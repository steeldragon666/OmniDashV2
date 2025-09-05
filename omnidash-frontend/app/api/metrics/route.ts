/**
 * Metrics API Endpoint
 * Provides Prometheus-compatible metrics for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple metrics storage (in production, use a proper metrics library)
const metrics = new Map<string, number>();
const metricLabels = new Map<string, Record<string, string>>();

// Increment a counter metric
function incrementCounter(name: string, value = 1, labels: Record<string, string> = {}) {
  const key = `${name}_${JSON.stringify(labels)}`;
  metrics.set(key, (metrics.get(key) || 0) + value);
  metricLabels.set(key, { name, type: 'counter', ...labels });
}

// Set a gauge metric
function setGauge(name: string, value: number, labels: Record<string, string> = {}) {
  const key = `${name}_${JSON.stringify(labels)}`;
  metrics.set(key, value);
  metricLabels.set(key, { name, type: 'gauge', ...labels });
}

// Record system metrics
function recordSystemMetrics() {
  const usage = process.memoryUsage();
  
  // Memory metrics
  setGauge('nodejs_memory_rss_bytes', usage.rss);
  setGauge('nodejs_memory_heap_total_bytes', usage.heapTotal);
  setGauge('nodejs_memory_heap_used_bytes', usage.heapUsed);
  setGauge('nodejs_memory_external_bytes', usage.external);
  
  // Process metrics
  setGauge('nodejs_process_uptime_seconds', process.uptime());
  
  // CPU usage (simplified)
  const cpuUsage = process.cpuUsage();
  setGauge('nodejs_process_cpu_user_seconds', cpuUsage.user / 1000000); // Convert to seconds
  setGauge('nodejs_process_cpu_system_seconds', cpuUsage.system / 1000000);
}

// Format metrics in Prometheus format
function formatPrometheusMetrics(): string {
  recordSystemMetrics();
  
  const lines: string[] = [];
  const metricsByName = new Map<string, Array<{ key: string; value: number; labels: Record<string, string> }>>();
  
  // Group metrics by name
  for (const [key, value] of metrics.entries()) {
    const labels = metricLabels.get(key);
    if (!labels) continue;
    
    const name = labels.name;
    if (!metricsByName.has(name)) {
      metricsByName.set(name, []);
    }
    metricsByName.get(name)!.push({ key, value, labels });
  }
  
  // Format each metric group
  for (const [name, metricGroup] of metricsByName.entries()) {
    const firstMetric = metricGroup[0];
    
    // Add HELP and TYPE comments
    lines.push(`# HELP ${name} ${getMetricHelp(name)}`);
    lines.push(`# TYPE ${name} ${firstMetric.labels.type || 'gauge'}`);
    
    // Add metric values
    for (const metric of metricGroup) {
      const labelStr = formatLabels(metric.labels);
      lines.push(`${name}${labelStr} ${metric.value}`);
    }
    
    lines.push(''); // Empty line between metric groups
  }
  
  return lines.join('\n');
}

// Format labels for Prometheus
function formatLabels(labels: Record<string, string>): string {
  const filteredLabels = Object.entries(labels)
    .filter(([key]) => key !== 'name' && key !== 'type')
    .map(([key, value]) => `${key}="${value}"`)
    .join(',');
  
  return filteredLabels ? `{${filteredLabels}}` : '';
}

// Get metric help text
function getMetricHelp(metricName: string): string {
  const helpTexts: Record<string, string> = {
    'http_requests_total': 'Total number of HTTP requests',
    'http_request_duration_seconds': 'HTTP request duration in seconds',
    'nodejs_memory_rss_bytes': 'Resident Set Size memory usage in bytes',
    'nodejs_memory_heap_total_bytes': 'Total heap memory in bytes',
    'nodejs_memory_heap_used_bytes': 'Used heap memory in bytes',
    'nodejs_memory_external_bytes': 'External memory usage in bytes',
    'nodejs_process_uptime_seconds': 'Process uptime in seconds',
    'nodejs_process_cpu_user_seconds': 'User CPU time spent in seconds',
    'nodejs_process_cpu_system_seconds': 'System CPU time spent in seconds',
    'application_info': 'Application information',
    'database_connections_active': 'Number of active database connections',
    'redis_connections_active': 'Number of active Redis connections',
    'auth_attempts_total': 'Total number of authentication attempts',
    'api_rate_limit_exceeded_total': 'Total number of rate limit exceeded events'
  };
  
  return helpTexts[metricName] || `Metric ${metricName}`;
}

// Initialize some default metrics
function initializeMetrics() {
  // Application info
  setGauge('application_info', 1, {
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    name: 'omnidash-frontend'
  });
  
  // Initialize counters
  incrementCounter('http_requests_total', 0, { method: 'GET', status: '200' });
  incrementCounter('auth_attempts_total', 0, { result: 'success' });
  incrementCounter('api_rate_limit_exceeded_total', 0);
}

// Call initialization
initializeMetrics();

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const acceptHeader = request.headers.get('accept') || '';
    const format = request.nextUrl.searchParams.get('format') || 'prometheus';
    
    if (format === 'json' || acceptHeader.includes('application/json')) {
      // Return metrics as JSON
      const jsonMetrics: Record<string, any> = {};
      
      for (const [key, value] of metrics.entries()) {
        const labels = metricLabels.get(key);
        if (labels) {
          const name = labels.name;
          if (!jsonMetrics[name]) {
            jsonMetrics[name] = [];
          }
          jsonMetrics[name].push({
            value,
            labels: Object.fromEntries(
              Object.entries(labels).filter(([k]) => k !== 'name' && k !== 'type')
            )
          });
        }
      }
      
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        metrics: jsonMetrics
      });
    } else {
      // Return Prometheus format (default)
      const prometheusMetrics = formatPrometheusMetrics();
      
      return new NextResponse(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

// Utility functions to be called from other parts of the application
export class MetricsCollector {
  static incrementHttpRequests(method: string, status: string, path?: string) {
    incrementCounter('http_requests_total', 1, { 
      method: method.toUpperCase(), 
      status, 
      ...(path && { path }) 
    });
  }
  
  static recordHttpDuration(method: string, status: string, duration: number) {
    setGauge('http_request_duration_seconds', duration / 1000, { 
      method: method.toUpperCase(), 
      status 
    });
  }
  
  static incrementAuthAttempts(result: 'success' | 'failure', provider?: string) {
    incrementCounter('auth_attempts_total', 1, { 
      result, 
      ...(provider && { provider }) 
    });
  }
  
  static incrementRateLimitExceeded(endpoint?: string) {
    incrementCounter('api_rate_limit_exceeded_total', 1, { 
      ...(endpoint && { endpoint }) 
    });
  }
  
  static setDatabaseConnections(count: number) {
    setGauge('database_connections_active', count);
  }
  
  static setRedisConnections(count: number) {
    setGauge('redis_connections_active', count);
  }
  
  static recordCustomMetric(name: string, value: number, labels: Record<string, string> = {}, type: 'counter' | 'gauge' = 'gauge') {
    if (type === 'counter') {
      incrementCounter(name, value, labels);
    } else {
      setGauge(name, value, labels);
    }
  }
}