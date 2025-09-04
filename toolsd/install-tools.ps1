# Claude Code Tools Installation Script for Windows
# PowerShell script to install various Claude Code enhancement tools

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Claude Code Tools Installation (Windows)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Function to check if command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Function to install a tool
function Install-Tool {
    param(
        [string]$name,
        [string]$command
    )
    Write-Host "Installing $name..." -ForegroundColor Yellow
    try {
        Invoke-Expression $command
        Write-Host "✓ $name installed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to install $name" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    Write-Host ""
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

Write-Host "Starting installation of Claude Code tools..." -ForegroundColor Green
Write-Host ""

# 1. Usage Monitors
Write-Host "=== Usage Monitors ===" -ForegroundColor Cyan

# ccusage - Claude Code usage dashboard
Install-Tool "ccusage" "npm install -g ccusage"

# ccflare - Web-based usage dashboard
Install-Tool "ccflare" "git clone https://github.com/snipeship/ccflare.git; cd ccflare; npm install"

# viberank - Community leaderboard
Install-Tool "viberank" "git clone https://github.com/sculptdotfun/viberank.git; cd viberank; npm install"

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

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installed tools summary:" -ForegroundColor Yellow
Write-Host "- Usage Monitors: ccusage, ccflare, viberank"
Write-Host "- Orchestrators: Claude Squad, Claude Swarm, Claude Code Flow, Task Master"
Write-Host "- IDE Integrations: Claude Code Chat (VS Code), Crystal"
Write-Host "- General Tools: ccexp, cchistory, cclogviewer, claude-code-templates, claudekit, tweakcc"
Write-Host "- Statusline: ccstatusline, claude-powerline, claude-code-statusline"
Write-Host "- Hooks: CC Notify, cchooks, claude-hooks"
Write-Host ""
Write-Host "For more information about each tool, check the README files in their respective directories" -ForegroundColor Cyan