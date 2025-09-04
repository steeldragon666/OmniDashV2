# OmniDash Backend API

A comprehensive multi-brand social media management and automation platform backend built with Node.js, TypeScript, and PostgreSQL.

## 🚀 Features

- **Multi-Brand Management**: Manage multiple brands with role-based access control
- **Social Media Integration**: Connect and manage Twitter, Instagram, LinkedIn, TikTok accounts
- **Workflow Automation**: N8N-powered automation workflows for content generation and posting
- **Real-time Updates**: WebSocket-based real-time notifications and updates
- **Secure Authentication**: JWT-based auth with OAuth providers (Google, GitHub, Microsoft)
- **Content Management**: AI-powered content generation and scheduling
- **Analytics Integration**: Comprehensive analytics and reporting
- **Enterprise Security**: Rate limiting, encryption, audit logging

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Queue**: Bull Queue
- **Authentication**: JWT + OAuth 2.0
- **Real-time**: Socket.IO
- **Automation**: N8N.io integration
- **Monitoring**: Winston logging

## 📁 Project Structure

```
src/
├── controllers/     # Route controllers
├── middleware/      # Custom middleware (auth, validation, etc.)
├── routes/         # API route definitions
├── services/       # Business logic services
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── server.ts       # Main server file

prisma/
└── schema.prisma   # Database schema

```

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd omnidash-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb omnidash_db
   
   # Run migrations
   npm run prisma:migrate
   
   # Generate Prisma client
   npm run prisma:generate
   ```

5. **Start Redis server**
   ```bash
   redis-server
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔑 Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/omnidash_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Providers
OPENAI_API_KEY="your-openai-api-key"
CLAUDE_API_KEY="your-anthropic-claude-api-key"

# Social Media APIs
TWITTER_API_KEY="your-twitter-api-key"
TWITTER_API_SECRET="your-twitter-api-secret"

# N8N Integration
N8N_API_URL="http://localhost:5678/api/v1"
N8N_API_KEY="your-n8n-api-key"
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Brand Management
- `POST /api/brands` - Create brand
- `GET /api/brands` - List user's brands
- `GET /api/brands/:brandId` - Get brand details
- `PUT /api/brands/:brandId` - Update brand
- `DELETE /api/brands/:brandId` - Delete brand
- `POST /api/brands/:brandId/members` - Add team member
- `DELETE /api/brands/:brandId/members/:memberId` - Remove member

### Social Media
- `POST /api/social/accounts` - Connect social account
- `GET /api/social/brands/:brandId/accounts` - List brand's social accounts
- `PUT /api/social/accounts/:accountId` - Update account
- `DELETE /api/social/accounts/:accountId` - Disconnect account
- `GET /api/social/accounts/:accountId/insights` - Get account analytics

### Workflows
- `POST /api/workflows/:brandId` - Create workflow
- `GET /api/workflows/:brandId` - List brand workflows
- `GET /api/workflows/workflow/:workflowId` - Get workflow details
- `PUT /api/workflows/workflow/:workflowId` - Update workflow
- `DELETE /api/workflows/workflow/:workflowId` - Delete workflow
- `POST /api/workflows/workflow/:workflowId/execute` - Execute workflow
- `GET /api/workflows/templates` - Get workflow templates

## 🔐 Security Features

- **Rate Limiting**: Configurable rate limits per endpoint
- **JWT Authentication**: Secure token-based authentication
- **Data Encryption**: Sensitive data encrypted at rest
- **Input Validation**: Joi-based request validation
- **Security Headers**: Helmet.js security headers
- **CORS Protection**: Configurable CORS policies
- **Audit Logging**: Comprehensive activity logging

## 🏗 Database Schema

Key entities:

- **Users**: User accounts and authentication
- **Brands**: Multi-brand management
- **BrandMembers**: Team access control
- **SocialAccounts**: Connected social media accounts
- **Posts**: Social media posts and scheduling
- **Workflows**: Automation workflow definitions
- **Analytics**: Performance metrics and insights

## 🚀 Deployment

### Docker Deployment

1. **Build the container**
   ```bash
   docker build -t omnidash-backend .
   ```

2. **Run with docker-compose**
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 📊 Monitoring

- **Health Check**: `GET /health`
- **Logs**: Winston-based logging to files and console
- **Metrics**: Performance and usage metrics
- **Error Tracking**: Structured error logging

## 🔄 Workflow Automation

The platform integrates with N8N.io for powerful workflow automation:

- **Content Generation**: AI-powered content creation workflows
- **Social Posting**: Automated content publishing
- **Analytics Sync**: Data synchronization workflows  
- **Notifications**: Alert and notification workflows
- **Custom Actions**: Extensible action system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Health Check**: Visit `/health` endpoint for system status
- **Logs**: Check `logs/` directory for application logs
- **Issues**: Report issues through the project issue tracker

## 🔮 Future Roadmap

- [ ] Additional AI provider integrations
- [ ] Advanced analytics and reporting
- [ ] Mobile API optimizations
- [ ] Webhook system for third-party integrations
- [ ] Multi-language support
- [ ] Advanced workflow templates