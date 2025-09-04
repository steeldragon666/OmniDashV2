# OmniDash AI Agents System

A comprehensive, production-ready AI agents system for OmniDash automation workflows. This system provides a scalable, event-driven architecture for orchestrating complex automation tasks across multiple domains.

## 🏗️ Architecture Overview

The agents system is built on a modular, event-driven architecture with the following key components:

### Core Components

- **BaseAgent**: Abstract base class providing common functionality
- **AgentRegistry**: Centralized registry for agent discovery and lifecycle management  
- **TaskQueue**: Redis-backed queue system for handling agent tasks
- **AgentService**: Service layer for system initialization and management

### Agent Types

1. **ContentCreatorAgent** - AI-powered content generation
2. **PostSchedulerAgent** - Social media scheduling and publishing
3. **ABNLookupAgent** - Australian business registry lookups
4. **WorkflowCoordinatorAgent** - Complex workflow orchestration
5. **N8NIntegrationAgent** - n8n workflow automation integration

## 🚀 Features

### Core Features
- **Event-driven architecture** with pub/sub messaging
- **State management** with Supabase integration
- **Comprehensive error handling** and retry mechanisms
- **Logging and metrics** collection
- **Health monitoring** and alerting
- **Rate limiting** and API key management
- **Queue management** for parallel processing
- **Real-time communication** between agents

### Agent Capabilities
- **AI Content Generation** (OpenAI, Anthropic, Google)
- **Social Media Publishing** (Twitter, Facebook, Instagram, LinkedIn)
- **Business Data Lookup** (ABR Web Services)
- **Workflow Orchestration** (Complex multi-step processes)
- **External Integration** (n8n, webhooks, APIs)

## 📁 Project Structure

```
src/agents/
├── core/                          # Core agent infrastructure
│   ├── BaseAgent.ts              # Abstract base agent class
│   ├── AgentInterface.ts         # Core interfaces and contracts
│   └── AgentRegistry.ts          # Agent registration and discovery
├── implementations/               # Specific agent implementations
│   ├── content/
│   │   └── ContentCreatorAgent.ts
│   ├── social/
│   │   └── PostSchedulerAgent.ts
│   ├── business/
│   │   └── ABNLookupAgent.ts
│   ├── workflow/
│   │   └── WorkflowCoordinatorAgent.ts
│   └── integration/
│       └── N8NIntegrationAgent.ts
├── services/                      # Agent management services
│   └── AgentService.ts           # System initialization and management
├── types/                         # Type definitions
│   └── AgentTypes.ts             # Core type definitions
├── utils/                         # Utility classes
│   ├── AgentLogger.ts            # Centralized logging
│   └── AgentMetricsCollector.ts  # Metrics collection
├── queues/                        # Queue management
│   └── TaskQueue.ts              # Redis-backed task queue
└── events/                        # Event handling
    └── (future event handlers)
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+ 
- Redis server
- PostgreSQL database (via Supabase)
- API keys for integrated services

### Dependencies

The system uses the following key dependencies:

```json
{
  "@anthropic-ai/sdk": "^0.9.1",
  "openai": "^4.20.1",
  "axios": "^1.6.2",
  "bull": "^4.12.1",
  "redis": "^4.6.11",
  "winston": "^3.11.0",
  "uuid": "^9.0.1",
  "node-cron": "^4.2.1",
  "xml2js": "^0.6.2"
}
```

### Environment Configuration

Copy `.env.agents.example` to `.env` and configure:

```bash
# Essential configuration
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
ABR_GUID=your-abr-guid
N8N_BASE_URL=http://localhost:5678
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Installation Steps

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`

3. Start Redis server:
```bash
redis-server
```

4. Start the application:
```bash
npm run dev
```

## 📝 Usage Examples

### Basic Agent Operations

#### Create and Register an Agent

```typescript
import { ContentCreatorAgent } from './agents/implementations/content/ContentCreatorAgent';
import { agentRegistry } from './agents/core/AgentRegistry';

const agent = new ContentCreatorAgent({
  id: 'content-creator-1',
  name: 'Content Creator Agent',
  description: 'AI content generation agent',
  version: '1.0.0',
  enabled: true,
  maxConcurrentTasks: 5,
  // ... other config
});

await agentRegistry.registerAgent(agent);
await agent.start();
```

#### Execute a Task

```typescript
import { AgentTask, TaskStatus, AgentPriority } from './agents/types/AgentTypes';

const task: AgentTask = {
  id: 'task-123',
  agentId: 'content-creator-1',
  type: 'generate-content',
  status: TaskStatus.PENDING,
  priority: AgentPriority.MEDIUM,
  payload: {
    type: 'social-post',
    prompt: 'Create a social media post about AI automation',
    platform: 'twitter',
    tone: 'professional'
  },
  context: {
    correlationId: 'req-456',
    requestId: 'user-req-789',
    source: 'web-app'
  },
  // ... other fields
};

const result = await agent.processTask(task);
console.log('Generated content:', result);
```

### HTTP API Usage

#### Generate Content

```bash
POST /api/agents/content/generate
Content-Type: application/json

{
  "type": "social-post",
  "prompt": "Create a post about sustainable business practices",
  "platform": "linkedin",
  "tone": "professional",
  "keywords": ["sustainability", "business", "green"]
}
```

#### Schedule Social Media Post

```bash
POST /api/agents/social/schedule
Content-Type: application/json

{
  "content": "Excited to share our latest product update! 🚀",
  "platforms": ["twitter", "linkedin"],
  "scheduledTime": "2024-01-15T10:00:00Z",
  "hashtags": ["product", "update", "innovation"]
}
```

#### Lookup Business Information

```bash
GET /api/agents/business/abn/51824753556
```

#### Execute Workflow

```bash
POST /api/agents/workflow/execute
Content-Type: application/json

{
  "workflowId": "content-to-social-workflow",
  "input": {
    "topic": "AI automation trends",
    "platforms": ["twitter", "linkedin"]
  }
}
```

### Agent System Management

#### Get System Health

```bash
GET /api/agents/system/health
```

Response:
```json
{
  "success": true,
  "data": {
    "overall": "healthy",
    "agents": [
      {
        "id": "content-creator-1",
        "name": "Content Creator Agent",
        "health": {
          "status": "healthy",
          "uptime": 3600000,
          "lastHeartbeat": "2024-01-15T10:30:00Z"
        }
      }
    ],
    "summary": {
      "total": 5,
      "healthy": 5,
      "degraded": 0,
      "unhealthy": 0
    }
  }
}
```

#### Get System Metrics

```bash
GET /api/agents/system/metrics
```

## 🔧 Agent Configuration

### ContentCreatorAgent

Handles AI-powered content generation across multiple providers and formats.

**Capabilities:**
- Text generation (OpenAI, Anthropic, Google)
- Content analysis and optimization
- SEO optimization
- Multi-platform content formatting

**Configuration:**
```typescript
{
  name: 'Content Creator Agent',
  capabilities: ['content-generation', 'content-analysis'],
  // AI provider settings configured via environment variables
}
```

### PostSchedulerAgent

Manages social media post scheduling and publishing across platforms.

**Capabilities:**
- Multi-platform publishing (Twitter, Facebook, Instagram, LinkedIn)
- Content scheduling and calendar management
- Post analytics and tracking
- Rate limiting and API management

**Configuration:**
```typescript
{
  name: 'Post Scheduler Agent',
  capabilities: ['social-media-publishing', 'content-scheduling'],
  // Platform credentials configured via environment variables
}
```

### ABNLookupAgent

Provides Australian Business Register lookup services.

**Capabilities:**
- ABN/ACN validation and lookup
- Business name search
- Business verification services
- Data caching and rate limiting

**Configuration:**
```typescript
{
  name: 'ABN Lookup Agent',
  capabilities: ['abn-lookup', 'business-search'],
  // ABR GUID configured via ABR_GUID environment variable
}
```

### WorkflowCoordinatorAgent

Orchestrates complex multi-step workflows across multiple agents.

**Capabilities:**
- Workflow definition and execution
- Step coordination and error handling
- Conditional logic and parallel processing
- Workflow templates and reusability

**Configuration:**
```typescript
{
  name: 'Workflow Coordinator Agent',
  capabilities: ['workflow-execution', 'workflow-orchestration'],
  maxConcurrentTasks: 10 // Higher concurrency for workflow management
}
```

### N8NIntegrationAgent

Integrates with n8n workflow automation platform.

**Capabilities:**
- n8n workflow execution and monitoring
- Workflow synchronization
- Webhook integration
- Execution status tracking

**Configuration:**
```typescript
{
  name: 'N8N Integration Agent',
  capabilities: ['n8n-workflow-execution', 'n8n-webhook-integration'],
  // n8n instance URL and API key configured via environment variables
}
```

## 🔍 Monitoring & Observability

### Health Checks

Each agent provides comprehensive health information:

- **Basic Health**: Agent status and responsiveness
- **Resource Usage**: Memory, CPU, and queue metrics  
- **Dependency Status**: External service connectivity
- **Custom Checks**: Agent-specific health validations

### Metrics Collection

The system collects detailed metrics:

- **Task Metrics**: Completion rates, durations, error rates
- **API Metrics**: External API call success/failure rates
- **Resource Metrics**: Memory usage, CPU utilization
- **Business Metrics**: Content generated, posts published, etc.

### Logging

Structured logging with multiple levels:

- **Agent Logs**: Individual agent activities
- **System Logs**: Registry and service-level events
- **Error Logs**: Detailed error tracking and stack traces
- **Audit Logs**: Security and compliance tracking

## 🔐 Security & Best Practices

### API Key Management

- Secure storage of API keys in environment variables
- Rotation and renewal tracking
- Rate limiting per provider
- Usage monitoring and alerts

### Error Handling

- Comprehensive try-catch blocks
- Graceful degradation strategies
- Automatic retry mechanisms
- Dead letter queue handling

### Scalability

- Horizontal scaling via Redis queues
- Load balancing across agent instances
- Resource isolation per agent type
- Performance monitoring and optimization

## 🧪 Testing

### Unit Testing

```bash
npm test
```

### Integration Testing

```bash
npm run test:integration
```

### Load Testing

```bash
npm run test:load
```

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**:
   - Configure production environment variables
   - Set up Redis cluster for high availability
   - Configure monitoring and alerting

2. **Docker Deployment**:
```bash
docker build -t omnidash-agents .
docker run -d --env-file .env omnidash-agents
```

3. **Health Monitoring**:
   - Configure health check endpoints
   - Set up monitoring dashboards
   - Configure alerting rules

### Scaling Considerations

- **Horizontal Scaling**: Multiple agent instances behind load balancer
- **Queue Scaling**: Redis cluster with appropriate sharding
- **Database Scaling**: Supabase connection pooling and read replicas
- **Monitoring**: Comprehensive observability stack

## 🤝 Contributing

1. Follow the established architecture patterns
2. Add comprehensive tests for new agents
3. Update documentation for new features
4. Follow TypeScript best practices
5. Ensure proper error handling and logging

## 📄 License

This project is part of the OmniDash platform and follows the same licensing terms.

---

## 🎯 Roadmap

### Short Term
- [ ] Add more social media platforms (TikTok, Pinterest)
- [ ] Implement workflow templates gallery
- [ ] Add bulk operations support
- [ ] Enhanced error recovery mechanisms

### Medium Term  
- [ ] Machine learning for content optimization
- [ ] Advanced workflow analytics
- [ ] Multi-tenant support
- [ ] API rate limiting per tenant

### Long Term
- [ ] Custom agent development SDK
- [ ] Marketplace for community agents
- [ ] Advanced AI model fine-tuning
- [ ] Enterprise compliance features

---

For detailed API documentation, visit `/api/docs` when running in development mode.