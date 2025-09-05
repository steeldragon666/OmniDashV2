/**
 * Secure Encryption Utility
 * Uses AES-256-GCM with proper IV generation and authentication
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export class SecureEncryption {
  private static instance: SecureEncryption;
  private key: Buffer;
  private algorithm = 'aes-256-gcm';
  private saltLength = 32;
  private ivLength = 16;
  private tagLength = 16;
  
  private constructor() {
    // Validate encryption key from environment
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required. ' +
        'Generate a secure key using: openssl rand -hex 32'
      );
    }
    
    if (encryptionKey.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY must be at least 32 characters long. ' +
        'Generate a secure key using: openssl rand -hex 32'
      );
    }
    
    // Check for weak/default keys
    const weakKeys = [
      'default',
      'password',
      'secret',
      'test',
      '12345',
      'admin'
    ];
    
    if (weakKeys.some(weak => encryptionKey.toLowerCase().includes(weak))) {
      throw new Error(
        'ENCRYPTION_KEY contains weak or default values. ' +
        'Please generate a secure random key.'
      );
    }
    
    // Derive encryption key from the provided key using scrypt
    const salt = Buffer.from(process.env.ENCRYPTION_SALT || 'OmniDashSecureSalt2024', 'utf8');
    this.key = scryptSync(encryptionKey, salt, 32);
  }
  
  public static getInstance(): SecureEncryption {
    if (!SecureEncryption.instance) {
      SecureEncryption.instance = new SecureEncryption();
    }
    return SecureEncryption.instance;
  }
  
  /**
   * Encrypts data using AES-256-GCM
   * @param text The plaintext to encrypt
   * @param additionalData Optional additional authenticated data
   * @returns Encrypted data with IV and auth tag
   */
  public encrypt(text: string, additionalData?: string): string {
    try {
      // Generate random IV
      const iv = randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = createCipheriv(this.algorithm, this.key, iv);
      
      // Set additional authenticated data if provided
      if (additionalData) {
        cipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }
      
      // Encrypt the text
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
      ]);
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const combined = Buffer.concat([
        iv,
        authTag,
        encrypted
      ]);
      
      // Return base64 encoded string
      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Decrypts data encrypted with encrypt()
   * @param encryptedText The encrypted data
   * @param additionalData Optional additional authenticated data (must match encryption)
   * @returns Decrypted plaintext
   */
  public decrypt(encryptedText: string, additionalData?: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedText, 'base64');
      
      // Extract components
      const iv = combined.slice(0, this.ivLength);
      const authTag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      // Create decipher
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      // Set additional authenticated data if provided
      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }
      
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generates a secure random key for encryption
   * @param length Key length in bytes (default 32 for AES-256)
   * @returns Hex-encoded random key
   */
  public static generateKey(length = 32): string {
    return randomBytes(length).toString('hex');
  }
  
  /**
   * Generates a secure random salt
   * @param length Salt length in bytes (default 32)
   * @returns Hex-encoded random salt
   */
  public static generateSalt(length = 32): string {
    return randomBytes(length).toString('hex');
  }
  
  /**
   * Hashes sensitive data for storage (one-way)
   * @param data Data to hash
   * @param salt Optional salt (generated if not provided)
   * @returns Hash and salt
   */
  public hash(data: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || randomBytes(this.saltLength).toString('hex');
    const hash = scryptSync(data, actualSalt, 64).toString('hex');
    
    return {
      hash,
      salt: actualSalt
    };
  }
  
  /**
   * Verifies hashed data
   * @param data Data to verify
   * @param hash Previously generated hash
   * @param salt Salt used for hashing
   * @returns True if data matches hash
   */
  public verifyHash(data: string, hash: string, salt: string): boolean {
    const testHash = scryptSync(data, salt, 64).toString('hex');
    return testHash === hash;
  }
  
  /**
   * Encrypts an object as JSON
   * @param obj Object to encrypt
   * @returns Encrypted string
   */
  public encryptObject(obj: any): string {
    return this.encrypt(JSON.stringify(obj));
  }
  
  /**
   * Decrypts a JSON object
   * @param encryptedText Encrypted string
   * @returns Decrypted object
   */
  public decryptObject<T = any>(encryptedText: string): T {
    const json = this.decrypt(encryptedText);
    return JSON.parse(json) as T;
  }
  
  /**
   * Creates a time-limited encrypted token
   * @param data Data to include in token
   * @param expiresInMs Expiration time in milliseconds
   * @returns Encrypted token
   */
  public createToken(data: any, expiresInMs: number): string {
    const payload = {
      data,
      expires: Date.now() + expiresInMs,
      nonce: randomBytes(16).toString('hex')
    };
    
    return this.encryptObject(payload);
  }
  
  /**
   * Verifies and decrypts a time-limited token
   * @param token Encrypted token
   * @returns Token data if valid and not expired
   */
  public verifyToken<T = any>(token: string): T | null {
    try {
      const payload = this.decryptObject<{
        data: T;
        expires: number;
        nonce: string;
      }>(token);
      
      if (Date.now() > payload.expires) {
        return null; // Token expired
      }
      
      return payload.data;
    } catch {
      return null; // Invalid token
    }
  }
}

// Export singleton instance
export const encryption = SecureEncryption.getInstance();

// Export helper functions
export function encryptData(text: string): string {
  return encryption.encrypt(text);
}

export function decryptData(encryptedText: string): string {
  return encryption.decrypt(encryptedText);
}

export function generateSecureKey(): string {
  return SecureEncryption.generateKey();
}

export function generateSecureSalt(): string {
  return SecureEncryption.generateSalt();
}