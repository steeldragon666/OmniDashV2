import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Brain, 
  Search, 
  FileText, 
  BarChart3, 
  Workflow, 
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Eye,
  Edit3,
  Plus,
  Trash2,
  Zap,
  Target,
  Users,
  Clock,
  Cpu,
  Sparkles,
  TrendingUp,
  Lightbulb,
  MessageSquare,
  Database,
  Globe,
  Shield,
  Star
} from 'lucide-react';

interface AIAgent {
  id: string;
  name: string;
  description: string;
  type: 'content' | 'analytics' | 'social' | 'workflow' | 'strategy' | 'search';
  status: 'active' | 'inactive' | 'training' | 'error';
  capabilities: string[];
  lastUpdated: Date;
  performance: {
    accuracy: number;
    responseTime: number;
    usageCount: number;
  };
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  url?: string;
  score: number;
  metadata?: Record<string, any>;
  snippets?: string[];
}

interface AnalyticsInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  recommendations: string[];
  createdAt: Date;
}

export function VertexAIDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentPrompt, setContentPrompt] = useState('');

  useEffect(() => {
    loadVertexAIData();
  }, []);

  const loadVertexAIData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAIAgents(),
        loadAnalyticsInsights()
      ]);
    } catch (error) {
      console.error('Error loading Vertex AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAIAgents = async () => {
    try {
      const response = await fetch('/api/vertex-ai/agents');
      const data = await response.json();
      if (data.success) {
        setAgents(data.data);
      }
    } catch (error) {
      console.error('Error loading AI agents:', error);
    }
  };

  const loadAnalyticsInsights = async () => {
    try {
      const response = await fetch('/api/vertex-ai/analytics/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            { revenue: 150000, customers: 1200, month: 'September' },
            { revenue: 130000, customers: 1100, month: 'August' },
            { revenue: 120000, customers: 1000, month: 'July' }
          ]
        })
      });
      const data = await response.json();
      if (data.success) {
        setInsights(data.data);
      }
    } catch (error) {
      console.error('Error loading analytics insights:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch('/api/vertex-ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          searchType: 'semantic',
          limit: 10
        })
      });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const generateContent = async () => {
    if (!contentPrompt.trim()) return;

    try {
      const response = await fetch('/api/vertex-ai/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: contentPrompt,
          type: 'text',
          style: 'professional',
          length: 'medium'
        })
      });
      const data = await response.json();
      if (data.success) {
        // Handle generated content
        console.log('Generated content:', data.data);
      }
    } catch (error) {
      console.error('Error generating content:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVertexAIData();
    setRefreshing(false);
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'content': return FileText;
      case 'analytics': return BarChart3;
      case 'social': return Users;
      case 'workflow': return Workflow;
      case 'strategy': return Target;
      case 'search': return Search;
      default: return Brain;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'training': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading Vertex AI Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vertex AI Dashboard</h2>
          <p className="text-gray-600">Manage your AI agents and intelligent search</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Agent Space Overview */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center text-purple-900">
            <Brain className="h-5 w-5 mr-2" />
            Agent Space: 92e85bd3-51d9-41af-9f4c-1b6bb4da1dd7
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-900">{agents.length}</div>
              <div className="text-sm text-purple-700">Active Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-900">
                {agents.reduce((sum, agent) => sum + agent.performance.usageCount, 0)}
              </div>
              <div className="text-sm text-purple-700">Total Interactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-900">
                {Math.round(agents.reduce((sum, agent) => sum + agent.performance.accuracy, 0) / agents.length * 100) / 100}%
              </div>
              <div className="text-sm text-purple-700">Avg Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-900">
                {Math.round(agents.reduce((sum, agent) => sum + agent.performance.responseTime, 0) / agents.length * 100) / 100}s
              </div>
              <div className="text-sm text-purple-700">Avg Response Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab('search')}
                  >
                    <Search className="h-6 w-6 mb-2" />
                    <span className="text-sm">Search</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab('content')}
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    <span className="text-sm">Generate</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab('agents')}
                  >
                    <Brain className="h-6 w-6 mb-2" />
                    <span className="text-sm">Agents</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab('insights')}
                  >
                    <BarChart3 className="h-6 w-6 mb-2" />
                    <span className="text-sm">Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Content Generation Agent Created</p>
                        <p className="text-xs text-gray-500">2 minutes ago</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Success</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Search className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Semantic Search Executed</p>
                        <p className="text-xs text-gray-500">5 minutes ago</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Analytics Insights Generated</p>
                        <p className="text-xs text-gray-500">10 minutes ago</p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  AI Agents
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Agent
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.map((agent) => {
                  const IconComponent = getAgentTypeIcon(agent.type);
                  return (
                    <div key={agent.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <IconComponent className="h-5 w-5 text-gray-600" />
                            <h3 className="text-lg font-semibold">{agent.name}</h3>
                            <Badge className={getStatusColor(agent.status)}>
                              {agent.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{agent.description}</p>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Accuracy:</span>
                              <div className="font-semibold">{Math.round(agent.performance.accuracy * 100)}%</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Response Time:</span>
                              <div className="font-semibold">{agent.performance.responseTime}s</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Usage:</span>
                              <div className="font-semibold">{agent.performance.usageCount}</div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-1">
                              {agent.capabilities.map((capability, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {capability}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Intelligent Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Search your knowledge base..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Search Results</h4>
                    {searchResults.map((result) => (
                      <div key={result.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium">{result.title}</h5>
                          <Badge className="bg-blue-100 text-blue-800">
                            {Math.round(result.score * 100)}% match
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{result.content}</p>
                        {result.snippets && (
                          <div className="text-xs text-gray-500">
                            <strong>Snippets:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {result.snippets.map((snippet, idx) => (
                                <li key={idx}>{snippet}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Content Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Prompt
                  </label>
                  <textarea
                    placeholder="Describe what content you want to generate..."
                    value={contentPrompt}
                    onChange={(e) => setContentPrompt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={generateContent} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Content
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Options
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Analytics Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{insight.title}</h4>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(insight.type)}>
                          {insight.type}
                        </Badge>
                        <Badge className={`${getImpactColor(insight.impact)} bg-opacity-20`}>
                          {insight.impact} impact
                        </Badge>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Confidence</span>
                        <span>{Math.round(insight.confidence * 100)}%</span>
                      </div>
                      <Progress value={insight.confidence * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <h6 className="font-medium text-sm">Recommendations:</h6>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {insight.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-center">
                            <Lightbulb className="h-3 w-3 text-yellow-500 mr-2 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
