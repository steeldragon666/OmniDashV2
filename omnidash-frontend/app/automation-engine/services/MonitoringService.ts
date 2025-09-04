import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableLogs: boolean;
  enableAlerts: boolean;
  metricsRetention: number; // milliseconds
  tracingRetention: number; // milliseconds
  logsRetention: number; // milliseconds
  alertChannels: AlertChannel[];
  dashboardConfig: DashboardConfig;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  enabled: boolean;
  config: Record<string, string>;
  severity: AlertSeverity[];
}

export interface DashboardConfig {
  refreshInterval: number; // milliseconds
  defaultTimeRange: string; // '1h', '24h', '7d', etc.
  panels: DashboardPanel[];
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'stat' | 'gauge' | 'heatmap';
  query: MetricQuery;
  position: { x: number; y: number; width: number; height: number };
}

export interface MetricQuery {
  metric: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  groupBy?: string[];
  filters?: Record<string, string>;
  timeRange: string;
}

export interface WorkflowMetrics {
  workflowId: string;
  name: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  totalDuration: number;
  lastExecution?: Date;
  executionsPerHour: number;
  errorRate: number;
  activeExecutions: number;
  queuedExecutions: number;
  retryRate: number;
  timeoutRate: number;
  resourceUsage: {
    avgMemory: number;
    maxMemory: number;
    avgCpu: number;
    maxCpu: number;
  };
}

export interface ExecutionTrace {
  id: string;
  workflowId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  spans: TraceSpan[];
  error?: string;
  metadata: Record<string, unknown>;
}

export interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  type: 'workflow' | 'node' | 'action' | 'condition' | 'external';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  tags: Record<string, string>;
  logs: SpanLog[];
  error?: string;
}

export interface SpanLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  type: AlertType;
  condition: AlertCondition;
  status: 'active' | 'resolved' | 'silenced';
  triggeredAt: Date;
  resolvedAt?: Date;
  count: number;
  metadata: Record<string, unknown>;
  channels: string[]; // Alert channel IDs
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertType = 'workflow_failure' | 'high_error_rate' | 'slow_execution' | 'resource_usage' | 'custom';

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  timeWindow: string; // '5m', '1h', etc.
  evaluationInterval: string;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    cached: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    iops: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
  };
}

export interface PerformanceMetrics {
  timestamp: Date;
  workflowEngine: {
    activeExecutions: number;
    queuedExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    throughput: number; // executions per second
  };
  actionExecutor: {
    activeActions: number;
    queuedActions: number;
    completedActions: number;
    failedActions: number;
    averageActionTime: number;
    throughput: number;
  };
  triggerService: {
    activeTriggers: number;
    triggersPerMinute: number;
    averageResponseTime: number;
    failedTriggers: number;
  };
  stateManager: {
    totalStates: number;
    activeStates: number;
    memoryUsage: number;
    persistenceLatency: number;
  };
}

export class MonitoringService extends EventEmitter {
  private config: MonitoringConfig;
  private workflowMetrics: Map<string, WorkflowMetrics> = new Map();
  private executionTraces: Map<string, ExecutionTrace> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private isCollecting = false;
  private collectionInterval?: NodeJS.Timeout;
  private alertEvaluationInterval?: NodeJS.Timeout;

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.config = {
      enableMetrics: true,
      enableTracing: true,
      enableLogs: true,
      enableAlerts: true,
      metricsRetention: 7 * 24 * 3600 * 1000, // 7 days
      tracingRetention: 3 * 24 * 3600 * 1000, // 3 days
      logsRetention: 30 * 24 * 3600 * 1000, // 30 days
      alertChannels: [],
      dashboardConfig: {
        refreshInterval: 30000, // 30 seconds
        defaultTimeRange: '1h',
        panels: []
      },
      ...config
    };
    
    this.initialize();
  }

  private initialize(): void {
    this.setupDefaultAlertRules();
    this.startMetricsCollection();
    this.startAlertEvaluation();
    this.setupSystemMetricsCollection();
    
    console.log('📊 MonitoringService initialized');
  }

  // Metrics Collection
  public recordWorkflowExecution(
    workflowId: string,
    workflowName: string,
    execution: {
      id: string;
      status: 'completed' | 'failed' | 'timeout';
      startTime: Date;
      endTime: Date;
      duration: number;
      error?: string;
    }
  ): void {
    if (!this.config.enableMetrics) return;

    let metrics = this.workflowMetrics.get(workflowId);
    if (!metrics) {
      metrics = {
        workflowId,
        name: workflowName,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        totalDuration: 0,
        executionsPerHour: 0,
        errorRate: 0,
        activeExecutions: 0,
        queuedExecutions: 0,
        retryRate: 0,
        timeoutRate: 0,
        resourceUsage: {
          avgMemory: 0,
          maxMemory: 0,
          avgCpu: 0,
          maxCpu: 0
        }
      };
    }

    // Update metrics
    metrics.totalExecutions++;
    metrics.totalDuration += execution.duration;
    metrics.lastExecution = execution.endTime;
    metrics.minExecutionTime = Math.min(metrics.minExecutionTime, execution.duration);
    metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, execution.duration);

    if (execution.status === 'completed') {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    if (execution.status === 'timeout') {
      metrics.timeoutRate = (metrics.timeoutRate + 1) / metrics.totalExecutions;
    }

    // Calculate derived metrics
    metrics.successRate = metrics.successfulExecutions / metrics.totalExecutions;
    metrics.errorRate = metrics.failedExecutions / metrics.totalExecutions;
    metrics.averageExecutionTime = metrics.totalDuration / metrics.totalExecutions;

    // Calculate executions per hour (simplified)
    const hoursActive = Math.max(1, (Date.now() - (metrics.lastExecution?.getTime() || Date.now())) / 3600000);
    metrics.executionsPerHour = metrics.totalExecutions / hoursActive;

    this.workflowMetrics.set(workflowId, metrics);
    this.emit('metrics:workflow', metrics);
  }

  // Distributed Tracing
  public startTrace(workflowId: string, executionId: string, metadata: Record<string, unknown> = {}): string {
    if (!this.config.enableTracing) return '';

    const traceId = uuidv4();
    const trace: ExecutionTrace = {
      id: traceId,
      workflowId,
      executionId,
      startTime: new Date(),
      status: 'running',
      spans: [],
      metadata
    };

    this.executionTraces.set(traceId, trace);
    this.emit('trace:started', trace);

    return traceId;
  }

  public startSpan(
    traceId: string,
    name: string,
    type: TraceSpan['type'],
    parentSpanId?: string,
    tags: Record<string, string> = {}
  ): string {
    const trace = this.executionTraces.get(traceId);
    if (!trace) return '';

    const spanId = uuidv4();
    const span: TraceSpan = {
      id: spanId,
      parentId: parentSpanId,
      name,
      type,
      startTime: new Date(),
      status: 'running',
      tags,
      logs: []
    };

    trace.spans.push(span);
    this.executionTraces.set(traceId, trace);
    this.emit('span:started', { trace, span });

    return spanId;
  }

  public finishSpan(
    traceId: string,
    spanId: string,
    status: TraceSpan['status'],
    error?: string
  ): void {
    const trace = this.executionTraces.get(traceId);
    if (!trace) return;

    const span = trace.spans.find(s => s.id === spanId);
    if (!span) return;

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = status;
    span.error = error;

    this.executionTraces.set(traceId, trace);
    this.emit('span:finished', { trace, span });
  }

  public addSpanLog(
    traceId: string,
    spanId: string,
    level: SpanLog['level'],
    message: string,
    fields?: Record<string, unknown>
  ): void {
    const trace = this.executionTraces.get(traceId);
    if (!trace) return;

    const span = trace.spans.find(s => s.id === spanId);
    if (!span) return;

    span.logs.push({
      timestamp: new Date(),
      level,
      message,
      fields
    });

    this.executionTraces.set(traceId, trace);
  }

  public finishTrace(traceId: string, status: ExecutionTrace['status'], error?: string): void {
    const trace = this.executionTraces.get(traceId);
    if (!trace) return;

    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
    trace.status = status;
    trace.error = error;

    this.executionTraces.set(traceId, trace);
    this.emit('trace:finished', trace);
  }

  // Alert Management
  public createAlertRule(
    name: string,
    condition: AlertCondition,
    severity: AlertSeverity,
    channels: string[]
  ): string {
    const ruleId = uuidv4();
    const rule: AlertRule = {
      id: ruleId,
      name,
      condition,
      severity,
      channels,
      enabled: true,
      lastEvaluated: new Date(),
      evaluationCount: 0
    };

    this.alertRules.set(ruleId, rule);
    console.log(`🚨 Alert rule created: ${name}`);
    
    return ruleId;
  }

  private triggerAlert(rule: AlertRule, currentValue: number): void {
    const alertId = uuidv4();
    const alert: Alert = {
      id: alertId,
      name: rule.name,
      severity: rule.severity,
      type: 'custom', // Could be inferred from rule
      condition: rule.condition,
      status: 'active',
      triggeredAt: new Date(),
      count: 1,
      metadata: { currentValue, threshold: rule.condition.threshold },
      channels: rule.channels
    };

    this.alerts.set(alertId, alert);
    this.emit('alert:triggered', alert);

    // Send notifications
    this.sendAlertNotifications(alert);

    console.warn(`🚨 ALERT: ${rule.name} - Current: ${currentValue}, Threshold: ${rule.condition.threshold}`);
  }

  private sendAlertNotifications(alert: Alert): void {
    for (const channelId of alert.channels) {
      const channel = this.config.alertChannels.find(c => c.type === channelId);
      if (channel && channel.enabled && channel.severity.includes(alert.severity)) {
        this.sendNotification(channel, alert);
      }
    }
  }

  private sendNotification(channel: AlertChannel, alert: Alert): void {
    // Simulate sending notification
    console.log(`📧 Sending ${alert.severity} alert via ${channel.type}: ${alert.name}`);
    
    switch (channel.type) {
      case 'email':
        this.sendEmailAlert(alert, channel.config);
        break;
      case 'slack':
        this.sendSlackAlert(alert, channel.config);
        break;
      case 'webhook':
        this.sendWebhookAlert(alert, channel.config);
        break;
      case 'sms':
        this.sendSmsAlert(alert, channel.config);
        break;
    }
  }

  private async sendEmailAlert(alert: Alert, config: Record<string, string>): Promise<void> {
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`📧 Email alert sent: ${alert.name}`);
  }

  private async sendSlackAlert(alert: Alert, config: Record<string, string>): Promise<void> {
    // Simulate Slack webhook
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`💬 Slack alert sent: ${alert.name}`);
  }

  private async sendWebhookAlert(alert: Alert, config: Record<string, string>): Promise<void> {
    // Simulate webhook call
    await new Promise(resolve => setTimeout(resolve, 150));
    console.log(`🎣 Webhook alert sent: ${alert.name}`);
  }

  private async sendSmsAlert(alert: Alert, config: Record<string, string>): Promise<void> {
    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`📱 SMS alert sent: ${alert.name}`);
  }

  // System Monitoring
  private startMetricsCollection(): void {
    if (!this.isCollecting) {
      this.isCollecting = true;
      this.collectionInterval = setInterval(() => {
        this.collectSystemMetrics();
        this.collectPerformanceMetrics();
        this.cleanupOldMetrics();
      }, 30000); // Collect every 30 seconds
    }
  }

  private collectSystemMetrics(): void {
    const metrics: SystemMetrics = {
      timestamp: new Date(),
      cpu: {
        usage: Math.random() * 100,
        cores: 8,
        loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2]
      },
      memory: {
        used: Math.random() * 8000000000, // 8GB
        free: Math.random() * 2000000000, // 2GB
        total: 16000000000, // 16GB
        cached: Math.random() * 1000000000 // 1GB
      },
      disk: {
        used: Math.random() * 500000000000, // 500GB
        free: Math.random() * 500000000000, // 500GB
        total: 1000000000000, // 1TB
        iops: Math.random() * 1000
      },
      network: {
        bytesIn: Math.random() * 1000000,
        bytesOut: Math.random() * 1000000,
        packetsIn: Math.random() * 10000,
        packetsOut: Math.random() * 10000
      },
      processes: {
        total: Math.floor(Math.random() * 300) + 100,
        running: Math.floor(Math.random() * 50) + 10,
        sleeping: Math.floor(Math.random() * 200) + 50
      }
    };

    this.systemMetrics.push(metrics);
    this.emit('metrics:system', metrics);
  }

  private collectPerformanceMetrics(): void {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      workflowEngine: {
        activeExecutions: Math.floor(Math.random() * 50),
        queuedExecutions: Math.floor(Math.random() * 100),
        completedExecutions: Math.floor(Math.random() * 1000) + 5000,
        failedExecutions: Math.floor(Math.random() * 50),
        averageExecutionTime: Math.random() * 5000 + 1000, // 1-6 seconds
        throughput: Math.random() * 10 + 1 // 1-11 exec/sec
      },
      actionExecutor: {
        activeActions: Math.floor(Math.random() * 100),
        queuedActions: Math.floor(Math.random() * 200),
        completedActions: Math.floor(Math.random() * 5000) + 10000,
        failedActions: Math.floor(Math.random() * 100),
        averageActionTime: Math.random() * 2000 + 500, // 0.5-2.5 seconds
        throughput: Math.random() * 20 + 5 // 5-25 actions/sec
      },
      triggerService: {
        activeTriggers: Math.floor(Math.random() * 20) + 10,
        triggersPerMinute: Math.random() * 100 + 50,
        averageResponseTime: Math.random() * 100 + 50, // 50-150ms
        failedTriggers: Math.floor(Math.random() * 5)
      },
      stateManager: {
        totalStates: Math.floor(Math.random() * 1000) + 500,
        activeStates: Math.floor(Math.random() * 100) + 50,
        memoryUsage: Math.random() * 100000000 + 50000000, // 50-150MB
        persistenceLatency: Math.random() * 50 + 10 // 10-60ms
      }
    };

    this.performanceMetrics.push(metrics);
    this.emit('metrics:performance', metrics);
  }

  private startAlertEvaluation(): void {
    if (this.config.enableAlerts) {
      this.alertEvaluationInterval = setInterval(() => {
        this.evaluateAlertRules();
      }, 60000); // Evaluate every minute
    }
  }

  private evaluateAlertRules(): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      try {
        const currentValue = this.getMetricValue(rule.condition.metric);
        const thresholdMet = this.evaluateCondition(currentValue, rule.condition);

        rule.lastEvaluated = new Date();
        rule.evaluationCount++;

        if (thresholdMet) {
          // Check if alert already exists
          const existingAlert = Array.from(this.alerts.values())
            .find(alert => alert.name === rule.name && alert.status === 'active');

          if (existingAlert) {
            existingAlert.count++;
          } else {
            this.triggerAlert(rule, currentValue);
          }
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.name}:`, error);
      }
    }
  }

  private getMetricValue(metricName: string): number {
    // Simplified metric lookup - in production, query time series database
    switch (metricName) {
      case 'workflow.error_rate':
        const totalWorkflows = Array.from(this.workflowMetrics.values()).length;
        return totalWorkflows > 0 
          ? Array.from(this.workflowMetrics.values()).reduce((sum, m) => sum + m.errorRate, 0) / totalWorkflows 
          : 0;
      
      case 'system.cpu.usage':
        return this.systemMetrics.length > 0 
          ? this.systemMetrics[this.systemMetrics.length - 1].cpu.usage 
          : 0;
      
      case 'system.memory.usage':
        const latestSystem = this.systemMetrics[this.systemMetrics.length - 1];
        return latestSystem 
          ? (latestSystem.memory.used / latestSystem.memory.total) * 100 
          : 0;

      case 'workflow.execution_time':
        const avgTime = Array.from(this.workflowMetrics.values())
          .reduce((sum, m) => sum + m.averageExecutionTime, 0) / Math.max(1, this.workflowMetrics.size);
        return avgTime;

      default:
        return Math.random() * 100; // Default random value for unknown metrics
    }
  }

  private evaluateCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      default: return false;
    }
  }

  private cleanupOldMetrics(): void {
    const now = Date.now();

    // Clean system metrics
    this.systemMetrics = this.systemMetrics.filter(
      metric => now - metric.timestamp.getTime() < this.config.metricsRetention
    );

    // Clean performance metrics
    this.performanceMetrics = this.performanceMetrics.filter(
      metric => now - metric.timestamp.getTime() < this.config.metricsRetention
    );

    // Clean execution traces
    for (const [traceId, trace] of this.executionTraces.entries()) {
      if (now - trace.startTime.getTime() > this.config.tracingRetention) {
        this.executionTraces.delete(traceId);
      }
    }
  }

  private setupDefaultAlertRules(): void {
    // High error rate alert
    this.createAlertRule(
      'High Workflow Error Rate',
      {
        metric: 'workflow.error_rate',
        operator: 'gt',
        threshold: 0.1, // 10%
        timeWindow: '5m',
        evaluationInterval: '1m'
      },
      'warning',
      ['email', 'slack']
    );

    // High CPU usage alert
    this.createAlertRule(
      'High CPU Usage',
      {
        metric: 'system.cpu.usage',
        operator: 'gt',
        threshold: 80, // 80%
        timeWindow: '5m',
        evaluationInterval: '1m'
      },
      'critical',
      ['email', 'slack', 'sms']
    );

    // Slow execution alert
    this.createAlertRule(
      'Slow Workflow Execution',
      {
        metric: 'workflow.execution_time',
        operator: 'gt',
        threshold: 30000, // 30 seconds
        timeWindow: '10m',
        evaluationInterval: '2m'
      },
      'warning',
      ['email']
    );
  }

  // Public API methods
  public getWorkflowMetrics(workflowId?: string): WorkflowMetrics[] {
    if (workflowId) {
      const metrics = this.workflowMetrics.get(workflowId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.workflowMetrics.values());
  }

  public getSystemMetrics(timeRange?: string): SystemMetrics[] {
    // Simple time range filtering - in production, use proper time series queries
    const now = Date.now();
    const rangeMs = this.parseTimeRange(timeRange || '1h');
    
    return this.systemMetrics.filter(
      metric => now - metric.timestamp.getTime() <= rangeMs
    );
  }

  public getPerformanceMetrics(timeRange?: string): PerformanceMetrics[] {
    const now = Date.now();
    const rangeMs = this.parseTimeRange(timeRange || '1h');
    
    return this.performanceMetrics.filter(
      metric => now - metric.timestamp.getTime() <= rangeMs
    );
  }

  public getExecutionTraces(workflowId?: string): ExecutionTrace[] {
    const traces = Array.from(this.executionTraces.values());
    return workflowId 
      ? traces.filter(trace => trace.workflowId === workflowId)
      : traces;
  }

  public getAlerts(status?: Alert['status']): Alert[] {
    const alerts = Array.from(this.alerts.values());
    return status 
      ? alerts.filter(alert => alert.status === status)
      : alerts;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    this.alerts.set(alertId, alert);

    this.emit('alert:resolved', alert);
    console.log(`✅ Alert resolved: ${alert.name}`);
    
    return true;
  }

  public silenceAlert(alertId: string, duration: number = 3600000): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = 'silenced';
    alert.metadata.silencedUntil = new Date(Date.now() + duration);
    this.alerts.set(alertId, alert);

    this.emit('alert:silenced', alert);
    console.log(`🔇 Alert silenced: ${alert.name} for ${duration}ms`);
    
    return true;
  }

  private parseTimeRange(timeRange: string): number {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600000; // 1 hour default
    }
  }

  public getDashboardData(): {
    workflowMetrics: WorkflowMetrics[];
    systemMetrics: SystemMetrics[];
    performanceMetrics: PerformanceMetrics[];
    alerts: Alert[];
    summary: {
      totalWorkflows: number;
      activeExecutions: number;
      totalAlerts: number;
      systemHealth: 'healthy' | 'warning' | 'critical';
    };
  } {
    const workflowMetrics = this.getWorkflowMetrics();
    const systemMetrics = this.getSystemMetrics('1h');
    const performanceMetrics = this.getPerformanceMetrics('1h');
    const alerts = this.getAlerts('active');

    // Calculate system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    if (criticalAlerts.length > 0) {
      systemHealth = 'critical';
    } else if (warningAlerts.length > 0) {
      systemHealth = 'warning';
    }

    return {
      workflowMetrics,
      systemMetrics,
      performanceMetrics,
      alerts,
      summary: {
        totalWorkflows: workflowMetrics.length,
        activeExecutions: workflowMetrics.reduce((sum, m) => sum + m.activeExecutions, 0),
        totalAlerts: alerts.length,
        systemHealth
      }
    };
  }

  public shutdown(): void {
    this.isCollecting = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    
    if (this.alertEvaluationInterval) {
      clearInterval(this.alertEvaluationInterval);
    }

    this.removeAllListeners();
    console.log('🛑 MonitoringService shutdown complete');
  }
}

interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: string[];
  enabled: boolean;
  lastEvaluated: Date;
  evaluationCount: number;
}

export const monitoringService = new MonitoringService();