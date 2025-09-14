// Enterprise AI Training Hub Type Definitions

export interface TrainingConfig {
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

export interface TrainingStatus {
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

export interface OptimizedConfig {
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

export interface TrainingJob {
  jobId: string;
  status: string;
  config: TrainingConfig;
  createdAt: string;
  estimatedCompletion: string;
}

export interface TrainingMetrics {
  accuracy: number;
  loss: number;
  epoch: number;
  timestamp: Date;
}

export interface DeploymentStatus {
  status: 'idle' | 'deploying' | 'active' | 'failed';
  endpoint?: string;
  dashboard?: string;
  mobile?: string;
}
