/**
 * Agent Metrics Collector
 * Collects and aggregates metrics for agents
 */

import { EventEmitter } from 'events';

export interface MetricPoint {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

export interface TimeSeriesMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  unit?: string;
  description?: string;
  points: MetricPoint[];
}

export interface AggregatedMetric {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

/**
 * Collects and manages metrics for a specific agent
 */
export class AgentMetricsCollector extends EventEmitter {
  private agentId: string;
  private metrics: Map<string, TimeSeriesMetric> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private timers: Map<string, number[]> = new Map();
  private retentionPeriod: number = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupInterval: NodeJS.Timeout;

  constructor(agentId: string, retentionPeriod?: number) {
    super();
    this.agentId = agentId;
    if (retentionPeriod) {
      this.retentionPeriod = retentionPeriod;
    }

    // Setup periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  // =====================================
  // Counter Metrics
  // =====================================

  /**
   * Increment a counter metric
   */
  public incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const currentValue = this.counters.get(name) || 0;
    const newValue = currentValue + value;
    this.counters.set(name, newValue);

    this.recordMetricPoint(name, 'counter', newValue, tags);
    this.emit('metric-updated', { name, type: 'counter', value: newValue, tags });
  }

  /**
   * Decrement a counter metric
   */
  public decrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.incrementCounter(name, -value, tags);
  }

  /**
   * Get counter value
   */
  public getCounterValue(name: string): number {
    return this.counters.get(name) || 0;
  }

  // =====================================
  // Gauge Metrics
  // =====================================

  /**
   * Set a gauge metric value
   */
  public setGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.gauges.set(name, value);
    this.recordMetricPoint(name, 'gauge', value, tags);
    this.emit('metric-updated', { name, type: 'gauge', value, tags });
  }

  /**
   * Get gauge value
   */
  public getGaugeValue(name: string): number | undefined {
    return this.gauges.get(name);
  }

  // =====================================
  // Histogram Metrics
  // =====================================

  /**
   * Record a histogram value
   */
  public recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    let values = this.histograms.get(name);
    if (!values) {
      values = [];
      this.histograms.set(name, values);
    }
    
    values.push(value);
    this.recordMetricPoint(name, 'histogram', value, tags);
    this.emit('metric-updated', { name, type: 'histogram', value, tags });
  }

  /**
   * Get histogram statistics
   */
  public getHistogramStats(name: string): AggregatedMetric | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = sum / count;

    return {
      name,
      count,
      sum,
      min,
      max,
      avg,
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99)
    };
  }

  // =====================================
  // Timer Metrics
  // =====================================

  /**
   * Start a timer
   */
  public startTimer(name: string): () => void {
    const startTime = Date.now();
    
    return (tags?: Record<string, string>) => {
      const duration = Date.now() - startTime;
      this.recordTimer(name, duration, tags);
    };
  }

  /**
   * Record a timer duration
   */
  public recordTimer(name: string, duration: number, tags?: Record<string, string>): void {
    let durations = this.timers.get(name);
    if (!durations) {
      durations = [];
      this.timers.set(name, durations);
    }
    
    durations.push(duration);
    this.recordMetricPoint(name, 'timer', duration, tags);
    this.emit('metric-updated', { name, type: 'timer', value: duration, tags });
  }

  /**
   * Get timer statistics
   */
  public getTimerStats(name: string): AggregatedMetric | null {
    const durations = this.timers.get(name);
    if (!durations || durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = sum / count;

    return {
      name,
      count,
      sum,
      min,
      max,
      avg,
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99)
    };
  }

  // =====================================
  // Task-Specific Metrics
  // =====================================

  /**
   * Record task completion
   */
  public recordTaskCompletion(taskType: string, duration: number, success: boolean): void {
    const tags = { taskType, success: success.toString() };
    
    this.incrementCounter('tasks.completed', 1, tags);
    this.recordTimer('task.duration', duration, tags);
    
    if (success) {
      this.incrementCounter('tasks.successful', 1, tags);
    } else {
      this.incrementCounter('tasks.failed', 1, tags);
    }
  }

  /**
   * Record API call
   */
  public recordAPICall(
    endpoint: string, 
    method: string, 
    statusCode: number, 
    duration: number
  ): void {
    const tags = { endpoint, method, statusCode: statusCode.toString() };
    
    this.incrementCounter('api.calls', 1, tags);
    this.recordTimer('api.duration', duration, tags);
    
    if (statusCode >= 200 && statusCode < 300) {
      this.incrementCounter('api.success', 1, tags);
    } else {
      this.incrementCounter('api.errors', 1, tags);
    }
  }

  /**
   * Record resource usage
   */
  public recordResourceUsage(
    memoryUsage: number,
    cpuUsage: number,
    queueLength?: number
  ): void {
    this.setGauge('resources.memory', memoryUsage);
    this.setGauge('resources.cpu', cpuUsage);
    
    if (queueLength !== undefined) {
      this.setGauge('queue.length', queueLength);
    }
  }

  // =====================================
  // Data Retrieval
  // =====================================

  /**
   * Get all metrics
   */
  public getAllMetrics(): TimeSeriesMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metric by name
   */
  public getMetric(name: string): TimeSeriesMetric | null {
    return this.metrics.get(name) || null;
  }

  /**
   * Get metrics summary
   */
  public getMetricsSummary(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, AggregatedMetric>;
    timers: Record<string, AggregatedMetric>;
  } {
    const histograms: Record<string, AggregatedMetric> = {};
    for (const [name] of this.histograms) {
      const stats = this.getHistogramStats(name);
      if (stats) {
        histograms[name] = stats;
      }
    }

    const timers: Record<string, AggregatedMetric> = {};
    for (const [name] of this.timers) {
      const stats = this.getTimerStats(name);
      if (stats) {
        timers[name] = stats;
      }
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms,
      timers
    };
  }

  /**
   * Get metrics for time range
   */
  public getMetricsInRange(
    startTime: Date,
    endTime: Date,
    metricNames?: string[]
  ): TimeSeriesMetric[] {
    const metrics = metricNames 
      ? metricNames.map(name => this.metrics.get(name)).filter(Boolean) as TimeSeriesMetric[]
      : Array.from(this.metrics.values());

    return metrics.map(metric => ({
      ...metric,
      points: metric.points.filter(point => 
        point.timestamp >= startTime && point.timestamp <= endTime
      )
    }));
  }

  // =====================================
  // Export and Import
  // =====================================

  /**
   * Export metrics to JSON
   */
  public exportMetrics(): string {
    const data = {
      agentId: this.agentId,
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      summary: this.getMetricsSummary()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timers.clear();
    this.emit('metrics-reset');
  }

  // =====================================
  // Private Methods
  // =====================================

  private recordMetricPoint(
    name: string,
    type: 'counter' | 'gauge' | 'histogram' | 'timer',
    value: number,
    tags?: Record<string, string>
  ): void {
    let metric = this.metrics.get(name);
    if (!metric) {
      metric = {
        name,
        type,
        points: []
      };
      this.metrics.set(name, metric);
    }

    metric.points.push({
      timestamp: new Date(),
      value,
      tags
    });

    // Limit the number of points to prevent memory issues
    const maxPoints = 10000;
    if (metric.points.length > maxPoints) {
      metric.points = metric.points.slice(-maxPoints);
    }
  }

  private percentile(sortedArray: number[], p: number): number {
    const index = p * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private cleanup(): void {
    const cutoffTime = new Date(Date.now() - this.retentionPeriod);
    
    for (const metric of this.metrics.values()) {
      metric.points = metric.points.filter(point => point.timestamp > cutoffTime);
    }

    // Clean up empty metrics
    for (const [name, metric] of this.metrics) {
      if (metric.points.length === 0) {
        this.metrics.delete(name);
      }
    }

    this.emit('metrics-cleaned');
  }

  /**
   * Cleanup and dispose
   */
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.reset();
    this.removeAllListeners();
  }
}