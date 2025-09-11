# 🛠️ **Development Setup Guide**

## 📋 **Prerequisites**

### **Required Software**
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm/yarn** - Package manager
- **Git** - Version control
- **VS Code** - Recommended IDE with extensions

### **Required Accounts**
- **Supabase** - Database and backend services
- **Vercel** - Frontend deployment
- **OpenAI** - AI services
- **Anthropic** - AI services
- **Google Cloud** - AI and calendar services

---

## 🚀 **Quick Setup (5 minutes)**

### **1. Clone Repository**
```bash
git clone <repository-url>
cd omnidash-platform
```

### **2. Install Dependencies**
```bash
# Frontend
cd omnidash-frontend
npm install

# Backend
cd ../omnidash-backend
npm install
```

### **3. Environment Configuration**
```bash
# Frontend
cd omnidash-frontend
cp .env.example .env.local
# Edit .env.local with your keys

# Backend
cd ../omnidash-backend
cp .env.example .env
# Edit .env with your keys
```

### **4. Database Setup**
```bash
cd omnidash-backend
npx prisma generate
npx prisma db push
```

### **5. Start Development**
```bash
# Terminal 1 - Backend
cd omnidash-backend
npm run dev

# Terminal 2 - Frontend
cd omnidash-frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Database: Supabase Dashboard

---

## 🔧 **Detailed Setup**

### **Environment Variables**

#### **Frontend (.env.local)**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

#### **Backend (.env)**
```env
# Database
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
FRONTEND_URL=http://localhost:3000

# AI Services
OPENAI_API_KEY=sk-your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key

# External APIs
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
GOOGLE_CALENDAR_TOKEN=your_google_calendar_token
VERCEL_TOKEN=your_vercel_token

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

---

## 🗄️ **Database Setup**

### **1. Create Supabase Project**
1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Note down URL and API keys

### **2. Database Schema**
```bash
cd omnidash-backend
npx prisma generate
npx prisma db push
```

### **3. Row Level Security (RLS)**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies (examples)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### **4. Seed Database (Optional)**
```bash
npx prisma db seed
```

---

## 🤖 **AI Agent Setup**

### **Agent Configuration**
All 12 AI agents are pre-configured and ready to use:

1. **Content Creator Agent** - OpenAI/Anthropic integration
2. **Sales Manager Agent** - CRM and sales automation
3. **CRM & Help Desk Agent** - Customer support automation
4. **Influencer Intelligence Agent** - Social media analysis
5. **Sentiment Intelligence Agent** - Brand monitoring
6. **Revenue Intelligence Agent** - Financial analytics
7. **Competitive Intelligence Agent** - Market research
8. **AI Strategy Generator Agent** - Business planning
9. **Website Builder Agent** - Automated website creation
10. **Event Management Agent** - Event planning
11. **Compliance & Security Agent** - Regulatory compliance
12. **Public Sector Agent** - Government tools

### **Testing Agents**
```bash
cd omnidash-backend
npm run test:agents
```

---

## 🧪 **Testing Setup**

### **Run All Tests**
```bash
# Backend tests
cd omnidash-backend
npm test

# Frontend tests
cd omnidash-frontend
npm test

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

### **Test Coverage**
```bash
# Generate coverage report
npm run test:coverage
```

---

## 🚀 **Deployment Setup**

### **Frontend (Vercel)**
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### **Backend (Supabase)**
1. Use provided deployment scripts
2. Configure production environment variables
3. Run database migrations
4. Deploy API endpoints

### **Database (Supabase)**
1. Create production Supabase project
2. Import database schema
3. Configure RLS policies
4. Set up authentication

---

## 🔧 **Development Tools**

### **VS Code Extensions**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "prisma.prisma",
    "ms-vscode.vscode-json"
  ]
}
```

### **Useful Commands**
```bash
# Database
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Create migration
npx prisma db seed         # Seed database

# Development
npm run dev                # Start development server
npm run build              # Build for production
npm run lint               # Run linter
npm run type-check         # TypeScript type checking

# Testing
npm test                   # Run tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

---

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check connection
npx prisma db pull

# Reset database
npx prisma migrate reset
```

#### **Environment Variables**
```bash
# Check if variables are loaded
node -e "console.log(process.env.DATABASE_URL)"
```

#### **Port Conflicts**
```bash
# Kill processes on ports
npx kill-port 3000
npx kill-port 3001
```

#### **Dependency Issues**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### **Getting Help**
1. Check the documentation
2. Search GitHub issues
3. Create new issue with details
4. Join discussions for questions

---

## 📚 **Next Steps**

### **After Setup**
1. **Explore the codebase** - Familiarize with structure
2. **Run the test suite** - Verify everything works
3. **Review documentation** - Understand capabilities
4. **Start development** - Begin implementing features

### **Development Workflow**
1. **Create feature branch** - `git checkout -b feature/new-feature`
2. **Make changes** - Implement functionality
3. **Run tests** - Ensure nothing breaks
4. **Create pull request** - Submit for review
5. **Deploy** - Merge to main for deployment

---

**Status:** ✅ **READY FOR DEVELOPMENT**  
**Setup Time:** ~5 minutes  
**Documentation:** Complete  
**Support:** Available via GitHub
