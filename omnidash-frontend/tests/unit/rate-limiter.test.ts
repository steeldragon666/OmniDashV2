import { RateLimiter } from '@/lib/security/rate-limiter';
import { Redis } from 'ioredis';

jest.mock('ioredis');

describe('RateLimiter', () => {
  let mockRedis: jest.Mocked<Redis>;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = {
      multi: jest.fn().mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn()
      }),
      get: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn(),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);
    rateLimiter = new RateLimiter();
  });

  describe('checkLimit', () => {
    it('should allow request when under limit', async () => {
      const mockExec = jest.fn().mockResolvedValue([[null, 1], [null, 'OK']]);
      mockRedis.multi().exec = mockExec;

      const result = await rateLimiter.checkLimit('test-key', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(mockRedis.multi).toHaveBeenCalled();
    });

    it('should deny request when over limit', async () => {
      const mockExec = jest.fn().mockResolvedValue([[null, 11], [null, 'OK']]);
      mockRedis.multi().exec = mockExec;

      const result = await rateLimiter.checkLimit('test-key', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(-1);
    });

    it('should handle Redis errors gracefully', async () => {
      const mockExec = jest.fn().mockRejectedValue(new Error('Redis error'));
      mockRedis.multi().exec = mockExec;

      const result = await rateLimiter.checkLimit('test-key', 10, 60);

      // Should allow on Redis failure (fail open for availability)
      expect(result.allowed).toBe(true);
    });

    it('should calculate correct reset time', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      const mockExec = jest.fn().mockResolvedValue([[null, 1], [null, 'OK']]);
      mockRedis.multi().exec = mockExec;

      const result = await rateLimiter.checkLimit('test-key', 10, 60);

      expect(result.resetTime).toBe(Math.floor((now + 60 * 1000) / 1000));
    });
  });

  describe('getRemainingTime', () => {
    it('should return remaining TTL', async () => {
      mockRedis.ttl.mockResolvedValue(30);

      const remaining = await rateLimiter.getRemainingTime('test-key');

      expect(remaining).toBe(30);
      expect(mockRedis.ttl).toHaveBeenCalledWith('test-key');
    });

    it('should return 0 for non-existent key', async () => {
      mockRedis.ttl.mockResolvedValue(-2);

      const remaining = await rateLimiter.getRemainingTime('test-key');

      expect(remaining).toBe(0);
    });
  });

  describe('clearLimit', () => {
    it('should delete the key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await rateLimiter.clearLimit('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('getUsage', () => {
    it('should return current usage count', async () => {
      mockRedis.get.mockResolvedValue('5');

      const usage = await rateLimiter.getUsage('test-key');

      expect(usage).toBe(5);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return 0 for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const usage = await rateLimiter.getUsage('test-key');

      expect(usage).toBe(0);
    });
  });
});