/**
 * Advanced Lead Scoring Engine
 * Implements multiple scoring algorithms including AI-based predictive scoring
 */

export interface LeadData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  website?: string;
  industry?: string;
  companySize?: number;
  location?: string;
  leadSource?: string;
  
  // Behavioral data
  emailOpens?: number;
  emailClicks?: number;
  websiteVisits?: number;
  pagesViewed?: number;
  timeOnSite?: number;
  formSubmissions?: number;
  contentDownloads?: number;
  webinarAttendance?: number;
  socialMedia?: {
    linkedinProfile?: boolean;
    twitterProfile?: boolean;
    followers?: number;
  };
  
  // Engagement timeline
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
  
  // CRM data
  crmStage?: string;
  crmScore?: number;
  dealValue?: number;
}

export interface ScoringResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  segments: {
    demographic: number;
    firmographic: number;
    behavioral: number;
    engagement: number;
    predictive: number;
  };
  insights: string[];
  recommendedActions: string[];
  conversionProbability: number;
}

export interface ScoringConfig {
  weights: {
    demographic: number;
    firmographic: number;
    behavioral: number;
    engagement: number;
    predictive: number;
  };
  thresholds: {
    hot: number;
    warm: number;
    cold: number;
  };
  industryMultipliers: Record<string, number>;
  companySizeMultipliers: Record<string, number>;
}

class LeadScoringEngine {
  private config: ScoringConfig;

  constructor(config?: Partial<ScoringConfig>) {
    this.config = {
      weights: {
        demographic: 0.15,
        firmographic: 0.25,
        behavioral: 0.35,
        engagement: 0.15,
        predictive: 0.10,
      },
      thresholds: {
        hot: 80,
        warm: 60,
        cold: 40,
      },
      industryMultipliers: {
        'Technology': 1.2,
        'Healthcare': 1.1,
        'Finance': 1.3,
        'Manufacturing': 1.0,
        'Retail': 0.9,
        'Education': 0.8,
        'Non-profit': 0.7,
      },
      companySizeMultipliers: {
        'Enterprise (1000+)': 1.5,
        'Mid-market (100-999)': 1.2,
        'SMB (10-99)': 1.0,
        'Startup (1-9)': 0.8,
      },
      ...config,
    };
  }

  /**
   * Calculate comprehensive lead score
   */
  async scoreLeadComprehensive(lead: LeadData): Promise<ScoringResult> {
    const demographic = this.calculateDemographicScore(lead);
    const firmographic = this.calculateFirmographicScore(lead);
    const behavioral = this.calculateBehavioralScore(lead);
    const engagement = this.calculateEngagementScore(lead);
    const predictive = await this.calculatePredictiveScore(lead);

    const segments = {
      demographic: Math.round(demographic),
      firmographic: Math.round(firmographic),
      behavioral: Math.round(behavioral),
      engagement: Math.round(engagement),
      predictive: Math.round(predictive),
    };

    const totalScore = Math.round(
      demographic * this.config.weights.demographic +
      firmographic * this.config.weights.firmographic +
      behavioral * this.config.weights.behavioral +
      engagement * this.config.weights.engagement +
      predictive * this.config.weights.predictive
    );

    const maxScore = 100;
    const percentage = Math.round((totalScore / maxScore) * 100);
    const grade = this.calculateGrade(totalScore);
    const insights = this.generateInsights(lead, segments);
    const recommendedActions = this.generateRecommendedActions(lead, segments);
    const conversionProbability = this.calculateConversionProbability(totalScore, segments);

    return {
      totalScore,
      maxScore,
      percentage,
      grade,
      segments,
      insights,
      recommendedActions,
      conversionProbability,
    };
  }

  /**
   * Calculate demographic score based on personal information
   */
  private calculateDemographicScore(lead: LeadData): number {
    let score = 0;

    // Email domain quality
    if (lead.email) {
      const domain = lead.email.split('@')[1];
      const businessDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      if (!businessDomains.includes(domain)) {
        score += 25; // Business email
      } else {
        score += 10; // Personal email
      }
    }

    // Job title seniority
    if (lead.jobTitle) {
      const seniorTitles = ['CEO', 'CTO', 'VP', 'President', 'Director', 'Head of'];
      const managerTitles = ['Manager', 'Lead', 'Senior'];
      const title = lead.jobTitle.toLowerCase();
      
      if (seniorTitles.some(t => title.includes(t.toLowerCase()))) {
        score += 35;
      } else if (managerTitles.some(t => title.includes(t.toLowerCase()))) {
        score += 25;
      } else {
        score += 15;
      }
    }

    // Contact completeness
    if (lead.phone) score += 20;
    if (lead.firstName && lead.lastName) score += 15;
    if (lead.location) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Calculate firmographic score based on company information
   */
  private calculateFirmographicScore(lead: LeadData): number {
    let score = 0;

    // Company presence
    if (lead.company) {
      score += 20;
      
      // Industry scoring
      if (lead.industry) {
        const multiplier = this.config.industryMultipliers[lead.industry] || 1.0;
        score += 25 * multiplier;
      }

      // Company size
      if (lead.companySize) {
        if (lead.companySize >= 1000) score += 30; // Enterprise
        else if (lead.companySize >= 100) score += 25; // Mid-market
        else if (lead.companySize >= 10) score += 20; // SMB
        else score += 15; // Startup
      }

      // Website presence
      if (lead.website) {
        score += 15;
        
        // Check domain authority (simplified)
        const domain = lead.website.replace(/^https?:\/\//, '').split('/')[0];
        if (domain.includes('.edu')) score += 5; // Educational
        if (domain.includes('.gov')) score += 10; // Government
      }
    }

    // Location-based scoring
    if (lead.location) {
      const highValueLocations = ['San Francisco', 'New York', 'London', 'Tokyo', 'Singapore'];
      if (highValueLocations.some(loc => lead.location?.includes(loc))) {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate behavioral score based on digital engagement
   */
  private calculateBehavioralScore(lead: LeadData): number {
    let score = 0;

    // Email engagement
    const emailOpens = lead.emailOpens || 0;
    const emailClicks = lead.emailClicks || 0;
    
    score += Math.min(emailOpens * 2, 20);
    score += Math.min(emailClicks * 5, 25);

    // Website engagement
    const websiteVisits = lead.websiteVisits || 0;
    const pagesViewed = lead.pagesViewed || 0;
    const timeOnSite = lead.timeOnSite || 0;

    score += Math.min(websiteVisits * 3, 20);
    score += Math.min(pagesViewed * 1, 15);
    score += Math.min(timeOnSite / 60, 10); // Minutes to score

    // Content engagement
    const formSubmissions = lead.formSubmissions || 0;
    const contentDownloads = lead.contentDownloads || 0;
    const webinarAttendance = lead.webinarAttendance || 0;

    score += Math.min(formSubmissions * 8, 20);
    score += Math.min(contentDownloads * 6, 15);
    score += Math.min(webinarAttendance * 10, 20);

    // Social media presence
    if (lead.socialMedia?.linkedinProfile) score += 5;
    if (lead.socialMedia?.twitterProfile) score += 3;
    if (lead.socialMedia?.followers) {
      score += Math.min((lead.socialMedia.followers / 1000) * 2, 10);
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate engagement score based on recency and frequency
   */
  private calculateEngagementScore(lead: LeadData): number {
    let score = 0;

    // Recency scoring
    if (lead.lastActivity) {
      const lastActivityDate = new Date(lead.lastActivity);
      const daysSinceActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceActivity <= 1) score += 40;
      else if (daysSinceActivity <= 7) score += 30;
      else if (daysSinceActivity <= 30) score += 20;
      else if (daysSinceActivity <= 90) score += 10;
      else score += 5;
    }

    // Lead age (newer leads often convert better)
    const leadAge = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (leadAge <= 7) score += 20;
    else if (leadAge <= 30) score += 15;
    else if (leadAge <= 90) score += 10;
    else score += 5;

    // Update frequency
    const updateFrequency = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (updateFrequency <= 1) score += 25;
    else if (updateFrequency <= 7) score += 20;
    else if (updateFrequency <= 30) score += 15;
    else score += 10;

    // Lead source quality
    const sourceScores: Record<string, number> = {
      'Organic Search': 15,
      'Paid Search': 12,
      'Social Media': 10,
      'Email Campaign': 8,
      'Referral': 20,
      'Direct': 18,
      'Webinar': 15,
      'Trade Show': 12,
      'Cold Outreach': 5,
    };

    if (lead.leadSource) {
      score += sourceScores[lead.leadSource] || 8;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate predictive score using machine learning indicators
   */
  private async calculatePredictiveScore(lead: LeadData): Promise<number> {
    let score = 0;

    // Use existing CRM score if available
    if (lead.crmScore) {
      score += Math.min(lead.crmScore, 50);
    }

    // Engagement velocity (how quickly engagement is increasing)
    const totalEngagement = (lead.emailOpens || 0) + (lead.emailClicks || 0) + 
                           (lead.websiteVisits || 0) + (lead.formSubmissions || 0);
    
    if (totalEngagement > 0) {
      const leadAge = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const engagementVelocity = totalEngagement / Math.max(leadAge, 1);
      score += Math.min(engagementVelocity * 10, 25);
    }

    // Pattern matching with successful conversions
    const conversionPatterns = await this.analyzeConversionPatterns(lead);
    score += conversionPatterns;

    // Intent signals
    const intentScore = this.calculateIntentScore(lead);
    score += intentScore;

    return Math.min(score, 100);
  }

  /**
   * Analyze patterns similar to successful conversions
   */
  private async analyzeConversionPatterns(lead: LeadData): Promise<number> {
    // This would typically query historical data
    // For now, we'll use rule-based patterns
    let score = 0;

    // High-conversion patterns
    if (lead.industry === 'Technology' && lead.companySize && lead.companySize >= 100) {
      score += 15;
    }

    if (lead.jobTitle?.toLowerCase().includes('decision') || 
        lead.jobTitle?.toLowerCase().includes('director')) {
      score += 10;
    }

    if ((lead.emailOpens || 0) > 5 && (lead.websiteVisits || 0) > 3) {
      score += 12;
    }

    if (lead.leadSource === 'Referral' && lead.dealValue && lead.dealValue > 10000) {
      score += 20;
    }

    return Math.min(score, 25);
  }

  /**
   * Calculate intent score based on buying signals
   */
  private calculateIntentScore(lead: LeadData): number {
    let score = 0;

    // Pricing page visits indicate high intent
    if (lead.pagesViewed && lead.pagesViewed > 0) {
      score += 10; // Simplified - would check specific page URLs
    }

    // Multiple form submissions show engagement
    if ((lead.formSubmissions || 0) > 2) {
      score += 8;
    }

    // Recent high-value content downloads
    if ((lead.contentDownloads || 0) > 1) {
      score += 6;
    }

    // Webinar attendance shows education phase
    if ((lead.webinarAttendance || 0) > 0) {
      score += 5;
    }

    // Deal value indicates budget
    if (lead.dealValue && lead.dealValue > 0) {
      if (lead.dealValue > 50000) score += 15;
      else if (lead.dealValue > 10000) score += 10;
      else score += 5;
    }

    return Math.min(score, 25);
  }

  /**
   * Calculate letter grade based on score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate insights about the lead
   */
  private generateInsights(lead: LeadData, segments: ScoringResult['segments']): string[] {
    const insights: string[] = [];

    if (segments.firmographic > 80) {
      insights.push('Strong company profile - ideal customer fit');
    }

    if (segments.behavioral > 80) {
      insights.push('Highly engaged - showing strong buying signals');
    }

    if (segments.demographic < 40) {
      insights.push('Limited contact information - data enrichment needed');
    }

    if (segments.engagement < 30) {
      insights.push('Low recent activity - may need re-engagement');
    }

    if (lead.dealValue && lead.dealValue > 25000) {
      insights.push('High-value opportunity identified');
    }

    if (lead.leadSource === 'Referral') {
      insights.push('Referral lead - higher conversion probability');
    }

    if (segments.predictive > 75) {
      insights.push('AI model predicts high conversion likelihood');
    }

    return insights;
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendedActions(lead: LeadData, segments: ScoringResult['segments']): string[] {
    const actions: string[] = [];

    if (segments.demographic < 50) {
      actions.push('Enrich contact data through research or data services');
    }

    if (segments.behavioral > 70) {
      actions.push('Schedule immediate sales call - lead is highly engaged');
    }

    if (segments.engagement < 40) {
      actions.push('Launch re-engagement email sequence');
    }

    if (!lead.phone) {
      actions.push('Obtain phone number for direct outreach');
    }

    if (lead.jobTitle?.toLowerCase().includes('assistant') || 
        lead.jobTitle?.toLowerCase().includes('coordinator')) {
      actions.push('Identify decision maker within organization');
    }

    if (segments.firmographic > 80 && segments.behavioral > 60) {
      actions.push('Fast-track to sales team for immediate follow-up');
    }

    if ((lead.websiteVisits || 0) > 5) {
      actions.push('Send personalized demo invitation');
    }

    return actions;
  }

  /**
   * Calculate conversion probability
   */
  private calculateConversionProbability(totalScore: number, segments: ScoringResult['segments']): number {
    // Base probability from total score
    let probability = totalScore / 100;

    // Adjust based on segment strengths
    if (segments.behavioral > 80) probability *= 1.3;
    if (segments.firmographic > 80) probability *= 1.2;
    if (segments.predictive > 75) probability *= 1.25;

    // Historical conversion rate multiplier (would be data-driven)
    probability *= 0.15; // Assuming 15% base conversion rate

    return Math.min(Math.round(probability * 100), 95);
  }

  /**
   * Batch score multiple leads
   */
  async batchScoreLeads(leads: LeadData[]): Promise<Map<string, ScoringResult>> {
    const results = new Map<string, ScoringResult>();

    for (const lead of leads) {
      try {
        const score = await this.scoreLeadComprehensive(lead);
        results.set(lead.id, score);
      } catch (error) {
        console.error(`Error scoring lead ${lead.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Get scoring configuration
   */
  getConfig(): ScoringConfig {
    return { ...this.config };
  }

  /**
   * Update scoring configuration
   */
  updateConfig(updates: Partial<ScoringConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export default LeadScoringEngine;