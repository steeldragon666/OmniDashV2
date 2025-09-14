'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Cpu, HardDrive, Activity, Zap, TrendingUp, Monitor,
  Database, Network, Gauge, BarChart3, LineChart,
  Play, Pause, Square, RefreshCw, Settings, AlertTriangle,
  CheckCircle2, Clock, Server, Cloud, Layers, GitBranch
} from 'lucide-react';

interface ClusterNode {
  id: string;
  name: string;
  gpuCount: number;
  gpuType: string;
  memory: number;
  utilization: number;
  temperature: number;
  powerConsumption: number;
  status: 'idle' | 'busy' | 'offline' | 'maintenance';
  currentJobs: string[];
}

interface ComputeCluster {
  id: string;
  name: string;
  provider: 'aws' | 'gcp' | 'azure' | 'on-premise';
  region: string;
  nodes: ClusterNode[];
  totalGPUs: number;
  availableGPUs: number;
  utilization: number;
  status: 'active' | 'scaling' | 'maintenance' | 'offline';
}

interface ParallelJob {
  id: string;
  name: string;
  type: 'training' | 'inference' | 'data-processing' | 'model-optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  requiredGPUs: number;
  progress: number;
  assignedNodes: string[];
  startTime?: Date;
  estimatedCompletion?: Date;
}

interface ProcessingMetrics {
  totalChunks: number;
  processedChunks: number;
  throughput: number;
  memoryUsage: number;
  workerUtilization: number;
}

export default function ParallelComputingDashboard() {
  const [clusters, setClusters] = useState<ComputeCluster[]>([]);
  const [jobs, setJobs] = useState<ParallelJob[]>([]);
  const [processingMetrics, setProcessingMetrics] = useState<ProcessingMetrics>({
    totalChunks: 0,
    processedChunks: 0,
    throughput: 0,
    memoryUsage: 0,
    workerUtilization: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // Initialize mock data
  useEffect(() => {
    initializeMockData();
    startRealTimeUpdates();
  }, []);

  const initializeMockData = () => {
    // Mock clusters
    const mockClusters: ComputeCluster[] = [
      {
        id: 'cluster-1',
        name: 'AWS P4D Cluster',
        provider: 'aws',
        region: 'us-east-1',
        nodes: [
          {
            id: 'node-1',
            name: 'p4d-24xlarge-1',
            gpuCount: 8,
            gpuType: 'A100',
            memory: 320,
            utilization: 85,
            temperature: 65,
            powerConsumption: 450,
            status: 'busy',
            currentJobs: ['job-1', 'job-2']
          },
          {
            id: 'node-2',
            name: 'p4d-24xlarge-2',
            gpuCount: 8,
            gpuType: 'A100',
            memory: 320,
            utilization: 92,
            temperature: 72,
            powerConsumption: 480,
            status: 'busy',
            currentJobs: ['job-3']
          }
        ],
        totalGPUs: 16,
        availableGPUs: 1,
        utilization: 88,
        status: 'active'
      },
      {
        id: 'cluster-2',
        name: 'GCP A2 Cluster',
        provider: 'gcp',
        region: 'us-central1',
        nodes: [
          {
            id: 'node-3',
            name: 'a2-highgpu-8g-1',
            gpuCount: 8,
            gpuType: 'A100',
            memory: 640,
            utilization: 45,
            temperature: 55,
            powerConsumption: 320,
            status: 'idle',
            currentJobs: []
          }
        ],
        totalGPUs: 8,
        availableGPUs: 8,
        utilization: 45,
        status: 'active'
      }
    ];

    // Mock jobs
    const mockJobs: ParallelJob[] = [
      {
        id: 'job-1',
        name: 'Transformer Training',
        type: 'training',
        priority: 'high',
        status: 'running',
        requiredGPUs: 4,
        progress: 65,
        assignedNodes: ['node-1'],
        startTime: new Date(Date.now() - 3600000),
        estimatedCompletion: new Date(Date.now() + 1800000)
      },
      {
        id: 'job-2',
        name: 'Data Preprocessing',
        type: 'data-processing',
        priority: 'medium',
        status: 'running',
        requiredGPUs: 2,
        progress: 30,
        assignedNodes: ['node-1'],
        startTime: new Date(Date.now() - 1800000)
      },
      {
        id: 'job-3',
        name: 'Model Inference',
        type: 'inference',
        priority: 'critical',
        status: 'running',
        requiredGPUs: 1,
        progress: 90,
        assignedNodes: ['node-2'],
        startTime: new Date(Date.now() - 900000)
      },
      {
        id: 'job-4',
        name: 'CNN Training',
        type: 'training',
        priority: 'low',
        status: 'queued',
        requiredGPUs: 8,
        progress: 0,
        assignedNodes: []
      }
    ];

    setClusters(mockClusters);
    setJobs(mockJobs);
  };

  const startRealTimeUpdates = () => {
    const interval = setInterval(() => {
      // Update cluster metrics
      setClusters(prev => prev.map(cluster => ({
        ...cluster,
        nodes: cluster.nodes.map(node => ({
          ...node,
          utilization: Math.min(100, node.utilization + (Math.random() - 0.5) * 5),
          temperature: Math.max(40, Math.min(85, node.temperature + (Math.random() - 0.5) * 2)),
          powerConsumption: Math.max(200, Math.min(600, node.powerConsumption + (Math.random() - 0.5) * 20))
        })),
        utilization: Math.min(100, cluster.utilization + (Math.random() - 0.5) * 3),
        availableGPUs: Math.max(0, cluster.availableGPUs + Math.floor((Math.random() - 0.5) * 2))
      })));

      // Update job progress
      setJobs(prev => prev.map(job => {
        if (job.status === 'running') {
          const newProgress = Math.min(100, job.progress + Math.random() * 2);
          return {
            ...job,
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : 'running'
          };
        }
        return job;
      }));

      // Update processing metrics
      setProcessingMetrics(prev => ({
        ...prev,
        processedChunks: prev.processedChunks + Math.floor(Math.random() * 5),
        throughput: prev.throughput + (Math.random() - 0.5) * 10,
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        workerUtilization: Math.max(0, Math.min(100, prev.workerUtilization + (Math.random() - 0.5) * 3))
      }));
    }, 2000);

    return () => clearInterval(interval);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      scaling: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-orange-100 text-orange-800',
      offline: 'bg-red-100 text-red-800',
      idle: 'bg-gray-100 text-gray-800',
      busy: 'bg-blue-100 text-blue-800',
      running: 'bg-blue-100 text-blue-800',
      queued: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'aws': return '🟠';
      case 'gcp': return '🔵';
      case 'azure': return '🔷';
      case 'on-premise': return '🖥️';
      default: return '☁️';
    }
  };

  const totalGPUs = clusters.reduce((sum, cluster) => sum + cluster.totalGPUs, 0);
  const availableGPUs = clusters.reduce((sum, cluster) => sum + cluster.availableGPUs, 0);
  const runningJobs = jobs.filter(job => job.status === 'running').length;
  const queuedJobs = jobs.filter(job => job.status === 'queued').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Maximum Parallel Computing Hub
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Real-time monitoring and management of distributed compute clusters
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Server className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-900">{totalGPUs}</div>
                  <div className="text-sm text-blue-600">Total GPUs</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-900">{availableGPUs}</div>
                  <div className="text-sm text-green-600">Available GPUs</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-900">{runningJobs}</div>
                  <div className="text-sm text-purple-600">Running Jobs</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-900">{queuedJobs}</div>
                  <div className="text-sm text-orange-600">Queued Jobs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="clusters" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clusters">Compute Clusters</TabsTrigger>
            <TabsTrigger value="jobs">Parallel Jobs</TabsTrigger>
            <TabsTrigger value="processing">Data Processing</TabsTrigger>
            <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
          </TabsList>

          {/* Compute Clusters Tab */}
          <TabsContent value="clusters" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {clusters.map(cluster => (
                <Card key={cluster.id} className="border-2 border-gray-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getProviderIcon(cluster.provider)}</span>
                        <div>
                          <div className="text-lg font-bold">{cluster.name}</div>
                          <div className="text-sm text-gray-600">{cluster.provider.toUpperCase()} • {cluster.region}</div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(cluster.status)}>
                        {cluster.status.toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-sm text-blue-600">Total GPUs</div>
                        <div className="text-2xl font-bold text-blue-900">{cluster.totalGPUs}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-sm text-green-600">Available</div>
                        <div className="text-2xl font-bold text-green-900">{cluster.availableGPUs}</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Cluster Utilization</span>
                        <span>{cluster.utilization.toFixed(1)}%</span>
                      </div>
                      <Progress value={cluster.utilization} className="h-3" />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Nodes ({cluster.nodes.length})</div>
                      {cluster.nodes.map(node => (
                        <div key={node.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              node.status === 'busy' ? 'bg-red-500' : 
                              node.status === 'idle' ? 'bg-green-500' : 'bg-gray-500'
                            }`} />
                            <span className="text-sm font-medium">{node.name}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {node.gpuCount} GPUs • {node.utilization.toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Parallel Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card className="border-2 border-purple-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <GitBranch className="h-5 w-5 mr-2 text-purple-600" />
                    Parallel Job Queue
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Play className="h-4 w-4 mr-1" />
                      Start All
                    </Button>
                    <Button size="sm" variant="outline">
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {jobs.map(job => (
                    <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Layers className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold">{job.name}</div>
                          <div className="text-sm text-gray-600">
                            {job.type} • {job.requiredGPUs} GPUs • {job.assignedNodes.length} nodes
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className={getPriorityColor(job.priority)}>
                          {job.priority.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.toUpperCase()}
                        </Badge>
                        <div className="w-24">
                          <Progress value={job.progress} className="h-2" />
                          <div className="text-xs text-center mt-1">{job.progress.toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Processing Tab */}
          <TabsContent value="processing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-2 border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2 text-green-600" />
                    Processing Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-sm text-blue-600">Total Chunks</div>
                      <div className="text-2xl font-bold text-blue-900">{processingMetrics.totalChunks}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-sm text-green-600">Processed</div>
                      <div className="text-2xl font-bold text-green-900">{processingMetrics.processedChunks}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Processing Progress</span>
                      <span>{((processingMetrics.processedChunks / Math.max(processingMetrics.totalChunks, 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(processingMetrics.processedChunks / Math.max(processingMetrics.totalChunks, 1)) * 100} className="h-3" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Throughput</span>
                      <span className="font-semibold">{processingMetrics.throughput.toFixed(1)} chunks/sec</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <span className="font-semibold">{processingMetrics.memoryUsage.toFixed(1)} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Worker Utilization</span>
                      <span className="font-semibold">{processingMetrics.workerUtilization.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-orange-600" />
                    Processing Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => setIsProcessing(!isProcessing)}
                      variant={isProcessing ? "destructive" : "default"}
                    >
                      {isProcessing ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Stop Processing
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Start Processing
                        </>
                      )}
                    </Button>
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Active Workers</span>
                      <span className="font-semibold">8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Batch Size</span>
                      <span className="font-semibold">1024</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Compression</span>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Parallel Augmentation</span>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Real-time Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-2 border-indigo-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
                    System Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <LineChart className="h-12 w-12 text-indigo-600 mx-auto" />
                      <div className="text-sm text-gray-600">Real-time Performance Metrics</div>
                      <div className="text-2xl font-bold text-indigo-600">98.5%</div>
                      <div className="flex items-center justify-center space-x-2 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Optimal</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
                  <CardTitle className="flex items-center">
                    <Network className="h-5 w-5 mr-2 text-teal-600" />
                    Network I/O
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Bandwidth</span>
                      <span className="font-semibold">2.4 GB/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Latency</span>
                      <span className="font-semibold">0.8 ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Packet Loss</span>
                      <span className="font-semibold text-green-600">0.01%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Connections</span>
                      <span className="font-semibold">1,247</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-pink-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50">
                  <CardTitle className="flex items-center">
                    <Gauge className="h-5 w-5 mr-2 text-pink-600" />
                    Resource Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>CPU Usage</span>
                        <span>78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Memory Usage</span>
                        <span>65%</span>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>GPU Usage</span>
                        <span>92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Storage I/O</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
