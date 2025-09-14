/**
 * Salesforce CRM Integration
 * Handles authentication, contact/lead management, and data synchronization
 */

export interface SalesforceContact {
  Id: string;
  Email: string;
  FirstName?: string;
  LastName: string;
  AccountId?: string;
  Phone?: string;
  Title?: string;
  Department?: string;
  LeadSource?: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceLead {
  Id: string;
  Email: string;
  FirstName?: string;
  LastName: string;
  Company: string;
  Phone?: string;
  Title?: string;
  LeadSource?: string;
  Status: string;
  Rating?: string;
  Score__c?: number;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  AccountId: string;
  Amount?: number;
  StageName: string;
  Probability: number;
  CloseDate: string;
  LeadSource?: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Type?: string;
  Industry?: string;
  NumberOfEmployees?: number;
  Phone?: string;
  Website?: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

class SalesforceIntegration {
  private instanceUrl: string;
  private accessToken: string | null = null;
  private clientId: string;
  private clientSecret: string;
  private apiVersion = 'v58.0';

  constructor(config?: {
    instanceUrl?: string;
    accessToken?: string;
    clientId?: string;
    clientSecret?: string;
  }) {
    this.instanceUrl = config?.instanceUrl || process.env.SALESFORCE_INSTANCE_URL || '';
    this.accessToken = config?.accessToken || process.env.SALESFORCE_ACCESS_TOKEN || null;
    this.clientId = config?.clientId || process.env.SALESFORCE_CLIENT_ID || '';
    this.clientSecret = config?.clientSecret || process.env.SALESFORCE_CLIENT_SECRET || '';
  }

  /**
   * Authenticate with Salesforce using OAuth 2.0
   */
  async authenticate(username: string, password: string, securityToken: string): Promise<SalesforceAuthResponse> {
    const authUrl = `${this.instanceUrl}/services/oauth2/token`;
    
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username,
      password: password + securityToken,
    });

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Authentication failed' }));
      throw new Error(`Salesforce authentication error: ${error.error_description || error.error}`);
    }

    const authData: SalesforceAuthResponse = await response.json();
    this.accessToken = authData.access_token;
    this.instanceUrl = authData.instance_url;
    
    return authData;
  }

  /**
   * Make authenticated request to Salesforce API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Salesforce access token not configured. Call authenticate() first.');
    }

    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Salesforce API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Execute SOQL query
   */
  async query<T = any>(soql: string): Promise<{
    totalSize: number;
    done: boolean;
    records: T[];
    nextRecordsUrl?: string;
  }> {
    const encodedQuery = encodeURIComponent(soql);
    return this.request(`query?q=${encodedQuery}`);
  }

  /**
   * Get leads with pagination
   */
  async getLeads(limit = 100, offset = 0): Promise<{
    records: SalesforceLead[];
    totalSize: number;
    done: boolean;
  }> {
    const soql = `
      SELECT Id, Email, FirstName, LastName, Company, Phone, Title, 
             LeadSource, Status, Rating, Score__c, CreatedDate, LastModifiedDate
      FROM Lead 
      ORDER BY CreatedDate DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return this.query<SalesforceLead>(soql);
  }

  /**
   * Get contacts with pagination
   */
  async getContacts(limit = 100, offset = 0): Promise<{
    records: SalesforceContact[];
    totalSize: number;
    done: boolean;
  }> {
    const soql = `
      SELECT Id, Email, FirstName, LastName, AccountId, Phone, Title, 
             Department, LeadSource, CreatedDate, LastModifiedDate
      FROM Contact 
      ORDER BY CreatedDate DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return this.query<SalesforceContact>(soql);
  }

  /**
   * Get opportunities
   */
  async getOpportunities(limit = 100, offset = 0): Promise<{
    records: SalesforceOpportunity[];
    totalSize: number;
    done: boolean;
  }> {
    const soql = `
      SELECT Id, Name, AccountId, Amount, StageName, Probability, CloseDate,
             LeadSource, CreatedDate, LastModifiedDate
      FROM Opportunity 
      ORDER BY CreatedDate DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return this.query<SalesforceOpportunity>(soql);
  }

  /**
   * Get accounts
   */
  async getAccounts(limit = 100, offset = 0): Promise<{
    records: SalesforceAccount[];
    totalSize: number;
    done: boolean;
  }> {
    const soql = `
      SELECT Id, Name, Type, Industry, NumberOfEmployees, Phone, Website,
             CreatedDate, LastModifiedDate
      FROM Account 
      ORDER BY CreatedDate DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return this.query<SalesforceAccount>(soql);
  }

  /**
   * Create new lead
   */
  async createLead(leadData: Partial<SalesforceLead>): Promise<{ id: string; success: boolean }> {
    return this.request('sobjects/Lead', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  /**
   * Update lead
   */
  async updateLead(leadId: string, updates: Partial<SalesforceLead>): Promise<void> {
    return this.request(`sobjects/Lead/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Convert lead to contact and opportunity
   */
  async convertLead(leadId: string, options: {
    accountName?: string;
    opportunityName?: string;
    convertedStatus: string;
  }): Promise<{
    accountId: string;
    contactId: string;
    opportunityId?: string;
    success: boolean;
  }> {
    const conversionData = {
      leadId,
      convertedStatus: options.convertedStatus,
      accountName: options.accountName,
      opportunityName: options.opportunityName,
      createOpportunity: !!options.opportunityName,
    };

    return this.request('process/conversions', {
      method: 'POST',
      body: JSON.stringify(conversionData),
    });
  }

  /**
   * Search records using SOSL
   */
  async search(searchTerm: string, objectTypes: string[] = ['Lead', 'Contact', 'Account']): Promise<any> {
    const sosl = `
      FIND {${searchTerm}} IN ALL FIELDS 
      RETURNING ${objectTypes.map(type => `${type}(Id, Name)`).join(', ')}
      LIMIT 50
    `;
    
    const encodedSearch = encodeURIComponent(sosl);
    return this.request(`search?q=${encodedSearch}`);
  }

  /**
   * Calculate lead score based on Salesforce data
   */
  calculateLeadScore(lead: SalesforceLead): number {
    let score = 0;

    // Use existing score if available
    if (lead.Score__c) {
      return Math.min(lead.Score__c, 100);
    }

    // Status-based scoring
    const statusScores: Record<string, number> = {
      'Open - Not Contacted': 20,
      'Working - Contacted': 40,
      'Closed - Converted': 100,
      'Closed - Not Converted': 0,
      'Qualified': 80,
    };
    
    score += statusScores[lead.Status] || 10;

    // Rating-based scoring
    const ratingScores: Record<string, number> = {
      'Hot': 30,
      'Warm': 20,
      'Cold': 10,
    };
    
    if (lead.Rating) {
      score += ratingScores[lead.Rating] || 0;
    }

    // Lead source scoring
    const sourceScores: Record<string, number> = {
      'Web': 15,
      'Phone Inquiry': 20,
      'Partner Referral': 25,
      'Purchased List': 5,
      'Other': 10,
    };
    
    if (lead.LeadSource) {
      score += sourceScores[lead.LeadSource] || 0;
    }

    // Company presence
    if (lead.Company) score += 10;

    // Title presence (indicates seniority)
    if (lead.Title) {
      const seniorTitles = ['CEO', 'CTO', 'VP', 'Director', 'Manager', 'Head'];
      const isSenior = seniorTitles.some(title => 
        lead.Title?.toLowerCase().includes(title.toLowerCase())
      );
      score += isSenior ? 20 : 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Get pipeline data for forecasting
   */
  async getPipelineData(): Promise<{
    totalValue: number;
    weightedValue: number;
    opportunitiesByStage: Record<string, number>;
    averageDealSize: number;
    conversionRates: Record<string, number>;
  }> {
    const opportunities = await this.getOpportunities(1000);
    
    let totalValue = 0;
    let weightedValue = 0;
    const opportunitiesByStage: Record<string, number> = {};
    const stageConversions: Record<string, { total: number; won: number }> = {};

    opportunities.records.forEach(opp => {
      const amount = opp.Amount || 0;
      totalValue += amount;
      weightedValue += amount * (opp.Probability / 100);

      // Count by stage
      opportunitiesByStage[opp.StageName] = (opportunitiesByStage[opp.StageName] || 0) + 1;

      // Track conversions for each stage
      if (!stageConversions[opp.StageName]) {
        stageConversions[opp.StageName] = { total: 0, won: 0 };
      }
      stageConversions[opp.StageName].total++;
      
      if (opp.StageName.includes('Won') || opp.StageName.includes('Closed Won')) {
        stageConversions[opp.StageName].won++;
      }
    });

    const conversionRates: Record<string, number> = {};
    Object.entries(stageConversions).forEach(([stage, data]) => {
      conversionRates[stage] = data.total > 0 ? (data.won / data.total) * 100 : 0;
    });

    return {
      totalValue,
      weightedValue,
      opportunitiesByStage,
      averageDealSize: opportunities.records.length > 0 ? totalValue / opportunities.records.length : 0,
      conversionRates,
    };
  }

  /**
   * Sync data with local database
   */
  async syncData(): Promise<{
    leads: number;
    contacts: number;
    opportunities: number;
    accounts: number;
    errors: number;
    lastSyncTime: string;
  }> {
    let leadCount = 0;
    const contactCount = 0;
    const opportunityCount = 0;
    const accountCount = 0;
    let errors = 0;

    try {
      // Sync leads
      const leads = await this.getLeads(1000);
      for (const _lead of leads.records) {
        try {
          // const localLead = {
          //   external_id: lead.Id,
          //   source: 'salesforce',
          //   email: lead.Email,
          //   first_name: lead.FirstName,
          //   last_name: lead.LastName,
          //   company: lead.Company,
          //   phone: lead.Phone,
          //   title: lead.Title,
          //   status: lead.Status,
          //   lead_source: lead.LeadSource,
          //   lead_score: this.calculateLeadScore(lead),
          //   created_at: lead.CreatedDate,
          //   updated_at: lead.LastModifiedDate,
          // };
          
          // Save to database
          // await saveLeadToDatabase(localLead);
          leadCount++;
        } catch {
          errors++;
        }
      }

      // Sync contacts, opportunities, accounts...
      // Similar implementation for other object types

      return {
        leads: leadCount,
        contacts: contactCount,
        opportunities: opportunityCount,
        accounts: accountCount,
        errors,
        lastSyncTime: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Salesforce sync error:', error);
      throw error;
    }
  }

  /**
   * Test connection to Salesforce
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.query('SELECT Id FROM User LIMIT 1');
      return {
        success: true,
        message: 'Successfully connected to Salesforce CRM',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default SalesforceIntegration;