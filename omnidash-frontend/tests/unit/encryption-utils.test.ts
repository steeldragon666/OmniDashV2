import { encrypt, decrypt, hashPassword, verifyPassword } from '@/lib/security/encryption-utils';

// Mock the crypto module
const mockCrypto = {
  randomBytes: jest.fn(),
  scryptSync: jest.fn(),
  createCipheriv: jest.fn(),
  createDecipheriv: jest.fn(),
  timingSafeEqual: jest.fn()
};

jest.mock('crypto', () => mockCrypto);

describe('Encryption Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encrypt', () => {
    it('should encrypt text successfully', () => {
      const mockIv = Buffer.from('test-iv-16-bytes', 'utf8');
      const mockCipher = {
        update: jest.fn().mockReturnValue(Buffer.from('encrypted-part1')),
        final: jest.fn().mockReturnValue(Buffer.from('encrypted-part2'))
      };

      mockCrypto.randomBytes.mockReturnValue(mockIv);
      mockCrypto.createCipheriv.mockReturnValue(mockCipher);

      const result = encrypt('test-plaintext');

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(16);
      expect(mockCrypto.createCipheriv).toHaveBeenCalledWith('aes-256-cbc', 'test-encryption-key-32-characters', mockIv);
      expect(mockCipher.update).toHaveBeenCalledWith('test-plaintext', 'utf8');
      expect(mockCipher.final).toHaveBeenCalled();

      const expectedResult = mockIv.toString('hex') + ':' + Buffer.concat([
        Buffer.from('encrypted-part1'),
        Buffer.from('encrypted-part2')
      ]).toString('hex');
      
      expect(result).toBe(expectedResult);
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('decrypt', () => {
    it('should decrypt text successfully', () => {
      const mockDecipher = {
        update: jest.fn().mockReturnValue('decrypted-part1'),
        final: jest.fn().mockReturnValue('decrypted-part2')
      };

      mockCrypto.createDecipheriv.mockReturnValue(mockDecipher);

      const encryptedData = '746573742d69762d31362d6279746573:656e637279707465642d6461746131656e637279707465642d6461746132';
      
      const result = decrypt(encryptedData);

      expect(mockCrypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        'test-encryption-key-32-characters',
        Buffer.from('746573742d69762d31362d6279746573', 'hex')
      );
      expect(result).toBe('decrypted-part1decrypted-part2');
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted data format');
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => decrypt('iv:data')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('hashPassword', () => {
    it('should hash password with salt', () => {
      const mockSalt = Buffer.from('test-salt-16-bytes', 'utf8');
      const mockHash = Buffer.from('hashed-password', 'utf8');

      mockCrypto.randomBytes.mockReturnValue(mockSalt);
      mockCrypto.scryptSync.mockReturnValue(mockHash);

      const result = hashPassword('test-password');

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(16);
      expect(mockCrypto.scryptSync).toHaveBeenCalledWith('test-password', mockSalt, 64);
      
      const expected = mockSalt.toString('hex') + ':' + mockHash.toString('hex');
      expect(result).toBe(expected);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const salt = Buffer.from('test-salt', 'utf8');
      const hash = Buffer.from('correct-hash', 'utf8');
      const storedPassword = salt.toString('hex') + ':' + hash.toString('hex');

      mockCrypto.scryptSync.mockReturnValue(hash);
      mockCrypto.timingSafeEqual.mockReturnValue(true);

      const result = verifyPassword('test-password', storedPassword);

      expect(mockCrypto.scryptSync).toHaveBeenCalledWith('test-password', salt, 64);
      expect(mockCrypto.timingSafeEqual).toHaveBeenCalledWith(hash, hash);
      expect(result).toBe(true);
    });

    it('should reject incorrect password', () => {
      const salt = Buffer.from('test-salt', 'utf8');
      const hash = Buffer.from('correct-hash', 'utf8');
      const wrongHash = Buffer.from('wrong-hash', 'utf8');
      const storedPassword = salt.toString('hex') + ':' + hash.toString('hex');

      mockCrypto.scryptSync.mockReturnValue(wrongHash);
      mockCrypto.timingSafeEqual.mockReturnValue(false);

      const result = verifyPassword('wrong-password', storedPassword);

      expect(result).toBe(false);
    });

    it('should throw error for invalid stored password format', () => {
      expect(() => verifyPassword('password', 'invalid-format')).toThrow('Invalid stored password format');
    });

    it('should handle crypto errors gracefully', () => {
      mockCrypto.scryptSync.mockImplementation(() => {
        throw new Error('Crypto error');
      });

      const storedPassword = 'salt:hash';
      const result = verifyPassword('password', storedPassword);

      expect(result).toBe(false);
    });
  });
});