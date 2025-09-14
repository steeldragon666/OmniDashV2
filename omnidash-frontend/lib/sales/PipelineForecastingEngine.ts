/**
 * AI-Powered Pipeline Forecasting Engine
 * Predicts sales outcomes using historical data and machine learning algorithms
 */

export interface Deal {
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  closeDate: string;
  createdDate: string;
  lastModifiedDate: string;
  leadSource?: string;
  accountId?: string;
  contactId?: string;
  ownerId?: string;
  
  // Historical stage progression
  stageHistory: StageChange[];
  
  // Engagement metrics
  emailsSent?: number;
  emailsOpened?: number;
  callsMade?: number;
  meetingsHeld?: number;
  proposalsSent?: number;
  
  // External factors
  competitorPresence?: boolean;
  economicFactors?: number; // -1 to 1 scale
  seasonality?: number; // -1 to 1 scale
}

export interface StageChange {
  fromStage: string;
  toStage: string;
  timestamp: string;
  daysInPreviousStage: number;
}

export interface ForecastResult {
  period: string;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  predictedClosedWon: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  riskAdjustedForecast: number;
  
  // Breakdown by categories
  byStage: Record<string, ForecastStageData>;
  byOwner: Record<string, ForecastOwnerData>;
  bySource: Record<string, number>;
  
  // Insights and recommendations
  insights: string[];
  riskFactors: string[];
  recommendations: string[];
  
  // Accuracy metrics
  historicalAccuracy?: number;
  lastPeriodVariance?: number;
}

export interface ForecastStageData {
  dealsCount: number;
  totalValue: number;
  averageValue: number;
  averageDaysInStage: number;
  conversionProbability: number;
  predictedCloseValue: number;
}

export interface ForecastOwnerData {
  dealsCount: number;
  totalValue: number;
  historicalCloseRate: number;
  predictedCloseValue: number;
  performanceScore: number;
}

export interface ForecastConfig {
  // Time periods
  forecastPeriods: ('month' | 'quarter' | 'year')[];
  
  // Weighting factors
  stageWeights: Record<string, number>;
  
  // AI model parameters
  modelConfig: {
    lookbackPeriodDays: number;
    minimumHistoricalDeals: number;
    seasonalityFactors: Record<string, number>;
    economicFactors: {
      gdpImpact: number;
      industryGrowth: number;
      marketConditions: number;
    };
  };
  
  // Risk adjustment factors
  riskFactors: {
    competitorPresence: number;
    longSalesCycle: number;
    lowEngagement: number;
    economicDownturn: number;
  };
}

class PipelineForecastingEngine {
  private config: ForecastConfig;
  private historicalData: Deal[] = [];

  constructor(config?: Partial<ForecastConfig>) {
    this.config = {
      forecastPeriods: ['month', 'quarter', 'year'],
      stageWeights: {
        'Prospecting': 0.1,
        'Qualification': 0.2,
        'Needs Analysis': 0.3,
        'Proposal': 0.6,
        'Negotiation': 0.8,
        'Closed Won': 1.0,
        'Closed Lost': 0.0,
      },
      modelConfig: {
        lookbackPeriodDays: 365,
        minimumHistoricalDeals: 50,
        seasonalityFactors: {
          'Q1': 0.9,
          'Q2': 1.1,
          'Q3': 0.8,
          'Q4': 1.4,
        },
        economicFactors: {
          gdpImpact: 0.05,
          industryGrowth: 0.08,
          marketConditions: 0.03,
        },
      },
      riskFactors: {
        competitorPresence: 0.15,
        longSalesCycle: 0.10,
        lowEngagement: 0.20,
        economicDownturn: 0.25,
      },
      ...config,
    };
  }

  /**
   * Load historical deal data for training
   */
  async loadHistoricalData(deals: Deal[]): Promise<void> {
    this.historicalData = deals.filter(deal => 
      new Date(deal.createdDate) >= new Date(Date.now() - this.config.modelConfig.lookbackPeriodDays * 24 * 60 * 60 * 1000)
    );
  }

  /**
   * Generate forecast for specified period
   */
  async generateForecast(
    currentDeals: Deal[], 
    period: 'month' | 'quarter' | 'year'
  ): Promise<ForecastResult> {
    // Calculate period boundaries
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, period);
    
    // Filter deals that could close in this period
    const relevantDeals = currentDeals.filter(deal => 
      new Date(deal.closeDate) <= periodEnd && 
      !['Closed Won', 'Closed Lost'].includes(deal.stage)
    );

    // Calculate basic metrics
    const totalPipelineValue = relevantDeals.reduce((sum, deal) => sum + deal.value, 0);
    const weightedPipelineValue = relevantDeals.reduce((sum, deal) => 
      sum + (deal.value * (deal.probability / 100)), 0
    );

    // AI-enhanced predictions
    const aiPredictions = await this.generateAIPredictions(relevantDeals, period);
    const riskAdjustments = this.calculateRiskAdjustments(relevantDeals);
    
    const predictedClosedWon = aiPredictions.predictedValue;
    const riskAdjustedForecast = predictedClosedWon * (1 - riskAdjustments.totalRiskFactor);

    // Generate breakdowns
    const byStage = this.generateStageBreakdown(relevantDeals);
    const byOwner = await this.generateOwnerBreakdown(relevantDeals);
    const bySource = this.generateSourceBreakdown(relevantDeals);

    // Calculate confidence intervals
    const confidenceInterval = this.calculateConfidenceInterval(predictedClosedWon, relevantDeals.length);

    // Generate insights and recommendations
    const insights = this.generateInsights(relevantDeals, aiPredictions, riskAdjustments);
    const riskFactors = this.identifyRiskFactors(relevantDeals, riskAdjustments);
    const recommendations = this.generateRecommendations(relevantDeals, aiPredictions);

    // Historical accuracy
    const historicalAccuracy = await this.calculateHistoricalAccuracy(period);

    return {
      period,
      totalPipelineValue,
      weightedPipelineValue,
      predictedClosedWon,
      confidenceInterval,
      riskAdjustedForecast,
      byStage,
      byOwner,
      bySource,
      insights,
      riskFactors,
      recommendations,
      historicalAccuracy,
    };
  }

  /**
   * Generate AI-enhanced predictions using multiple algorithms
   */
  private async generateAIPredictions(
    deals: Deal[], 
    period: 'month' | 'quarter' | 'year'
  ): Promise<{
    predictedValue: number;
    individualPredictions: Array<{ dealId: string; probability: number; predictedValue: number }>;
    modelConfidence: number;
  }> {
    const individualPredictions: Array<{ dealId: string; probability: number; predictedValue: number }> = [];
    let totalPredictedValue = 0;

    for (const deal of deals) {
      // Multi-factor probability calculation
      const stageProbability = this.calculateStageProbability(deal);
      const timeProbability = this.calculateTimeProbability(deal, period);
      const engagementProbability = this.calculateEngagementProbability(deal);
      const historicalProbability = this.calculateHistoricalProbability(deal);
      const seasonalityFactor = this.calculateSeasonalityFactor(deal.closeDate);

      // Weighted ensemble prediction
      const enhancedProbability = (
        stageProbability * 0.3 +
        timeProbability * 0.2 +
        engagementProbability * 0.2 +
        historicalProbability * 0.2 +
        deal.probability * 0.1
      ) * seasonalityFactor;

      const predictedValue = deal.value * (enhancedProbability / 100);
      
      individualPredictions.push({
        dealId: deal.id,
        probability: enhancedProbability,
        predictedValue,
      });

      totalPredictedValue += predictedValue;
    }

    // Calculate model confidence based on historical accuracy and data quality
    const modelConfidence = this.calculateModelConfidence(deals);

    return {
      predictedValue: totalPredictedValue,
      individualPredictions,
      modelConfidence,
    };
  }

  /**
   * Calculate probability based on stage progression patterns
   */
  private calculateStageProbability(deal: Deal): number {
    const baseStageWeight = this.config.stageWeights[deal.stage] || 0.5;
    
    // Analyze stage progression velocity
    if (deal.stageHistory.length > 1) {
      const recentProgression = deal.stageHistory.slice(-2);
      const avgTimeInStage = recentProgression.reduce((sum, change) => 
        sum + change.daysInPreviousStage, 0) / recentProgression.length;
      
      // Deals moving quickly through stages have higher probability
      if (avgTimeInStage < 14) return Math.min(baseStageWeight * 100 * 1.2, 100);
      if (avgTimeInStage > 60) return baseStageWeight * 100 * 0.8;
    }

    return baseStageWeight * 100;
  }

  /**
   * Calculate probability based on time factors
   */
  private calculateTimeProbability(deal: Deal, period: 'month' | 'quarter' | 'year'): number {
    const closeDate = new Date(deal.closeDate);
    const now = new Date();
    const daysToClose = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    // Deals closing sooner have higher probability within the period
    const periodDays = period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
    
    if (daysToClose <= 0) return 95; // Past due - likely to close soon
    if (daysToClose <= periodDays * 0.3) return 85;
    if (daysToClose <= periodDays * 0.6) return 70;
    if (daysToClose <= periodDays) return 50;
    return 25; // Beyond period
  }

  /**
   * Calculate probability based on engagement metrics
   */
  private calculateEngagementProbability(deal: Deal): number {
    let score = 50; // Base score

    // Email engagement
    if (deal.emailsSent && deal.emailsOpened) {
      const openRate = deal.emailsOpened / deal.emailsSent;
      score += openRate * 20;
    }

    // Activity levels
    if (deal.callsMade && deal.callsMade > 0) score += Math.min(deal.callsMade * 3, 15);
    if (deal.meetingsHeld && deal.meetingsHeld > 0) score += Math.min(deal.meetingsHeld * 5, 20);
    if (deal.proposalsSent && deal.proposalsSent > 0) score += Math.min(deal.proposalsSent * 8, 15);

    return Math.min(score, 100);
  }

  /**
   * Calculate probability based on historical patterns
   */
  private calculateHistoricalProbability(deal: Deal): number {
    if (this.historicalData.length < this.config.modelConfig.minimumHistoricalDeals) {
      return 50; // Default if insufficient data
    }

    // Find similar deals in historical data
    const similarDeals = this.historicalData.filter(historicalDeal =>
      historicalDeal.stage === deal.stage &&
      Math.abs(historicalDeal.value - deal.value) / deal.value < 0.5 && // Within 50% value range
      historicalDeal.leadSource === deal.leadSource
    );

    if (similarDeals.length < 5) return 50; // Insufficient similar deals

    // Calculate historical success rate
    const wonDeals = similarDeals.filter(d => d.stage === 'Closed Won').length;
    const lostDeals = similarDeals.filter(d => d.stage === 'Closed Lost').length;
    const totalClosed = wonDeals + lostDeals;

    if (totalClosed === 0) return 50;

    return (wonDeals / totalClosed) * 100;
  }

  /**
   * Calculate seasonality factor
   */
  private calculateSeasonalityFactor(closeDate: string): number {
    const date = new Date(closeDate);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const quarterKey = `Q${quarter}`;
    
    return this.config.modelConfig.seasonalityFactors[quarterKey] || 1.0;
  }

  /**
   * Calculate risk adjustments
   */
  private calculateRiskAdjustments(deals: Deal[]): {
    totalRiskFactor: number;
    riskBreakdown: Record<string, number>;
  } {
    let totalRisk = 0;
    const riskBreakdown: Record<string, number> = {};

    // Competitor presence risk
    const competitorDeals = deals.filter(d => d.competitorPresence);
    if (competitorDeals.length > 0) {
      const competitorRisk = (competitorDeals.length / deals.length) * this.config.riskFactors.competitorPresence;
      totalRisk += competitorRisk;
      riskBreakdown.competitorPresence = competitorRisk;
    }

    // Long sales cycle risk
    const now = Date.now();
    const longCycleDeals = deals.filter(d => {
      const daysSinceCreated = (now - new Date(d.createdDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated > 180; // 6+ months
    });
    
    if (longCycleDeals.length > 0) {
      const longCycleRisk = (longCycleDeals.length / deals.length) * this.config.riskFactors.longSalesCycle;
      totalRisk += longCycleRisk;
      riskBreakdown.longSalesCycle = longCycleRisk;
    }

    // Low engagement risk
    const lowEngagementDeals = deals.filter(d => 
      (d.emailsOpened || 0) < 2 && (d.meetingsHeld || 0) < 1
    );
    
    if (lowEngagementDeals.length > 0) {
      const lowEngagementRisk = (lowEngagementDeals.length / deals.length) * this.config.riskFactors.lowEngagement;
      totalRisk += lowEngagementRisk;
      riskBreakdown.lowEngagement = lowEngagementRisk;
    }

    return {
      totalRiskFactor: Math.min(totalRisk, 0.5), // Cap at 50% risk
      riskBreakdown,
    };
  }

  /**
   * Generate stage breakdown
   */
  private generateStageBreakdown(deals: Deal[]): Record<string, ForecastStageData> {
    const stageBreakdown: Record<string, ForecastStageData> = {};

    // Group deals by stage
    const dealsByStage = deals.reduce((acc, deal) => {
      if (!acc[deal.stage]) acc[deal.stage] = [];
      acc[deal.stage].push(deal);
      return acc;
    }, {} as Record<string, Deal[]>);

    // Calculate metrics for each stage
    Object.entries(dealsByStage).forEach(([stage, stageDeals]) => {
      const totalValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);
      const averageValue = totalValue / stageDeals.length;
      
      // Calculate average days in current stage
      const now = Date.now();
      const averageDaysInStage = stageDeals.reduce((sum, deal) => {
        const lastStageChange = deal.stageHistory[deal.stageHistory.length - 1];
        const daysInStage = lastStageChange ? 
          (now - new Date(lastStageChange.timestamp).getTime()) / (1000 * 60 * 60 * 24) : 0;
        return sum + daysInStage;
      }, 0) / stageDeals.length;

      // Historical conversion probability for this stage
      const conversionProbability = this.calculateStageConversionRate(stage);
      
      stageBreakdown[stage] = {
        dealsCount: stageDeals.length,
        totalValue,
        averageValue,
        averageDaysInStage,
        conversionProbability,
        predictedCloseValue: totalValue * (conversionProbability / 100),
      };
    });

    return stageBreakdown;
  }

  /**
   * Generate owner breakdown
   */
  private async generateOwnerBreakdown(deals: Deal[]): Promise<Record<string, ForecastOwnerData>> {
    const ownerBreakdown: Record<string, ForecastOwnerData> = {};

    // Group deals by owner
    const dealsByOwner = deals.reduce((acc, deal) => {
      const ownerId = deal.ownerId || 'Unassigned';
      if (!acc[ownerId]) acc[ownerId] = [];
      acc[ownerId].push(deal);
      return acc;
    }, {} as Record<string, Deal[]>);

    // Calculate metrics for each owner
    for (const [ownerId, ownerDeals] of Object.entries(dealsByOwner)) {
      const totalValue = ownerDeals.reduce((sum, deal) => sum + deal.value, 0);
      const historicalCloseRate = await this.calculateOwnerHistoricalCloseRate(ownerId);
      const performanceScore = this.calculateOwnerPerformanceScore(ownerId, ownerDeals);
      
      ownerBreakdown[ownerId] = {
        dealsCount: ownerDeals.length,
        totalValue,
        historicalCloseRate,
        predictedCloseValue: totalValue * (historicalCloseRate / 100),
        performanceScore,
      };
    }

    return ownerBreakdown;
  }

  /**
   * Generate source breakdown
   */
  private generateSourceBreakdown(deals: Deal[]): Record<string, number> {
    const sourceBreakdown: Record<string, number> = {};

    deals.forEach(deal => {
      const source = deal.leadSource || 'Unknown';
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + deal.value;
    });

    return sourceBreakdown;
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidenceInterval(predictedValue: number, sampleSize: number): {
    low: number;
    high: number;
  } {
    // Use statistical methods to calculate confidence interval
    // This is a simplified version - would use historical variance in production
    const confidenceLevel = 0.95;
    const standardError = predictedValue * 0.2; // 20% standard error assumption
    const marginOfError = 1.96 * standardError; // 95% confidence interval

    return {
      low: Math.max(0, predictedValue - marginOfError),
      high: predictedValue + marginOfError,
    };
  }

  // Helper methods
  private calculatePeriodEnd(start: Date, period: 'month' | 'quarter' | 'year'): Date {
    const end = new Date(start);
    switch (period) {
      case 'month':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarter':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'year':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }

  private calculateModelConfidence(deals: Deal[]): number {
    // Base confidence on data quality and quantity
    let confidence = 50;
    
    if (deals.length > 20) confidence += 20;
    if (deals.length > 50) confidence += 10;
    
    // Check data completeness
    const completeDeals = deals.filter(d => 
      d.stageHistory.length > 0 && d.value > 0 && d.closeDate
    );
    confidence += (completeDeals.length / deals.length) * 20;
    
    return Math.min(confidence, 95);
  }

  private calculateStageConversionRate(stage: string): number {
    if (this.historicalData.length === 0) return this.config.stageWeights[stage] * 100 || 50;
    
    const stageDeals = this.historicalData.filter(d => d.stage === stage);
    if (stageDeals.length < 5) return this.config.stageWeights[stage] * 100 || 50;
    
    const wonDeals = stageDeals.filter(d => d.stage === 'Closed Won').length;
    return (wonDeals / stageDeals.length) * 100;
  }

  private async calculateOwnerHistoricalCloseRate(ownerId: string): Promise<number> {
    const ownerDeals = this.historicalData.filter(d => d.ownerId === ownerId);
    if (ownerDeals.length < 5) return 50; // Default if insufficient data
    
    const closedDeals = ownerDeals.filter(d => ['Closed Won', 'Closed Lost'].includes(d.stage));
    const wonDeals = ownerDeals.filter(d => d.stage === 'Closed Won');
    
    return closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 50;
  }

  private calculateOwnerPerformanceScore(ownerId: string, currentDeals: Deal[]): number {
    // Simplified performance scoring based on deal progression and engagement
    let score = 50;
    
    const avgEngagement = currentDeals.reduce((sum, deal) => 
      sum + ((deal.emailsSent || 0) + (deal.callsMade || 0) + (deal.meetingsHeld || 0)), 0
    ) / currentDeals.length;
    
    score += Math.min(avgEngagement * 2, 30);
    
    return Math.min(score, 100);
  }

  private async calculateHistoricalAccuracy(period: 'month' | 'quarter' | 'year'): Promise<number> {
    // Would compare historical forecasts to actual results
    // Return a percentage accuracy score
    return 75; // Placeholder
  }

  private generateInsights(deals: Deal[], predictions: any, riskAdjustments: any): string[] {
    const insights: string[] = [];
    
    if (predictions.modelConfidence > 80) {
      insights.push('High confidence in forecast accuracy based on historical patterns');
    }
    
    if (riskAdjustments.totalRiskFactor > 0.3) {
      insights.push('Significant risk factors identified - consider risk mitigation strategies');
    }
    
    const highValueDeals = deals.filter(d => d.value > 50000);
    if (highValueDeals.length > 0) {
      insights.push(`${highValueDeals.length} high-value deals in pipeline - focus on these opportunities`);
    }
    
    return insights;
  }

  private identifyRiskFactors(deals: Deal[], riskAdjustments: any): string[] {
    const risks: string[] = [];
    
    Object.entries(riskAdjustments.riskBreakdown).forEach(([risk, value]) => {
      if (value > 0.1) {
        risks.push(`${risk}: ${Math.round(value * 100)}% risk impact`);
      }
    });
    
    return risks;
  }

  private generateRecommendations(deals: Deal[], predictions: any): string[] {
    const recommendations: string[] = [];
    
    const stuckDeals = deals.filter(d => {
      const lastChange = d.stageHistory[d.stageHistory.length - 1];
      const daysSinceChange = lastChange ? 
        (Date.now() - new Date(lastChange.timestamp).getTime()) / (1000 * 60 * 60 * 24) : 0;
      return daysSinceChange > 30;
    });
    
    if (stuckDeals.length > 0) {
      recommendations.push(`${stuckDeals.length} deals haven't progressed in 30+ days - requires attention`);
    }
    
    recommendations.push('Focus on high-probability deals in Proposal and Negotiation stages');
    recommendations.push('Increase engagement activities for deals with low interaction scores');
    
    return recommendations;
  }
}

export default PipelineForecastingEngine;