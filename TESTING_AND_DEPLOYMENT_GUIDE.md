# 🧪 **Testing and Deployment Guide**

## 📋 **Overview**

This guide covers comprehensive testing strategies and production deployment procedures for the OmniDash Platform. The platform includes automated testing, CI/CD pipelines, and production-ready deployment configurations.

---

## 🧪 **Testing Strategy**

### **Test Types**

#### **1. Unit Tests**
- **Purpose:** Test individual functions and components
- **Coverage:** 90%+ code coverage
- **Tools:** Jest, React Testing Library
- **Location:** `omnidash-backend/tests/unit/`, `omnidash-frontend/__tests__/`

#### **2. Integration Tests**
- **Purpose:** Test API endpoints and database interactions
- **Coverage:** All API endpoints
- **Tools:** Jest, Supertest
- **Location:** `omnidash-backend/tests/integration/`

#### **3. End-to-End Tests**
- **Purpose:** Test complete user workflows
- **Coverage:** Critical user journeys
- **Tools:** Playwright, Cypress
- **Location:** `tests/e2e/`

#### **4. Performance Tests**
- **Purpose:** Test system performance under load
- **Coverage:** API endpoints, database queries
- **Tools:** Artillery, k6
- **Location:** `tests/performance/`

#### **5. Security Tests**
- **Purpose:** Test security vulnerabilities
- **Coverage:** Authentication, authorization, input validation
- **Tools:** OWASP ZAP, Snyk
- **Location:** `tests/security/`

---

## 🚀 **Running Tests**

### **Backend Tests**
```bash
cd omnidash-backend

# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:agents

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run performance tests
npm run test:performance
```

### **Frontend Tests**
```bash
cd omnidash-frontend

# Run all tests
npm test

# Run component tests
npm run test:components

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### **E2E Tests**
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in headless mode
npm run test:e2e:headless

# Run E2E tests with video recording
npm run test:e2e:video
```

### **Security Tests**
```bash
# Run security tests
npm run test:security

# Run vulnerability scan
npm run security:scan

# Run OWASP ZAP scan
npm run security:zap
```

---

## 📊 **Test Coverage**

### **Coverage Targets**
- **Backend:** 90%+ line coverage
- **Frontend:** 85%+ line coverage
- **API Endpoints:** 100% endpoint coverage
- **Critical Paths:** 100% coverage

### **Coverage Reports**
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### **Coverage Configuration**
```json
// jest.config.js
{
  "collectCoverageFrom": [
    "src/**/*.{js,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,ts,tsx}",
    "!src/**/*.test.{js,ts,tsx}"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

---

## 🔄 **CI/CD Pipeline**

### **GitHub Actions Workflow**

#### **Backend CI/CD**
```yaml
# .github/workflows/backend.yml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths: ['omnidash-backend/**']
  pull_request:
    branches: [main]
    paths: ['omnidash-backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: omnidash-backend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd omnidash-backend
          npm ci
      
      - name: Run linting
        run: |
          cd omnidash-backend
          npm run lint
      
      - name: Run type checking
        run: |
          cd omnidash-backend
          npm run type-check
      
      - name: Run unit tests
        run: |
          cd omnidash-backend
          npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run integration tests
        run: |
          cd omnidash-backend
          npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run security tests
        run: |
          cd omnidash-backend
          npm run test:security
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: omnidash-backend/coverage/lcov.info
          flags: backend
          name: backend-coverage

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Supabase
        run: |
          cd omnidash-backend
          npm run deploy:production
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

#### **Frontend CI/CD**
```yaml
# .github/workflows/frontend.yml
name: Frontend CI/CD

on:
  push:
    branches: [main, develop]
    paths: ['omnidash-frontend/**']
  pull_request:
    branches: [main]
    paths: ['omnidash-frontend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: omnidash-frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd omnidash-frontend
          npm ci
      
      - name: Run linting
        run: |
          cd omnidash-frontend
          npm run lint
      
      - name: Run type checking
        run: |
          cd omnidash-frontend
          npm run type-check
      
      - name: Run tests
        run: |
          cd omnidash-frontend
          npm test -- --coverage --watchAll=false
      
      - name: Build application
        run: |
          cd omnidash-frontend
          npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: omnidash-frontend/coverage/lcov.info
          flags: frontend
          name: frontend-coverage

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: omnidash-frontend
```

---

## 🚀 **Deployment**

### **Environment Setup**

#### **Production Environment Variables**
```bash
# Backend (.env.production)
DATABASE_URL=postgresql://user:password@prod-db.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_production_jwt_secret
FRONTEND_URL=https://app.omnidash.com
NODE_ENV=production
LOG_LEVEL=info

# AI Services
OPENAI_API_KEY=your_production_openai_key
ANTHROPIC_API_KEY=your_production_anthropic_key
GOOGLE_AI_API_KEY=your_production_google_ai_key

# External APIs
TWITTER_API_KEY=your_production_twitter_key
FACEBOOK_APP_ID=your_production_facebook_app_id
LINKEDIN_CLIENT_ID=your_production_linkedin_client_id
GOOGLE_CALENDAR_TOKEN=your_production_google_calendar_token
VERCEL_TOKEN=your_production_vercel_token

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_production_email
SMTP_PASS=your_production_app_password
```

#### **Frontend Environment Variables**
```bash
# Frontend (.env.production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
NEXT_PUBLIC_API_URL=https://api.omnidash.com
NEXT_PUBLIC_GA_ID=your_production_google_analytics_id
```

### **Database Deployment**

#### **Supabase Setup**
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Deploy database changes
supabase db push

# Deploy functions
supabase functions deploy

# Deploy edge functions
supabase edge-functions deploy
```

#### **Database Migrations**
```bash
cd omnidash-backend

# Generate migration
npx prisma migrate dev --name add_new_feature

# Deploy to production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### **Backend Deployment**

#### **Supabase Functions**
```bash
# Deploy API functions
supabase functions deploy api

# Deploy agent functions
supabase functions deploy agents

# Deploy webhook functions
supabase functions deploy webhooks
```

#### **Environment Configuration**
```bash
# Set environment variables
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set ANTHROPIC_API_KEY=your_key
supabase secrets set JWT_SECRET=your_secret
```

### **Frontend Deployment**

#### **Vercel Deployment**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
cd omnidash-frontend
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_API_URL
```

#### **Custom Domain Setup**
```bash
# Add custom domain
vercel domains add app.omnidash.com

# Configure DNS
# Add CNAME record pointing to cname.vercel-dns.com
```

---

## 📊 **Monitoring and Observability**

### **Application Monitoring**

#### **Error Tracking**
```typescript
// Sentry configuration
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

#### **Performance Monitoring**
```typescript
// Performance monitoring
import { Analytics } from '@vercel/analytics';

// Track custom events
Analytics.track('agent_task_completed', {
  agentId: 'agent-1',
  taskType: 'generate-content',
  duration: 2.3
});
```

#### **Logging**
```typescript
// Winston logger configuration
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### **Health Checks**

#### **API Health Check**
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      externalAPIs: await checkExternalAPIs()
    }
  };
  
  res.json(health);
});
```

#### **Agent Health Check**
```typescript
// Agent health check
app.get('/health/agents', async (req, res) => {
  const agentHealth = await Promise.all(
    agents.map(async (agent) => ({
      id: agent.id,
      status: agent.status,
      lastActivity: agent.lastActivity,
      metrics: agent.getMetrics()
    }))
  );
  
  res.json({ agents: agentHealth });
});
```

---

## 🔒 **Security Deployment**

### **SSL/TLS Configuration**
```bash
# Vercel automatically handles SSL
# For custom domains, ensure SSL is enabled

# Supabase handles SSL automatically
# No additional configuration needed
```

### **Security Headers**
```typescript
// Security headers middleware
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### **Rate Limiting**
```typescript
// Rate limiting configuration
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

---

## 📈 **Performance Optimization**

### **Database Optimization**
```sql
-- Create indexes for better performance
CREATE INDEX idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Optimize queries
EXPLAIN ANALYZE SELECT * FROM tasks WHERE agent_id = 'agent-1' AND status = 'completed';
```

### **Caching Strategy**
```typescript
// Redis caching
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache agent results
const cacheKey = `agent:${agentId}:result:${taskId}`;
await redis.setex(cacheKey, 3600, JSON.stringify(result));
```

### **CDN Configuration**
```typescript
// Vercel CDN configuration
// Automatically handled by Vercel
// No additional configuration needed
```

---

## 🚨 **Rollback Procedures**

### **Database Rollback**
```bash
# Rollback to previous migration
npx prisma migrate rollback

# Rollback to specific migration
npx prisma migrate rollback --to 20231201000000_add_feature
```

### **Application Rollback**
```bash
# Vercel rollback
vercel rollback

# Supabase function rollback
supabase functions deploy api --no-verify-jwt
```

### **Emergency Procedures**
```bash
# Disable all agents
curl -X POST https://api.omnidash.com/admin/agents/disable-all

# Enable maintenance mode
curl -X POST https://api.omnidash.com/admin/maintenance/enable
```

---

## 📋 **Deployment Checklist**

### **Pre-Deployment**
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Performance tests passed
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Backup created

### **Deployment**
- [ ] Database migrations deployed
- [ ] Backend functions deployed
- [ ] Frontend deployed
- [ ] DNS configured
- [ ] SSL certificates valid
- [ ] Health checks passing

### **Post-Deployment**
- [ ] Smoke tests passed
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Documentation updated
- [ ] Team notified
- [ ] Rollback plan ready

---

## 📞 **Support and Troubleshooting**

### **Common Issues**
1. **Database Connection Issues**
   - Check connection string
   - Verify network access
   - Check SSL configuration

2. **Agent Startup Issues**
   - Check environment variables
   - Verify API keys
   - Check rate limits

3. **Performance Issues**
   - Check database queries
   - Monitor memory usage
   - Review error logs

### **Monitoring Tools**
- **Vercel Analytics** - Frontend performance
- **Supabase Dashboard** - Database and backend
- **Sentry** - Error tracking
- **Uptime Robot** - Uptime monitoring

---

**Status:** ✅ **DEPLOYMENT READY**  
**Last Updated:** December 2024  
**Version:** 2.0.0
