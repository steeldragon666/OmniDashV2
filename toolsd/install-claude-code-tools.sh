#!/bin/bash

# Claude Code Tools Installation Script
# This script installs various Claude Code enhancement tools

echo "========================================="
echo "Claude Code Tools Installation"
echo "========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install a tool
install_tool() {
    local name=$1
    local cmd=$2
    echo -e "${YELLOW}Installing $name...${NC}"
    eval $cmd
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $name installed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to install $name${NC}"
    fi
    echo ""
}

# Check for Node.js and npm
if ! command_exists node; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo "Starting installation of Claude Code tools..."
echo ""

# 1. Usage Monitors
echo "=== Usage Monitors ==="

# ccusage - Claude Code usage dashboard
install_tool "ccusage" "npm install -g ccusage"

# ccflare - Web-based usage dashboard
install_tool "ccflare" "git clone https://github.com/snipeship/ccflare.git && cd ccflare && npm install"

# 2. Orchestrators
echo "=== Orchestrators ==="

# Claude Squad - Terminal app for managing multiple Claude Code sessions
install_tool "Claude Squad" "git clone https://github.com/smtg-ai/claude-squad.git && cd claude-squad && npm install"

# Claude Swarm - Launch swarm of Claude Code agents
install_tool "Claude Swarm" "git clone https://github.com/parruda/claude-swarm.git && cd claude-swarm && npm install"

# Happy Coder - Control multiple Claude Codes in parallel
install_tool "Happy Coder" "git clone https://github.com/slopus/happy.git && cd happy && cargo build --release"

# 3. IDE Integrations
echo "=== IDE Integrations ==="

# claude-code.nvim for Neovim
if command_exists nvim; then
    install_tool "claude-code.nvim" "git clone https://github.com/greggh/claude-code.nvim ~/.config/nvim/pack/plugins/start/claude-code.nvim"
fi

# 4. General Tools
echo "=== General Tools ==="

# ccexp - Interactive CLI for discovering Claude Code configs
install_tool "ccexp" "npm install -g ccexp"

# cchistory - Shell history for Claude Code sessions
install_tool "cchistory" "git clone https://github.com/eckardt/cchistory.git && cd cchistory && cargo build --release"

# claude-code-templates - Collection of templates and resources
install_tool "claude-code-templates" "npm install -g claude-code-templates"

# claudekit - CLI toolkit with auto-save and code quality hooks
install_tool "claudekit" "npm install -g claudekit"

# 5. Statusline Tools
echo "=== Statusline Tools ==="

# ccstatusline - Customizable status line formatter
install_tool "ccstatusline" "npm install -g ccstatusline"

# claude-powerline - Vim-style powerline statusline
install_tool "claude-powerline" "npm install -g @owloops/claude-powerline"

# 6. Hook Management
echo "=== Hook Management ==="

# cchooks - Python SDK for hooks
if command_exists pip; then
    install_tool "cchooks" "pip install cchooks"
fi

echo "========================================="
echo -e "${GREEN}Installation complete!${NC}"
echo "========================================="
echo ""
echo "Installed tools summary:"
echo "- Usage Monitors: ccusage, ccflare"
echo "- Orchestrators: Claude Squad, Claude Swarm, Happy Coder"
echo "- IDE Integrations: claude-code.nvim (if Neovim installed)"
echo "- General Tools: ccexp, cchistory, claude-code-templates, claudekit"
echo "- Statusline: ccstatusline, claude-powerline"
echo "- Hooks: cchooks (if Python installed)"
echo ""
echo "For more tools and documentation, check the toolsd/ directory"