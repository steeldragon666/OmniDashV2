import { GET } from '@/app/api/health/route';
import { NextRequest } from 'next/server';

// Mock external dependencies
jest.mock('@/lib/database', () => ({
  testConnection: jest.fn()
}));

jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      ping: jest.fn(),
      disconnect: jest.fn()
    }))
  };
});

describe('/api/health', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/health');
    
    // Set up environment variables
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
  });

  it('should return healthy status when all services are working', async () => {
    const { testConnection } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    testConnection.mockResolvedValue(true);
    Redis().ping.mockResolvedValue('PONG');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.services.database.status).toBe('healthy');
    expect(data.services.redis.status).toBe('healthy');
    expect(data.services.memory.status).toBeOneOf(['healthy', 'warning']);
    expect(data.uptime).toBeGreaterThan(0);
  });

  it('should return degraded status when database is down', async () => {
    const { testConnection } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    testConnection.mockRejectedValue(new Error('Database connection failed'));
    Redis().ping.mockResolvedValue('PONG');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.services.database.status).toBe('unhealthy');
    expect(data.services.database.error).toBe('Database connection failed');
    expect(data.services.redis.status).toBe('healthy');
  });

  it('should return degraded status when Redis is down', async () => {
    const { testConnection } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    testConnection.mockResolvedValue(true);
    Redis().ping.mockRejectedValue(new Error('Redis connection failed'));

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.services.database.status).toBe('healthy');
    expect(data.services.redis.status).toBe('unhealthy');
    expect(data.services.redis.error).toBe('Redis connection failed');
  });

  it('should include system information', async () => {
    const { testConnection } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    testConnection.mockResolvedValue(true);
    Redis().ping.mockResolvedValue('PONG');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data.version).toBeDefined();
    expect(data.environment).toBeDefined();
    expect(data.uptime).toBeGreaterThan(0);
    expect(data.services.memory.usage).toBeDefined();
    expect(data.services.memory.limit).toBeDefined();
  });

  it('should handle missing environment variables gracefully', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.services.database.status).toBe('unhealthy');
    expect(data.services.redis.status).toBe('unhealthy');
  });

  it('should include detailed service information', async () => {
    const { testConnection } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    testConnection.mockResolvedValue(true);
    Redis().ping.mockResolvedValue('PONG');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data.services.database).toHaveProperty('status');
    expect(data.services.database).toHaveProperty('responseTime');
    expect(data.services.redis).toHaveProperty('status');
    expect(data.services.redis).toHaveProperty('responseTime');
    expect(data.services.memory).toHaveProperty('status');
    expect(data.services.memory).toHaveProperty('usage');
  });

  it('should measure response times for services', async () => {
    const { testConnection } = require('@/lib/database');
    const { Redis } = require('ioredis');
    
    // Simulate slow response
    testConnection.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(true), 100))
    );
    Redis().ping.mockResolvedValue('PONG');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data.services.database.responseTime).toBeGreaterThanOrEqual(100);
    expect(data.services.redis.responseTime).toBeGreaterThanOrEqual(0);
  });
});