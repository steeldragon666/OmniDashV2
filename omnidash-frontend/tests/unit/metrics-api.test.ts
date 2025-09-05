import { GET } from '@/app/api/metrics/route';
import { NextRequest } from 'next/server';

// Mock external dependencies
jest.mock('@/lib/database', () => ({
  getConnectionCount: jest.fn(),
  getQueryMetrics: jest.fn()
}));

jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      disconnect: jest.fn()
    }))
  };
});

describe('/api/metrics', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/metrics');
    
    // Set up environment variables
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
  });

  it('should return metrics in Prometheus format', async () => {
    const { getConnectionCount, getQueryMetrics } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    getConnectionCount.mockResolvedValue(5);
    getQueryMetrics.mockResolvedValue({
      totalQueries: 1000,
      avgResponseTime: 50
    });
    
    Redis().info.mockResolvedValue('used_memory:1024000\nconnected_clients:10');

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    
    // Check for Prometheus format
    expect(text).toContain('# HELP system_memory_usage_bytes Current memory usage in bytes');
    expect(text).toContain('# TYPE system_memory_usage_bytes gauge');
    expect(text).toContain('system_memory_usage_bytes');
    
    expect(text).toContain('# HELP system_cpu_usage_percent Current CPU usage percentage');
    expect(text).toContain('# TYPE system_cpu_usage_percent gauge');
    
    expect(text).toContain('# HELP nodejs_heap_size_used_bytes Process heap space used');
    expect(text).toContain('# TYPE nodejs_heap_size_used_bytes gauge');
    
    expect(text).toContain('# HELP database_connections_active Number of active database connections');
    expect(text).toContain('database_connections_active 5');
  });

  it('should include Redis metrics when available', async () => {
    const { getConnectionCount, getQueryMetrics } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    getConnectionCount.mockResolvedValue(3);
    getQueryMetrics.mockResolvedValue({
      totalQueries: 500,
      avgResponseTime: 25
    });
    
    Redis().info.mockResolvedValue('used_memory:2048000\nconnected_clients:15');

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(text).toContain('# HELP redis_memory_used_bytes Redis memory usage in bytes');
    expect(text).toContain('redis_memory_used_bytes 2048000');
    expect(text).toContain('# HELP redis_connected_clients Number of connected Redis clients');
    expect(text).toContain('redis_connected_clients 15');
  });

  it('should handle database connection errors gracefully', async () => {
    const { getConnectionCount, getQueryMetrics } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    getConnectionCount.mockRejectedValue(new Error('Database error'));
    getQueryMetrics.mockRejectedValue(new Error('Database error'));
    
    Redis().info.mockResolvedValue('used_memory:1024000');

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('system_memory_usage_bytes');
    expect(text).toContain('nodejs_heap_size_used_bytes');
    // Should not contain database metrics when error occurs
    expect(text).not.toContain('database_connections_active');
  });

  it('should handle Redis connection errors gracefully', async () => {
    const { getConnectionCount, getQueryMetrics } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    getConnectionCount.mockResolvedValue(2);
    getQueryMetrics.mockResolvedValue({
      totalQueries: 100,
      avgResponseTime: 30
    });
    
    Redis().info.mockRejectedValue(new Error('Redis error'));

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('system_memory_usage_bytes');
    expect(text).toContain('database_connections_active 2');
    // Should not contain Redis metrics when error occurs
    expect(text).not.toContain('redis_memory_used_bytes');
  });

  it('should include application uptime metric', async () => {
    const { getConnectionCount, getQueryMetrics } = require('@/lib/database');
    
    getConnectionCount.mockResolvedValue(1);
    getQueryMetrics.mockResolvedValue({
      totalQueries: 50,
      avgResponseTime: 20
    });

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(text).toContain('# HELP process_uptime_seconds Process uptime in seconds');
    expect(text).toContain('# TYPE process_uptime_seconds counter');
    expect(text).toContain('process_uptime_seconds');
  });

  it('should include HTTP request metrics', async () => {
    const { getConnectionCount, getQueryMetrics } = require('@/lib/database');
    
    getConnectionCount.mockResolvedValue(1);
    getQueryMetrics.mockResolvedValue({
      totalQueries: 50,
      avgResponseTime: 20
    });

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(text).toContain('# HELP http_requests_total Total number of HTTP requests');
    expect(text).toContain('# TYPE http_requests_total counter');
    expect(text).toContain('http_requests_total');
  });

  it('should format metrics with proper labels', async () => {
    const { getConnectionCount, getQueryMetrics } = require('@/lib/database');
    
    getConnectionCount.mockResolvedValue(1);
    getQueryMetrics.mockResolvedValue({
      totalQueries: 50,
      avgResponseTime: 20
    });

    const response = await GET(mockRequest);
    const text = await response.text();

    // Check for proper label formatting
    expect(text).toContain('http_requests_total{method="GET",status="200"}');
    expect(text).toContain('database_query_duration_seconds{operation="select"}');
  });

  it('should handle missing Redis URL environment variable', async () => {
    delete process.env.REDIS_URL;
    
    const { getConnectionCount, getQueryMetrics } = require('@/lib/database');
    
    getConnectionCount.mockResolvedValue(1);
    getQueryMetrics.mockResolvedValue({
      totalQueries: 50,
      avgResponseTime: 20
    });

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('system_memory_usage_bytes');
    expect(text).not.toContain('redis_memory_used_bytes');
  });
});