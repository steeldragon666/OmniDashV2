# Claude Code Tools Directory

This directory contains installation scripts and documentation for various Claude Code enhancement tools.

## Quick Installation

### Windows (PowerShell)
```powershell
.\install-tools.ps1
```

### Linux/macOS (Bash)
```bash
chmod +x install-claude-code-tools.sh
./install-claude-code-tools.sh
```

## Tool Categories

### 📊 Usage Monitors
- **ccusage** - CLI dashboard for token usage and costs
- **ccflare** - Web-based usage dashboard with advanced metrics
- **viberank** - Community leaderboard for Claude Code usage
- **Claude Code Usage Monitor** - Real-time terminal-based monitoring

### 🎭 Orchestrators
- **Claude Squad** - Manage multiple Claude Code sessions
- **Claude Swarm** - Launch swarm of Claude Code agents
- **Claude Code Flow** - Code-first orchestration layer
- **Claude Task Master** - Task management for AI-driven development
- **Happy Coder** - Control multiple Claude Codes from phone/desktop
- **TSK** - AI Agent Task Manager with Docker sandboxing

### 🔧 IDE Integrations
- **Claude Code Chat** - VS Code extension with elegant UI
- **claude-code.nvim** - Neovim integration
- **claude-code.el** - Emacs interface
- **claude-code-ide.el** - Advanced Emacs integration with LSP
- **Crystal** - Desktop application for orchestrating agents

### 📝 General Tools
- **ccexp** - Interactive CLI for discovering configs
- **cchistory** - Shell history for Claude Code sessions
- **cclogviewer** - View conversation files in HTML
- **Claude Code Templates** - Collection of resources with UI
- **claudekit** - CLI toolkit with auto-save and subagents
- **tweakcc** - Customize Claude Code styling
- **Claude Composer** - Small enhancements
- **claude-code-tools** - Tmux integrations and security hooks
- **Container Use** - Development environments for coding agents

### 📈 Statusline Tools
- **ccstatusline** - Customizable status line formatter
- **claude-powerline** - Vim-style powerline statusline
- **claude-code-statusline** - Enhanced 4-line statusline with themes

### 🪝 Hook Management
- **CC Notify** - Desktop notifications for Claude Code
- **cchooks** - Python SDK for hooks
- **claude-hooks** - TypeScript-based hook system
- **claude-code-hooks-sdk** - Laravel-inspired PHP SDK
- **TDD Guard** - Enforce TDD principles with hooks
- **TypeScript Quality Hooks** - Quality checks for TypeScript

## Individual Tool Installation

### Installing ccusage
```bash
npm install -g ccusage
ccusage --help
```

### Installing ccflare
```bash
git clone https://github.com/snipeship/ccflare.git
cd ccflare
npm install
npm start
```

### Installing Claude Squad
```bash
git clone https://github.com/smtg-ai/claude-squad.git
cd claude-squad
npm install
npm run build
```

### Installing claudekit
```bash
npm install -g claudekit
claudekit --help
```

## Configuration

Most tools require configuration after installation. Common configuration locations:

- `~/.config/claude-code/` - General configurations
- `~/.claude/` - Claude Code specific settings
- Project-specific `.claude/` directories

## Requirements

### General Requirements
- Node.js 16+ and npm
- Git
- Terminal with UTF-8 support

### Optional Requirements
- Python 3.8+ (for Python-based tools)
- Rust/Cargo (for Rust-based tools)
- Docker (for containerized tools)

## Troubleshooting

### npm permission errors
```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Git clone failures
Ensure you have proper SSH keys or use HTTPS URLs:
```bash
git config --global url."https://".insteadOf git://
```

### Windows-specific issues
Run PowerShell as Administrator or use:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Contributing

To add new tools to this collection:
1. Add the tool to the appropriate installation script
2. Update this README with tool information
3. Test installation on target platforms

## License

Individual tools maintain their own licenses. See each tool's repository for specific license information.

## Support

For tool-specific issues, please refer to each tool's GitHub repository.
For installation script issues, please create an issue in this project.