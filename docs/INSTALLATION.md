# Installation Guide

Complete installation instructions for PM Vibe Code Operations on all platforms and modes.

**New to terminals?** See [SETUP_GUIDE.md](SETUP_GUIDE.md) for beginners starting from scratch.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Choose Your Mode](#choose-your-mode)
3. [Claude Code Installation](#claude-code-installation)
4. [OpenAI Codex Installation](#openai-codex-installation)
5. [Verification](#verification)
6. [MCP Configuration](#mcp-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required for All Platforms

**AI Coding Tool**:
- **Claude Code** (recommended) - [Official installation guide](https://code.claude.com/docs/en/setup)
- **OR OpenAI Codex CLI** - [Official installation guide](https://developers.openai.com/codex/cli)

**Project Management**:
- **Linear** (recommended) with MCP - [Get Linear MCP](https://github.com/QuantGeekDev/linear-mcp)
- **OR Jira** with MCP - [Get Jira MCP](https://github.com/zcaceres/jira-mcp)
- **OR** other ticketing system with MCP integration

**Version Control**:
- **Git** - [Install Git](https://git-scm.com/downloads)
- Git repository for your project (or create new one)

**Claude Code Authentication** (one of these):
- **Claude Pro** or **Claude Max** subscription
- **API access** via console.anthropic.com (requires active billing)
- **Enterprise platform** (Amazon Bedrock, Google Vertex AI, Microsoft Foundry)

**For Codex Users**:
- ChatGPT Plus, Pro, Business, Edu, or Enterprise account

### System Requirements

**Operating Systems**:
- macOS 10.15+
- Linux (Ubuntu 20.04+, Debian 10+)
- Windows 10/11 (WSL2 recommended for best experience)

**Software**:
- Node.js 18+ and npm (for MCP servers like Linear, Perplexity)
- Terminal application (Terminal.app on macOS, Windows Terminal, etc.)
- Text editor (VS Code, Sublime, Vim, etc.) - optional but helpful

**For Claude Code**:
- At least 4GB RAM
- Active internet connection
- Compatible shell (Bash, Zsh, or Fish)

---

## Choose Your Mode

Before installing, choose your platform and mode:

### For Claude Code Users

| Mode | Best For | Commands Location | Install From |
|------|----------|-------------------|--------------|
| **Simple Mode** | Beginners, one ticket at a time | `claude/commands/` | Recommended starting point |
| **Worktree Mode** | Advanced users, concurrent development | `claude/commands-worktrees/` | After mastering Simple Mode |

**Recommendation**: Start with Simple Mode. Switch to Worktree Mode after shipping 3-5 features successfully.

### For OpenAI Codex Users

| Type | Location | Notes |
|------|----------|-------|
| **Platform-Agnostic Prompts** | `codex/prompts/` | Simple mode only, no agent references |

Codex users use platform-agnostic prompts from `codex/prompts/` directory.

---

## Install Claude Code First

Before installing this workflow, make sure you have Claude Code installed.

**👉 For complete installation instructions, visit the official guide:**
**[https://code.claude.com/docs/en/setup](https://code.claude.com/docs/en/setup)**

**Quick install**:

**macOS/Linux (Homebrew)**:
```bash
brew install --cask claude-code
```

**macOS/Linux/WSL (Script)**:
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows (PowerShell)**:
```powershell
irm https://claude.ai/install.ps1 | iex
```

**Alternative (NPM)**:
```bash
npm install -g @anthropic-ai/claude-code
```

**Verify installation**:
```bash
claude --version
```

**First run** (authentication):
```bash
claude
```

Follow the prompts to authenticate via Claude Console, Claude App, or Enterprise platform. No manual API key setup required.

---

## Workflow Installation

Now that Claude Code is installed, you can install this workflow's commands and agents.

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/pm-vibecode-ops.git
cd pm-vibecode-ops
```

### Step 2: Choose Installation Type

You can install globally (available for all projects) or locally (specific to one project).

#### Global Installation (Recommended)

Global installation makes the workflow available across all your projects.

**For Simple Mode**:
```bash
# Create Claude directories
mkdir -p ~/.claude/commands
mkdir -p ~/.claude/agents

# Copy Simple Mode commands and agents
cp claude/commands/*.md ~/.claude/commands/
cp claude/agents/*.md ~/.claude/agents/
```

**For Worktree Mode**:
```bash
# Create Claude directories (if not already created)
mkdir -p ~/.claude/commands
mkdir -p ~/.claude/agents

# Copy Worktree Mode commands and agents
cp claude/commands-worktrees/*.md ~/.claude/commands/
cp claude/agents/*.md ~/.claude/agents/
```

#### Local Installation (Project-Specific)

For project-specific workflow customization:

```bash
# Navigate to your project
cd /path/to/your/project

# Create local Claude directories
mkdir -p .claude/commands
mkdir -p .claude/agents

# For Simple Mode
cp /path/to/pm-vibecode-ops/claude/commands/*.md .claude/commands/
cp /path/to/pm-vibecode-ops/claude/agents/*.md .claude/agents/

# OR for Worktree Mode
cp /path/to/pm-vibecode-ops/claude/commands-worktrees/*.md .claude/commands/
cp /path/to/pm-vibecode-ops/claude/agents/*.md .claude/agents/
```

**Note**: Project-specific installation takes precedence over global installation for that project.

### Step 3: Verify Installation

```bash
# Check commands installed
ls ~/.claude/commands/
# Should show: adaptation.md, codereview.md, discovery.md, documentation.md, epic-planning.md, etc.

# Check agents installed
ls ~/.claude/agents/
# Should show: architect_agent.md, backend_engineer_agent.md, etc.

# For local installation
ls .claude/commands/
ls .claude/agents/
```

---

## OpenAI Codex Installation

Codex uses prompts instead of slash commands. The prompts in `codex/prompts/` are platform-agnostic (no Claude-specific agents) but assume similar workflow.

### Step 0: Install Codex CLI First

Before installing this workflow, make sure you have OpenAI Codex installed.

**👉 For complete installation instructions, visit the official guides:**
- **[OpenAI Codex CLI Documentation](https://developers.openai.com/codex/cli)**
- **[OpenAI Help Center - Getting Started](https://help.openai.com/en/articles/11096431-openai-codex-cli-getting-started)**

**Quick install**:
```bash
npm i -g @openai/codex
```

**Verify installation**:
```bash
codex --version
```

**First run** (authentication):
```bash
codex
```

Follow the prompts to authenticate with your ChatGPT account. **Requires**: ChatGPT Plus, Pro, Business, Edu, or Enterprise account. No manual API key setup needed for standard usage.

---

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/pm-vibecode-ops.git
cd pm-vibecode-ops
```

### Step 2: Access Prompts

**Option A: Reference Directly** (Recommended)
```bash
# Prompts are available in the cloned repository
ls codex/prompts/
# Shows: adaptation.md, codereview.md, discovery.md, etc.

# Use prompts by copying content from these files
```

**Option B: Copy to Codex Directory**
```bash
# Create Codex directory (optional)
mkdir -p ~/.codex/prompts

# Copy prompts
cp codex/prompts/*.md ~/.codex/prompts/

# Verify
ls ~/.codex/prompts/
```

### Step 3: Using Codex Prompts

Unlike Claude Code's slash commands, Codex prompts are used by copying their content:

```bash
# View a prompt
cat codex/prompts/discovery.md

# Copy the content and paste into your Codex session
# Or reference the file path in your own Codex configuration
```

**See** [codex/README.md](../codex/README.md) for Codex-specific guidance and workflow details.

---

## Verification

### Claude Code Verification

```bash
# Start Claude Code in any project
claude

# Type /help to see available commands
/help

# You should see your installed commands listed:
# /adaptation, /codereview, /discovery, /documentation,
# /epic-planning, /generate_service_inventory, /implementation,
# /planning, /security_review, /testing

# Exit Claude Code
exit
```

**Troubleshooting**:
- If commands don't appear, check installation paths match: `ls ~/.claude/commands/`
- Try restarting Claude Code
- Check for file permissions: `chmod +r ~/.claude/commands/*.md`

### Codex Verification

```bash
# Verify prompts are accessible
ls ~/.codex/prompts/   # If you copied them
# OR
ls /path/to/pm-vibecode-ops/codex/prompts/   # If referencing directly

# Should show all prompt files
```

---

## MCP Configuration

Model Context Protocol (MCP) servers provide AI tools for ticketing, web search, and other integrations.

**Required MCP Servers**:
- **Linear** (or Jira) - For creating and managing tickets

**Recommended MCP Servers**:
- **Perplexity** - For web research during discovery
- **Sequential Thinking** - For complex reasoning tasks

**Optional MCP Servers**:
- **Playwright** - For browser-based testing

**Complete MCP setup guide**: [MCP_SETUP.md](MCP_SETUP.md)

**Quick Linear MCP Setup**:
```bash
# Install Linear MCP
npm install -g @modelcontextprotocol/server-linear

# Get your Linear API key from: https://linear.app/settings/api
# Configure in Claude Code settings
```

---

## Troubleshooting

### Commands Not Showing Up

**Problem**: Slash commands don't appear in Claude Code

**Solutions**:
```bash
# 1. Verify files are in correct location
ls ~/.claude/commands/
# Should show .md files

# 2. Check file permissions
chmod +r ~/.claude/commands/*.md

# 3. Restart Claude Code
claude
/help  # Commands should now appear

# 4. Check for typos in filenames
# Filenames must match command names exactly
```

### Wrong Mode Installed

**Problem**: Installed Worktree Mode but wanted Simple Mode (or vice versa)

**Solution**:
```bash
# Remove current installation
rm -rf ~/.claude/commands/*.md

# Re-install correct mode
# For Simple Mode:
cp /path/to/pm-vibecode-ops/claude/commands/*.md ~/.claude/commands/

# For Worktree Mode:
cp /path/to/pm-vibecode-ops/claude/commands-worktrees/*.md ~/.claude/commands/
```

### Permission Denied Errors

**Problem**: "Permission denied" when copying files

**Solution**:
```bash
# Create directories with proper permissions
mkdir -p ~/.claude/commands
mkdir -p ~/.claude/agents
chmod 755 ~/.claude/commands ~/.claude/agents

# Copy files
cp claude/commands/*.md ~/.claude/commands/
cp claude/agents/*.md ~/.claude/agents/

# Set read permissions
chmod +r ~/.claude/commands/*.md
chmod +r ~/.claude/agents/*.md
```

### MCP Integration Not Working

**Problem**: Commands can't create Linear tickets or access MCP tools

**Solution**:
1. Verify MCP server is installed: `npm list -g @modelcontextprotocol/server-linear`
2. Check API key is configured correctly
3. Test MCP connection in Claude Code
4. See [MCP_SETUP.md](MCP_SETUP.md) for detailed troubleshooting

### Git Not Found

**Problem**: "git: command not found"

**Solution**:
```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt-get install git

# Windows (install Git for Windows)
# Download from: https://git-scm.com/download/win
```

### Node.js Not Found

**Problem**: "npm: command not found" or "node: command not found"

**Solution**:
```bash
# macOS
brew install node

# Ubuntu/Debian
sudo apt-get install nodejs npm

# Windows
# Download from: https://nodejs.org/

# Verify installation
node --version
npm --version
```

---

## Platform-Specific Notes

### macOS

- Use **Terminal.app** or **iTerm2**
- Install **Homebrew** first: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Then install Git and Node: `brew install git node`

### Linux

- Use your distribution's package manager
- Ubuntu/Debian: `apt-get`
- Fedora/RHEL: `dnf` or `yum`
- Arch: `pacman`

### Windows

**Option 1: WSL2 (Recommended)**
1. Install WSL2: [Microsoft's WSL Guide](https://docs.microsoft.com/en-us/windows/wsl/install)
2. Install Ubuntu from Microsoft Store
3. Follow Linux instructions inside WSL

**Option 2: Native Windows**
1. Install Git for Windows
2. Install Node.js from nodejs.org
3. Use PowerShell or Git Bash as terminal

---

## Next Steps

After installation:

1. **Configure MCP**: [MCP_SETUP.md](MCP_SETUP.md)
2. **Learn the workflow**: [PM_GUIDE.md](../PM_GUIDE.md)
3. **Ship your first feature**: [GET_STARTED.md](../GET_STARTED.md)
4. **Review examples**: [EXAMPLES.md](../EXAMPLES.md)

---

## Advanced Configuration

### Multiple Projects with Different Modes

You can use global installation for one mode and local installation for specific projects using the other mode:

```bash
# Global: Simple Mode (default for most projects)
cp claude/commands/*.md ~/.claude/commands/

# Project A: Use global Simple Mode
cd /path/to/project-a
# (no local .claude/ directory)

# Project B: Use Worktree Mode locally
cd /path/to/project-b
mkdir -p .claude/commands .claude/agents
cp /path/to/pm-vibecode-ops/claude/commands-worktrees/*.md .claude/commands/
cp /path/to/pm-vibecode-ops/claude/agents/*.md .claude/agents/
```

### Switching Between Modes

**From Simple to Worktree**:
```bash
# 1. Finish all in-progress tickets in Simple Mode
# 2. Update global commands to Worktree Mode
rm ~/.claude/commands/*.md
cp /path/to/pm-vibecode-ops/claude/commands-worktrees/*.md ~/.claude/commands/
# 3. Start new tickets using Worktree Mode
```

**From Worktree to Simple**:
```bash
# 1. Complete and merge all active worktrees
git worktree list  # Check for active worktrees
# Finish each one via /security_review

# 2. Clean up stale worktrees
git worktree prune

# 3. Switch to Simple Mode commands
rm ~/.claude/commands/*.md
cp /path/to/pm-vibecode-ops/claude/commands/*.md ~/.claude/commands/
```

---

**Need help?** Check [FAQ.md](../FAQ.md) or [Troubleshooting Guide](TROUBLESHOOTING.md)
