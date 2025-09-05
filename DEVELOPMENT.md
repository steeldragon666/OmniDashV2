# 🚀 OmniDash Development Guide

## 📋 Quick Start

### Prerequisites
- Windows 10/11 with PowerShell 5.1+
- Git
- Node.js 18+ (automatically installed by setup script)

### Automated Setup
```powershell
# Clone and setup
git clone https://github.com/your-org/omnidash.git
cd omnidash
.\toolsd\install-tools.ps1 -DevMode

# Start development
pnpm dev:all
```

## 🏗️ Project Structure

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
├── 📁 media/                     # Static assets
└── 📄 README.md
```

## 🔧 Development Commands

### Backend (omnidash-backend)
```bash
cd omnidash-backend

# Development
pnpm dev                 # Start with nodemon
pnpm build              # Build for production
pnpm start              # Start production server

# Database
pnpm prisma:generate    # Generate Prisma client
pnpm prisma:migrate     # Run database migrations
pnpm prisma:studio      # Open Prisma Studio

# Testing
pnpm test               # Run tests
pnpm test:watch         # Run tests in watch mode
```

### Frontend (omnidash-frontend)
```bash
cd omnidash-frontend

# Development
pnpm dev                # Start Next.js dev server
pnpm build              # Build for production
pnpm start              # Start production server

# Linting & Formatting
pnpm lint               # Run ESLint
pnpm format             # Format with Prettier
```

### Root Level
```bash
# Install all dependencies
pnpm install:all

# Start all services
pnpm dev:all

# Build all projects
pnpm build:all

# Run all tests
pnpm test:all
```

## 🗄️ Database Management

### Prisma Schema
The database schema is defined in `omnidash-backend/prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  brands Brand[]
}

model Brand {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  themeConfig Json?
  createdAt   DateTime @default(now())
  
  user   User   @relation(fields: [userId], references: [id])
  userId String
}
```

### Database Commands
```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name init

# Reset database
npx prisma migrate reset

# View data in browser
npx prisma studio
```

## 🔌 API Development

### Adding New Endpoints

1. **Create Controller** (`src/controllers/`)
```typescript
// src/controllers/example.ts
import { Request, Response } from 'express';

export const getExample = async (req: Request, res: Response) => {
  try {
    const data = await exampleService.getData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

2. **Create Route** (`src/routes/`)
```typescript
// src/routes/example.ts
import { Router } from 'express';
import { getExample } from '../controllers/example';

const router = Router();
router.get('/', getExample);

export default router;
```

3. **Register Route** (`src/server.ts`)
```typescript
import exampleRoutes from './routes/example';
app.use('/api/example', exampleRoutes);
```

## 🎨 Frontend Development

### Adding New Pages

1. **Create Page** (`app/`)
```typescript
// app/example/page.tsx
export default function ExamplePage() {
  return (
    <div>
      <h1>Example Page</h1>
    </div>
  );
}
```

2. **Create Components** (`components/`)
```typescript
// components/ExampleComponent.tsx
interface ExampleComponentProps {
  title: string;
}

export function ExampleComponent({ title }: ExampleComponentProps) {
  return <div>{title}</div>;
}
```

### State Management
We use Zustand for client-side state management:

```typescript
// lib/stores/exampleStore.ts
import { create } from 'zustand';

interface ExampleState {
  data: string[];
  setData: (data: string[]) => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  data: [],
  setData: (data) => set({ data }),
}));
```

## 🤖 AI Agents Development

### Creating New Agents

1. **Extend BaseAgent** (`src/agents/implementations/`)
```typescript
// src/agents/implementations/ExampleAgent.ts
import { BaseAgent } from '../core/BaseAgent';

export class ExampleAgent extends BaseAgent {
  async execute(task: any): Promise<any> {
    // Agent logic here
    return { success: true, result: 'Task completed' };
  }
}
```

2. **Register Agent** (`src/agents/services/AgentService.ts`)
```typescript
import { ExampleAgent } from '../implementations/ExampleAgent';

// Register in initializeAgents()
this.registerAgent('example', new ExampleAgent());
```

## 🧪 Testing

### Backend Testing
```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

### Frontend Testing
```bash
# Component tests
pnpm test

# E2E tests with Playwright
pnpm test:e2e
```

## 🚀 Deployment

### Development Deployment
```bash
# Build all projects
pnpm build:all

# Start production servers
pnpm start:all
```

### Production Deployment
```bash
# Using PM2
pm2 start ecosystem.config.js

# Using Docker
docker-compose up -d
```

## 🔍 Debugging

### Backend Debugging
```bash
# Debug with VS Code
# Set breakpoints in VS Code and run:
pnpm dev:debug

# Log debugging
# Add console.log or use Winston logger
```

### Frontend Debugging
```bash
# React DevTools
# Install browser extension for React debugging

# Next.js debugging
# Use browser dev tools and Next.js built-in debugging
```

## 📊 Monitoring

### Health Checks
- Backend: `http://localhost:3001/api/health`
- Frontend: `http://localhost:3000/api/health`

### Logs
- Backend logs: `omnidash-backend/logs/`
- Frontend logs: Browser console

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Issues**
```bash
# Check if PostgreSQL is running
# Verify connection string in .env
# Run: npx prisma db push
```

2. **Port Conflicts**
```bash
# Backend default: 3001
# Frontend default: 3000
# Check if ports are available
```

3. **Dependency Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

- **Documentation**: Check this file and README.md
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions
