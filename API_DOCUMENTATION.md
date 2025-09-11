# 📚 **API Documentation**

## 📋 **Overview**

The OmniDash Platform provides a comprehensive REST API for managing AI agents, business processes, and integrations. All endpoints are secured with JWT authentication and include comprehensive error handling.

**Base URL:** `https://api.omnidash.com` (Production)  
**Base URL:** `http://localhost:3001` (Development)

---

## 🔐 **Authentication**

### **JWT Authentication**
All API endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### **Token Refresh**
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

**Response:**
```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token",
  "expiresIn": 3600
}
```

---

## 🤖 **AI Agent Endpoints**

### **Agent Management**

#### **List All Agents**
```http
GET /api/agents
```

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-1",
      "name": "Content Creator Agent",
      "type": "content",
      "status": "active",
      "capabilities": ["text-generation", "image-generation", "social-publishing"],
      "lastActivity": "2024-12-01T10:30:00Z"
    }
  ],
  "total": 12
}
```

#### **Get Agent Details**
```http
GET /api/agents/{agentId}
```

**Response:**
```json
{
  "id": "agent-1",
  "name": "Content Creator Agent",
  "type": "content",
  "status": "active",
  "config": {
    "maxTasks": 100,
    "timeout": 30000,
    "retries": 3
  },
  "metrics": {
    "tasksCompleted": 1250,
    "successRate": 98.5,
    "avgResponseTime": 2.3
  },
  "capabilities": ["text-generation", "image-generation", "social-publishing"]
}
```

#### **Start Agent**
```http
POST /api/agents/{agentId}/start
```

**Response:**
```json
{
  "success": true,
  "message": "Agent started successfully",
  "agentId": "agent-1",
  "status": "active"
}
```

#### **Stop Agent**
```http
POST /api/agents/{agentId}/stop
```

**Response:**
```json
{
  "success": true,
  "message": "Agent stopped successfully",
  "agentId": "agent-1",
  "status": "inactive"
}
```

### **Task Management**

#### **Create Task**
```http
POST /api/agents/{agentId}/tasks
Content-Type: application/json

{
  "type": "generate-content",
  "priority": "high",
  "payload": {
    "contentType": "blog-post",
    "topic": "AI in Business",
    "length": 1000,
    "tone": "professional"
  }
}
```

**Response:**
```json
{
  "taskId": "task-123",
  "status": "queued",
  "estimatedCompletion": "2024-12-01T10:35:00Z",
  "priority": "high"
}
```

#### **Get Task Status**
```http
GET /api/tasks/{taskId}
```

**Response:**
```json
{
  "taskId": "task-123",
  "status": "completed",
  "progress": 100,
  "result": {
    "content": "Generated blog post content...",
    "metadata": {
      "wordCount": 1000,
      "readabilityScore": 85,
      "seoScore": 92
    }
  },
  "createdAt": "2024-12-01T10:30:00Z",
  "completedAt": "2024-12-01T10:32:00Z"
}
```

#### **List Tasks**
```http
GET /api/tasks?agentId={agentId}&status={status}&limit=50&offset=0
```

**Response:**
```json
{
  "tasks": [
    {
      "taskId": "task-123",
      "agentId": "agent-1",
      "type": "generate-content",
      "status": "completed",
      "priority": "high",
      "createdAt": "2024-12-01T10:30:00Z",
      "completedAt": "2024-12-01T10:32:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

## 📊 **Analytics Endpoints**

### **Agent Metrics**

#### **Get Agent Metrics**
```http
GET /api/agents/{agentId}/metrics?timeframe=7d
```

**Response:**
```json
{
  "agentId": "agent-1",
  "timeframe": "7d",
  "metrics": {
    "tasksCompleted": 1250,
    "tasksFailed": 19,
    "successRate": 98.5,
    "avgResponseTime": 2.3,
    "throughput": 178.6,
    "errorRate": 1.5
  },
  "trends": {
    "tasksCompleted": "+12%",
    "successRate": "+2.1%",
    "avgResponseTime": "-0.3s"
  }
}
```

#### **Get System Metrics**
```http
GET /api/metrics/system?timeframe=24h
```

**Response:**
```json
{
  "timeframe": "24h",
  "system": {
    "totalAgents": 12,
    "activeAgents": 11,
    "totalTasks": 15420,
    "completedTasks": 15201,
    "failedTasks": 219,
    "systemUptime": 99.8
  },
  "performance": {
    "avgResponseTime": 1.8,
    "throughput": 642.5,
    "errorRate": 1.4
  }
}
```

---

## 🔗 **Integration Endpoints**

### **External API Connections**

#### **List Connections**
```http
GET /api/integrations/connections
```

**Response:**
```json
{
  "connections": [
    {
      "id": "conn-1",
      "name": "OpenAI API",
      "type": "ai-service",
      "status": "connected",
      "lastSync": "2024-12-01T10:30:00Z",
      "health": "healthy"
    }
  ]
}
```

#### **Test Connection**
```http
POST /api/integrations/connections/{connectionId}/test
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "responseTime": 245,
  "lastTested": "2024-12-01T10:30:00Z"
}
```

#### **Sync Data**
```http
POST /api/integrations/connections/{connectionId}/sync
Content-Type: application/json

{
  "direction": "in",
  "dataTypes": ["users", "content", "analytics"]
}
```

**Response:**
```json
{
  "success": true,
  "syncId": "sync-123",
  "status": "in_progress",
  "estimatedCompletion": "2024-12-01T10:35:00Z"
}
```

---

## 📈 **Business Intelligence Endpoints**

### **Competitive Intelligence**

#### **Analyze Competitor**
```http
POST /api/intelligence/competitor/analyze
Content-Type: application/json

{
  "competitorName": "Competitor Inc",
  "website": "https://competitor.com",
  "industry": "SaaS",
  "analysisType": "comprehensive"
}
```

**Response:**
```json
{
  "analysisId": "analysis-123",
  "competitor": {
    "name": "Competitor Inc",
    "marketShare": 15.2,
    "revenue": 50000000,
    "strengths": ["Strong brand", "Innovative tech"],
    "weaknesses": ["High pricing", "Limited support"]
  },
  "insights": [
    "Competitor has strong market presence",
    "Opportunity in pricing strategy"
  ],
  "recommendations": [
    "Focus on competitive pricing",
    "Improve customer support"
  ]
}
```

### **Sentiment Analysis**

#### **Analyze Sentiment**
```http
POST /api/intelligence/sentiment/analyze
Content-Type: application/json

{
  "content": "Sample text to analyze",
  "platform": "twitter",
  "brand": "YourBrand"
}
```

**Response:**
```json
{
  "analysisId": "sentiment-123",
  "sentiment": {
    "overall": "positive",
    "score": 0.75,
    "confidence": 0.92
  },
  "emotions": {
    "joy": 0.8,
    "anger": 0.1,
    "fear": 0.05,
    "sadness": 0.05
  },
  "keywords": ["excellent", "amazing", "love"],
  "insights": [
    "Strong positive sentiment detected",
    "High confidence in analysis"
  ]
}
```

### **Market Research**

#### **Get Market Research**
```http
POST /api/intelligence/market/research
Content-Type: application/json

{
  "industry": "SaaS",
  "region": "North America",
  "timeframe": "12m"
}
```

**Response:**
```json
{
  "researchId": "research-123",
  "market": {
    "size": 5000000000,
    "growthRate": 12.5,
    "trends": ["AI adoption", "Cloud migration"],
    "opportunities": ["Emerging markets", "New technologies"]
  },
  "competitiveLandscape": {
    "leaders": ["Company A", "Company B"],
    "marketShare": {
      "Company A": 25,
      "Company B": 20,
      "Others": 55
    }
  },
  "insights": [
    "Market growing at 12.5% annually",
    "AI adoption is key trend"
  ]
}
```

---

## 🎯 **Strategy Endpoints**

### **Strategic Planning**

#### **Generate Strategy**
```http
POST /api/strategy/generate
Content-Type: application/json

{
  "company": "Your Company",
  "industry": "SaaS",
  "objectives": ["Increase revenue", "Expand market"],
  "timeframe": "12m"
}
```

**Response:**
```json
{
  "strategyId": "strategy-123",
  "company": "Your Company",
  "vision": "To become the leading SaaS provider",
  "mission": "Empowering businesses with AI",
  "objectives": [
    {
      "id": "obj-1",
      "title": "Increase revenue",
      "priority": "high",
      "target": "25% growth",
      "timeframe": "12m"
    }
  ],
  "strategies": [
    {
      "name": "Market Expansion",
      "description": "Expand into new markets",
      "tactics": ["Geographic expansion", "Product diversification"]
    }
  ],
  "recommendations": [
    "Focus on AI capabilities",
    "Invest in customer success"
  ]
}
```

### **SWOT Analysis**

#### **Generate SWOT Analysis**
```http
POST /api/strategy/swot
Content-Type: application/json

{
  "company": "Your Company",
  "industry": "SaaS",
  "context": "Annual planning"
}
```

**Response:**
```json
{
  "swotId": "swot-123",
  "company": "Your Company",
  "strengths": [
    {
      "factor": "Strong technology",
      "impact": "high",
      "description": "Advanced AI capabilities"
    }
  ],
  "weaknesses": [
    {
      "factor": "Limited market presence",
      "impact": "medium",
      "description": "Small market share"
    }
  ],
  "opportunities": [
    {
      "factor": "Market growth",
      "potential": "high",
      "description": "Growing SaaS market"
    }
  ],
  "threats": [
    {
      "factor": "Competition",
      "severity": "high",
      "description": "Intense competition"
    }
  ]
}
```

---

## 🏗️ **Website Builder Endpoints**

### **Website Management**

#### **Create Website**
```http
POST /api/website/create
Content-Type: application/json

{
  "name": "My Website",
  "industry": "SaaS",
  "purpose": "marketing",
  "template": "business-template"
}
```

**Response:**
```json
{
  "websiteId": "website-123",
  "name": "My Website",
  "status": "building",
  "url": "https://my-website.omnidash.com",
  "template": "business-template",
  "estimatedCompletion": "2024-12-01T10:35:00Z"
}
```

#### **Get Website Status**
```http
GET /api/website/{websiteId}
```

**Response:**
```json
{
  "websiteId": "website-123",
  "name": "My Website",
  "status": "live",
  "url": "https://my-website.omnidash.com",
  "performance": {
    "loadTime": 1.2,
    "seoScore": 95,
    "accessibilityScore": 98
  },
  "analytics": {
    "views": 1250,
    "conversions": 45,
    "conversionRate": 3.6
  }
}
```

### **A/B Testing**

#### **Create A/B Test**
```http
POST /api/website/{websiteId}/ab-test
Content-Type: application/json

{
  "name": "Headline Test",
  "type": "headline",
  "variants": [
    {
      "name": "Original",
      "content": "Original headline"
    },
    {
      "name": "Variant A",
      "content": "New headline"
    }
  ],
  "trafficSplit": 50
}
```

**Response:**
```json
{
  "testId": "test-123",
  "name": "Headline Test",
  "status": "running",
  "variants": [
    {
      "id": "variant-1",
      "name": "Original",
      "traffic": 50,
      "conversions": 25
    },
    {
      "id": "variant-2",
      "name": "Variant A",
      "traffic": 50,
      "conversions": 30
    }
  ],
  "results": {
    "winner": "Variant A",
    "confidence": 95,
    "improvement": 20
  }
}
```

---

## 📅 **Event Management Endpoints**

### **Event Management**

#### **Create Event**
```http
POST /api/events/create
Content-Type: application/json

{
  "title": "Product Launch",
  "description": "Launch of new product",
  "startDate": "2024-12-15T10:00:00Z",
  "endDate": "2024-12-15T18:00:00Z",
  "location": {
    "type": "virtual",
    "platform": "Zoom"
  },
  "capacity": 500
}
```

**Response:**
```json
{
  "eventId": "event-123",
  "title": "Product Launch",
  "status": "draft",
  "url": "https://events.omnidash.com/event-123",
  "registration": {
    "enabled": true,
    "maxAttendees": 500,
    "currentRegistrations": 0
  },
  "marketing": {
    "socialMediaPosts": 0,
    "emailCampaigns": 0
  }
}
```

#### **Get Event Analytics**
```http
GET /api/events/{eventId}/analytics
```

**Response:**
```json
{
  "eventId": "event-123",
  "analytics": {
    "registrations": {
      "total": 450,
      "bySource": {
        "direct": 200,
        "social": 150,
        "email": 100
      }
    },
    "attendance": {
      "total": 420,
      "rate": 93.3
    },
    "engagement": {
      "avgRating": 4.5,
      "feedbackCount": 380
    }
  },
  "insights": [
    "High registration rate from social media",
    "Excellent attendance rate"
  ]
}
```

---

## 📊 **Reporting Endpoints**

### **Generate Reports**

#### **Create Report**
```http
POST /api/reports/generate
Content-Type: application/json

{
  "type": "agent-performance",
  "timeframe": "30d",
  "agents": ["agent-1", "agent-2"],
  "format": "pdf"
}
```

**Response:**
```json
{
  "reportId": "report-123",
  "type": "agent-performance",
  "status": "generating",
  "estimatedCompletion": "2024-12-01T10:35:00Z",
  "downloadUrl": "https://api.omnidash.com/reports/report-123/download"
}
```

#### **Get Report**
```http
GET /api/reports/{reportId}
```

**Response:**
```json
{
  "reportId": "report-123",
  "type": "agent-performance",
  "status": "completed",
  "generatedAt": "2024-12-01T10:32:00Z",
  "downloadUrl": "https://api.omnidash.com/reports/report-123/download",
  "summary": {
    "totalTasks": 15000,
    "successRate": 98.5,
    "avgResponseTime": 2.1
  }
}
```

---

## ⚠️ **Error Handling**

### **Error Response Format**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2024-12-01T10:30:00Z",
    "requestId": "req-123"
  }
}
```

### **Common Error Codes**
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

### **Rate Limiting**
- **Standard:** 1000 requests per hour
- **Premium:** 10000 requests per hour
- **Enterprise:** Unlimited

---

## 🔧 **SDK and Libraries**

### **JavaScript/TypeScript SDK**
```bash
npm install @omnidash/sdk
```

```typescript
import { OmniDashClient } from '@omnidash/sdk';

const client = new OmniDashClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.omnidash.com'
});

// Create a task
const task = await client.agents.createTask('agent-1', {
  type: 'generate-content',
  payload: { topic: 'AI in Business' }
});

// Get task status
const status = await client.tasks.getStatus(task.taskId);
```

### **Python SDK**
```bash
pip install omnidash-sdk
```

```python
from omnidash import OmniDashClient

client = OmniDashClient(api_key='your_api_key')

# Create a task
task = client.agents.create_task('agent-1', {
    'type': 'generate-content',
    'payload': {'topic': 'AI in Business'}
})

# Get task status
status = client.tasks.get_status(task.task_id)
```

---

## 📚 **Additional Resources**

- **API Reference:** [https://docs.omnidash.com/api](https://docs.omnidash.com/api)
- **SDK Documentation:** [https://docs.omnidash.com/sdk](https://docs.omnidash.com/sdk)
- **Postman Collection:** [Download](https://api.omnidash.com/postman)
- **OpenAPI Spec:** [https://api.omnidash.com/openapi.json](https://api.omnidash.com/openapi.json)

---

**Status:** ✅ **API READY FOR PRODUCTION**  
**Version:** 2.0.0  
**Last Updated:** December 2024
