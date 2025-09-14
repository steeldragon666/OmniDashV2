// Enterprise AI Training Hub Constants

export const TRAINING_PRIORITIES = {
  SPEED: 'speed',
  COST: 'cost',
  QUALITY: 'quality'
} as const;

export const CLOUD_PROVIDERS = {
  AWS: 'aws',
  GCP: 'gcp',
  AZURE: 'azure'
} as const;

export const DATA_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  XLARGE: 'xlarge'
} as const;

export const MODEL_ARCHITECTURES = {
  TRANSFORMER: 'transformer',
  CNN: 'cnn',
  LSTM: 'lstm',
  ENSEMBLE: 'ensemble'
} as const;

export const OPTIMIZATION_STRATEGIES = {
  ADAMW: 'adamw',
  SGD: 'sgd',
  RMSPROP: 'rmsprop',
  ADAGRAD: 'adagrad'
} as const;

export const LEARNING_RATE_SCHEDULES = {
  COSINE: 'cosine',
  LINEAR: 'linear',
  EXPONENTIAL: 'exponential',
  STEP: 'step'
} as const;

export const REGULARIZATION_TYPES = {
  DROPOUT: 'dropout',
  BATCHNORM: 'batchnorm',
  LAYERNORM: 'layernorm',
  WEIGHT_DECAY: 'weight_decay'
} as const;

export const TRAINING_STATUS = {
  IDLE: 'idle',
  CONFIGURING: 'configuring',
  LAUNCHING: 'launching',
  TRAINING: 'training',
  VALIDATING: 'validating',
  DEPLOYING: 'deploying',
  COMPLETE: 'complete',
  ERROR: 'error'
} as const;

export const DEFAULT_CONFIG = {
  budget: 5000,
  priority: TRAINING_PRIORITIES.QUALITY,
  cloudProvider: CLOUD_PROVIDERS.AWS,
  dataSize: DATA_SIZES.LARGE,
  modelComplexity: 'advanced',
  projectName: 'enterprise-intelligence',
  modelArchitecture: MODEL_ARCHITECTURES.TRANSFORMER,
  optimizationStrategy: OPTIMIZATION_STRATEGIES.ADAMW,
  learningRateSchedule: LEARNING_RATE_SCHEDULES.COSINE,
  regularization: REGULARIZATION_TYPES.DROPOUT
} as const;
