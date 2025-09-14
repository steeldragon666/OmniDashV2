import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  User, Users, MessageSquare, Phone, Mail, Calendar, Clock,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  LifeBuoy, Heart, Star, Target, Brain, Zap, Filter,
  ArrowUp, ArrowDown, RefreshCw, Plus, Search, Send,
  ThumbsUp, ThumbsDown, Award, Shield, Activity,
  DollarSign, BarChart3, PieChart, LineChart
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  avatar?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  status: 'active' | 'at_risk' | 'churned' | 'new';
  ltv: number;
  mrr: number;
  joinDate: Date;
  lastActivity: Date;
  healthScore: number;
  satisfactionScore: number;
  supportTickets: number;
  totalSpent: number;
  contractEnd?: Date;
  churnRisk: number;
  tags: string[];
  assignedCSM: string;
  preferences: {
    communicationChannel: 'email' | 'phone' | 'chat' | 'slack';
    timezone: string;
    language: string;
  };
  interactions: CustomerInteraction[];
  aiInsights: {
    churnPrediction: number;
    upsellPotential: number;
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
    keyRiskFactors: string[];
    recommendations: string[];
    nextBestAction: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  };
}

interface CustomerInteraction {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'support_ticket' | 'chat' | 'survey';
  date: Date;
  summary: string;
  outcome: 'positive' | 'neutral' | 'negative';
  actionItems: string[];
  nextFollowUp?: Date;
  tags: string[];
}

interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'onboarding';
  createdDate: Date;
  lastUpdated: Date;
  assignedAgent: string;
  resolutionTime?: number;
  satisfactionRating?: number;
  aiSuggestions: {
    suggestedResponse: string;
    similarTickets: string[];
    escalationRisk: number;
    estimatedResolutionTime: number;
    knowledgeBaseArticles: string[];
  };
}

interface HealthScoreMetric {
  metric: string;
  weight: number;
  score: number;
  trend: 'up' | 'down' | 'stable';
  impact: string;
}

export function CRMAgent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');

  const [customers] = useState<Customer[]>([
    {
      id: '1',
      name: 'Sarah Chen',
      email: 'sarah.chen@techflow.com',
      company: 'TechFlow Solutions',
      phone: '+1-555-0123',
      tier: 'gold',
      status: 'at_risk',
      ltv: 45000,
      mrr: 2500,
      joinDate: new Date('2023-03-15'),
      lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      healthScore: 65,
      satisfactionScore: 7.2,
      supportTickets: 3,
      totalSpent: 28500,
      contractEnd: new Date('2024-12-31'),
      churnRisk: 72,
      tags: ['Enterprise', 'High Value', 'Technical User'],
      assignedCSM: 'Alex Newton',
      preferences: {
        communicationChannel: 'email',
        timezone: 'PST',
        language: 'English'
      },
      interactions: [],
      aiInsights: {
        churnPrediction: 72,
        upsellPotential: 35,
        engagementTrend: 'decreasing',
        keyRiskFactors: [
          'Decreased feature usage by 40%',
          'No login activity in 7 days',
          'Recent support tickets unresolved'
        ],
        recommendations: [
          'Schedule immediate check-in call',
          'Offer technical training session',
          'Provide dedicated support channel'
        ],
        nextBestAction: 'Proactive outreach within 24 hours',
        sentiment: 'negative'
      }
    },
    {
      id: '2',
      name: 'Mike Rodriguez',
      email: 'mike@startupco.com',
      company: 'StartupCo Inc',
      tier: 'silver',
      status: 'active',
      ltv: 18000,
      mrr: 1200,
      joinDate: new Date('2024-01-10'),
      lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      healthScore: 88,
      satisfactionScore: 9.1,
      supportTickets: 1,
      totalSpent: 8400,
      churnRisk: 15,
      tags: ['Startup', 'Growing', 'Power User'],
      assignedCSM: 'Jessica Wong',
      preferences: {
        communicationChannel: 'chat',
        timezone: 'EST',
        language: 'English'
      },
      interactions: [],
      aiInsights: {
        churnPrediction: 15,
        upsellPotential: 85,
        engagementTrend: 'increasing',
        keyRiskFactors: [],
        recommendations: [
          'Introduce premium features',
          'Discuss team expansion plans',
          'Offer referral program'
        ],
        nextBestAction: 'Present upgrade opportunity',
        sentiment: 'positive'
      }
    }
  ]);

  const [tickets] = useState<SupportTicket[]>([
    {
      id: 'T-001',
      customerId: '1',
      customerName: 'Sarah Chen',
      title: 'API Integration Issues',
      description: 'Having trouble with webhook configuration for our production environment.',
      priority: 'high',
      status: 'in_progress',
      category: 'technical',
      createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000),
      assignedAgent: 'Tom Wilson',
      aiSuggestions: {
        suggestedResponse: 'Based on similar issues, check the webhook endpoint URL configuration and ensure proper authentication headers are included.',
        similarTickets: ['T-089', 'T-156', 'T-201'],
        escalationRisk: 78,
        estimatedResolutionTime: 6,
        knowledgeBaseArticles: ['API Setup Guide', 'Webhook Troubleshooting', 'Production Environment Best Practices']
      }
    },
    {
      id: 'T-002',
      customerId: '2',
      customerName: 'Mike Rodriguez',
      title: 'Feature Request: Bulk Operations',
      description: 'Would love to see bulk operations for data import/export to save time.',
      priority: 'medium',
      status: 'open',
      category: 'feature_request',
      createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      assignedAgent: 'Sarah Kim',
      aiSuggestions: {
        suggestedResponse: 'Thank you for the suggestion! This aligns with our Q2 roadmap. Let me connect you with our product team for more details.',
        similarTickets: ['T-134', 'T-267'],
        escalationRisk: 20,
        estimatedResolutionTime: 72,
        knowledgeBaseArticles: ['Product Roadmap', 'Feature Request Process']
      }
    }
  ]);

  const getCustomersByRisk = () => {
    return {
      high: customers.filter(c => c.churnRisk >= 70).length,
      medium: customers.filter(c => c.churnRisk >= 40 && c.churnRisk < 70).length,
      low: customers.filter(c => c.churnRisk < 40).length
    };
  };

  const getHealthScoreMetrics = (customer: Customer): HealthScoreMetric[] => [
    {
      metric: 'Product Usage',
      weight: 30,
      score: customer.status === 'at_risk' ? 45 : 85,
      trend: customer.aiInsights.engagementTrend === 'decreasing' ? 'down' : 'up',
      impact: 'Critical for retention'
    },
    {
      metric: 'Support Satisfaction',
      weight: 25,
      score: Math.round(customer.satisfactionScore * 10),
      trend: 'stable',
      impact: 'Affects overall experience'
    },
    {
      metric: 'Feature Adoption',
      weight: 20,
      score: customer.tier === 'gold' ? 78 : 65,
      trend: 'up',
      impact: 'Drives value realization'
    },
    {
      metric: 'Support Tickets',
      weight: 15,
      score: Math.max(0, 100 - (customer.supportTickets * 20)),
      trend: customer.supportTickets > 2 ? 'down' : 'stable',
      impact: 'Indicates friction points'
    },
    {
      metric: 'Payment History',
      weight: 10,
      score: 95,
      trend: 'stable',
      impact: 'Financial health indicator'
    }
  ];

  const getTierColor = (tier: Customer['tier']) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800 border-amber-200',
      silver: 'bg-gray-100 text-gray-800 border-gray-200',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      platinum: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[tier];
  };

  const getStatusColor = (status: Customer['status']) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      at_risk: 'bg-red-100 text-red-800 border-red-200',
      churned: 'bg-gray-100 text-gray-800 border-gray-200',
      new: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[status];
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority];
  };

  const riskDistribution = getCustomersByRisk();
  const totalCustomers = customers.length;
  const totalMRR = customers.reduce((sum, c) => sum + c.mrr, 0);
  const avgHealthScore = Math.round(customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length);
  const atRiskCustomers = customers.filter(c => c.status === 'at_risk').length;

  return (
    <div className="space-y-6">
      {/* CRM Overview Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Customers</p>
                <p className="text-2xl font-bold text-blue-900">{totalCustomers}</p>
                <p className="text-xs text-blue-700 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +8 this month
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-900">${(totalMRR / 1000).toFixed(0)}K</p>
                <p className="text-xs text-green-700 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +12% growth
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Health Score</p>
                <p className="text-2xl font-bold text-purple-900">{avgHealthScore}</p>
                <p className="text-xs text-purple-700 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +5 points improved
                </p>
              </div>
              <Heart className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">At Risk Customers</p>
                <p className="text-2xl font-bold text-orange-900">{atRiskCustomers}</p>
                <p className="text-xs text-orange-700 mt-1">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Needs attention
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Alert for At-Risk Customers */}
      {atRiskCustomers > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Brain className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">Critical Customer Alert</h4>
                  <p className="text-sm text-red-800 mt-1">
                    {atRiskCustomers} high-value customer{atRiskCustomers > 1 ? 's' : ''} at risk of churning. 
                    Immediate intervention recommended to prevent ${customers.filter(c => c.status === 'at_risk').reduce((sum, c) => sum + c.mrr * 12, 0).toLocaleString()} annual revenue loss.
                  </p>
                </div>
              </div>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                View At-Risk
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="health">Health Scores</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Churn Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  Churn Risk Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">High Risk (70%+)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{riskDistribution.high}</span>
                      <div className="text-xs text-gray-500">customers</div>
                    </div>
                  </div>
                  <Progress value={(riskDistribution.high / totalCustomers) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Medium Risk (40-69%)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{riskDistribution.medium}</span>
                      <div className="text-xs text-gray-500">customers</div>
                    </div>
                  </div>
                  <Progress value={(riskDistribution.medium / totalCustomers) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Low Risk (&lt;40%)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{riskDistribution.low}</span>
                      <div className="text-xs text-gray-500">customers</div>
                    </div>
                  </div>
                  <Progress value={(riskDistribution.low / totalCustomers) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Support Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LifeBuoy className="h-5 w-5 mr-2 text-blue-500" />
                  Recent Support Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tickets.slice(0, 3).map(ticket => (
                    <div key={ticket.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{ticket.title}</p>
                          <p className="text-xs text-gray-600">{ticket.customerName}</p>
                        </div>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{ticket.id}</span>
                        <span>{ticket.createdDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Tickets
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Customer Tier Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Tier Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['platinum', 'gold', 'silver', 'bronze'].map(tier => {
                  const tierCustomers = customers.filter(c => c.tier === tier);
                  const tierRevenue = tierCustomers.reduce((sum, c) => sum + c.mrr, 0);
                  const avgHealth = tierCustomers.length > 0 ? Math.round(tierCustomers.reduce((sum, c) => sum + c.healthScore, 0) / tierCustomers.length) : 0;

                  return (
                    <div key={tier} className="text-center p-4 border rounded-lg">
                      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-2 ${getTierColor(tier as Customer['tier'])}`}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-lg font-bold">{tierCustomers.length}</p>
                          <p className="text-xs text-gray-600">Customers</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">${(tierRevenue / 1000).toFixed(0)}K</p>
                          <p className="text-xs text-gray-600">MRR</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{avgHealth}</p>
                          <p className="text-xs text-gray-600">Avg Health</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Customer Portfolio
                <div className="flex items-center space-x-2">
                  <Select value={filterRisk} onValueChange={setFilterRisk}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="low">Low Risk</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers
                  .filter(customer => {
                    if (filterRisk === 'all') return true;
                    if (filterRisk === 'high') return customer.churnRisk >= 70;
                    if (filterRisk === 'medium') return customer.churnRisk >= 40 && customer.churnRisk < 70;
                    if (filterRisk === 'low') return customer.churnRisk < 40;
                    return true;
                  })
                  .map(customer => (
                    <div key={customer.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{customer.name}</h4>
                              <p className="text-sm text-gray-600">{customer.company}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getTierColor(customer.tier)}>
                                {customer.tier}
                              </Badge>
                              <Badge className={getStatusColor(customer.status)}>
                                {customer.status.replace('_', ' ')}
                              </Badge>
                              {customer.churnRisk >= 70 && (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  High Churn Risk
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-600">Health Score</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Progress value={customer.healthScore} className="h-2 flex-1" />
                                <span className="text-sm font-medium">{customer.healthScore}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">MRR</p>
                              <p className="font-semibold">${customer.mrr.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">LTV</p>
                              <p className="font-semibold">${(customer.ltv / 1000).toFixed(0)}K</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Churn Risk</p>
                              <p className={`font-semibold ${customer.churnRisk >= 70 ? 'text-red-600' : customer.churnRisk >= 40 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {customer.churnRisk}%
                              </p>
                            </div>
                          </div>

                          {/* AI Insights */}
                          <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <div className="flex items-center mb-2">
                              <Brain className="h-4 w-4 text-blue-600 mr-2" />
                              <span className="font-semibold text-blue-900">AI Insights</span>
                              <Badge className={`ml-2 text-xs ${customer.aiInsights.sentiment === 'positive' ? 'bg-green-100 text-green-800' : customer.aiInsights.sentiment === 'negative' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                {customer.aiInsights.sentiment} sentiment
                              </Badge>
                            </div>
                            <p className="text-sm text-blue-800 mb-2">{customer.aiInsights.nextBestAction}</p>
                            <div className="space-y-1">
                              {customer.aiInsights.recommendations.slice(0, 2).map((rec, idx) => (
                                <div key={idx} className="flex items-center text-sm text-blue-700">
                                  <Zap className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                  {rec}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Risk Factors */}
                          {customer.aiInsights.keyRiskFactors.length > 0 && (
                            <div className="bg-red-50 rounded-lg p-3 mb-3">
                              <h6 className="font-medium text-red-900 mb-2 flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Risk Factors
                              </h6>
                              {customer.aiInsights.keyRiskFactors.map((factor, idx) => (
                                <p key={idx} className="text-sm text-red-800">{factor}</p>
                              ))}
                            </div>
                          )}
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
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            View Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Health Score Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{selectedCustomer.name} - Health Breakdown</h3>
                    <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                      Back to Overview
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-4">Health Score Components</h4>
                      <div className="space-y-4">
                        {getHealthScoreMetrics(selectedCustomer).map((metric, idx) => (
                          <div key={idx} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{metric.metric}</span>
                              <div className="flex items-center space-x-2">
                                {metric.trend === 'up' && <ArrowUp className="h-4 w-4 text-green-500" />}
                                {metric.trend === 'down' && <ArrowDown className="h-4 w-4 text-red-500" />}
                                {metric.trend === 'stable' && <div className="w-4 h-4 bg-gray-400 rounded-full"></div>}
                                <span className="font-semibold">{metric.score}/100</span>
                              </div>
                            </div>
                            <Progress value={metric.score} className="h-2 mb-2" />
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>Weight: {metric.weight}%</span>
                              <span>{metric.impact}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-4">Overall Health Trends</h4>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold mb-2">{selectedCustomer.healthScore}</div>
                          <div className="text-sm text-gray-600">Current Health Score</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                          <span className="text-sm">Satisfaction Score</span>
                          <span className="font-semibold">{selectedCustomer.satisfactionScore}/10</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-sm">Engagement Trend</span>
                          <span className="font-semibold capitalize">{selectedCustomer.aiInsights.engagementTrend}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                          <span className="text-sm">Support Tickets</span>
                          <span className="font-semibold">{selectedCustomer.supportTickets} open</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Select a customer to view detailed health score analysis</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {customers.slice(0, 3).map(customer => (
                      <Button
                        key={customer.id}
                        variant="outline"
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-4 h-auto"
                      >
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-600">{customer.company}</p>
                          <p className="text-lg font-bold mt-2">Health: {customer.healthScore}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Support Ticket Management
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold">{ticket.title}</h4>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant="outline">
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{ticket.customerName}</span>
                          <span>•</span>
                          <span>{ticket.category.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>Assigned to {ticket.assignedAgent}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Suggestions */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center mb-2">
                        <Brain className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="font-semibold text-blue-900">AI Suggestions</span>
                        <Badge className="ml-2 text-xs bg-blue-100 text-blue-800">
                          {ticket.aiSuggestions.escalationRisk}% escalation risk
                        </Badge>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-blue-800 font-medium mb-1">Suggested Response:</p>
                        <p className="text-sm text-blue-700">{ticket.aiSuggestions.suggestedResponse}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="font-medium text-blue-800">Similar Tickets:</p>
                          <p className="text-blue-700">{ticket.aiSuggestions.similarTickets.join(', ')}</p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">Est. Resolution:</p>
                          <p className="text-blue-700">{ticket.aiSuggestions.estimatedResolutionTime} hours</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            Use Suggestion
                          </Button>
                          <Button size="sm" variant="outline">
                            View KB Articles
                          </Button>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button size="sm" variant="ghost">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-500" />
                  Upsell Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customers
                    .filter(c => c.aiInsights.upsellPotential >= 70)
                    .map(customer => (
                      <div key={customer.id} className="border rounded-lg p-3 bg-green-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{customer.name}</h4>
                          <Badge className="bg-green-100 text-green-800">
                            {customer.aiInsights.upsellPotential}% potential
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{customer.company}</p>
                        <p className="text-sm font-medium text-green-700">
                          Current MRR: ${customer.mrr.toLocaleString()} → Potential: ${Math.round(customer.mrr * 1.5).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-yellow-500" />
                  Success Stories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customers
                    .filter(c => c.healthScore >= 80)
                    .slice(0, 3)
                    .map(customer => (
                      <div key={customer.id} className="border rounded-lg p-3 bg-yellow-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{customer.name}</h4>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Health: {customer.healthScore}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{customer.company}</p>
                        <p className="text-sm text-yellow-800">
                          High satisfaction score: {customer.satisfactionScore}/10
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                Customer Intelligence Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">
                    {Math.round(customers.reduce((sum, c) => sum + c.aiInsights.churnPrediction, 0) / customers.length)}%
                  </div>
                  <div className="text-sm text-blue-700">Avg Churn Risk</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {Math.round(customers.reduce((sum, c) => sum + c.aiInsights.upsellPotential, 0) / customers.length)}%
                  </div>
                  <div className="text-sm text-green-700">Avg Upsell Potential</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">
                    {customers.filter(c => c.aiInsights.sentiment === 'positive').length}
                  </div>
                  <div className="text-sm text-purple-700">Positive Sentiment</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
