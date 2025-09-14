// Test setup file for Node.js backend
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.BCRYPT_SALT_ROUNDS = '4'; // Lower for faster tests
process.env.SESSION_SECRET = 'test-session-secret';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Google OAuth test credentials
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

// Other social media test credentials
process.env.FACEBOOK_CLIENT_ID = 'test-facebook-client-id';
process.env.FACEBOOK_CLIENT_SECRET = 'test-facebook-client-secret';
process.env.TWITTER_CLIENT_ID = 'test-twitter-client-id';
process.env.TWITTER_CLIENT_SECRET = 'test-twitter-client-secret';
process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';
process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-client-secret';

// Email service test configuration
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';

// Google Cloud test configuration
process.env.GOOGLE_APPLICATION_CREDENTIALS = './test-service-account.json';
process.env.GCP_PROJECT_ID = 'test-project';

// OpenAI test configuration
process.env.OPENAI_API_KEY = 'test-openai-api-key';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests unless verbose is enabled
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
    // Keep warn and error for important messages
  }
});

afterAll(() => {
  // Restore original console methods
  Object.assign(console, originalConsole);
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in test:', reason);
  throw reason;
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in test:', error);
  throw error;
});

// Global test timeout
jest.setTimeout(10000);

export {};