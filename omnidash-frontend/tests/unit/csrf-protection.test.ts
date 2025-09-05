import { generateCSRFToken, validateCSRFToken } from '@/lib/security/csrf-protection';
import { NextRequest } from 'next/server';

// Mock the crypto module
const mockCrypto = {
  randomBytes: jest.fn(),
  createHmac: jest.fn()
};

jest.mock('crypto', () => mockCrypto);

describe('CSRF Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CSRF_SECRET = 'test-secret-key-for-csrf-protection';
  });

  afterEach(() => {
    delete process.env.CSRF_SECRET;
  });

  describe('generateCSRFToken', () => {
    it('should generate a valid CSRF token', () => {
      const mockRandomBytes = Buffer.from('test-random-bytes', 'utf8');
      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-signature')
      };

      mockCrypto.randomBytes.mockReturnValue(mockRandomBytes);
      mockCrypto.createHmac.mockReturnValue(mockHmac);

      const token = generateCSRFToken();

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockCrypto.createHmac).toHaveBeenCalledWith('sha256', 'test-secret-key-for-csrf-protection');
      expect(mockHmac.update).toHaveBeenCalledWith(mockRandomBytes.toString('base64'));
      expect(mockHmac.digest).toHaveBeenCalledWith('hex');
      
      const expectedToken = `${mockRandomBytes.toString('base64')}.test-signature`;
      expect(token).toBe(expectedToken);
    });

    it('should throw error when CSRF_SECRET is not set', () => {
      delete process.env.CSRF_SECRET;

      expect(() => generateCSRFToken()).toThrow('CSRF_SECRET environment variable is not set');
    });
  });

  describe('validateCSRFToken', () => {
    const validToken = 'dGVzdC1yYW5kb20tYnl0ZXM=.test-signature';

    beforeEach(() => {
      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-signature')
      };
      mockCrypto.createHmac.mockReturnValue(mockHmac);
    });

    it('should validate a correct CSRF token from header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(validToken)
        }
      } as unknown as NextRequest;

      const isValid = validateCSRFToken(mockRequest);

      expect(isValid).toBe(true);
      expect(mockRequest.headers.get).toHaveBeenCalledWith('x-csrf-token');
    });

    it('should validate a correct CSRF token from form data', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as unknown as NextRequest;

      const isValid = validateCSRFToken(mockRequest, validToken);

      expect(isValid).toBe(true);
    });

    it('should reject token with invalid format', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('invalid-token-format')
        }
      } as unknown as NextRequest;

      const isValid = validateCSRFToken(mockRequest);

      expect(isValid).toBe(false);
    });

    it('should reject token with invalid signature', () => {
      const invalidToken = 'dGVzdC1yYW5kb20tYnl0ZXM=.wrong-signature';
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(invalidToken)
        }
      } as unknown as NextRequest;

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('correct-signature')
      };
      mockCrypto.createHmac.mockReturnValue(mockHmac);

      const isValid = validateCSRFToken(mockRequest);

      expect(isValid).toBe(false);
    });

    it('should reject empty token', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as unknown as NextRequest;

      const isValid = validateCSRFToken(mockRequest);

      expect(isValid).toBe(false);
    });

    it('should throw error when CSRF_SECRET is not set', () => {
      delete process.env.CSRF_SECRET;
      
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(validToken)
        }
      } as unknown as NextRequest;

      expect(() => validateCSRFToken(mockRequest)).toThrow('CSRF_SECRET environment variable is not set');
    });

    it('should handle crypto errors gracefully', () => {
      mockCrypto.createHmac.mockImplementation(() => {
        throw new Error('Crypto error');
      });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(validToken)
        }
      } as unknown as NextRequest;

      const isValid = validateCSRFToken(mockRequest);

      expect(isValid).toBe(false);
    });
  });
});