// Core workflow types
export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: Record<string, any>;
    credentials?: Record<string, string>;
    description?: string;
  };
  style?: Record<string, any>;
  className?: string;
  targetPosition?: string;
  sourcePosition?: string;
  hidden?: boolean;
  selected?: boolean;
  dragging?: boolean;
  resizing?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  className?: string;
  label?: string;
  labelStyle?: Record<string, any>;
  labelShowBg?: boolean;
  labelBgStyle?: Record<string, any>;
  markerEnd?: {
    type: string;
    color?: string;
    width?: number;
    height?: number;
  };
}

export interface WorkflowViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: WorkflowViewport;
}

export interface WorkflowSettings {
  errorHandling: 'stop' | 'continue' | 'retry';
  timeout: number;
  retryOnFailure: boolean;
  maxRetries: number;
  retryDelay?: number;
  executeInParallel?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  userId: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  definition: WorkflowDefinition;
  triggers: string[];
  variables: Record<string, any>;
  settings: WorkflowSettings;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Node templates for the palette
export interface NodeTemplate {
  type: string;
  category: 'trigger' | 'action' | 'condition' | 'utility' | 'integration';
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultData: {
    label: string;
    config: Record<string, any>;
  };
  inputs: NodeInput[];
  outputs: NodeOutput[];
  configSchema?: ConfigField[];
}

export interface NodeInput {
  id: string;
  label: string;
  type: 'data' | 'trigger' | 'condition';
  required: boolean;
}

export interface NodeOutput {
  id: string;
  label: string;
  type: 'data' | 'success' | 'error' | 'condition';
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'json' | 'cron';
  required: boolean;
  description?: string;
  defaultValue?: any;
  options?: { value: any; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean | string;
  };
}

// Execution types
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  triggerType?: string;
  triggerData?: Record<string, any>;
  executionLogs: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  data?: Record<string, any>;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'skipped';
  output?: any;
  error?: string;
  duration: number;
  timestamp: string;
}

// Trigger types
export interface TriggerConfig {
  id: string;
  type: 'webhook' | 'schedule' | 'manual' | 'api' | 'event';
  config: Record<string, any>;
  isActive: boolean;
}

export interface WebhookTrigger extends TriggerConfig {
  type: 'webhook';
  config: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    headers?: Record<string, string>;
    authentication?: {
      type: 'none' | 'apikey' | 'bearer' | 'basic';
      config: Record<string, any>;
    };
  };
}

export interface ScheduleTrigger extends TriggerConfig {
  type: 'schedule';
  config: {
    cron: string;
    timezone: string;
    startDate?: string;
    endDate?: string;
  };
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  type: 'missing_connection' | 'invalid_config' | 'circular_dependency' | 'invalid_trigger';
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  nodeId?: string;
  edgeId?: string;
  type: 'performance' | 'best_practice' | 'deprecated';
  message: string;
}

// Node categories and types
export const NODE_CATEGORIES = {
  TRIGGER: 'trigger',
  ACTION: 'action',
  CONDITION: 'condition',
  UTILITY: 'utility',
  INTEGRATION: 'integration'
} as const;

export const TRIGGER_TYPES = {
  WEBHOOK: 'webhook-trigger',
  SCHEDULE: 'schedule-trigger',
  MANUAL: 'manual-trigger',
  EMAIL: 'email-trigger',
  FILE: 'file-trigger'
} as const;

export const ACTION_TYPES = {
  HTTP_REQUEST: 'http-action',
  EMAIL: 'email-action',
  SOCIAL_MEDIA: 'social-action',
  DATABASE: 'database-action',
  FILE: 'file-action',
  JAVASCRIPT: 'javascript-action',
  WEBHOOK: 'webhook-action',
  NOTIFICATION: 'notification-action'
} as const;

export const CONDITION_TYPES = {
  IF_ELSE: 'condition',
  SWITCH: 'switch-condition',
  FILTER: 'filter-condition',
  MERGE: 'merge-condition'
} as const;

export const UTILITY_TYPES = {
  DELAY: 'delay',
  TRANSFORM: 'data-transform',
  VARIABLE: 'variable-setter',
  LOG: 'logger',
  COUNTER: 'counter'
} as const;

// Default node styles
export const NODE_STYLES = {
  trigger: {
    background: '#10b981',
    color: 'white',
    border: '2px solid #059669',
    borderRadius: '8px',
    padding: '10px'
  },
  action: {
    background: '#3b82f6',
    color: 'white',
    border: '2px solid #2563eb',
    borderRadius: '8px',
    padding: '10px'
  },
  condition: {
    background: '#f59e0b',
    color: 'white',
    border: '2px solid #d97706',
    borderRadius: '8px',
    padding: '10px'
  },
  utility: {
    background: '#8b5cf6',
    color: 'white',
    border: '2px solid #7c3aed',
    borderRadius: '8px',
    padding: '10px'
  },
  integration: {
    background: '#ef4444',
    color: 'white',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    padding: '10px'
  }
} as const;

// Edge styles
export const EDGE_STYLES = {
  default: {
    stroke: '#94a3b8',
    strokeWidth: 2
  },
  success: {
    stroke: '#10b981',
    strokeWidth: 2
  },
  error: {
    stroke: '#ef4444',
    strokeWidth: 2
  },
  condition: {
    stroke: '#f59e0b',
    strokeWidth: 2,
    strokeDasharray: '5,5'
  }
} as const;