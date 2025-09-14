/**
 * HubSpot CRM Integration
 * Handles authentication, contact management, and data synchronization
 */

export interface HubSpotContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  leadScore?: number;
  lifecycleStage: string;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotDeal {
  id: string;
  dealName: string;
  amount: number;
  stage: string;
  probability: number;
  closeDate: string;
  contactIds: string[];
  companyId?: string;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotCompany {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  employees?: number;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotPipeline {
  id: string;
  label: string;
  stages: HubSpotPipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotPipelineStage {
  id: string;
  label: string;
  probability: number;
  stageOrder: number;
}

class HubSpotIntegration {
  private baseUrl = 'https://api.hubapi.com';
  private accessToken: string | null = null;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.HUBSPOT_ACCESS_TOKEN || null;
  }

  /**
   * Set access token for API requests
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Make authenticated request to HubSpot API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('HubSpot access token not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
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
      throw new Error(`HubSpot API error: ${response.status} - ${error.message}`);
    }

    return response.json();
  }

  /**
   * Get all contacts with pagination
   */
  async getContacts(limit = 100, after?: string): Promise<{
    results: HubSpotContact[];
    paging?: { next?: { after: string } };
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      properties: 'email,firstname,lastname,company,phone,lifecyclestage,hs_lead_status,hubspotscore',
    });

    if (after) {
      params.append('after', after);
    }

    return this.request(`/crm/v3/objects/contacts?${params}`);
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<HubSpotContact> {
    return this.request(`/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company,phone,lifecyclestage,hs_lead_status,hubspotscore`);
  }

  /**
   * Create new contact
   */
  async createContact(contactData: Partial<HubSpotContact>): Promise<HubSpotContact> {
    const properties: Record<string, any> = {};
    
    if (contactData.email) properties.email = contactData.email;
    if (contactData.firstName) properties.firstname = contactData.firstName;
    if (contactData.lastName) properties.lastname = contactData.lastName;
    if (contactData.company) properties.company = contactData.company;
    if (contactData.phone) properties.phone = contactData.phone;

    return this.request('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify({ properties }),
    });
  }

  /**
   * Update contact
   */
  async updateContact(contactId: string, updates: Partial<HubSpotContact>): Promise<HubSpotContact> {
    const properties: Record<string, any> = {};
    
    if (updates.email) properties.email = updates.email;
    if (updates.firstName) properties.firstname = updates.firstName;
    if (updates.lastName) properties.lastname = updates.lastName;
    if (updates.company) properties.company = updates.company;
    if (updates.phone) properties.phone = updates.phone;

    return this.request(`/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
  }

  /**
   * Get all deals
   */
  async getDeals(limit = 100, after?: string): Promise<{
    results: HubSpotDeal[];
    paging?: { next?: { after: string } };
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      properties: 'dealname,amount,dealstage,hs_deal_stage_probability,closedate,createdate',
      associations: 'contacts,companies',
    });

    if (after) {
      params.append('after', after);
    }

    return this.request(`/crm/v3/objects/deals?${params}`);
  }

  /**
   * Create new deal
   */
  async createDeal(dealData: Partial<HubSpotDeal>): Promise<HubSpotDeal> {
    const properties: Record<string, any> = {};
    
    if (dealData.dealName) properties.dealname = dealData.dealName;
    if (dealData.amount) properties.amount = dealData.amount;
    if (dealData.stage) properties.dealstage = dealData.stage;
    if (dealData.closeDate) properties.closedate = dealData.closeDate;

    return this.request('/crm/v3/objects/deals', {
      method: 'POST',
      body: JSON.stringify({ properties }),
    });
  }

  /**
   * Get companies
   */
  async getCompanies(limit = 100, after?: string): Promise<{
    results: HubSpotCompany[];
    paging?: { next?: { after: string } };
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      properties: 'name,domain,industry,numberofemployees',
    });

    if (after) {
      params.append('after', after);
    }

    return this.request(`/crm/v3/objects/companies?${params}`);
  }

  /**
   * Get pipelines
   */
  async getPipelines(): Promise<{ results: HubSpotPipeline[] }> {
    return this.request('/crm/v3/pipelines/deals');
  }

  /**
   * Search contacts
   */
  async searchContacts(query: string, limit = 50): Promise<{
    results: HubSpotContact[];
    total: number;
  }> {
    const searchRequest = {
      query,
      limit,
      properties: ['email', 'firstname', 'lastname', 'company', 'phone', 'lifecyclestage'],
    };

    return this.request('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest),
    });
  }

  /**
   * Get contact activities/engagements
   */
  async getContactActivities(contactId: string): Promise<any[]> {
    try {
      const response = await this.request(`/crm/v3/objects/contacts/${contactId}/associations/activities`);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching contact activities:', error);
      return [];
    }
  }

  /**
   * Calculate lead score based on HubSpot data
   */
  calculateLeadScore(contact: HubSpotContact): number {
    let score = 0;

    // Base score from HubSpot's built-in scoring
    if (contact.properties?.hubspotscore) {
      score += Math.min(contact.properties.hubspotscore, 50);
    }

    // Lifecycle stage scoring
    const stageScores: Record<string, number> = {
      'subscriber': 10,
      'lead': 25,
      'marketingqualifiedlead': 50,
      'salesqualifiedlead': 75,
      'opportunity': 90,
      'customer': 100,
    };

    score += stageScores[contact.lifecycleStage] || 0;

    // Company presence
    if (contact.company) score += 15;

    // Phone number
    if (contact.phone) score += 10;

    // Email engagement (if available)
    if (contact.properties?.hs_email_last_email_date) {
      const lastEmailDate = new Date(contact.properties.hs_email_last_email_date);
      const daysSinceEmail = (Date.now() - lastEmailDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceEmail < 30) score += 20;
      else if (daysSinceEmail < 90) score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Sync contact data with local database
   */
  async syncContacts(): Promise<{
    synced: number;
    errors: number;
    lastSyncTime: string;
  }> {
    let synced = 0;
    let errors = 0;
    let after: string | undefined;

    try {
      do {
        const response = await this.getContacts(100, after);
        
        for (const contact of response.results) {
          try {
            // Transform and save to local database
            // const localContact = {
            //   external_id: contact.id,
            //   source: 'hubspot',
            //   email: contact.email,
            //   first_name: contact.firstName,
            //   last_name: contact.lastName,
            //   company: contact.company,
            //   phone: contact.phone,
            //   lifecycle_stage: contact.lifecycleStage,
            //   lead_score: this.calculateLeadScore(contact),
            //   properties: contact.properties,
            //   created_at: contact.createdAt,
            //   updated_at: contact.updatedAt,
            // };

            // Here you would save to your database
            // await saveContactToDatabase(localContact);
            synced++;
          } catch (error) {
            console.error(`Error syncing contact ${contact.id}:`, error);
            errors++;
          }
        }

        after = response.paging?.next?.after;
      } while (after);

      return {
        synced,
        errors,
        lastSyncTime: new Date().toISOString(),
      };
    } catch (error) {
      console.error('HubSpot sync error:', error);
      throw error;
    }
  }

  /**
   * Test connection to HubSpot
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/crm/v3/objects/contacts?limit=1');
      return {
        success: true,
        message: 'Successfully connected to HubSpot CRM',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default HubSpotIntegration;