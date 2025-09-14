'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Zap, Brain, Cloud, Settings, Play, Pause, 
  CheckCircle2, AlertTriangle, TrendingUp, Monitor, 
  Cpu, HardDrive, Activity, Clock, Globe, Database,
  Rocket, Target, BarChart3, LineChart, PieChart,
  RefreshCw, Download, Upload, Save, Share, Eye,
  Sparkles, Award, Users, Calendar, Mail, Smartphone,
  Copy, Plus, Minus, Maximize2, Minimize2
} from 'lucide-react';

interface TrainingConfig {
  budget: number;
  priority: 'speed' | 'cost' | 'quality';
  cloudProvider: 'aws' | 'gcp' | 'azure';
  dataSize: 'small' | 'medium' | 'large' | 'xlarge';
  modelComplexity: 'simple' | 'standard' | 'advanced' | 'enterprise';
  projectName: string;
  modelArchitecture: string;
  optimizationStrategy: string;
  learningRateSchedule: string;
  regularization: string;
}

interface TrainingStatus {
  status: 'idle' | 'configuring' | 'launching' | 'training' | 'validating' | 'deploying' | 'complete' | 'error';
  progress: number;
  currentStep: string;
  gpusActive: number;
  totalGpus: number;
  costSpent: number;
  estimatedCompletion: string;
  currentEpoch: number;
  totalEpochs: number;
  bestAccuracy: number;
  trainingLoss: number;
  jobId?: string;
  startTime?: Date;
  endTime?: Date;
}

interface OptimizedConfig {
  gpus: number;
  nodes: number;
  instanceType: string;
  estimatedTime: string;
  datasamples: string;
  expectedAccuracy: string;
  costBreakdown: {
    compute: number;
    storage: number;
    network: number;
  };
}

interface TrainingJob {
  id: string;
  name: string;
  status: string;
  cost: number;
  accuracy: number;
  startDate: string;
  endDate?: string;
  config: TrainingConfig;
}

export default function EnterpriseAITrainingHub() {
  const [config, setConfig] = useState<TrainingConfig>({
    budget: 5000,
    priority: 'quality',
    cloudProvider: 'aws',
    dataSize: 'large',
    modelComplexity: 'advanced',
    projectName: 'Enterprise Intelligence Model',
    modelArchitecture: 'transformer',
    optimizationStrategy: 'adamw',
    learningRateSchedule: 'cosine',
    regularization: 'dropout'
  });

  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    status: 'idle',
    progress: 0,
    currentStep: 'Ready to start',
    gpusActive: 0,
    totalGpus: 0,
    costSpent: 0,
    estimatedCompletion: '--',
    currentEpoch: 0,
    totalEpochs: 0,
    bestAccuracy: 0,
    trainingLoss: 0
  });

  const [optimizedConfig, setOptimizedConfig] = useState<OptimizedConfig | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState('idle');
  const [trainingHistory, setTrainingHistory] = useState<TrainingJob[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  // Calculate optimal configuration based on budget
  const calculateOptimalConfig = (budget: number, priority: string): OptimizedConfig => {
    let baseConfig: OptimizedConfig;
    
    if (budget < 1000) {
      baseConfig = {
        gpus: 8,
        nodes: 1,
        instanceType: 'g4dn.12xlarge',
        estimatedTime: '6 hours',
        datasamples: '5M',
        expectedAccuracy: '85%',
        costBreakdown: {
          compute: budget * 0.8,
          storage: budget * 0.1,
          network: budget * 0.1
        }
      };
    } else if (budget < 5000) {
      baseConfig = {
        gpus: 32,
        nodes: 4,
        instanceType: 'p3.16xlarge',
        estimatedTime: '3 hours',
        datasamples: '25M',
        expectedAccuracy: '92%',
        costBreakdown: {
          compute: budget * 0.85,
          storage: budget * 0.08,
          network: budget * 0.07
        }
      };
    } else if (budget < 15000) {
      baseConfig = {
        gpus: 128,
        nodes: 16,
        instanceType: 'p4d.24xlarge',
        estimatedTime: '2 hours',
        datasamples: '100M',
        expectedAccuracy: '96%',
        costBreakdown: {
          compute: budget * 0.87,
          storage: budget * 0.08,
          network: budget * 0.05
        }
      };
    } else {
      baseConfig = {
        gpus: 512,
        nodes: 64,
        instanceType: 'p4d.24xlarge',
        estimatedTime: '1 hour',
        datasamples: '500M',
        expectedAccuracy: '98%',
        costBreakdown: {
          compute: budget * 0.9,
          storage: budget * 0.07,
          network: budget * 0.03
        }
      };
    }

    // Adjust for priority
    if (priority === 'speed') {
      baseConfig.gpus = Math.floor(baseConfig.gpus * 1.5);
      baseConfig.nodes = Math.floor(baseConfig.nodes * 1.5);
      baseConfig.estimatedTime = (parseFloat(baseConfig.estimatedTime) * 0.7).toFixed(1) + ' hours';
    } else if (priority === 'cost') {
      baseConfig.gpus = Math.floor(baseConfig.gpus * 0.7);
      baseConfig.nodes = Math.floor(baseConfig.nodes * 0.7);
      baseConfig.instanceType = baseConfig.instanceType.includes('p4d') ? 'p3.16xlarge' : 'g4dn.12xlarge';
    }

    return baseConfig;
  };

  // Simulate training workflow
  const startTraining = async () => {
    setIsTraining(true);
    const jobId = `job_${Date.now()}`;
    const startTime = new Date();
    
    setTrainingStatus(prev => ({ 
      ...prev, 
      status: 'configuring', 
      progress: 5, 
      jobId,
      startTime
    }));

    // Step 1: Configure infrastructure
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTrainingStatus(prev => ({ 
      ...prev, 
      status: 'launching', 
      progress: 15, 
      currentStep: 'Launching cloud infrastructure...',
      totalGpus: optimizedConfig?.gpus || 0
    }));

    // Step 2: Launch GPUs
    await new Promise(resolve => setTimeout(resolve, 3000));
    setTrainingStatus(prev => ({ 
      ...prev, 
      status: 'training', 
      progress: 25, 
      currentStep: 'Starting distributed training...',
      gpusActive: optimizedConfig?.gpus || 0,
      totalEpochs: 50
    }));

    // Step 3: Simulate training progress
    for (let epoch = 1; epoch <= 50; epoch++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const progress = 25 + (epoch / 50) * 60;
      const accuracy = 0.6 + (epoch / 50) * 0.35 + Math.random() * 0.05;
      const loss = 2.0 - (epoch / 50) * 1.5 + Math.random() * 0.1;
      const costSpent = config.budget * (progress / 100);

      setTrainingStatus(prev => ({
        ...prev,
        progress,
        currentStep: `Training epoch ${epoch}/50`,
        currentEpoch: epoch,
        bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
        trainingLoss: loss,
        costSpent
      }));
    }

    // Step 4: Validation
    setTrainingStatus(prev => ({ 
      ...prev, 
      status: 'validating', 
      progress: 90, 
      currentStep: 'Validating model performance...' 
    }));
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Deployment
    setTrainingStatus(prev => ({ 
      ...prev, 
      status: 'deploying', 
      progress: 95, 
      currentStep: 'Deploying to production...' 
    }));
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Complete
    const endTime = new Date();
    setTrainingStatus(prev => ({ 
      ...prev, 
      status: 'complete', 
      progress: 100, 
      currentStep: 'Training complete! Models deployed.',
      estimatedCompletion: 'Now',
      endTime
    }));

    // Add to training history
    const newJob: TrainingJob = {
      id: jobId,
      name: config.projectName,
      status: 'completed',
      cost: config.budget,
      accuracy: trainingStatus.bestAccuracy * 100,
      startDate: startTime.toISOString().split('T')[0],
      endDate: endTime.toISOString().split('T')[0],
      config: { ...config }
    };

    setTrainingHistory(prev => [newJob, ...prev]);
    setIsTraining(false);
    setDeploymentStatus('complete');
  };

  // Auto-calculate when budget changes
  useEffect(() => {
    const optimal = calculateOptimalConfig(config.budget, config.priority);
    setOptimizedConfig(optimal);
  }, [config.budget, config.priority]);

  const getStatusColor = (status: string) => {
    const colors = {
      idle: 'bg-gray-100 text-gray-800',
      configuring: 'bg-blue-100 text-blue-800',
      launching: 'bg-yellow-100 text-yellow-800',
      training: 'bg-purple-100 text-purple-800',
      validating: 'bg-orange-100 text-orange-800',
      deploying: 'bg-green-100 text-green-800',
      complete: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      idle: Clock,
      configuring: Settings,
      launching: Rocket,
      training: Brain,
      validating: CheckCircle2,
      deploying: Upload,
      complete: Award,
      error: AlertTriangle
    };
    return icons[status] || Clock;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-xl border-2 border-blue-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-sm">
                <Brain className="h-4 w-4 mr-2 text-blue-600" />
                AI Training Hub
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Status:</span>
                <Badge className={getStatusColor(trainingStatus.status)}>
                  {trainingStatus.status.toUpperCase()}
                </Badge>
              </div>
              {trainingStatus.status === 'training' && (
                <>
                  <div className="flex justify-between text-xs">
                    <span>Progress:</span>
                    <span>{trainingStatus.progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={trainingStatus.progress} className="h-1" />
                </>
              )}
              <div className="flex justify-between text-xs">
                <span>Cost Spent:</span>
                <span>${trainingStatus.costSpent.toFixed(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Enterprise AI Training Hub
            </h1>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              className="ml-4"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-lg text-gray-600">
            Input your budget, hit GO, and watch your AI system train across hundreds of GPUs
          </p>
        </div>

        {/* Main Training Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Configuration */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Budget Input */}
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Training Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Budget Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      value={config.budget}
                      onChange={(e) => setConfig(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                      className="pl-10 text-lg font-semibold"
                      placeholder="5000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Project Name</label>
                  <Input
                    value={config.projectName}
                    onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value }))}
                    placeholder="Enterprise Intelligence Model"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <Select value={config.priority} onValueChange={(value) => setConfig(prev => ({ ...prev, priority: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cost">💰 Cost Optimized</SelectItem>
                      <SelectItem value="speed">⚡ Speed Optimized</SelectItem>
                      <SelectItem value="quality">🎯 Quality Optimized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Cloud Provider</label>
                  <Select value={config.cloudProvider} onValueChange={(value) => setConfig(prev => ({ ...prev, cloudProvider: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aws">🟠 Amazon AWS</SelectItem>
                      <SelectItem value="gcp">🔵 Google Cloud</SelectItem>
                      <SelectItem value="azure">🔷 Microsoft Azure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Dataset Size</label>
                  <Select value={config.dataSize} onValueChange={(value) => setConfig(prev => ({ ...prev, dataSize: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">📊 Small (1M samples)</SelectItem>
                      <SelectItem value="medium">📈 Medium (10M samples)</SelectItem>
                      <SelectItem value="large">📉 Large (100M samples)</SelectItem>
                      <SelectItem value="xlarge">🗃️ XLarge (1B+ samples)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Optimized Configuration Display */}
            {optimizedConfig && (
              <Card className="border-2 border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                    AI-Optimized Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-sm text-blue-600">Total GPUs</div>
                      <div className="text-2xl font-bold text-blue-900">{optimizedConfig.gpus}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-sm text-purple-600">Nodes</div>
                      <div className="text-2xl font-bold text-purple-900">{optimizedConfig.nodes}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-sm text-green-600">Est. Time</div>
                      <div className="text-lg font-bold text-green-900">{optimizedConfig.estimatedTime}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-sm text-orange-600">Accuracy</div>
                      <div className="text-lg font-bold text-orange-900">{optimizedConfig.expectedAccuracy}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Instance Type</div>
                    <Badge className="bg-gray-100 text-gray-800 font-mono">
                      {optimizedConfig.instanceType}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Dataset</div>
                    <div className="text-lg font-semibold text-gray-700">{optimizedConfig.datasamples} samples</div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Middle Column - Training Control & Status */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Big GO Button */}
            <Card className="border-4 border-gradient-to-r from-green-400 to-blue-500 shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  {!isTraining ? (
                    <>
                      <Button
                        onClick={startTraining}
                        disabled={!optimizedConfig || config.budget < 100}
                        className="w-full h-20 text-2xl font-bold bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
                      >
                        <Rocket className="h-8 w-8 mr-3" />
                        START AI TRAINING
                      </Button>
                      <p className="text-sm text-gray-600">
                        This will launch {optimizedConfig?.gpus} GPUs and begin training
                      </p>
                    </>
                  ) : (
                    <>
                      <Button
                        disabled
                        className="w-full h-20 text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg"
                      >
                        <RefreshCw className="h-8 w-8 mr-3 animate-spin" />
                        TRAINING IN PROGRESS
                      </Button>
                      <p className="text-sm text-gray-600">
                        Training will complete automatically
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Training Status */}
            <Card className="border-2 border-purple-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    {React.createElement(getStatusIcon(trainingStatus.status), { 
                      className: "h-5 w-5 mr-2 text-purple-600" 
                    })}
                    Training Status
                  </div>
                  <Badge className={getStatusColor(trainingStatus.status)}>
                    {trainingStatus.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Progress</span>
                    <span>{trainingStatus.progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={trainingStatus.progress} className="h-3" />
                </div>

                <div className="text-sm text-gray-600">
                  <strong>Current Step:</strong> {trainingStatus.currentStep}
                </div>

                {trainingStatus.jobId && (
                  <div className="text-xs text-gray-500">
                    <strong>Job ID:</strong> {trainingStatus.jobId}
                  </div>
                )}

                {trainingStatus.status === 'training' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Epoch</div>
                      <div className="text-lg font-bold">{trainingStatus.currentEpoch}/{trainingStatus.totalEpochs}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Best Accuracy</div>
                      <div className="text-lg font-bold text-green-600">{(trainingStatus.bestAccuracy * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Training Loss</div>
                      <div className="text-lg font-bold">{trainingStatus.trainingLoss.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Cost Spent</div>
                      <div className="text-lg font-bold text-orange-600">${trainingStatus.costSpent.toFixed(0)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GPU Cluster Status */}
            <Card className="border-2 border-orange-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
                <CardTitle className="flex items-center">
                  <Cpu className="h-5 w-5 mr-2 text-orange-600" />
                  GPU Cluster Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active GPUs</span>
                  <span className="text-2xl font-bold">
                    {trainingStatus.gpusActive}/{trainingStatus.totalGpus}
                  </span>
                </div>

                {trainingStatus.gpusActive > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: Math.min(trainingStatus.totalGpus, 16) }, (_, i) => (
                      <div
                        key={i}
                        className={`h-4 w-full rounded ${
                          i < trainingStatus.gpusActive ? 'bg-green-400' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  {trainingStatus.totalGpus > 16 && `Showing 16 of ${trainingStatus.totalGpus} GPUs`}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column - Real-time Monitoring */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Real-time Metrics */}
            <Card className="border-2 border-indigo-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-indigo-600" />
                  Real-time Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                  {trainingStatus.status === 'training' ? (
                    <div className="text-center space-y-2">
                      <LineChart className="h-12 w-12 text-indigo-600 mx-auto" />
                      <div className="text-sm text-gray-600">Training Loss</div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {trainingStatus.trainingLoss.toFixed(4)}
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Improving</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <div className="text-sm">Waiting for training to start</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cost Tracking */}
            <Card className="border-2 border-green-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Cost Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Budget</span>
                    <span className="font-bold">${config.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Spent</span>
                    <span className="font-bold text-orange-600">${trainingStatus.costSpent.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Remaining</span>
                    <span className="font-bold text-green-600">
                      ${(config.budget - trainingStatus.costSpent).toFixed(0)}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Budget Used</span>
                      <span>{((trainingStatus.costSpent / config.budget) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={(trainingStatus.costSpent / config.budget) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deployment Status */}
            <Card className="border-2 border-teal-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
                <CardTitle className="flex items-center">
                  <Cloud className="h-5 w-5 mr-2 text-teal-600" />
                  Model Deployment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {deploymentStatus === 'idle' ? (
                  <div className="text-center text-gray-400 py-4">
                    <Upload className="h-8 w-8 mx-auto mb-2" />
                    <div className="text-sm">Awaiting model completion</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Models Deployed Successfully</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>API Endpoint</span>
                        <Badge className="bg-green-100 text-green-800">Live</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Dashboard</span>
                        <Badge className="bg-blue-100 text-blue-800">Updated</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Mobile App</span>
                        <Badge className="bg-purple-100 text-purple-800">Synced</Badge>
                      </div>
                    </div>

                    <Button className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white">
                      <Eye className="h-4 w-4 mr-2" />
                      View Live Models
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Bottom Section - Advanced Options & Results */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Training Overview</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
            <TabsTrigger value="history">Training History</TabsTrigger>
            <TabsTrigger value="api">API Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Pipeline Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="font-semibold">Data Generation</div>
                    <div className="text-sm text-gray-600">RAPIDS-accelerated synthetic data</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="font-semibold">Model Training</div>
                    <div className="text-sm text-gray-600">Distributed multi-GPU training</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="font-semibold">Validation</div>
                    <div className="text-sm text-gray-600">Performance validation & testing</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <Rocket className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <div className="font-semibold">Deployment</div>
                    <div className="text-sm text-gray-600">Automatic model deployment</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Model Architecture</label>
                    <Select value={config.modelArchitecture} onValueChange={(value) => setConfig(prev => ({ ...prev, modelArchitecture: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transformer">🧠 Transformer + Attention</SelectItem>
                        <SelectItem value="cnn">🔲 Convolutional Neural Network</SelectItem>
                        <SelectItem value="lstm">🔄 LSTM Recurrent Network</SelectItem>
                        <SelectItem value="ensemble">🎭 Ensemble Model</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Optimization Strategy</label>
                    <Select value={config.optimizationStrategy} onValueChange={(value) => setConfig(prev => ({ ...prev, optimizationStrategy: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adamw">⚡ AdamW</SelectItem>
                        <SelectItem value="sgd">🎯 SGD with Momentum</SelectItem>
                        <SelectItem value="rmsprop">📈 RMSprop</SelectItem>
                        <SelectItem value="adagrad">🔧 Adagrad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Learning Rate Schedule</label>
                    <Select value={config.learningRateSchedule} onValueChange={(value) => setConfig(prev => ({ ...prev, learningRateSchedule: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cosine">🌊 Cosine Annealing</SelectItem>
                        <SelectItem value="linear">📉 Linear Decay</SelectItem>
                        <SelectItem value="exponential">📊 Exponential Decay</SelectItem>
                        <SelectItem value="step">🪜 Step Decay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Regularization</label>
                    <Select value={config.regularization} onValueChange={(value) => setConfig(prev => ({ ...prev, regularization: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dropout">🎲 Dropout</SelectItem>
                        <SelectItem value="batchnorm">📊 Batch Normalization</SelectItem>
                        <SelectItem value="layernorm">🔗 Layer Normalization</SelectItem>
                        <SelectItem value="weight_decay">⚖️ Weight Decay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Previous Training Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trainingHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Calendar className="h-12 w-12 mx-auto mb-4" />
                      <p>No training runs yet</p>
                    </div>
                  ) : (
                    trainingHistory.map(run => (
                      <div key={run.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">{run.name}</div>
                            <div className="text-sm text-gray-600">Cost: ${run.cost.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="font-medium text-green-600">{run.accuracy.toFixed(1)}%</div>
                            <div className="text-sm text-gray-600">{run.status}</div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">API Endpoint</label>
                    <div className="flex space-x-2">
                      <Input 
                        value="https://api.omnidash.com/v1/ai-training/predict" 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">WebSocket Stream</label>
                    <div className="flex space-x-2">
                      <Input 
                        value="wss://stream.omnidash.com/v1/ai-training/realtime" 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <Globe className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <div className="font-semibold">REST API</div>
                      <div className="text-sm text-gray-600">HTTP/HTTPS endpoints</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <Smartphone className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <div className="font-semibold">Mobile SDK</div>
                      <div className="text-sm text-gray-600">iOS & Android</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <Database className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                      <div className="font-semibold">GraphQL</div>
                      <div className="text-sm text-gray-600">Flexible queries</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
