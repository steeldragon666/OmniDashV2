import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import {
  TrendingUp, TrendingDown, Target, Users, DollarSign, Clock,
  Phone, Mail, Calendar, AlertCircle, CheckCircle2, Star,
  BarChart3, PieChart, Activity, Zap, Brain, Filter,
  ArrowRight, ExternalLink, RefreshCw, Settings
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  score: number;
  stage: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  value: number;
  source: string;
  lastActivity: Date;
  nextAction: string;
  assignee: string;
  tags: string[];
  aiInsights: {
    buyingIntent: number;
    riskScore: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
    predictedCloseDate: Date;
    winProbability: number;
  };
}

interface SalesMetrics {
  totalPipeline: number;
  monthlyRevenue: number;
  conversionRate: number;
  avgDealSize: number;
  salesCycle: number;
  activeLeads: number;
  qualifiedThisWeek: number;
  closedThisMonth: number;
  quota: number;
  quotaAttainment: number;
  forecastAccuracy: number;
}

interface SalesActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'demo' | 'proposal';
  leadId: string;
  leadName: string;
  description: string;
  outcome: 'completed' | 'scheduled' | 'missed' | 'cancelled';
  scheduledDate: Date;
  completedDate?: Date;
  notes?: string;
  nextSteps?: string;
}

interface AIRecommendation {
  id: string;
  type: 'follow_up' | 'pricing' | 'feature_highlight' | 'urgency' | 'competitor_response';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: string;
  actionItems: string[];
  dueDate: Date;
  confidence: number;
}

export function SalesAgent() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    totalPipeline: 487500,
    monthlyRevenue: 85200,
    conversionRate: 23.8,
    avgDealSize: 6750,
    salesCycle: 28,
    activeLeads: 142,
    qualifiedThisWeek: 12,
    closedThisMonth: 8,
    quota: 120000,
    quotaAttainment: 71,
    forecastAccuracy: 89
  });

  const [leads] = useState<Lead[]>([
    {
      id: '1',
      name: 'Sarah Chen',
      company: 'TechFlow Solutions',
      email: 'sarah.chen@techflow.com',
      phone: '+1-555-0123',
      score: 92,
      stage: 'proposal',
      value: 12500,
      source: 'LinkedIn',
      lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      nextAction: 'Follow up on pricing proposal',
      assignee: 'Alex Newton',
      tags: ['Enterprise', 'Hot Lead', 'Decision Maker'],
      aiInsights: {
        buyingIntent: 88,
        riskScore: 15,
        urgency: 'high',
        recommendations: [
          'Schedule demo with technical team',
          'Provide ROI calculator',
          'Address security concerns mentioned in last call'
        ],
        predictedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        winProbability: 78
      }
    },
    {
      id: '2',
      name: 'Mike Rodriguez',
      company: 'StartupCo Inc',
      email: 'mike@startupco.com',
      score: 76,
      stage: 'qualified',
      value: 4200,
      source: 'Website Form',
      lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      nextAction: 'Send product demo video',
      assignee: 'Jessica Wong',
      tags: ['SME', 'Budget Confirmed', 'Growing Fast'],
      aiInsights: {
        buyingIntent: 65,
        riskScore: 35,
        urgency: 'medium',
        recommendations: [
          'Focus on scalability benefits',
          'Offer startup discount program',
          'Connect with their technical lead'
        ],
        predictedCloseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        winProbability: 45
      }
    }
  ]);

  const [recommendations] = useState<AIRecommendation[]>([
    {
      id: '1',
      type: 'follow_up',
      priority: 'critical',
      title: 'High-Value Lead Going Cold',
      description: 'Sarah Chen from TechFlow Solutions hasn\'t responded in 48 hours after pricing proposal',
      expectedImpact: '+$12.5K potential revenue',
      actionItems: [
        'Send personalized follow-up email',
        'Offer limited-time discount',
        'Schedule executive meeting'
      ],
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      confidence: 94
    },
    {
      id: '2',
      type: 'pricing',
      priority: 'high',
      title: 'Optimize Pricing Strategy',
      description: 'AI analysis suggests 15% discount could close 3 pending deals worth $28K',
      expectedImpact: '+$23.8K net revenue gain',
      actionItems: [
        'Prepare discount proposal for qualified leads',
        'Create urgency with limited-time offer',
        'Track competitor pricing moves'
      ],
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      confidence: 87
    }
  ]);

  const getStageColor = (stage: Lead['stage']) => {
    const colors = {
      prospect: 'bg-gray-100 text-gray-800',
      qualified: 'bg-blue-100 text-blue-800',
      proposal: 'bg-yellow-100 text-yellow-800',
      negotiation: 'bg-orange-100 text-orange-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800'
    };
    return colors[stage];
  };

  const getPriorityColor = (priority: AIRecommendation['priority']) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[priority];
  };

  const calculatePipelineHealth = () => {
    const totalValue = leads.reduce((sum, lead) => sum + lead.value, 0);
    const qualifiedValue = leads
      .filter(lead => ['qualified', 'proposal', 'negotiation'].includes(lead.stage))
      .reduce((sum, lead) => sum + lead.value, 0);
    
    return {
      totalValue,
      qualifiedValue,
      healthScore: Math.round((qualifiedValue / totalValue) * 100),
      avgScore: Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length)
    };
  };

  const pipelineHealth = calculatePipelineHealth();

  return (
    <div className="space-y-6">
      {/* Sales Intelligence Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-blue-900">${(salesMetrics.totalPipeline / 1000).toFixed(0)}K</p>
                <p className="text-xs text-blue-700 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +12% vs last month
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-900">{salesMetrics.conversionRate}%</p>
                <p className="text-xs text-green-700 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +3.2% vs last quarter
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Deal Size</p>
                <p className="text-2xl font-bold text-purple-900">${(salesMetrics.avgDealSize / 1000).toFixed(1)}K</p>
                <p className="text-xs text-purple-700 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +8% growth trend
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Sales Cycle</p>
                <p className="text-2xl font-bold text-orange-900">{salesMetrics.salesCycle} days</p>
                <p className="text-xs text-orange-700 mt-1">
                  <TrendingDown className="h-3 w-3 inline mr-1" />
                  -5 days improved
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations Alert */}
      <Card className="border-l-4 border-l-red-500 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Brain className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Critical AI Alert</h4>
                <p className="text-sm text-red-800 mt-1">
                  High-value lead Sarah Chen is at risk of going cold. Immediate action recommended to secure $12.5K deal.
                </p>
              </div>
            </div>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              Take Action
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="leads">Lead Scoring</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="recommendations">AI Insights</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Sales Pipeline Overview
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pipeline Stages */}
                <div className="lg:col-span-2">
                  <div className="space-y-4">
                    {['prospect', 'qualified', 'proposal', 'negotiation'].map(stage => {
                      const stageLeads = leads.filter(lead => lead.stage === stage);
                      const stageValue = stageLeads.reduce((sum, lead) => sum + lead.value, 0);
                      
                      return (
                        <div key={stage} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold capitalize">{stage.replace('_', ' ')}</h4>
                            <div className="text-right">
                              <p className="font-bold">${(stageValue / 1000).toFixed(0)}K</p>
                              <p className="text-sm text-gray-600">{stageLeads.length} deals</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {stageLeads.map(lead => (
                              <div
                                key={lead.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                                onClick={() => setSelectedLead(lead)}
                              >
                                <div>
                                  <p className="font-medium">{lead.name} - {lead.company}</p>
                                  <p className="text-sm text-gray-600">${lead.value.toLocaleString()}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getPriorityColor(lead.aiInsights.urgency)}>
                                    {lead.aiInsights.urgency}
                                  </Badge>
                                  <ArrowRight className="h-4 w-4 text-gray-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pipeline Health */}
                <div>
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-100">
                    <CardHeader>
                      <CardTitle className="text-lg">Pipeline Health</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Health Score</span>
                          <span>{pipelineHealth.healthScore}%</span>
                        </div>
                        <Progress value={pipelineHealth.healthScore} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Quality Score</span>
                          <span>{pipelineHealth.avgScore}</span>
                        </div>
                        <Progress value={pipelineHealth.avgScore} className="h-2" />
                      </div>

                      <div className="pt-4 border-t">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Pipeline</span>
                            <span className="font-semibold">${(pipelineHealth.totalValue / 1000).toFixed(0)}K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Qualified Value</span>
                            <span className="font-semibold text-green-600">${(pipelineHealth.qualifiedValue / 1000).toFixed(0)}K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Forecast Accuracy</span>
                            <span className="font-semibold">{salesMetrics.forecastAccuracy}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                AI-Powered Lead Scoring
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Scoring Rules
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leads
                  .sort((a, b) => b.score - a.score)
                  .map(lead => (
                    <div key={lead.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold">{lead.name}</h4>
                            <Badge className={getStageColor(lead.stage)}>
                              {lead.stage.replace('_', ' ')}
                            </Badge>
                            <Badge 
                              className={`${lead.score >= 80 ? 'bg-green-100 text-green-800' : 
                                lead.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'}`}
                            >
                              Score: {lead.score}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-gray-600">Company</p>
                              <p className="font-medium">{lead.company}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Deal Value</p>
                              <p className="font-medium">${lead.value.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Source</p>
                              <p className="font-medium">{lead.source}</p>
                            </div>
                          </div>

                          {/* AI Insights */}
                          <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <h5 className="font-semibold text-blue-900 mb-2 flex items-center">
                              <Brain className="h-4 w-4 mr-2" />
                              AI Insights
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-blue-700">Buying Intent:</span>
                                <div className="flex items-center mt-1">
                                  <Progress value={lead.aiInsights.buyingIntent} className="h-2 flex-1 mr-2" />
                                  <span className="font-medium">{lead.aiInsights.buyingIntent}%</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-blue-700">Win Probability:</span>
                                <div className="flex items-center mt-1">
                                  <Progress value={lead.aiInsights.winProbability} className="h-2 flex-1 mr-2" />
                                  <span className="font-medium">{lead.aiInsights.winProbability}%</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-blue-700">Predicted Close:</span>
                                <p className="font-medium mt-1">
                                  {lead.aiInsights.predictedCloseDate.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Recommendations */}
                          <div className="space-y-2">
                            <h6 className="font-medium text-gray-900">AI Recommendations:</h6>
                            {lead.aiInsights.recommendations.slice(0, 2).map((rec, idx) => (
                              <div key={idx} className="flex items-center text-sm text-gray-700">
                                <Zap className="h-3 w-3 text-yellow-500 mr-2 flex-shrink-0" />
                                {rec}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-blue-600" />
                AI-Powered Sales Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map(rec => (
                  <div key={rec.id} className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">{rec.title}</h4>
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority} Priority
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">{rec.description}</p>
                        <p className="text-sm font-medium text-green-700">{rec.expectedImpact}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Confidence</div>
                        <div className="text-lg font-bold">{rec.confidence}%</div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h5 className="font-medium mb-2">Recommended Actions:</h5>
                      <ul className="space-y-1">
                        {rec.actionItems.map((item, idx) => (
                          <li key={idx} className="flex items-center text-sm">
                            <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Due: {rec.dueDate.toLocaleDateString()}
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        Execute Recommendation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-green-700 font-medium">This Month Projection</span>
                      <span className="text-2xl font-bold text-green-900">${(salesMetrics.monthlyRevenue / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Quota: ${(salesMetrics.quota / 1000).toFixed(0)}K</span>
                      <span>Attainment: {salesMetrics.quotaAttainment}%</span>
                    </div>
                    <Progress value={salesMetrics.quotaAttainment} className="h-2 mt-2" />
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-medium">Deal Probability Analysis</h5>
                    {leads.filter(lead => ['proposal', 'negotiation'].includes(lead.stage)).map(lead => (
                      <div key={lead.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-sm">{lead.company}</p>
                          <p className="text-xs text-gray-600">${lead.value.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{lead.aiInsights.winProbability}%</p>
                          <p className="text-xs text-gray-600">
                            ${Math.round(lead.value * lead.aiInsights.winProbability / 100).toLocaleString()} exp.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{salesMetrics.activeLeads}</div>
                      <div className="text-sm text-blue-700">Active Leads</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{salesMetrics.qualifiedThisWeek}</div>
                      <div className="text-sm text-green-700">Qualified This Week</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-medium">Key Insights</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center p-2 bg-yellow-50 rounded">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                        <span>3 high-value deals require immediate attention</span>
                      </div>
                      <div className="flex items-center p-2 bg-green-50 rounded">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                        <span>Conversion rate improved 15% this quarter</span>
                      </div>
                      <div className="flex items-center p-2 bg-blue-50 rounded">
                        <Star className="h-4 w-4 text-blue-600 mr-2" />
                        <span>LinkedIn generating highest quality leads</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Forecast Accuracy</span>
                      <span className="font-semibold">{salesMetrics.forecastAccuracy}%</span>
                    </div>
                    <Progress value={salesMetrics.forecastAccuracy} className="h-2" />
                    <p className="text-xs text-gray-600 mt-1">
                      Based on last 6 months performance
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
