// Jest setup file for Next.js testing
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage(props) {
    const { src, alt, ...rest } = props;
    return React.createElement('img', { src, alt, ...rest });
  };
});

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...rest }) {
    return React.createElement('a', { href, ...rest }, children);
  };
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.CSRF_SECRET = 'test-csrf-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';

// Mock crypto for Node.js compatibility
const crypto = require('crypto');
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => crypto.randomUUID(),
    getRandomValues: (arr) => crypto.getRandomValues(arr),
    subtle: crypto.webcrypto?.subtle,
  },
});

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock console methods in test environment
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    // Suppress console.log in tests unless explicitly enabled
    log: process.env.VERBOSE_TESTS ? console.log : jest.fn(),
    debug: process.env.VERBOSE_TESTS ? console.debug : jest.fn(),
    info: process.env.VERBOSE_TESTS ? console.info : jest.fn(),
    warn: console.warn,
    error: console.error,
  };
}

// Add custom matchers
expect.extend({
  toBeOneOf(received, validOptions) {
    const pass = validOptions.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${validOptions}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${validOptions}`,
        pass: false,
      };
    }
  },
});

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset environment variables
  process.env.NODE_ENV = 'test';
  
  // Clear localStorage and sessionStorage
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// Global test teardown
afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  fail(reason);
});

// Set test timeout
jest.setTimeout(10000);

// Export for use in individual test files
export {
  localStorageMock,
  sessionStorageMock,
};