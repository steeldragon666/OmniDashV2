import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager } from '@/lib/cache/cache-manager';
import { getCacheMetrics } from '@/lib/cache/cache-decorators';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const key = searchParams.get('key');
    
    const cacheManager = getCacheManager();
    
    switch (action) {
      case 'stats':
        const stats = await cacheManager.getStats();
        const metrics = await getCacheMetrics();
        
        return NextResponse.json({
          cache: stats,
          metrics,
          timestamp: new Date().toISOString()
        });
        
      case 'info':
        const info = await cacheManager.info();
        return NextResponse.json({
          info,
          timestamp: new Date().toISOString()
        });
        
      case 'ping':
        const healthy = await cacheManager.ping();
        return NextResponse.json({
          healthy,
          timestamp: new Date().toISOString()
        });
        
      case 'get':
        if (!key) {
          return NextResponse.json(
            { error: 'Key parameter is required for get action' },
            { status: 400 }
          );
        }
        
        const value = await cacheManager.get(key);
        const ttl = await cacheManager.ttl(key);
        
        return NextResponse.json({
          key,
          value,
          ttl,
          exists: value !== null,
          timestamp: new Date().toISOString()
        });
        
      case 'exists':
        if (!key) {
          return NextResponse.json(
            { error: 'Key parameter is required for exists action' },
            { status: 400 }
          );
        }
        
        const exists = await cacheManager.exists(key);
        const keyTtl = await cacheManager.ttl(key);
        
        return NextResponse.json({
          key,
          exists,
          ttl: keyTtl,
          timestamp: new Date().toISOString()
        });
        
      default:
        // Default: return cache stats
        const defaultStats = await cacheManager.getStats();
        return NextResponse.json({
          cache: defaultStats,
          endpoints: {
            stats: '/api/cache?action=stats',
            info: '/api/cache?action=info',
            ping: '/api/cache?action=ping',
            get: '/api/cache?action=get&key=<key>',
            exists: '/api/cache?action=exists&key=<key>'
          },
          timestamp: new Date().toISOString()
        });
    }
    
  } catch (error) {
    console.error('Cache API GET error:', error);
    return NextResponse.json(
      {
        error: 'Cache operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, key, value, ttl, keys, pattern } = body;
    
    const cacheManager = getCacheManager();
    
    switch (action) {
      case 'set':
        if (!key || value === undefined) {
          return NextResponse.json(
            { error: 'Key and value are required for set action' },
            { status: 400 }
          );
        }
        
        const setSuccess = await cacheManager.set(key, value, ttl);
        
        return NextResponse.json({
          success: setSuccess,
          key,
          ttl: ttl || 3600,
          timestamp: new Date().toISOString()
        });
        
      case 'delete':
      case 'del':
        if (!key) {
          return NextResponse.json(
            { error: 'Key is required for delete action' },
            { status: 400 }
          );
        }
        
        const deleteSuccess = await cacheManager.del(key);
        
        return NextResponse.json({
          success: deleteSuccess,
          key,
          timestamp: new Date().toISOString()
        });
        
      case 'mget':
        if (!keys || !Array.isArray(keys)) {
          return NextResponse.json(
            { error: 'Keys array is required for mget action' },
            { status: 400 }
          );
        }
        
        const values = await cacheManager.mget(keys);
        const keyValuePairs: Record<string, any> = {};
        
        keys.forEach((k: string, index: number) => {
          keyValuePairs[k] = values[index];
        });
        
        return NextResponse.json({
          keys,
          values: keyValuePairs,
          timestamp: new Date().toISOString()
        });
        
      case 'mset':
        if (!keys || typeof keys !== 'object') {
          return NextResponse.json(
            { error: 'Keys object is required for mset action' },
            { status: 400 }
          );
        }
        
        const msetSuccess = await cacheManager.mset(keys, ttl);
        
        return NextResponse.json({
          success: msetSuccess,
          count: Object.keys(keys).length,
          ttl: ttl || 3600,
          timestamp: new Date().toISOString()
        });
        
      case 'deleteByPattern':
        if (!pattern) {
          return NextResponse.json(
            { error: 'Pattern is required for deleteByPattern action' },
            { status: 400 }
          );
        }
        
        const deletedCount = await cacheManager.deleteByPattern(pattern);
        
        return NextResponse.json({
          success: true,
          pattern,
          deletedCount,
          timestamp: new Date().toISOString()
        });
        
      case 'flush':
      case 'flushall':
        const flushSuccess = await cacheManager.flushall();
        
        return NextResponse.json({
          success: flushSuccess,
          message: 'All cache entries have been cleared',
          timestamp: new Date().toISOString()
        });
        
      case 'warmup':
        if (!keys || typeof keys !== 'object') {
          return NextResponse.json(
            { error: 'Warmup data object is required' },
            { status: 400 }
          );
        }
        
        await cacheManager.warmup(keys);
        
        return NextResponse.json({
          success: true,
          message: 'Cache warmed up successfully',
          entriesCount: Object.keys(keys).length,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json(
          { 
            error: 'Invalid action',
            availableActions: [
              'set',
              'delete',
              'mget',
              'mset',
              'deleteByPattern',
              'flush',
              'warmup'
            ]
          },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Cache API POST error:', error);
    return NextResponse.json(
      {
        error: 'Cache operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const pattern = searchParams.get('pattern');
    
    const cacheManager = getCacheManager();
    
    if (pattern) {
      // Delete by pattern
      const deletedCount = await cacheManager.deleteByPattern(pattern);
      
      return NextResponse.json({
        success: true,
        pattern,
        deletedCount,
        timestamp: new Date().toISOString()
      });
    }
    
    if (key) {
      // Delete single key
      const deleteSuccess = await cacheManager.del(key);
      
      return NextResponse.json({
        success: deleteSuccess,
        key,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { error: 'Key or pattern parameter is required' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Cache API DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Cache delete operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}