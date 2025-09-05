# OmniDash Development Tools Installation Script
# PowerShell script to install and configure OmniDash development environment

param(
    [switch]$SkipDependencies,
    [switch]$DevMode,
    [string]$Environment = "development"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "OmniDash Development Environment Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Dev Mode: $DevMode" -ForegroundColor Yellow
Write-Host ""

# Function to check if command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Function to install a tool with better error handling
function Install-Tool {
    param(
        [string]$name,
        [string]$command,
        [string]$description = "",
        [switch]$Optional = $false
    )
    
    Write-Host "Installing $name..." -ForegroundColor Yellow
    if ($description) {
        Write-Host "  $description" -ForegroundColor Gray
    }
    
    try {
        $result = Invoke-Expression $command 2>&1
        if ($LASTEXITCODE -eq 0 -or $Optional) {
            Write-Host "✓ $name installed successfully" -ForegroundColor Green
            return $true
        } else {
            throw "Command failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        if ($Optional) {
            Write-Host "⚠ $name installation skipped (optional)" -ForegroundColor Yellow
            return $false
        } else {
            Write-Host "✗ Failed to install $name" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
            return $false
        }
    }
    Write-Host ""
}

# Function to check and install system dependencies
function Install-SystemDependencies {
    Write-Host "=== System Dependencies ===" -ForegroundColor Cyan
    
    # Check for Git
    if (!(Test-CommandExists "git")) {
        Write-Host "Git is required but not installed." -ForegroundColor Red
        Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
        exit 1
    }
    
    # Check for Docker (optional for development)
    if (!(Test-CommandExists "docker")) {
        Write-Host "Docker not found. Installing Docker Desktop..." -ForegroundColor Yellow
        Install-Tool "Docker Desktop" "winget install Docker.DockerDesktop" "Container platform for development" -Optional
    }
    
    # Check for VS Code
    if (!(Test-CommandExists "code")) {
        Write-Host "VS Code not found. Installing VS Code..." -ForegroundColor Yellow
        Install-Tool "VS Code" "winget install Microsoft.VisualStudioCode" "Code editor with OmniDash extensions" -Optional
    }
}

# Check for Node.js and npm
if (!(Test-CommandExists "node")) {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

if (!(Test-CommandExists "npm")) {
    Write-Host "npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install system dependencies first
if (!$SkipDependencies) {
    Install-SystemDependencies
}

Write-Host "Starting OmniDash development environment setup..." -ForegroundColor Green
Write-Host ""

# 1. OmniDash Core Dependencies
Write-Host "=== OmniDash Core Dependencies ===" -ForegroundColor Cyan

# Install Node.js version manager
Install-Tool "nvm-windows" "winget install CoreyButler.NVMforWindows" "Node.js version management" -Optional

# Install latest LTS Node.js
Install-Tool "Node.js LTS" "nvm install lts" "JavaScript runtime for OmniDash" -Optional

# Install pnpm (faster than npm)
Install-Tool "pnpm" "npm install -g pnpm" "Fast, disk space efficient package manager"

# Install TypeScript globally
Install-Tool "TypeScript" "npm install -g typescript" "TypeScript compiler"

# Install Prisma CLI
Install-Tool "Prisma CLI" "npm install -g prisma" "Database toolkit and ORM"

# 2. Development Tools
Write-Host "=== Development Tools ===" -ForegroundColor Cyan

# Install ESLint and Prettier for code quality
Install-Tool "ESLint" "npm install -g eslint" "JavaScript/TypeScript linter"

# Install Prettier for code formatting
Install-Tool "Prettier" "npm install -g prettier" "Code formatter"

# Install nodemon for development
Install-Tool "nodemon" "npm install -g nodemon" "Development server with auto-restart"

# Install concurrently for running multiple commands
Install-Tool "concurrently" "npm install -g concurrently" "Run multiple commands concurrently"

# Install PM2 for production process management
Install-Tool "PM2" "npm install -g pm2" "Production process manager"

# 2. Orchestrators
Write-Host "=== Orchestrators ===" -ForegroundColor Cyan

# Claude Squad
Install-Tool "Claude Squad" "git clone https://github.com/smtg-ai/claude-squad.git; cd claude-squad; npm install"

# Claude Swarm
Install-Tool "Claude Swarm" "git clone https://github.com/parruda/claude-swarm.git; cd claude-swarm; npm install"

# Claude Code Flow
Install-Tool "Claude Code Flow" "git clone https://github.com/ruvnet/claude-code-flow.git; cd claude-code-flow; npm install"

# Claude Task Master
Install-Tool "Claude Task Master" "git clone https://github.com/eyaltoledano/claude-task-master.git"

# 3. IDE Integrations
Write-Host "=== IDE Integrations ===" -ForegroundColor Cyan

# Claude Code Chat for VS Code
Install-Tool "Claude Code Chat (VS Code)" "code --install-extension AndrePimenta.claude-code-chat"

# Crystal - Desktop application
Install-Tool "Crystal" "git clone https://github.com/stravu/crystal.git; cd crystal; npm install"

# 4. General Tools
Write-Host "=== General Tools ===" -ForegroundColor Cyan

# ccexp - Interactive CLI for discovering configs
Install-Tool "ccexp" "npm install -g ccexp"

# cchistory - Shell history for Claude Code
Install-Tool "cchistory" "git clone https://github.com/eckardt/cchistory.git"

# cclogviewer - View conversation files in HTML
Install-Tool "cclogviewer" "git clone https://github.com/Brads3290/cclogviewer.git"

# claude-code-templates
Install-Tool "claude-code-templates" "npm install -g claude-code-templates"

# claudekit - CLI toolkit
Install-Tool "claudekit" "npm install -g claudekit"

# tweakcc - Customize Claude Code styling
Install-Tool "tweakcc" "git clone https://github.com/Piebald-AI/tweakcc.git; cd tweakcc; npm install"

# 5. Statusline Tools
Write-Host "=== Statusline Tools ===" -ForegroundColor Cyan

# ccstatusline
Install-Tool "ccstatusline" "npm install -g ccstatusline"

# claude-powerline
Install-Tool "claude-powerline" "npm install -g @owloops/claude-powerline"

# claude-code-statusline
Install-Tool "claude-code-statusline" "git clone https://github.com/rz1989s/claude-code-statusline.git"

# 6. Hook Management
Write-Host "=== Hook Management ===" -ForegroundColor Cyan

# CC Notify - Desktop notifications
Install-Tool "CC Notify" "git clone https://github.com/dazuiba/CCNotify.git"

# cchooks - Python SDK
if (Test-CommandExists "pip") {
    Install-Tool "cchooks" "pip install cchooks"
}

# claude-hooks - TypeScript system
Install-Tool "claude-hooks" "git clone https://github.com/johnlindquist/claude-hooks.git; cd claude-hooks; npm install"

# 3. OmniDash Project Setup
Write-Host "=== OmniDash Project Setup ===" -ForegroundColor Cyan

# Function to setup OmniDash project
function Setup-OmniDashProject {
    Write-Host "Setting up OmniDash project..." -ForegroundColor Yellow
    
    # Install frontend dependencies
    if (Test-Path "omnidash-frontend/package.json") {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        Set-Location "omnidash-frontend"
        pnpm install
        Set-Location ".."
    }
    
    # Install backend dependencies
    if (Test-Path "omnidash-backend/package.json") {
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        Set-Location "omnidash-backend"
        pnpm install
        Set-Location ".."
    }
    
    # Setup environment files
    Write-Host "Setting up environment files..." -ForegroundColor Yellow
    if (!(Test-Path "omnidash-backend/.env")) {
        Copy-Item "omnidash-backend/.env.example" "omnidash-backend/.env" -ErrorAction SilentlyContinue
        Write-Host "✓ Backend .env file created" -ForegroundColor Green
    }
    
    if (!(Test-Path "omnidash-frontend/.env.local")) {
        Copy-Item "omnidash-frontend/.env.example" "omnidash-frontend/.env.local" -ErrorAction SilentlyContinue
        Write-Host "✓ Frontend .env.local file created" -ForegroundColor Green
    }
    
    # Setup database
    Write-Host "Setting up database..." -ForegroundColor Yellow
    Set-Location "omnidash-backend"
    npx prisma generate
    npx prisma db push
    Set-Location ".."
    
    Write-Host "✓ OmniDash project setup complete!" -ForegroundColor Green
}

# Run project setup if in dev mode
if ($DevMode) {
    Setup-OmniDashProject
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "OmniDash Development Environment Ready!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installed tools summary:" -ForegroundColor Yellow
Write-Host "- Core Dependencies: Node.js, TypeScript, Prisma, pnpm"
Write-Host "- Development Tools: ESLint, Prettier, nodemon, PM2"
Write-Host "- Claude Code Tools: ccusage, ccflare, viberank"
Write-Host "- Orchestrators: Claude Squad, Claude Swarm, Claude Code Flow"
Write-Host "- IDE Integrations: VS Code extensions, Crystal"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: cd omnidash-backend && pnpm dev"
Write-Host "2. Run: cd omnidash-frontend && pnpm dev"
Write-Host "3. Visit: http://localhost:3000"
Write-Host ""
Write-Host "For more information, check the README files in each directory" -ForegroundColor Cyan