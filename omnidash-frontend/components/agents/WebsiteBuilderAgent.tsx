import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import {
  Globe, Layout, Palette, Zap, Target, BarChart3, LineChart,
  TrendingUp, TrendingDown, Eye, MousePointer, Timer, Users,
  Smartphone, Monitor, Tablet, Code, Image, Type, Link,
  Play, Pause, RefreshCw, Download, Upload, Copy, Share,
  Settings, Filter, Search, Plus, Edit3, Trash2, Star,
  CheckCircle2, AlertTriangle, Brain, Lightbulb, Award,
  PieChart, Activity, Calendar, Clock, DollarSign,
  ArrowUp, ArrowDown, ExternalLink, Maximize, Minimize
} from 'lucide-react';
import { WebsiteBuilderTabs } from './WebsiteBuilderAgentTabs';

// Simple UI Components
const Badge = ({ children, className = '', ...props }: any) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`} {...props}>
    {children}
  </span>
);

const Input = ({ className = '', ...props }: any) => (
  <input className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`} {...props} />
);

const Textarea = ({ className = '', ...props }: any) => (
  <textarea className={`flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`} {...props} />
);

const Progress = ({ value, className = '', ...props }: any) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`} {...props}>
    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${value}%` }}></div>
  </div>
);

const Tabs = ({ children, value, onValueChange, className = '' }: any) => (
  <div className={className}>
    {React.Children.map(children, child => 
      React.cloneElement(child, { value, onValueChange })
    )}
  </div>
);

const TabsList = ({ children, className = '' }: any) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`}>
    {children}
  </div>
);

const TabsTrigger = ({ children, value, className = '', ...props }: any) => (
  <button className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-950 data-[state=active]:shadow-sm ${className}`} {...props}>
    {children}
  </button>
);

const TabsContent = ({ children, value, className = '' }: any) => (
  <div className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}>
    {children}
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
  elements: PageElement[];
  variants: PageVariant[];
  analytics: PageAnalytics;
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

interface PageElement {
  id: string;
  type: 'header' | 'hero' | 'form' | 'cta' | 'testimonial' | 'feature' | 'pricing' | 'footer';
  position: { x: number; y: number; width: number; height: number };
  content: any;
  style: any;
  conversionImpact: number;
  clickThroughRate?: number;
  interactionRate?: number;
}

interface PageVariant {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'winner' | 'paused' | 'draft';
  traffic: number; // percentage
  conversions: number;
  conversionRate: number;
  significance: number;
  elements: PageElement[];
}

interface PageAnalytics {
  visitors: {
    total: number;
    unique: number;
    returning: number;
    new: number;
  };
  traffic: {
    organic: number;
    direct: number;
    social: number;
    paid: number;
    referral: number;
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
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
}

interface ABTest {
  id: string;
  name: string;
  pageId: string;
  pageName: string;
  hypothesis: string;
  startDate: Date;
  endDate?: Date;
  status: 'running' | 'completed' | 'paused' | 'draft';
  variants: TestVariant[];
  metrics: {
    primaryMetric: 'conversion_rate' | 'bounce_rate' | 'time_on_page' | 'click_through_rate';
    secondaryMetrics: string[];
  };
  results?: {
    winner: string;
    significance: number;
    improvement: number;
    confidence: number;
  };
  aiInsights: {
    recommendedVariant: string;
    predictedWinner: string;
    suggestedActions: string[];
    nextTestIdeas: string[];
  };
}

interface TestVariant {
  id: string;
  name: string;
  description: string;
  traffic: number;
  visitors: number;
  conversions: number;
  conversionRate: number;
  bounceRate: number;
  avgTimeOnPage: number;
}

interface ConversionFunnel {
  id: string;
  name: string;
  steps: FunnelStep[];
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

interface FunnelStep {
  id: string;
  name: string;
  pageUrl: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  dropoffRate: number;
  avgTimeOnStep: number;
  issues: string[];
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

export function WebsiteBuilderAgent() {
  const [activeTab, setActiveTab] = useState('pages');
  const [selectedPage, setSelectedPage] = useState<WebsitePage | null>(null);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');

  const [pages] = useState<WebsitePage[]>([
    {
      id: '1',
      name: 'Product Landing Page',
      url: '/product-demo',
      type: 'landing',
      status: 'published',
      template: 'SaaS Conversion Pro',
      createdDate: new Date('2024-09-01'),
      lastModified: new Date('2024-09-10'),
      views: 15420,
      conversions: 924,
      conversionRate: 6.0,
      bounceRate: 42.5,
      avgTimeOnPage: 125,
      mobileOptimized: true,
      seoScore: 89,
      performanceScore: 94,
      elements: [],
      variants: [],
      analytics: {
        visitors: { total: 15420, unique: 12840, returning: 2580, new: 12840 },
        traffic: { organic: 45, direct: 25, social: 15, paid: 10, referral: 5 },
        devices: { desktop: 55, mobile: 35, tablet: 10 },
        conversions: {
          total: 924,
          rate: 6.0,
          bySource: { organic: 420, direct: 230, social: 138, paid: 92, referral: 44 },
          byDevice: { desktop: 508, mobile: 323, tablet: 93 }
        },
        engagement: {
          avgTimeOnPage: 125,
          bounceRate: 42.5,
          pagesPerSession: 2.3,
          scrollDepth: 68
        }
      },
      aiInsights: {
        optimizationScore: 78,
        recommendations: [
          'Optimize mobile form layout for better conversion',
          'Test social proof placement above fold',
          'Reduce form fields from 7 to 4 for higher completion',
          'Add urgency elements to CTA buttons'
        ],
        predictedImprovements: {
          conversionRate: 23,
          bounceRate: -15,
          engagement: 18
        },
        heatmapInsights: [
          'Users spend 65% more time on testimonial section',
          'CTA button gets 3x more clicks when in primary color',
          'Mobile users abandon at form field #5 most frequently'
        ],
        userJourneyIssues: [
          'High exit rate at pricing section',
          'Mobile navigation causing confusion',
          'Loading time spike on feature comparison table'
        ]
      }
    },
    {
      id: '2',
      name: 'Pricing Page',
      url: '/pricing',
      type: 'pricing',
      status: 'testing',
      template: 'Price Comparison Pro',
      createdDate: new Date('2024-08-15'),
      lastModified: new Date('2024-09-12'),
      views: 8750,
      conversions: 525,
      conversionRate: 6.0,
      bounceRate: 38.2,
      avgTimeOnPage: 98,
      mobileOptimized: true,
      seoScore: 76,
      performanceScore: 91,
      elements: [],
      variants: [],
      analytics: {
        visitors: { total: 8750, unique: 7200, returning: 1550, new: 7200 },
        traffic: { organic: 30, direct: 40, social: 10, paid: 15, referral: 5 },
        devices: { desktop: 60, mobile: 30, tablet: 10 },
        conversions: {
          total: 525,
          rate: 6.0,
          bySource: { organic: 158, direct: 210, social: 53, paid: 79, referral: 25 },
          byDevice: { desktop: 315, mobile: 158, tablet: 52 }
        },
        engagement: {
          avgTimeOnPage: 98,
          bounceRate: 38.2,
          pagesPerSession: 1.8,
          scrollDepth: 72
        }
      },
      aiInsights: {
        optimizationScore: 82,
        recommendations: [
          'Test different pricing structures (monthly vs annual emphasis)',
          'Add feature comparison tooltips',
          'Implement price anchoring with enterprise tier',
          'Test removing/adding money-back guarantee badge'
        ],
        predictedImprovements: {
          conversionRate: 15,
          bounceRate: -8,
          engagement: 12
        },
        heatmapInsights: [
          'Most popular plan gets 60% of clicks',
          'FAQ section reduces bounce rate by 25%',
          'Mobile users scroll less on pricing tables'
        ],
        userJourneyIssues: [
          'Confusion between plan features',
          'High exit rate after viewing enterprise pricing',
          'Mobile pricing table difficult to compare'
        ]
      }
    }
  ]);

  const [abTests] = useState<ABTest[]>([
    {
      id: '1',
      name: 'Hero CTA Button Test',
      pageId: '1',
      pageName: 'Product Landing Page',
      hypothesis: 'Green CTA button will outperform blue by 15%+ due to better contrast and urgency',
      startDate: new Date('2024-09-05'),
      status: 'running',
      variants: [
        {
          id: 'control',
          name: 'Blue Button (Control)',
          description: 'Current blue CTA button with white text',
          traffic: 50,
          visitors: 2840,
          conversions: 167,
          conversionRate: 5.9,
          bounceRate: 43.1,
          avgTimeOnPage: 122
        },
        {
          id: 'variant_a',
          name: 'Green Button',
          description: 'Green CTA button with white text',
          traffic: 50,
          visitors: 2760,
          conversions: 182,
          conversionRate: 6.6,
          bounceRate: 41.8,
          avgTimeOnPage: 128
        }
      ],
      metrics: {
        primaryMetric: 'conversion_rate',
        secondaryMetrics: ['bounce_rate', 'time_on_page', 'click_through_rate']
      },
      results: {
        winner: 'variant_a',
        significance: 87,
        improvement: 11.9,
        confidence: 87
      },
      aiInsights: {
        recommendedVariant: 'variant_a',
        predictedWinner: 'Green Button',
        suggestedActions: [
          'Implement green button as winner',
          'Test orange button as next iteration',
          'Apply green color scheme to other CTAs'
        ],
        nextTestIdeas: [
          'Test button size variations',
          'Test button copy variations',
          'Test button placement above/below testimonials'
        ]
      }
    },
    {
      id: '2',
      name: 'Form Length Optimization',
      pageId: '2',
      pageName: 'Pricing Page',
      hypothesis: 'Reducing signup form from 7 fields to 4 will increase conversions by 20%+',
      startDate: new Date('2024-09-01'),
      status: 'completed',
      variants: [
        {
          id: 'control',
          name: '7-Field Form (Control)',
          description: 'Full form with company, role, phone, etc.',
          traffic: 50,
          visitors: 1950,
          conversions: 97,
          conversionRate: 5.0,
          bounceRate: 39.2,
          avgTimeOnPage: 95
        },
        {
          id: 'variant_a',
          name: '4-Field Form',
          description: 'Simplified form with only essential fields',
          traffic: 50,
          visitors: 1875,
          conversions: 131,
          conversionRate: 7.0,
          bounceRate: 35.8,
          avgTimeOnPage: 102
        }
      ],
      metrics: {
        primaryMetric: 'conversion_rate',
        secondaryMetrics: ['bounce_rate', 'time_on_page']
      },
      results: {
        winner: 'variant_a',
        significance: 95,
        improvement: 40.0,
        confidence: 95
      },
      aiInsights: {
        recommendedVariant: 'variant_a',
        predictedWinner: '4-Field Form',
        suggestedActions: [
          'Implement 4-field form immediately',
          'A/B test progressive form reveal',
          'Test social login options'
        ],
        nextTestIdeas: [
          'Test 3-field form (email, name, company)',
          'Test multi-step form approach',
          'Test form placement on page'
        ]
      }
    }
  ]);

  const [templates] = useState<Template[]>([
    {
      id: '1',
      name: 'SaaS Conversion Pro',
      category: 'saas',
      description: 'High-converting landing page template optimized for SaaS products',
      thumbnail: '/templates/saas-pro.jpg',
      conversionRate: 8.2,
      industryFocus: ['Software', 'Technology', 'B2B'],
      features: ['Hero Section', 'Feature Grid', 'Testimonials', 'Pricing Cards', 'FAQ'],
      responsive: true,
      seoOptimized: true,
      loadTime: 1.2,
      complexity: 'moderate',
      price: 49,
      usageCount: 1247,
      rating: 4.8
    },
    {
      id: '2',
      name: 'E-commerce Booster',
      category: 'ecommerce',
      description: 'Product showcase template with integrated shopping features',
      thumbnail: '/templates/ecommerce-booster.jpg',
      conversionRate: 6.5,
      industryFocus: ['Retail', 'Fashion', 'Electronics'],
      features: ['Product Gallery', 'Shopping Cart', 'Reviews', 'Related Products'],
      responsive: true,
      seoOptimized: true,
      loadTime: 1.8,
      complexity: 'advanced',
      price: 79,
      usageCount: 892,
      rating: 4.6
    }
  ]);

  const [conversionFunnel] = useState<ConversionFunnel>({
    id: '1',
    name: 'Main Conversion Funnel',
    steps: [
      {
        id: '1',
        name: 'Landing Page Visit',
        pageUrl: '/product-demo',
        visitors: 15420,
        conversions: 8750,
        conversionRate: 56.7,
        dropoffRate: 43.3,
        avgTimeOnStep: 125,
        issues: ['High mobile bounce rate', 'Slow loading on 3G']
      },
      {
        id: '2',
        name: 'Pricing Page',
        pageUrl: '/pricing',
        visitors: 8750,
        conversions: 3420,
        conversionRate: 39.1,
        dropoffRate: 60.9,
        avgTimeOnStep: 98,
        issues: ['Pricing confusion', 'Feature comparison unclear']
      },
      {
        id: '3',
        name: 'Signup Form',
        pageUrl: '/signup',
        visitors: 3420,
        conversions: 1950,
        conversionRate: 57.0,
        dropoffRate: 43.0,
        avgTimeOnStep: 45,
        issues: ['Too many form fields', 'No social login options']
      },
      {
        id: '4',
        name: 'Payment',
        pageUrl: '/checkout',
        visitors: 1950,
        conversions: 924,
        conversionRate: 47.4,
        dropoffRate: 52.6,
        avgTimeOnStep: 78,
        issues: ['Limited payment options', 'Security concerns']
      }
    ],
    totalVisitors: 15420,
    finalConversions: 924,
    overallConversionRate: 6.0,
    dropoffAnalysis: {
      biggestDropoff: 'Pricing Page',
      improvementOpportunity: 45
    },
    aiInsights: {
      bottlenecks: [
        'Pricing page causing 60.9% dropoff - highest in funnel',
        'Payment page security concerns reducing completion',
        'Mobile experience significantly worse than desktop'
      ],
      optimizationSuggestions: [
        'Simplify pricing presentation with clear value propositions',
        'Add trust badges and security certifications to payment page',
        'Implement progressive form fields to reduce abandonment',
        'Add live chat support at high-dropoff points'
      ],
      predictedImprovements: {
        'pricing_optimization': 25,
        'payment_trust_signals': 18,
        'form_optimization': 35,
        'mobile_experience': 22
      }
    }
  });

  const getStatusColor = (status: string) => {
    const colors = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      testing: 'bg-blue-100 text-blue-800',
      archived: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      winner: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const calculateTotalConversions = () => {
    return pages.reduce((sum, page) => sum + page.conversions, 0);
  };

  const calculateAverageConversionRate = () => {
    const totalRate = pages.reduce((sum, page) => sum + page.conversionRate, 0);
    return Math.round((totalRate / pages.length) * 10) / 10;
  };

  const getActiveTests = () => {
    return abTests.filter(test => test.status === 'running').length;
  };

  const getTopPerformingPage = () => {
    return pages.reduce((best, page) => 
      page.conversionRate > best.conversionRate ? page : best
    , pages[0]);
  };

  return (
    <div className="space-y-6">
      {/* Website Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Pages</p>
                <p className="text-2xl font-bold text-blue-900">{pages.length}</p>
                <p className="text-xs text-blue-700 mt-1">
                  <Globe className="h-3 w-3 inline mr-1" />
                  {pages.filter(p => p.status === 'published').length} published
                </p>
              </div>
              <Layout className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Conversions</p>
                <p className="text-2xl font-bold text-green-900">{calculateTotalConversions().toLocaleString()}</p>
                <p className="text-xs text-green-700 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {calculateAverageConversionRate()}% avg rate
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
                <p className="text-sm font-medium text-purple-600">Active A/B Tests</p>
                <p className="text-2xl font-bold text-purple-900">{getActiveTests()}</p>
                <p className="text-xs text-purple-700 mt-1">
                  <Zap className="h-3 w-3 inline mr-1" />
                  {abTests.filter(t => t.results?.significance && t.results.significance > 90).length} significant
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
                <p className="text-sm font-medium text-orange-600">Best Converter</p>
                <p className="text-2xl font-bold text-orange-900">{getTopPerformingPage()?.conversionRate}%</p>
                <p className="text-xs text-orange-700 mt-1">
                  <Award className="h-3 w-3 inline mr-1" />
                  {getTopPerformingPage()?.name}
                </p>
              </div>
              <Award className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Optimization Alert */}
      <Card className="border-l-4 border-l-green-500 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Brain className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900">AI Conversion Opportunity</h4>
                <p className="text-sm text-green-800 mt-1">
                  Green CTA button test shows 11.9% improvement with 87% confidence. Implementing this change 
                  across all pages could increase conversions by 180+ monthly. Form field reduction test shows 40% improvement.
                </p>
              </div>
            </div>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              Implement Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="builder">Page Builder</TabsTrigger>
          <TabsTrigger value="testing">A/B Testing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="optimization">AI Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Website Pages Management
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={viewMode === 'desktop' ? 'primary' : 'ghost'}
                      onClick={() => setViewMode('desktop')}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'tablet' ? 'primary' : 'ghost'}
                      onClick={() => setViewMode('tablet')}
                    >
                      <Tablet className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'mobile' ? 'primary' : 'ghost'}
                      onClick={() => setViewMode('mobile')}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    New Page
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pages.map(page => (
                  <Card key={page.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Layout className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold">{page.name}</h3>
                              <p className="text-sm text-gray-600">{page.url}</p>
                              <p className="text-xs text-gray-500">Template: {page.template}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(page.status)}>
                                {page.status}
                              </Badge>
                              <Badge className={`${page.type === 'landing' ? 'bg-blue-100 text-blue-800' : 
                                page.type === 'pricing' ? 'bg-green-100 text-green-800' : 
                                'bg-gray-100 text-gray-800'}`}>
                                {page.type}
                              </Badge>
                              {page.mobileOptimized && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Smartphone className="h-3 w-3 mr-1" />
                                  Mobile Optimized
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Key Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-blue-600">Views</p>
                                  <p className="text-lg font-bold text-blue-900">{page.views.toLocaleString()}</p>
                                </div>
                                <Eye className="h-5 w-5 text-blue-500" />
                              </div>
                            </div>
                            
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-green-600">Conversions</p>
                                  <p className="text-lg font-bold text-green-900">{page.conversions}</p>
                                </div>
                                <Target className="h-5 w-5 text-green-500" />
                              </div>
                            </div>

                            <div className="bg-purple-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-purple-600">Conv. Rate</p>
                                  <p className="text-lg font-bold text-purple-900">{page.conversionRate}%</p>
                                </div>
                                <BarChart3 className="h-5 w-5 text-purple-500" />
                              </div>
                            </div>

                            <div className="bg-orange-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-orange-600">Bounce Rate</p>
                                  <p className="text-lg font-bold text-orange-900">{page.bounceRate}%</p>
                                </div>
                                <Activity className="h-5 w-5 text-orange-500" />
                              </div>
                            </div>
                          </div>

                          {/* Performance Scores */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">SEO Score</span>
                                <span className="text-sm font-bold">{page.seoScore}/100</span>
                              </div>
                              <Progress value={page.seoScore} className="h-2" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">Performance</span>
                                <span className="text-sm font-bold">{page.performanceScore}/100</span>
                              </div>
                              <Progress value={page.performanceScore} className="h-2" />
                            </div>
                          </div>

                          {/* AI Insights */}
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <Brain className="h-4 w-4 text-blue-600 mr-2" />
                              <span className="font-semibold text-blue-900">AI Optimization Insights</span>
                              <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                                Score: {page.aiInsights.optimizationScore}/100
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div className="bg-white rounded p-2">
                                <div className="text-xs text-gray-600">Predicted Conv. Rate Improvement</div>
                                <div className="text-lg font-bold text-green-600">+{page.aiInsights.predictedImprovements.conversionRate}%</div>
                              </div>
                              <div className="bg-white rounded p-2">
                                <div className="text-xs text-gray-600">Bounce Rate Improvement</div>
                                <div className="text-lg font-bold text-blue-600">{page.aiInsights.predictedImprovements.bounceRate}%</div>
                              </div>
                              <div className="bg-white rounded p-2">
                                <div className="text-xs text-gray-600">Engagement Boost</div>
                                <div className="text-lg font-bold text-purple-600">+{page.aiInsights.predictedImprovements.engagement}%</div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h6 className="font-medium text-blue-800">Top Recommendations:</h6>
                              {page.aiInsights.recommendations.slice(0, 2).map((rec, idx) => (
                                <div key={idx} className="flex items-center text-sm text-blue-700">
                                  <Zap className="h-3 w-3 text-yellow-500 mr-2 flex-shrink-0" />
                                  {rec}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* User Journey Issues */}
                          {page.aiInsights.userJourneyIssues.length > 0 && (
                            <div className="bg-orange-50 rounded-lg p-3 mt-3">
                              <h6 className="font-medium text-orange-800 mb-2 flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                User Journey Issues
                              </h6>
                              {page.aiInsights.userJourneyIssues.slice(0, 2).map((issue, idx) => (
                                <p key={idx} className="text-sm text-orange-700 mb-1">{issue}</p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button size="sm" variant="outline">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Analytics
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                            Optimize
                          </Button>
                        </div>
                      </div>

                      {/* Device Performance */}
                      <div className="border-t pt-4">
                        <h6 className="font-medium mb-2">Performance by Device</h6>
                        <div className="grid grid-cols-3 gap-3">
                          {Object.entries(page.analytics.devices).map(([device, percentage]) => {
                            const DeviceIcon = getDeviceIcon(device);
                            const conversionsByDevice = page.analytics.conversions.byDevice[device] || 0;
                            const deviceConversionRate = page.analytics.visitors.total > 0 ? 
                              Math.round((conversionsByDevice / (page.analytics.visitors.total * percentage / 100)) * 100 * 10) / 10 : 0;

                            return (
                              <div key={device} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <DeviceIcon className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm font-medium capitalize">{device}</span>
                                  </div>
                                  <span className="text-sm text-gray-600">{percentage}%</span>
                                </div>
                                <div className="text-xs text-gray-600">Conv. Rate: {deviceConversionRate}%</div>
                                <div className="text-xs text-gray-600">Conversions: {conversionsByDevice}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Page Builder Studio
                <div className="flex items-center space-x-2">
                  <Select defaultValue="product-demo">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select page to edit" />
                    </SelectTrigger>
                    <SelectContent>
                      {pages.map(page => (
                        <SelectItem key={page.id} value={page.url.slice(1)}>
                          {page.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Code className="h-4 w-4 mr-2" />
                    Code View
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Publish
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Element Palette */}
                <div className="lg:col-span-1">
                  <h4 className="font-semibold mb-3">Elements</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Hero Section', icon: Layout, description: 'Main banner with CTA' },
                      { name: 'Feature Grid', icon: Target, description: 'Product features layout' },
                      { name: 'Testimonials', icon: Users, description: 'Customer reviews' },
                      { name: 'Pricing Cards', icon: DollarSign, description: 'Price comparison' },
                      { name: 'Contact Form', icon: Type, description: 'Lead capture form' },
                      { name: 'FAQ Section', icon: AlertTriangle, description: 'Common questions' }
                    ].map((element, idx) => (
                      <div key={idx} className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center space-x-2">
                          <element.icon className="h-4 w-4 text-gray-600" />
                          <div>
                            <div className="text-sm font-medium">{element.name}</div>
                            <div className="text-xs text-gray-500">{element.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Canvas */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-100 rounded-lg p-4 min-h-96">
                    <div className="bg-white rounded shadow-sm p-6">
                      <div className="text-center py-12">
                        <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-600 mb-2">Visual Page Builder</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Drag and drop elements to build your page
                        </p>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          Start Building
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Properties Panel */}
                <div className="lg:col-span-1">
                  <h4 className="font-semibold mb-3">Properties</h4>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-3">
                      <h5 className="font-medium mb-2">Style</h5>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium block mb-1">Background Color</label>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-500 rounded border"></div>
                            <Input placeholder="#ffffff" className="text-xs" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Font Size</label>
                          <Select defaultValue="16">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12">12px</SelectItem>
                              <SelectItem value="14">14px</SelectItem>
                              <SelectItem value="16">16px</SelectItem>
                              <SelectItem value="18">18px</SelectItem>
                              <SelectItem value="20">20px</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3">
                      <h5 className="font-medium mb-2">Content</h5>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium block mb-1">Text</label>
                          <Textarea placeholder="Enter content..." className="text-xs" />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Link URL</label>
                          <Input placeholder="https://..." className="text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                A/B Testing Dashboard
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Test
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {abTests.map(test => (
                  <Card key={test.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">{test.name}</h3>
                            <Badge className={getStatusColor(test.status)}>
                              {test.status}
                            </Badge>
                            {test.results && test.results.significance >= 90 && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Significant
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{test.pageName}</p>
                          <p className="text-sm text-gray-700 mb-3">
                            <strong>Hypothesis:</strong> {test.hypothesis}
                          </p>

                          {/* Test Results */}
                          {test.results && (
                            <div className="bg-green-50 rounded-lg p-3 mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-green-900">Test Results</span>
                                <Badge className="bg-green-100 text-green-800">
                                  Winner: {test.variants.find(v => v.id === test.results?.winner)?.name}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-green-700">Improvement:</span>
                                  <div className="font-semibold text-green-900">+{test.results.improvement}%</div>
                                </div>
                                <div>
                                  <span className="text-green-700">Confidence:</span>
                                  <div className="font-semibold text-green-900">{test.results.confidence}%</div>
                                </div>
                                <div>
                                  <span className="text-green-700">Significance:</span>
                                  <div className="font-semibold text-green-900">{test.results.significance}%</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Variants Comparison */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {test.variants.map(variant => (
                              <div key={variant.id} className={`border rounded-lg p-3 ${
                                test.results?.winner === variant.id ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium">{variant.name}</h5>
                                  {test.results?.winner === variant.id && (
                                    <Badge className="bg-green-100 text-green-800">
                                      <Award className="h-3 w-3 mr-1" />
                                      Winner
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{variant.description}</p>
                                
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-600">Visitors:</span>
                                    <div className="font-semibold">{variant.visitors.toLocaleString()}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Conversions:</span>
                                    <div className="font-semibold">{variant.conversions}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Conv. Rate:</span>
                                    <div className="font-semibold text-blue-600">{variant.conversionRate}%</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Bounce Rate:</span>
                                    <div className="font-semibold">{variant.bounceRate}%</div>
                                  </div>
                                </div>

                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span>Traffic Split</span>
                                    <span>{variant.traffic}%</span>
                                  </div>
                                  <Progress value={variant.traffic} className="h-1" />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* AI Insights */}
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <Brain className="h-4 w-4 text-blue-600 mr-2" />
                              <span className="font-semibold text-blue-900">AI Test Analysis</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h6 className="font-medium text-blue-800 mb-2">Recommended Actions</h6>
                                {test.aiInsights.suggestedActions.map((action, idx) => (
                                  <div key={idx} className="flex items-center text-sm text-blue-700 mb-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                    {action}
                                  </div>
                                ))}
                              </div>
                              
                              <div>
                                <h6 className="font-medium text-blue-800 mb-2">Next Test Ideas</h6>
                                {test.aiInsights.nextTestIdeas.slice(0, 2).map((idea, idx) => (
                                  <div key={idx} className="flex items-center text-sm text-blue-700 mb-1">
                                    <Lightbulb className="h-3 w-3 text-yellow-500 mr-2 flex-shrink-0" />
                                    {idea}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {test.status === 'running' ? (
                            <Button size="sm" variant="outline">
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </Button>
                          ) : test.status === 'completed' ? (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Implement
                            </Button>
                          ) : (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                              <Play className="h-4 w-4 mr-2" />
                              Start
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="border-t pt-4 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Started: {test.startDate.toLocaleDateString()}</span>
                          <span>Primary Metric: {test.metrics.primaryMetric.replace('_', ' ')}</span>
                          {test.endDate && <span>Ended: {test.endDate.toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <WebsiteBuilderTabs 
            pages={pages}
            conversionFunnel={conversionFunnel}
            templates={templates}
            tab="analytics"
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <WebsiteBuilderTabs 
            pages={pages}
            conversionFunnel={conversionFunnel}
            templates={templates}
            tab="templates"
          />
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <WebsiteBuilderTabs 
            pages={pages}
            conversionFunnel={conversionFunnel}
            templates={templates}
            tab="optimization"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
