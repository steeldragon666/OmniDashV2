# 🚀 OmniDash - Multi-Brand Social Media & Automation Dashboard

[![CI/CD Pipeline](https://github.com/your-org/omnidash/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/your-org/omnidash/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

> **The ultimate platform for managing multiple brands with AI-powered automation, social media management, and comprehensive analytics.**

## ✨ Features

### 🏢 **Multi-Brand Management**
- **Unified Dashboard**: Manage multiple brands from a single interface
- **Brand-Specific Analytics**: Track performance metrics for each brand
- **Custom Branding**: Apply unique themes and styling per brand
- **Team Collaboration**: Role-based access control and permissions

### 🤖 **AI-Powered Automation**
- **Content Generation**: AI creates 5 content options per platform
- **Smart Scheduling**: Optimal posting times based on audience data
- **Workflow Automation**: Visual drag-and-drop workflow builder
- **Sentiment Analysis**: Monitor brand mentions and industry trends

### 📱 **Social Media Integration**
- **Multi-Platform Support**: Twitter, LinkedIn, Instagram, TikTok
- **Unified Posting**: Schedule and publish across all platforms
- **Engagement Tracking**: Real-time analytics and performance metrics
- **Content Calendar**: Visual planning and scheduling interface

### 📊 **Advanced Analytics**
- **Real-Time Dashboard**: Live metrics and performance indicators
- **Custom Reports**: Generate PDF and CSV reports
- **ROI Tracking**: Measure campaign effectiveness and returns
- **Competitor Analysis**: Monitor industry trends and benchmarks

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **pnpm** 8+
- **PostgreSQL** 15+
- **Redis** 7+

### Automated Setup (Recommended)
```powershell
# Clone the repository
git clone https://github.com/your-org/omnidash.git
cd omnidash

# Run the automated setup script
.\toolsd\install-tools.ps1 -DevMode

# Start development servers
pnpm dev:all
```

### Manual Setup
```bash
# Install dependencies
pnpm install

# Setup environment files
cp omnidash-backend/.env.example omnidash-backend/.env
cp omnidash-frontend/.env.example omnidash-frontend/.env.local

# Setup database
pnpm db:generate
pnpm db:migrate

# Start development
pnpm dev:all
```

### Docker Setup
```bash
# Start all services with Docker
docker-compose up -d

# View logs
docker-compose logs -f
```

## 🏗️ Architecture

### Frontend Stack
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library
- **Framer Motion** - Smooth animations
- **Zustand** - State management
- **Socket.IO** - Real-time updates

### Backend Stack
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe development
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **Bull Queue** - Background job processing
- **Socket.IO** - Real-time communication

### AI & Automation
- **Claude API** - Creative content generation
- **OpenAI API** - Structured content creation
- **N8N.io** - Workflow automation
- **Custom Agents** - Specialized automation tasks

## 📁 Project Structure

```
omnidash/
├── 📁 omnidash-backend/          # Node.js/Express API
│   ├── 📁 src/
│   │   ├── 📁 agents/            # AI automation agents
│   │   ├── 📁 controllers/       # API route handlers
│   │   ├── 📁 middleware/        # Express middleware
│   │   ├── 📁 routes/            # API route definitions
│   │   ├── 📁 services/          # Business logic
│   │   └── 📁 types/             # TypeScript definitions
│   ├── 📁 prisma/                # Database schema
│   └── 📄 package.json
├── 📁 omnidash-frontend/         # Next.js React app
│   ├── 📁 app/                   # Next.js 13+ app directory
│   ├── 📁 components/            # Reusable UI components
│   ├── 📁 lib/                   # Utility functions
│   └── 📄 package.json
├── 📁 toolsd/                    # Development tools
├── 📁 .github/                   # GitHub Actions workflows
├── 📁 media/                     # Static assets
└── 📄 README.md
```

## 🔧 Development

### Available Scripts

#### Root Level
```bash
pnpm dev:all          # Start all services
pnpm build:all        # Build all projects
pnpm test:all         # Run all tests
pnpm lint:all         # Lint all projects
pnpm format           # Format code with Prettier
```

#### Backend
```bash
pnpm dev              # Start with nodemon
pnpm build            # Build for production
pnpm start            # Start production server
pnpm test             # Run tests
pnpm prisma:studio    # Open Prisma Studio
```

#### Frontend
```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm test             # Run tests
pnpm test:e2e         # Run E2E tests
```

### Database Management
```bash
# Generate Prisma client
pnpm db:generate

# Create and apply migration
pnpm db:migrate

# Reset database
pnpm db:reset

# View data in browser
pnpm db:studio
```

## 🚀 Deployment

### Production Deployment
```bash
# Build all projects
pnpm build:all

# Start with PM2
pnpm pm2:start

# Or with Docker
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/omnidash
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
CLAUDE_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-openai-api-key
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## 📊 Monitoring

### Health Checks
- **Backend**: `http://localhost:3001/api/health`
- **Frontend**: `http://localhost:3000/api/health`

### Logs
- **Backend**: `omnidash-backend/logs/`
- **Frontend**: Browser console
- **PM2**: `pnpm pm2:logs`

## 🧪 Testing

### Unit Tests
```bash
pnpm test:all
```

### E2E Tests
```bash
pnpm test:e2e
```

### Test Coverage
```bash
pnpm test:coverage
```

## 📚 Documentation

- **[Development Guide](DEVELOPMENT.md)** - Comprehensive development documentation
- **[User Onboarding](USER-ONBOARDING.md)** - User setup and onboarding guide
- **[API Documentation](omnidash-backend/README.md)** - Backend API reference
- **[Frontend Guide](omnidash-frontend/README.md)** - Frontend development guide

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow conventional commit messages
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🆘 Support

- **Documentation**: Check the docs folder
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@omnidash.io

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Core platform architecture
- [x] Multi-brand management
- [x] Social media integrations
- [x] Basic automation workflows

### Phase 2 (Q2 2024)
- [ ] Advanced AI content generation
- [ ] Visual workflow builder
- [ ] Mobile application
- [ ] White-label solutions

### Phase 3 (Q3 2024)
- [ ] Enterprise features
- [ ] Advanced analytics
- [ ] API marketplace
- [ ] Custom integrations

## 🙏 Acknowledgments

- **Claude AI** for content generation capabilities
- **OpenAI** for structured content creation
- **N8N** for workflow automation
- **Vercel** for hosting and deployment
- **Supabase** for database and authentication

---

**Built with ❤️ by the OmniDash Team**

[Website](https://omnidash.io) • [Documentation](https://docs.omnidash.io) • [Support](mailto:support@omnidash.io)