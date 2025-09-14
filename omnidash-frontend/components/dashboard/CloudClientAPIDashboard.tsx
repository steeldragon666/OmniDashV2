import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Eye,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Zap,
  Brain,
  Target,
  Users,
  DollarSign,
  Clock,
  Cpu,
  HardDrive,
  Network,
  FileText,
  Database,
  Server,
  Cloud,
  Sparkles,
  PieChart,
  LineChart,
  Scatter
} from 'lucide-react';

interface CloudClientAPIHealth {
  chartService: boolean;
  processService: boolean;
  storage: boolean;
  overall: boolean;
}

interface ServiceStatus {
  chartService: {
    name: string;
    status: string;
    url: string;
    lastUpdated: string;
  };
  processService: {
    name: string;
    status: string;
    url: string;
    lastUpdated: string;
  };
}

interface ChartRequest {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap';
  data: any[];
  options?: {
    title?: string;
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
    width?: number;
    height?: number;
  };
}

export function CloudClientAPIDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [health, setHealth] = useState<CloudClientAPIHealth | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedCharts, setGeneratedCharts] = useState<string[]>([]);
  const [processingResults, setProcessingResults] = useState<any[]>([]);

  useEffect(() => {
    loadCloudClientAPIData();
  }, []);

  const loadCloudClientAPIData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadHealthCheck(),
        loadServiceStatus()
      ]);
    } catch (error) {
      console.error('Error loading Cloud Client API data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthCheck = async () => {
    try {
      const response = await fetch('/api/cloud-client-api/health');
      const data = await response.json();
      setHealth(data.health);
    } catch (error) {
      console.error('Error loading health check:', error);
    }
  };

  const loadServiceStatus = async () => {
    try {
      const response = await fetch('/api/cloud-client-api/services/status');
      const data = await response.json();
      setServiceStatus(data.data);
    } catch (error) {
      console.error('Error loading service status:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCloudClientAPIData();
    setRefreshing(false);
  };

  const generateSampleChart = async (type: string) => {
    try {
      const sampleData = [
        { month: 'Jan', revenue: 12000, customers: 150 },
        { month: 'Feb', revenue: 15000, customers: 180 },
        { month: 'Mar', revenue: 18000, customers: 220 },
        { month: 'Apr', revenue: 16000, customers: 200 },
        { month: 'May', revenue: 20000, customers: 250 },
        { month: 'Jun', revenue: 22000, customers: 280 }
      ];

      const response = await fetch('/api/cloud-client-api/charts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data: sampleData,
          options: {
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
            xAxis: 'month',
            yAxis: 'revenue',
            colors: ['#3B82F6', '#10B981', '#F59E0B']
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        setGeneratedCharts(prev => [...prev, result.data]);
      }
    } catch (error) {
      console.error('Error generating chart:', error);
    }
  };

  const processSampleData = async (operation: string) => {
    try {
      const sampleData = [
        { id: 1, name: 'Customer A', revenue: 5000, region: 'North' },
        { id: 2, name: 'Customer B', revenue: 7500, region: 'South' },
        { id: 3, name: 'Customer C', revenue: 3000, region: 'East' },
        { id: 4, name: 'Customer D', revenue: 9000, region: 'West' }
      ];

      const response = await fetch('/api/cloud-client-api/data/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          data: sampleData,
          config: {
            columns: ['id', 'name', 'revenue', 'region'],
            filters: operation === 'filter' ? { revenue: { min: 5000 } } : undefined,
            aggregations: operation === 'aggregate' ? { revenue: 'sum', customers: 'count' } : undefined
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        setProcessingResults(prev => [...prev, {
          operation,
          result: result.data,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error processing data:', error);
    }
  };

  const getHealthIcon = (status: boolean) => {
    return status ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getHealthColor = (status: boolean) => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line': return LineChart;
      case 'bar': return BarChart3;
      case 'pie': return PieChart;
      case 'scatter': return Scatter;
      default: return BarChart3;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading Cloud Client API Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cloud Client API Dashboard</h2>
          <p className="text-gray-600">Manage your Cloud Run services and data processing</p>
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

      {/* Health Status Overview */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={`${health.overall ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Status</p>
                  <p className={`text-lg font-bold ${health.overall ? 'text-green-900' : 'text-red-900'}`}>
                    {health.overall ? 'Healthy' : 'Issues Detected'}
                  </p>
                </div>
                {health.overall ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Chart Service</p>
                  <p className={`text-lg font-bold ${getHealthColor(health.chartService)}`}>
                    {health.chartService ? 'Active' : 'Inactive'}
                  </p>
                </div>
                {getHealthIcon(health.chartService)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Process Service</p>
                  <p className={`text-lg font-bold ${getHealthColor(health.processService)}`}>
                    {health.processService ? 'Active' : 'Inactive'}
                  </p>
                </div>
                {getHealthIcon(health.processService)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cloud Storage</p>
                  <p className={`text-lg font-bold ${getHealthColor(health.storage)}`}>
                    {health.storage ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
                {getHealthIcon(health.storage)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service URLs */}
      {serviceStatus && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Cloud className="h-5 w-5 mr-2" />
              Cloud Run Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Chart Service</h4>
                <p className="text-sm text-blue-700 mb-2">
                  <strong>URL:</strong> {serviceStatus.chartService.url}
                </p>
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Status:</strong> {serviceStatus.chartService.status}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Last Updated:</strong> {new Date(serviceStatus.chartService.lastUpdated).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Process Service</h4>
                <p className="text-sm text-blue-700 mb-2">
                  <strong>URL:</strong> {serviceStatus.processService.url}
                </p>
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Status:</strong> {serviceStatus.processService.status}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Last Updated:</strong> {new Date(serviceStatus.processService.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                    onClick={() => generateSampleChart('line')}
                  >
                    <LineChart className="h-6 w-6 mb-2" />
                    <span className="text-sm">Line Chart</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => generateSampleChart('bar')}
                  >
                    <BarChart3 className="h-6 w-6 mb-2" />
                    <span className="text-sm">Bar Chart</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => generateSampleChart('pie')}
                  >
                    <PieChart className="h-6 w-6 mb-2" />
                    <span className="text-sm">Pie Chart</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => processSampleData('aggregate')}
                  >
                    <Database className="h-6 w-6 mb-2" />
                    <span className="text-sm">Aggregate</span>
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
                  {generatedCharts.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Chart Generated</p>
                          <p className="text-xs text-gray-500">Just now</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Success</Badge>
                    </div>
                  )}
                  {processingResults.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Database className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">Data Processed</p>
                          <p className="text-xs text-gray-500">Just now</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Server className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Service Health Check</p>
                        <p className="text-xs text-gray-500">1 minute ago</p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">Healthy</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Chart Generation
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Chart
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {['line', 'bar', 'pie', 'scatter', 'area', 'heatmap'].map((type) => {
                  const IconComponent = getChartIcon(type);
                  return (
                    <Button
                      key={type}
                      variant="outline"
                      className="h-24 flex flex-col items-center justify-center"
                      onClick={() => generateSampleChart(type)}
                    >
                      <IconComponent className="h-6 w-6 mb-2" />
                      <span className="text-sm capitalize">{type} Chart</span>
                    </Button>
                  );
                })}
              </div>
              
              {generatedCharts.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Generated Charts</h4>
                  {generatedCharts.map((chartUrl, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Chart #{index + 1}</p>
                          <p className="text-sm text-gray-600">{chartUrl}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cpu className="h-5 w-5 mr-2" />
                  Data Processing
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Process Data
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {['transform', 'aggregate', 'filter', 'ml_predict'].map((operation) => (
                  <Button
                    key={operation}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => processSampleData(operation)}
                  >
                    <Database className="h-6 w-6 mb-2" />
                    <span className="text-sm capitalize">{operation}</span>
                  </Button>
                ))}
              </div>
              
              {processingResults.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Processing Results</h4>
                  {processingResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium capitalize">{result.operation} Operation</p>
                          <p className="text-sm text-gray-600">
                            {new Date(result.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <pre className="text-sm text-gray-700 overflow-x-auto">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <HardDrive className="h-5 w-5 mr-2" />
                  Cloud Storage
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Data
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Raw Data Bucket</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    raw_data-cloud-client-api-f921-omnidashv2
                  </p>
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                    <Button size="sm" variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Processed Data Bucket</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    processed-cloud-client-api-f921-omnidashv2
                  </p>
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                    <Button size="sm" variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                API Usage Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">24</div>
                  <div className="text-sm text-blue-700">Charts Generated</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">156</div>
                  <div className="text-sm text-green-700">Data Operations</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">98.5%</div>
                  <div className="text-sm text-purple-700">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
