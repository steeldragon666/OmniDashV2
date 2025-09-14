import jwt from 'jsonwebtoken';
import { JWTPayload } from '@/types/auth';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'omnidash-api',
    audience: 'omnidash-client'
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'omnidash-api',
      audience: 'omnidash-client'
    } as jwt.VerifyOptions) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const generateRefreshToken = (): string => {
  return jwt.sign(
    { type: 'refresh' },
    JWT_SECRET,
    {
      expiresIn: '30d',
      issuer: 'omnidash-api',
      audience: 'omnidash-client'
    } as jwt.SignOptions
  );
};