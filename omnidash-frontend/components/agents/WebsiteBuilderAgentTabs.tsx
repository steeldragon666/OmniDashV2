import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import {
  Target, Brain, AlertTriangle, Lightbulb, Eye, Upload, Star,
  Layout, BarChart3, Activity, Smartphone, Monitor, Tablet,
  CheckCircle2, Award, Zap
} from 'lucide-react';

// Simple UI Components
const Badge = ({ children, className = '', ...props }: any) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`} {...props}>
    {children}
  </span>
);

const Progress = ({ value, className = '', ...props }: any) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`} {...props}>
    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${value}%` }}></div>
  </div>
);

const Select = ({ children, defaultValue, ...props }: any) => (
  <div className="relative" {...props}>
    {children}
  </div>
);

const SelectTrigger = ({ children, className = '', ...props }: any) => (
  <button className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`} {...props}>
    {children}
  </button>
);

const SelectValue = ({ placeholder }: any) => (
  <span className="text-gray-500">{placeholder}</span>
);

const SelectContent = ({ children, className = '' }: any) => (
  <div className={`absolute top-full z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg ${className}`}>
    {children}
  </div>
);

const SelectItem = ({ children, value, className = '', ...props }: any) => (
  <div className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 ${className}`} {...props}>
    {children}
  </div>
);

interface WebsitePage {
  id: string;
  name: string;
  url: string;
  type: 'landing' | 'product' | 'pricing' | 'about' | 'contact' | 'blog' | 'custom';
  status: 'draft' | 'published' | 'testing' | 'archived';
  template: string;
  createdDate: Date;
  lastModified: Date;
  views: number;
  conversions: number;
  conversionRate: number;
  bounceRate: number;
  avgTimeOnPage: number;
  mobileOptimized: boolean;
  seoScore: number;
  performanceScore: number;
  elements: any[];
  variants: any[];
  analytics: {
    visitors: { total: number; unique: number; returning: number; new: number };
    traffic: { organic: number; direct: number; social: number; paid: number; referral: number };
    devices: { desktop: number; mobile: number; tablet: number };
    conversions: {
      total: number;
      rate: number;
      bySource: { [key: string]: number };
      byDevice: { [key: string]: number };
    };
    engagement: {
      avgTimeOnPage: number;
      bounceRate: number;
      pagesPerSession: number;
      scrollDepth: number;
    };
  };
  aiInsights: {
    optimizationScore: number;
    recommendations: string[];
    predictedImprovements: {
      conversionRate: number;
      bounceRate: number;
      engagement: number;
    };
    heatmapInsights: string[];
    userJourneyIssues: string[];
  };
}

interface ConversionFunnel {
  id: string;
  name: string;
  steps: {
    id: string;
    name: string;
    pageUrl: string;
    visitors: number;
    conversions: number;
    conversionRate: number;
    dropoffRate: number;
    avgTimeOnStep: number;
    issues: string[];
  }[];
  totalVisitors: number;
  finalConversions: number;
  overallConversionRate: number;
  dropoffAnalysis: {
    biggestDropoff: string;
    improvementOpportunity: number;
  };
  aiInsights: {
    bottlenecks: string[];
    optimizationSuggestions: string[];
    predictedImprovements: { [key: string]: number };
  };
}

interface Template {
  id: string;
  name: string;
  category: 'landing' | 'ecommerce' | 'saas' | 'portfolio' | 'blog' | 'corporate';
  description: string;
  thumbnail: string;
  conversionRate: number;
  industryFocus: string[];
  features: string[];
  responsive: boolean;
  seoOptimized: boolean;
  loadTime: number;
  complexity: 'simple' | 'moderate' | 'advanced';
  price: number;
  usageCount: number;
  rating: number;
}

interface WebsiteBuilderTabsProps {
  pages: WebsitePage[];
  conversionFunnel: ConversionFunnel;
  templates: Template[];
  tab?: 'analytics' | 'templates' | 'optimization';
}

export function WebsiteBuilderTabs({ pages, conversionFunnel, templates, tab = 'analytics' }: WebsiteBuilderTabsProps) {
  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  if (tab === 'templates') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Template Library
              <div className="flex items-center space-x-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="landing">Landing Pages</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Template
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="aspect-video bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                      <Layout className="h-8 w-8 text-gray-400" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{template.name}</h4>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs">{template.rating}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div>
                        <span className="text-gray-600">Conversion Rate:</span>
                        <div className="font-semibold text-green-600">{template.conversionRate}%</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Load Time:</span>
                        <div className="font-semibold">{template.loadTime}s</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Complexity:</span>
                        <div className="font-semibold capitalize">{template.complexity}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Used:</span>
                        <div className="font-semibold">{template.usageCount}x</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.features.slice(0, 3).map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold">${template.price}</div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tab === 'optimization') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-500" />
              AI-Powered Optimization Hub
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Optimization Recommendations */}
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-purple-800">Smart Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pages.flatMap(page => 
                    page.aiInsights.recommendations.map((rec, idx) => ({
                      recommendation: rec,
                      page: page.name,
                      impact: page.aiInsights.predictedImprovements.conversionRate,
                      pageId: page.id
                    }))
                  ).slice(0, 5).map((item, idx) => (
                    <div key={idx} className="border border-purple-200 rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-purple-900">{item.recommendation}</p>
                        <Badge className="bg-purple-100 text-purple-800">
                          +{item.impact}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-purple-700">{item.page}</span>
                        <Button size="sm" variant="outline">
                          Apply
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Performance Insights */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">Performance Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-lg font-bold text-blue-900">
                        {Math.round(pages.reduce((sum, p) => sum + p.aiInsights.optimizationScore, 0) / pages.length)}
                      </div>
                      <div className="text-sm text-blue-700">Avg Optimization Score</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-lg font-bold text-blue-900">
                        +{Math.round(pages.reduce((sum, p) => sum + p.aiInsights.predictedImprovements.conversionRate, 0) / pages.length)}%
                      </div>
                      <div className="text-sm text-blue-700">Potential Improvement</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-blue-800">Quick Wins</h5>
                    {[
                      'Implement green CTA buttons across all pages',
                      'Reduce form fields to 4 maximum',
                      'Add social proof to pricing pages',
                      'Optimize mobile form layouts'
                    ].map((win, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                        <div className="flex items-center text-sm">
                          <Zap className="h-3 w-3 text-yellow-500 mr-2" />
                          {win}
                        </div>
                        <Button size="sm" variant="outline" className="text-xs">
                          Implement
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Automated Optimization */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Automated Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-green-800">Auto A/B Testing</h5>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      Automatically test CTA buttons, headlines, and forms
                    </p>
                    <div className="text-xs text-green-600">
                      Next test starts: Tomorrow
                    </div>
                  </div>

                  <div className="bg-white border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-green-800">Smart Personalization</h5>
                      <Badge className="bg-yellow-100 text-yellow-800">Beta</Badge>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      Personalize content based on visitor behavior
                    </p>
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                      Enable
                    </Button>
                  </div>

                  <div className="bg-white border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-green-800">Performance Monitoring</h5>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      24/7 monitoring with automatic alerts
                    </p>
                    <div className="text-xs text-green-600">
                      Last alert: 2 hours ago
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: Analytics tab
  return (
    <div className="space-y-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-500" />
              Conversion Funnel Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionFunnel.steps.map((step, idx) => (
                <div key={step.id} className="relative">
                  {idx > 0 && (
                    <div className="absolute left-4 -top-2 w-0.5 h-4 bg-gray-300"></div>
                  )}
                  <div className="flex items-start space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                      idx === 0 ? 'bg-blue-500' : 
                      step.dropoffRate > 50 ? 'bg-red-500' : 
                      'bg-green-500'
                    }`}>
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{step.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${step.dropoffRate > 50 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {step.conversionRate}% conversion
                          </Badge>
                          {step.dropoffRate > 50 && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              High dropoff
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Visitors</p>
                          <p className="text-lg font-bold">{step.visitors.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Conversions</p>
                          <p className="text-lg font-bold text-green-600">{step.conversions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Dropoff Rate</p>
                          <p className={`text-lg font-bold ${step.dropoffRate > 50 ? 'text-red-600' : 'text-gray-800'}`}>
                            {step.dropoffRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Avg Time</p>
                          <p className="text-lg font-bold">{step.avgTimeOnStep}s</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <Progress value={step.conversionRate} className="h-2" />
                      </div>

                      {step.issues.length > 0 && (
                        <div className="bg-orange-50 rounded p-2">
                          <p className="text-sm font-medium text-orange-800 mb-1">Issues Identified:</p>
                          {step.issues.map((issue, issueIdx) => (
                            <p key={issueIdx} className="text-sm text-orange-700">• {issue}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Funnel Summary */}
            <div className="border-t pt-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{conversionFunnel.totalVisitors.toLocaleString()}</div>
                  <div className="text-sm text-blue-700">Total Visitors</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{conversionFunnel.finalConversions.toLocaleString()}</div>
                  <div className="text-sm text-green-700">Final Conversions</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">{conversionFunnel.overallConversionRate}%</div>
                  <div className="text-sm text-purple-700">Overall Conversion Rate</div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-blue-50 rounded-lg p-4 mt-4">
              <div className="flex items-center mb-3">
                <Brain className="h-4 w-4 text-blue-600 mr-2" />
                <span className="font-semibold text-blue-900">AI Funnel Analysis</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h6 className="font-medium text-blue-800 mb-2">Bottlenecks Identified</h6>
                  {conversionFunnel.aiInsights.bottlenecks.map((bottleneck, idx) => (
                    <div key={idx} className="flex items-center text-sm text-blue-700 mb-1">
                      <AlertTriangle className="h-3 w-3 text-orange-500 mr-2 flex-shrink-0" />
                      {bottleneck}
                    </div>
                  ))}
                </div>
                
                <div>
                  <h6 className="font-medium text-blue-800 mb-2">Optimization Suggestions</h6>
                  {conversionFunnel.aiInsights.optimizationSuggestions.slice(0, 3).map((suggestion, idx) => (
                    <div key={idx} className="flex items-center text-sm text-blue-700 mb-1">
                      <Lightbulb className="h-3 w-3 text-yellow-500 mr-2 flex-shrink-0" />
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-200">
                <h6 className="font-medium text-blue-800 mb-2">Predicted Impact</h6>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.entries(conversionFunnel.aiInsights.predictedImprovements).map(([key, value]) => (
                    <div key={key} className="bg-white rounded p-2 text-center">
                      <div className="text-lg font-bold text-green-600">+{value}%</div>
                      <div className="text-xs text-gray-600">{key.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pages.length > 0 ? Object.entries(pages[0].analytics.traffic).map(([source, percentage]) => (
                  <div key={source} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        source === 'organic' ? 'bg-green-500' :
                        source === 'direct' ? 'bg-blue-500' :
                        source === 'social' ? 'bg-purple-500' :
                        source === 'paid' ? 'bg-orange-500' :
                        'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-medium capitalize">{source}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{percentage}%</div>
                      <Progress value={percentage} className="h-1 w-20" />
                    </div>
                  </div>
                )) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pages.length > 0 ? Object.entries(pages[0].analytics.devices).map(([device, percentage]) => {
                  const DeviceIcon = getDeviceIcon(device);
                  return (
                    <div key={device} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DeviceIcon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium capitalize">{device}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{percentage}%</div>
                        <Progress value={percentage} className="h-1 w-20" />
                      </div>
                    </div>
                  );
                }) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
