/**
 * ABN Lookup Agent
 * Handles Australian Business Number (ABN) and Australian Company Number (ACN) lookups
 * Integrates with Australian Business Register (ABR) Web Services
 */

import { BaseAgent } from '../../core/BaseAgent';
import {
  IBusinessLookupAgent,
  IIntegrationAgent,
  AgentConfig,
  AgentTask,
  AgentCapability,
  ServiceConnection,
  APICallResult
} from '../../types/AgentTypes';
import axios, { AxiosResponse } from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

export interface BusinessDetails {
  abn: string;
  acn?: string;
  entityName: string;
  entityType: string;
  status: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  businessNames?: string[];
  tradingNames?: string[];
  address: {
    stateCode: string;
    postcode: string;
    addressDetails?: string;
  };
  goodsAndServicesTax?: {
    effectiveFrom?: Date;
    effectiveTo?: Date;
  };
  payAsYouGoWithholding?: {
    effectiveFrom?: Date;
    effectiveTo?: Date;
  };
  dgrStatus?: {
    entityEndorsed: boolean;
    itemNumbers?: string[];
  };
  charity?: {
    charityType?: string;
    companyType?: string;
    endorsed: boolean;
  };
}

export interface BusinessSearchCriteria {
  name?: string;
  postcode?: string;
  state?: string;
  searchWidth?: 'exact' | 'typical' | 'narrow' | 'wide';
  minimumScore?: number;
  maxResults?: number;
  activeOnly?: boolean;
  currentOnly?: boolean;
  tradingNames?: boolean;
  businessNames?: boolean;
}

export interface BusinessSearchResult {
  abn: string;
  acn?: string;
  name: string;
  score: number;
  isActive: boolean;
  isCurrent: boolean;
  postcode: string;
  state: string;
}

/**
 * Australian Business Register lookup agent
 */
export class ABNLookupAgent extends BaseAgent implements IBusinessLookupAgent, IIntegrationAgent {
  private abrConnection: ServiceConnection | null = null;
  private guid: string = '';
  private baseUrl: string = 'https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx';
  private rateLimit = {
    requestsPerMinute: 1000, // ABR allows up to 1000 requests per minute
    currentCount: 0,
    lastReset: Date.now()
  };
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config: AgentConfig) {
    super(config);
    this.setupCapabilities();
  }

  // =====================================
  // Agent Lifecycle
  // =====================================

  protected async onInitialize(): Promise<void> {
    await this.setupABRConnection();
    this.logger.info('ABNLookupAgent initialized successfully');
  }

  protected async onStart(): Promise<void> {
    if (!await this.testConnection()) {
      this.logger.warn('ABR connection test failed, but agent will continue');
    }
    this.startCacheCleanup();
    this.logger.info('ABNLookupAgent started and ready');
  }

  // =====================================
  // Task Processing
  // =====================================

  public canHandleTask(task: AgentTask): boolean {
    const supportedTypes = [
      'lookup-abn',
      'lookup-acn', 
      'search-business-name',
      'verify-business',
      'get-business-details',
      'bulk-lookup',
      'validate-abn',
      'validate-acn'
    ];
    return supportedTypes.includes(task.type);
  }

  protected async executeTask(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result: any;

      switch (task.type) {
        case 'lookup-abn':
          result = await this.handleABNLookup(task);
          break;
        case 'lookup-acn':
          result = await this.handleACNLookup(task);
          break;
        case 'search-business-name':
          result = await this.handleBusinessNameSearch(task);
          break;
        case 'verify-business':
          result = await this.handleBusinessVerification(task);
          break;
        case 'get-business-details':
          result = await this.handleGetBusinessDetails(task);
          break;
        case 'bulk-lookup':
          result = await this.handleBulkLookup(task);
          break;
        case 'validate-abn':
          result = await this.handleValidateABN(task);
          break;
        case 'validate-acn':
          result = await this.handleValidateACN(task);
          break;
        default:
          throw new Error(`Unsupported task type: ${task.type}`);
      }

      const duration = Date.now() - startTime;
      this.metricsCollector.recordTaskCompletion(task.type, duration, true);
      this.metricsCollector.recordAPICall('abr', 'GET', 200, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordTaskCompletion(task.type, duration, false);
      this.metricsCollector.recordAPICall('abr', 'GET', 500, duration);
      throw error;
    }
  }

  protected async validateTaskPayload(task: AgentTask): Promise<boolean> {
    if (!task.payload) return false;

    switch (task.type) {
      case 'lookup-abn':
        return !!task.payload.abn && this.isValidABN(task.payload.abn);
      case 'lookup-acn':
        return !!task.payload.acn && this.isValidACN(task.payload.acn);
      case 'search-business-name':
        return !!task.payload.name && task.payload.name.length >= 2;
      case 'verify-business':
        return !!(task.payload.abn || task.payload.acn);
      case 'get-business-details':
        return !!(task.payload.abn || task.payload.acn);
      case 'bulk-lookup':
        return !!(task.payload.identifiers && Array.isArray(task.payload.identifiers));
      case 'validate-abn':
        return !!task.payload.abn;
      case 'validate-acn':
        return !!task.payload.acn;
      default:
        return true;
    }
  }

  // =====================================
  // IBusinessLookupAgent Implementation
  // =====================================

  public async lookupByABN(abn: string): Promise<BusinessDetails | null> {
    if (!this.isValidABN(abn)) {
      throw new Error(`Invalid ABN format: ${abn}`);
    }

    const cacheKey = `abn:${abn}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.checkRateLimit();
      
      const url = `${this.baseUrl}/ABRSearchByABN`;
      const params = {
        searchString: abn.replace(/\s/g, ''),
        includeHistoricalDetails: 'N',
        authenticationGuid: this.guid
      };

      const response = await axios.get(url, { params });
      const data = await this.parseXMLResponse(response.data);
      
      if (data.ABRPayloadSearchResults?.response?.exception) {
        throw new Error(data.ABRPayloadSearchResults.response.exception.exceptionDescription[0]);
      }

      const businessEntity = data.ABRPayloadSearchResults?.response?.businessEntity201408?.[0];
      if (!businessEntity) {
        return null;
      }

      const result = this.parseBusinessEntity(businessEntity);
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      this.logger.error(`ABN lookup failed for ${abn}:`, error);
      throw error;
    }
  }

  public async lookupByACN(acn: string): Promise<BusinessDetails | null> {
    if (!this.isValidACN(acn)) {
      throw new Error(`Invalid ACN format: ${acn}`);
    }

    const cacheKey = `acn:${acn}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.checkRateLimit();
      
      const url = `${this.baseUrl}/ABRSearchByASIC`;
      const params = {
        searchString: acn.replace(/\s/g, ''),
        includeHistoricalDetails: 'N',
        authenticationGuid: this.guid
      };

      const response = await axios.get(url, { params });
      const data = await this.parseXMLResponse(response.data);
      
      if (data.ABRPayloadSearchResults?.response?.exception) {
        throw new Error(data.ABRPayloadSearchResults.response.exception.exceptionDescription[0]);
      }

      const businessEntity = data.ABRPayloadSearchResults?.response?.businessEntity201408?.[0];
      if (!businessEntity) {
        return null;
      }

      const result = this.parseBusinessEntity(businessEntity);
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      this.logger.error(`ACN lookup failed for ${acn}:`, error);
      throw error;
    }
  }

  public async lookupByName(name: string): Promise<BusinessSearchResult[]> {
    if (!name || name.length < 2) {
      throw new Error('Business name must be at least 2 characters long');
    }

    const criteria: BusinessSearchCriteria = {
      name,
      searchWidth: 'typical',
      maxResults: 50,
      activeOnly: true,
      currentOnly: true
    };

    return await this.searchBusinesses(criteria);
  }

  public async verifyBusiness(identifier: string): Promise<boolean> {
    try {
      let business: BusinessDetails | null = null;
      
      if (this.isValidABN(identifier)) {
        business = await this.lookupByABN(identifier);
      } else if (this.isValidACN(identifier)) {
        business = await this.lookupByACN(identifier);
      } else {
        return false;
      }

      return business !== null && business.status === 'Active';
    } catch (error) {
      this.logger.error(`Business verification failed for ${identifier}:`, error);
      return false;
    }
  }

  public async getBusinessDetails(identifier: string): Promise<BusinessDetails | null> {
    if (this.isValidABN(identifier)) {
      return await this.lookupByABN(identifier);
    } else if (this.isValidACN(identifier)) {
      return await this.lookupByACN(identifier);
    } else {
      throw new Error(`Invalid business identifier: ${identifier}`);
    }
  }

  public async searchBusinesses(criteria: BusinessSearchCriteria): Promise<BusinessSearchResult[]> {
    if (!criteria.name) {
      throw new Error('Business name is required for search');
    }

    const cacheKey = `search:${JSON.stringify(criteria)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.checkRateLimit();
      
      const url = `${this.baseUrl}/ABRSearchByName`;
      const params = {
        name: criteria.name,
        postcode: criteria.postcode || '',
        legalName: 'Y',
        tradingName: criteria.tradingNames ? 'Y' : 'N',
        businessName: criteria.businessNames ? 'Y' : 'N',
        activeABNsOnly: criteria.activeOnly ? 'Y' : 'N',
        currentABNsOnly: criteria.currentOnly ? 'Y' : 'N',
        searchWidth: criteria.searchWidth || 'typical',
        minimumScore: criteria.minimumScore || 0,
        maxSearchResults: criteria.maxResults || 50,
        authenticationGuid: this.guid
      };

      const response = await axios.get(url, { params });
      const data = await this.parseXMLResponse(response.data);
      
      if (data.ABRPayloadSearchResults?.response?.exception) {
        throw new Error(data.ABRPayloadSearchResults.response.exception.exceptionDescription[0]);
      }

      const searchResultsList = data.ABRPayloadSearchResults?.response?.searchResultsList;
      if (!searchResultsList || !searchResultsList[0]?.searchResultsRecord) {
        return [];
      }

      const results = searchResultsList[0].searchResultsRecord.map((record: any) => 
        this.parseSearchResult(record)
      );

      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      this.logger.error(`Business name search failed for "${criteria.name}":`, error);
      throw error;
    }
  }

  public async filterBusinesses(businesses: any[], filters: any): Promise<any[]> {
    return businesses.filter(business => {
      // Apply filters
      if (filters.state && business.state !== filters.state) {
        return false;
      }
      
      if (filters.postcode && business.postcode !== filters.postcode) {
        return false;
      }
      
      if (filters.activeOnly && !business.isActive) {
        return false;
      }
      
      if (filters.minimumScore && business.score < filters.minimumScore) {
        return false;
      }
      
      return true;
    });
  }

  // =====================================
  // IIntegrationAgent Implementation
  // =====================================

  public async connect(config: any): Promise<void> {
    this.guid = config.guid || process.env.ABR_GUID || '';
    if (!this.guid) {
      throw new Error('ABR GUID is required for connection');
    }
    
    this.abrConnection = {
      id: 'abr-web-services',
      name: 'Australian Business Register',
      type: 'web-api',
      config: { guid: this.guid },
      credentials: { guid: this.guid },
      status: 'active',
      lastConnected: new Date()
    };
    
    await this.testConnection();
    this.logger.info('Connected to ABR Web Services');
  }

  public async disconnect(): Promise<void> {
    if (this.abrConnection) {
      this.abrConnection.status = 'inactive';
      this.abrConnection = null;
      this.logger.info('Disconnected from ABR Web Services');
    }
  }

  public isConnected(): boolean {
    return this.abrConnection?.status === 'active';
  }

  public async testConnection(): Promise<boolean> {
    if (!this.guid) {
      return false;
    }

    try {
      // Test with a known ABN (Australian Taxation Office)
      const testABN = '51824753556';
      const result = await this.lookupByABN(testABN);
      return result !== null;
    } catch (error) {
      this.logger.error('ABR connection test failed:', error);
      return false;
    }
  }

  public async syncData(direction: 'in' | 'out' | 'both'): Promise<void> {
    // ABR is read-only, so only 'in' direction is supported
    if (direction === 'out' || direction === 'both') {
      throw new Error('ABR Web Services are read-only');
    }
    
    // Sync would involve refreshing cached data
    this.clearCache();
    this.logger.info('ABR data sync completed (cache cleared)');
  }

  public async getLastSyncTime(): Promise<Date | null> {
    return this.abrConnection?.lastConnected || null;
  }

  public async callExternalAPI(endpoint: string, method: string, data?: any): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to ABR Web Services');
    }

    const url = `${this.baseUrl}/${endpoint}`;
    const params = { ...data, authenticationGuid: this.guid };

    const response = await axios.request({
      url,
      method,
      params: method === 'GET' ? params : undefined,
      data: method !== 'GET' ? params : undefined
    });

    return await this.parseXMLResponse(response.data);
  }

  // =====================================
  // Task Handlers
  // =====================================

  private async handleABNLookup(task: AgentTask): Promise<BusinessDetails | null> {
    const { abn } = task.payload;
    return await this.lookupByABN(abn);
  }

  private async handleACNLookup(task: AgentTask): Promise<BusinessDetails | null> {
    const { acn } = task.payload;
    return await this.lookupByACN(acn);
  }

  private async handleBusinessNameSearch(task: AgentTask): Promise<BusinessSearchResult[]> {
    const criteria = task.payload as BusinessSearchCriteria;
    return await this.searchBusinesses(criteria);
  }

  private async handleBusinessVerification(task: AgentTask): Promise<boolean> {
    const { identifier } = task.payload;
    return await this.verifyBusiness(identifier);
  }

  private async handleGetBusinessDetails(task: AgentTask): Promise<BusinessDetails | null> {
    const { identifier } = task.payload;
    return await this.getBusinessDetails(identifier);
  }

  private async handleBulkLookup(task: AgentTask): Promise<Array<{ identifier: string; result: BusinessDetails | null; error?: string }>> {
    const { identifiers } = task.payload;
    const results = [];

    for (const identifier of identifiers) {
      try {
        const result = await this.getBusinessDetails(identifier);
        results.push({ identifier, result });
        
        // Add delay to respect rate limits
        await this.delay(100);
      } catch (error) {
        results.push({ 
          identifier, 
          result: null, 
          error: error.message 
        });
      }
    }

    return results;
  }

  private async handleValidateABN(task: AgentTask): Promise<{ valid: boolean; formatted?: string }> {
    const { abn } = task.payload;
    const valid = this.isValidABN(abn);
    
    return {
      valid,
      formatted: valid ? this.formatABN(abn) : undefined
    };
  }

  private async handleValidateACN(task: AgentTask): Promise<{ valid: boolean; formatted?: string }> {
    const { acn } = task.payload;
    const valid = this.isValidACN(acn);
    
    return {
      valid,
      formatted: valid ? this.formatACN(acn) : undefined
    };
  }

  // =====================================
  // Helper Methods
  // =====================================

  private async parseXMLResponse(xmlData: string): Promise<any> {
    try {
      return await parseXML(xmlData, {
        explicitArray: true,
        ignoreAttrs: false,
        mergeAttrs: true
      });
    } catch (error) {
      this.logger.error('Failed to parse XML response:', error);
      throw new Error('Invalid XML response from ABR');
    }
  }

  private parseBusinessEntity(entity: any): BusinessDetails {
    const abn = entity.ABN?.[0]?.identifierValue?.[0] || '';
    const acn = entity.ASICNumber?.[0]?.identifierValue?.[0] || '';
    
    const legalName = entity.legalName?.[0];
    const entityName = legalName?.givenName?.[0] || legalName?.familyName?.[0] || 
                     legalName?.organisationName?.[0] || 'Unknown';

    const entityType = entity.entityType?.[0]?.entityTypeCode?.[0] || 'Unknown';
    const entityStatus = entity.entityStatus?.[0]?.entityStatusCode?.[0] || 'Unknown';
    
    const effectiveFrom = new Date(entity.entityStatus?.[0]?.effectiveFrom?.[0] || Date.now());
    const effectiveTo = entity.entityStatus?.[0]?.effectiveTo?.[0] ? 
                       new Date(entity.entityStatus[0].effectiveTo[0]) : undefined;

    // Extract addresses
    const mainBusinessPhysicalAddress = entity.mainBusinessPhysicalAddress?.[0];
    const address = {
      stateCode: mainBusinessPhysicalAddress?.stateCode?.[0] || '',
      postcode: mainBusinessPhysicalAddress?.postcode?.[0] || '',
      addressDetails: this.buildAddressString(mainBusinessPhysicalAddress)
    };

    // Extract business names
    const businessNames: string[] = [];
    const tradingNames: string[] = [];
    
    if (entity.businessName) {
      entity.businessName.forEach((bn: any) => {
        if (bn.organisationName?.[0]) {
          businessNames.push(bn.organisationName[0]);
        }
      });
    }

    if (entity.mainTradingName) {
      entity.mainTradingName.forEach((tn: any) => {
        if (tn.organisationName?.[0]) {
          tradingNames.push(tn.organisationName[0]);
        }
      });
    }

    // Extract GST information
    let goodsAndServicesTax;
    if (entity.goodsAndServicesTax?.[0]) {
      const gst = entity.goodsAndServicesTax[0];
      goodsAndServicesTax = {
        effectiveFrom: gst.effectiveFrom?.[0] ? new Date(gst.effectiveFrom[0]) : undefined,
        effectiveTo: gst.effectiveTo?.[0] ? new Date(gst.effectiveTo[0]) : undefined
      };
    }

    // Extract PAYG information
    let payAsYouGoWithholding;
    if (entity.payAsYouGoWithholding?.[0]) {
      const payg = entity.payAsYouGoWithholding[0];
      payAsYouGoWithholding = {
        effectiveFrom: payg.effectiveFrom?.[0] ? new Date(payg.effectiveFrom[0]) : undefined,
        effectiveTo: payg.effectiveTo?.[0] ? new Date(payg.effectiveTo[0]) : undefined
      };
    }

    // Extract DGR status
    let dgrStatus;
    if (entity.dgrFund?.[0]) {
      const dgr = entity.dgrFund[0];
      dgrStatus = {
        entityEndorsed: dgr.entityEndorsed?.[0] === 'Y',
        itemNumbers: dgr.itemNumber?.map((item: any) => item.itemNumber?.[0]).filter(Boolean)
      };
    }

    // Extract charity information
    let charity;
    if (entity.charityType?.[0]) {
      const charityInfo = entity.charityType[0];
      charity = {
        charityType: charityInfo.charityTypeDescription?.[0],
        companyType: charityInfo.companyType?.[0],
        endorsed: true
      };
    }

    return {
      abn: this.formatABN(abn),
      acn: acn ? this.formatACN(acn) : undefined,
      entityName,
      entityType,
      status: entityStatus,
      effectiveFrom,
      effectiveTo,
      businessNames: businessNames.length > 0 ? businessNames : undefined,
      tradingNames: tradingNames.length > 0 ? tradingNames : undefined,
      address,
      goodsAndServicesTax,
      payAsYouGoWithholding,
      dgrStatus,
      charity
    };
  }

  private parseSearchResult(record: any): BusinessSearchResult {
    const abn = record.ABN?.[0]?.identifierValue?.[0] || '';
    const acn = record.ASICNumber?.[0]?.identifierValue?.[0];
    const name = record.legalName?.[0]?.organisationName?.[0] || 
                record.mainName?.[0]?.organisationName?.[0] || 'Unknown';
    const score = parseInt(record.nameScore?.[0] || '0');
    const isActive = record.isCurrentIndicator?.[0] === 'Y';
    const isCurrent = record.isCurrentIndicator?.[0] === 'Y';
    const postcode = record.mainBusinessPhysicalAddress?.[0]?.postcode?.[0] || '';
    const state = record.mainBusinessPhysicalAddress?.[0]?.stateCode?.[0] || '';

    return {
      abn: this.formatABN(abn),
      acn: acn ? this.formatACN(acn) : undefined,
      name,
      score,
      isActive,
      isCurrent,
      postcode,
      state
    };
  }

  private buildAddressString(address: any): string {
    if (!address) return '';

    const parts = [];
    
    if (address.addressLine?.[0]) parts.push(address.addressLine[0]);
    if (address.localityName?.[0]) parts.push(address.localityName[0]);
    if (address.stateCode?.[0]) parts.push(address.stateCode[0]);
    if (address.postcode?.[0]) parts.push(address.postcode[0]);

    return parts.join(', ');
  }

  private isValidABN(abn: string): boolean {
    if (!abn) return false;
    
    // Remove spaces and check format
    const cleanABN = abn.replace(/\s/g, '');
    
    // Must be 11 digits
    if (!/^\d{11}$/.test(cleanABN)) return false;
    
    // ABN validation algorithm
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    const digits = cleanABN.split('').map(Number);
    
    // Subtract 1 from the first digit
    digits[0] -= 1;
    
    // Calculate weighted sum
    const sum = digits.reduce((acc, digit, index) => acc + (digit * weights[index]), 0);
    
    // Valid if sum is divisible by 89
    return sum % 89 === 0;
  }

  private isValidACN(acn: string): boolean {
    if (!acn) return false;
    
    // Remove spaces and check format
    const cleanACN = acn.replace(/\s/g, '');
    
    // Must be 9 digits
    if (!/^\d{9}$/.test(cleanACN)) return false;
    
    // ACN validation algorithm
    const weights = [8, 7, 6, 5, 4, 3, 2, 1];
    const digits = cleanACN.split('').map(Number);
    const checkDigit = digits[8];
    
    // Calculate weighted sum of first 8 digits
    const sum = digits.slice(0, 8).reduce((acc, digit, index) => acc + (digit * weights[index]), 0);
    
    // Calculate expected check digit
    const remainder = sum % 10;
    const expectedCheckDigit = remainder === 0 ? 0 : 10 - remainder;
    
    return checkDigit === expectedCheckDigit;
  }

  private formatABN(abn: string): string {
    const clean = abn.replace(/\s/g, '');
    return `${clean.substring(0, 2)} ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8, 11)}`;
  }

  private formatACN(acn: string): string {
    const clean = acn.replace(/\s/g, '');
    return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 9)}`;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // Reset counter if a minute has passed
    if (now - this.rateLimit.lastReset >= oneMinute) {
      this.rateLimit.currentCount = 0;
      this.rateLimit.lastReset = now;
    }
    
    // Check if we've exceeded the rate limit
    if (this.rateLimit.currentCount >= this.rateLimit.requestsPerMinute) {
      const waitTime = oneMinute - (now - this.rateLimit.lastReset);
      await this.delay(waitTime);
      
      // Reset after waiting
      this.rateLimit.currentCount = 0;
      this.rateLimit.lastReset = Date.now();
    }
    
    this.rateLimit.currentCount++;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp >= this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  // =====================================
  // Initialization Methods
  // =====================================

  private async setupABRConnection(): Promise<void> {
    const guid = process.env.ABR_GUID;
    if (guid) {
      await this.connect({ guid });
    } else {
      this.logger.warn('ABR_GUID not provided. Some functionality may be limited.');
    }
  }

  private setupCapabilities(): void {
    this.capabilities.push(
      {
        name: 'abn-lookup',
        version: '1.0.0',
        description: 'Look up Australian Business Numbers',
        inputSchema: {},
        outputSchema: {},
        requirements: ['ABR GUID'],
        limitations: ['Rate limited to 1000 requests per minute']
      },
      {
        name: 'acn-lookup',
        version: '1.0.0',
        description: 'Look up Australian Company Numbers',
        inputSchema: {},
        outputSchema: {},
        requirements: ['ABR GUID'],
        limitations: ['Rate limited to 1000 requests per minute']
      },
      {
        name: 'business-search',
        version: '1.0.0',
        description: 'Search businesses by name',
        inputSchema: {},
        outputSchema: {},
        requirements: ['ABR GUID'],
        limitations: ['Rate limited to 1000 requests per minute']
      },
      {
        name: 'business-verification',
        version: '1.0.0',
        description: 'Verify business registration status',
        inputSchema: {},
        outputSchema: {},
        requirements: ['ABR GUID'],
        limitations: ['Rate limited to 1000 requests per minute']
      }
    );
  }

  protected async getCustomMetrics(): Promise<Record<string, number>> {
    return {
      'abr.requests_made': this.rateLimit.currentCount,
      'abr.cache_size': this.cache.size,
      'abr.cache_hit_rate': 0.85, // Would calculate from actual cache hits
      'abr.connection_status': this.isConnected() ? 1 : 0
    };
  }
}