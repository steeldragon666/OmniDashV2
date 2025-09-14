# OmniDash Backend

A comprehensive business intelligence and automation platform backend built with Node.js, TypeScript, and Google Cloud Platform integration.

## 🚀 Features

- **Authentication & Authorization**: Google OAuth, JWT-based authentication
- **Database Management**: PostgreSQL with Prisma ORM
- **Caching**: Redis for high-performance caching
- **AI Integration**: Vertex AI, Google Cloud AI services
- **Social Media APIs**: Twitter, LinkedIn, Facebook, Instagram, YouTube, TikTok, Pinterest
- **Analytics**: Google Analytics, Search Console integration
- **Workflow Automation**: Custom workflow engine with visual builder
- **Real-time Communication**: WebSocket support via Socket.io
- **CI/CD Pipeline**: Google Cloud Build integration
- **Monitoring**: Prometheus, Grafana, health checks
- **Security**: Rate limiting, input validation, security headers

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Google Cloud   │
                       │  Services       │
                       └─────────────────┘
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **Authentication**: NextAuth.js, Google OAuth
- **Cloud Platform**: Google Cloud Platform
- **AI/ML**: Vertex AI, Google Cloud AI
- **Monitoring**: Prometheus, Grafana
- **Containerization**: Docker, Docker Compose
- **CI/CD**: Google Cloud Build, GitHub Actions

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose
- Google Cloud Platform account
- Google OAuth credentials

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/steeldragon666/OmniDashV2.git
cd OmniDashV2/omnidash-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment example file and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://omnidash:omnidash123@localhost:5432/omnidash

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Google Cloud Platform
GCP_PROJECT_ID=omnidashv2
GCP_REGION=australia-southeast2
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed
```

### 5. Start Development Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### 6. Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📁 Project Structure

```
omnidash-backend/
├── src/
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Express middleware
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic services
│   ├── models/              # Database models
│   ├── utils/               # Utility functions
│   ├── ai/                  # AI/ML components
│   └── index.ts             # Application entry point
├── tests/                   # Test files
├── docker-compose.yml       # Docker services configuration
├── Dockerfile              # Docker image configuration
├── cloudbuild.yaml         # Google Cloud Build configuration
├── nginx.conf              # Nginx reverse proxy configuration
├── prometheus.yml          # Prometheus monitoring configuration
└── package.json            # Dependencies and scripts
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - Google OAuth callback

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/analytics` - Analytics data

### Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/execute` - Execute workflow

### Social Media
- `GET /api/social/accounts` - List connected accounts
- `POST /api/social/connect` - Connect social account
- `POST /api/social/post` - Create social media post
- `GET /api/social/analytics` - Social media analytics

### Google Cloud Platform
- `GET /api/gcp/projects` - List GCP projects
- `GET /api/gcp/bigquery/datasets` - List BigQuery datasets
- `POST /api/gcp/bigquery/query` - Execute BigQuery query
- `GET /api/gcp/storage/buckets` - List Cloud Storage buckets

### Vertex AI
- `GET /api/vertex-ai/agents` - List AI agents
- `POST /api/vertex-ai/agents` - Create AI agent
- `POST /api/vertex-ai/search` - Semantic search
- `POST /api/vertex-ai/generate` - Generate content

### Repository Management
- `GET /api/repository/list` - List repositories
- `POST /api/repository/create` - Create repository
- `GET /api/repository/status` - Deployment status
- `POST /api/repository/:name/trigger` - Trigger deployment

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Performance testing
npm run test:performance
```

## 📊 Monitoring

### Health Checks
- Backend: `http://localhost:3001/api/health`
- Frontend: `http://localhost:3000/api/health`

### Metrics
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin)

### Logs
```bash
# View application logs
docker-compose logs -f backend

# View all service logs
docker-compose logs -f
```

## 🔒 Security

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Configurable rate limits per endpoint
- **Input Validation**: Joi schema validation
- **Security Headers**: CORS, CSP, XSS protection
- **Data Encryption**: Environment variables and sensitive data
- **Audit Logging**: Comprehensive request/response logging

## 🚀 Deployment

### Google Cloud Platform

1. **Enable Required APIs**:
   - Cloud Build API
   - Cloud Run API
   - Cloud Source Repositories API
   - Vertex AI API
   - BigQuery API
   - Cloud Storage API

2. **Set up Cloud Build**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

3. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy omnidash-backend \
     --source . \
     --region australia-southeast2 \
     --platform managed \
     --allow-unauthenticated
   ```

### Environment Variables for Production

Set the following environment variables in your Cloud Run service:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-production-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
GCP_PROJECT_ID=omnidashv2
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/steeldragon666/OmniDashV2/wiki)
- **Issues**: [GitHub Issues](https://github.com/steeldragon666/OmniDashV2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/steeldragon666/OmniDashV2/discussions)

## 🔗 Related Projects

- [OmniDash Frontend](../omnidash-frontend/) - React/Next.js frontend application
- [OmniDash AI Services](../omnidash-ai/) - AI/ML services and models
- [OmniDash Documentation](../docs/) - Comprehensive documentation

---

**Built with ❤️ by the OmniDash Team**