import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Database, 
  Storage, 
  Workflow, 
  Server, 
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
  Network
} from 'lucide-react';

interface GCPHealth {
  bigquery: boolean;
  storage: boolean;
  workflows: boolean;
  dataproc: boolean;
  status: 'healthy' | 'unhealthy' | 'error';
  timestamp: string;
}

interface BigQueryDataset {
  id: string;
  name: string;
  description: string;
  location: string;
  createdAt: string;
  tables: BigQueryTable[];
}

interface BigQueryTable {
  id: string;
  name: string;
  description: string;
  rowCount: number;
  sizeBytes: number;
  lastModified: string;
  schema: any[];
}

interface StorageBucket {
  name: string;
  location: string;
  storageClass: string;
  createdAt: string;
  sizeBytes: number;
  objectCount: number;
}

interface WorkflowExecution {
  id: string;
  name: string;
  state: 'ACTIVE' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  startTime: string;
  endTime?: string;
  result?: any;
  error?: any;
}

interface BusinessIntelligenceMetrics {
  total_customers: number;
  avg_health_score: number;
  avg_churn_risk: number;
  total_revenue: number;
}

export function GCPIntegrationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [health, setHealth] = useState<GCPHealth | null>(null);
  const [datasets, setDatasets] = useState<BigQueryDataset[]>([]);
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [biMetrics, setBiMetrics] = useState<BusinessIntelligenceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGCPData();
  }, []);

  const loadGCPData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadHealthCheck(),
        loadBigQueryData(),
        loadStorageData(),
        loadWorkflowsData(),
        loadBusinessIntelligenceMetrics()
      ]);
    } catch (error) {
      console.error('Error loading GCP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthCheck = async () => {
    try {
      const response = await fetch('/api/gcp/health');
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Error loading health check:', error);
    }
  };

  const loadBigQueryData = async () => {
    try {
      const response = await fetch('/api/gcp/bigquery/datasets');
      const data = await response.json();
      setDatasets(data.datasets || []);
    } catch (error) {
      console.error('Error loading BigQuery data:', error);
    }
  };

  const loadStorageData = async () => {
    try {
      const response = await fetch('/api/gcp/storage/buckets');
      const data = await response.json();
      setBuckets(data.buckets || []);
    } catch (error) {
      console.error('Error loading storage data:', error);
    }
  };

  const loadWorkflowsData = async () => {
    try {
      const response = await fetch('/api/gcp/workflows');
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Error loading workflows data:', error);
    }
  };

  const loadBusinessIntelligenceMetrics = async () => {
    try {
      const response = await fetch('/api/gcp/business-intelligence/metrics');
      const data = await response.json();
      setBiMetrics(data.metrics || null);
    } catch (error) {
      console.error('Error loading BI metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGCPData();
    setRefreshing(false);
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading GCP Integration Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">GCP Integration Dashboard</h2>
          <p className="text-gray-600">Monitor your Google Cloud Platform infrastructure</p>
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
          <Card className={`${health.status === 'healthy' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Status</p>
                  <p className={`text-lg font-bold ${health.status === 'healthy' ? 'text-green-900' : 'text-red-900'}`}>
                    {health.status === 'healthy' ? 'Healthy' : 'Issues Detected'}
                  </p>
                </div>
                {health.status === 'healthy' ? (
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
                  <p className="text-sm font-medium text-gray-600">BigQuery</p>
                  <p className={`text-lg font-bold ${getHealthColor(health.bigquery)}`}>
                    {health.bigquery ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
                {getHealthIcon(health.bigquery)}
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

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Workflows</p>
                  <p className={`text-lg font-bold ${getHealthColor(health.workflows)}`}>
                    {health.workflows ? 'Active' : 'Inactive'}
                  </p>
                </div>
                {getHealthIcon(health.workflows)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Business Intelligence Metrics */}
      {biMetrics && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center text-purple-900">
              <Brain className="h-5 w-5 mr-2" />
              Unified Business Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {formatNumber(biMetrics.total_customers)}
                </div>
                <div className="text-sm text-purple-700">Total Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {biMetrics.avg_health_score.toFixed(1)}%
                </div>
                <div className="text-sm text-purple-700">Avg Health Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {biMetrics.avg_churn_risk.toFixed(1)}%
                </div>
                <div className="text-sm text-purple-700">Avg Churn Risk</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-900">
                  ${formatNumber(biMetrics.total_revenue)}
                </div>
                <div className="text-sm text-purple-700">Total Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bigquery">BigQuery</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="dataproc">Dataproc</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <p className="text-sm font-medium">Unified Business Intelligence Dataset Created</p>
                        <p className="text-xs text-gray-500">2 minutes ago</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Success</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Database className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">BigQuery Query Executed</p>
                        <p className="text-xs text-gray-500">5 minutes ago</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Workflow className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Workflow Execution Started</p>
                        <p className="text-xs text-gray-500">10 minutes ago</p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">Running</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resource Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Resource Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">BigQuery Storage</span>
                      <span className="text-sm text-gray-600">2.4 GB</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Cloud Storage</span>
                      <span className="text-sm text-gray-600">15.8 GB</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Workflow Executions</span>
                      <span className="text-sm text-gray-600">12/50</span>
                    </div>
                    <Progress value={24} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Dataproc Clusters</span>
                      <span className="text-sm text-gray-600">1/3</span>
                    </div>
                    <Progress value={33} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bigquery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  BigQuery Datasets
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Dataset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {datasets.map((dataset) => (
                  <div key={dataset.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{dataset.name}</h3>
                          <Badge variant="outline">{dataset.location}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{dataset.description}</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Tables:</span>
                            <div className="font-semibold">{dataset.tables.length}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Created:</span>
                            <div className="font-semibold">
                              {new Date(dataset.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Size:</span>
                            <div className="font-semibold">
                              {formatBytes(dataset.tables.reduce((sum, table) => sum + table.sizeBytes, 0))}
                            </div>
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Storage className="h-5 w-5 mr-2" />
                  Cloud Storage Buckets
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Bucket
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {buckets.map((bucket) => (
                  <div key={bucket.name} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{bucket.name}</h3>
                          <Badge variant="outline">{bucket.storageClass}</Badge>
                          <Badge variant="outline">{bucket.location}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Objects:</span>
                            <div className="font-semibold">{formatNumber(bucket.objectCount)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Size:</span>
                            <div className="font-semibold">{formatBytes(bucket.sizeBytes)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Created:</span>
                            <div className="font-semibold">
                              {new Date(bucket.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Browse
                        </Button>
                        <Button size="sm" variant="outline">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Workflow className="h-5 w-5 mr-2" />
                  Google Cloud Workflows
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Workflow
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{workflow.name}</h3>
                          <Badge className={
                            workflow.state === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            workflow.state === 'SUCCEEDED' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {workflow.state}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Created:</span>
                            <div className="font-semibold">
                              {new Date(workflow.createTime).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Last Updated:</span>
                            <div className="font-semibold">
                              {new Date(workflow.updateTime).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Play className="h-4 w-4 mr-2" />
                          Execute
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dataproc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Dataproc Clusters
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Cluster
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Clusters Found</h3>
                <p className="text-gray-500 mb-4">
                  Create your first Dataproc cluster to start processing big data
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Cluster
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
