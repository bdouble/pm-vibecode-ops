# Installation Guide

Complete installation instructions for PM Vibe Code Operations.

**New to terminals?** See [SETUP_GUIDE.md](SETUP_GUIDE.md) for beginners starting from scratch.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Claude Code Installation](#claude-code-installation)
3. [OpenAI Codex Installation](#openai-codex-installation)
4. [MCP Configuration](#mcp-configuration)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required for All Platforms

**AI Coding Tool**:
- **Claude Code** (recommended) - [Official installation guide](https://code.claude.com/docs/en/setup)
- **OR OpenAI Codex CLI** - [Official installation guide](https://developers.openai.com/codex/cli)

**Project Management**:
- **Linear** (recommended) with MCP - [Install Linear MCP](https://linear.app/docs/mcp)
- **OR Jira** with MCP - [Install Jira MCP](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/)
- **OR** other ticketing system with MCP integration: [Asana](https://developers.asana.com/docs/using-asanas-mcp-server)

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

## Claude Code Installation

### Step 1: Install Claude Code

Before installing this workflow, make sure you have Claude Code installed.

**For complete installation instructions, visit the official guide:**
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

### Step 2: Install the PM Workflow Plugin

**Install from Claude Code Marketplace**:
```bash
# Add the marketplace first
/plugin marketplace add bdouble/pm-vibecode-ops

# Then install from marketplace
/plugin install pm-vibecode-ops@pm-vibecode-ops
```

When prompted for scope, **select "User"** (recommended) to make the plugin available across all projects.

**Scope options**:
| Scope | Who can use it | Where it works | Best for |
|-------|----------------|----------------|----------|
| **User** | You only | All your projects | Personal workflow (recommended) |
| **Project** | All collaborators | This repository only | Team standardization |
| **Local** | You only | This repository only | Testing/evaluation |

That's it! The plugin system automatically installs:
- **Commands** (`/adaptation`, `/implementation`, etc.) - Workflow phases you invoke
- **Agents** - Specialized AI roles (architect, QA engineer, security engineer)
- **Skills** - Auto-activated quality enforcement during development
- **Hooks** - Session automation for workflow context

### Step 3: Verify Installation

```bash
# Start Claude Code in any project
claude

# Type /help to see available commands
/help

# You should see workflow commands listed:
# /adaptation, /codereview, /discovery, /documentation,
# /epic-planning, /generate_service_inventory, /implementation,
# /planning, /security_review, /testing
```

**Note**: Skills don't appear in `/help`. They activate automatically based on what you're doing (e.g., security patterns apply when writing auth code).

### Plugin Management

**Update the plugin**:
```bash
/plugin marketplace update
```

**Reinstall if needed**:
```bash
/plugin uninstall pm-vibecode-ops
/plugin marketplace add bdouble/pm-vibecode-ops
/plugin install pm-vibecode-ops@pm-vibecode-ops
```

**List installed plugins**:
```bash
/plugin list
```

---

## OpenAI Codex Installation

Codex uses prompts instead of slash commands. The prompts in `codex/prompts/` are platform-agnostic.

### Step 1: Install Codex CLI

**For complete installation instructions, visit the official guides:**
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

Follow the prompts to authenticate with your ChatGPT account. **Requires**: ChatGPT Plus, Pro, Business, Edu, or Enterprise account.

### Step 2: Clone Repository for Prompts

```bash
# Clone the repository
git clone https://github.com/bdouble/pm-vibecode-ops.git
cd pm-vibecode-ops
```

### Step 3: Access Prompts

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

### Step 4: Using Codex Prompts

Unlike Claude Code's slash commands, Codex prompts are used by copying their content:

```bash
# View a prompt
cat codex/prompts/discovery.md

# Copy the content and paste into your Codex session
```

**See** [codex/README.md](../codex/README.md) for Codex-specific guidance and workflow details.

---

## MCP Configuration

Model Context Protocol (MCP) servers provide AI tools for ticketing, web search, and other integrations.

**Required MCP Servers**:
- **Linear** (or Jira) - For creating and managing tickets

**Recommended MCP Servers**:
- **Perplexity** - For web search, conversational AI, deep research, and reasoning ([Docs](https://docs.perplexity.ai/guides/mcp-server))
- **Sequential Thinking** - For complex reasoning tasks

**Optional MCP Servers**:
- **Playwright** - For browser-based testing ([Docs](https://github.com/microsoft/playwright-mcp))

**Complete MCP setup guide**: [MCP_SETUP.md](MCP_SETUP.md)

**Quick Linear MCP Setup**:
```bash
# Install Linear MCP (uses OAuth 2.1 - no API key needed)
claude mcp add --transport http linear-server https://mcp.linear.app/mcp

# Authenticate via /mcp command in Claude Code session
# Or follow OAuth prompts in Claude Desktop/Cursor

# See: https://linear.app/docs/mcp for official documentation
```

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

# Test a command
/discovery --help

# Exit Claude Code
exit
```

**Troubleshooting**:
- If commands don't appear, try `/plugin list` to verify installation
- Try restarting Claude Code
- Reinstall plugin via marketplace (see Plugin Management section above)

### Codex Verification

```bash
# Verify prompts are accessible
ls ~/.codex/prompts/   # If you copied them
# OR
ls /path/to/pm-vibecode-ops/codex/prompts/   # If referencing directly

# Should show all prompt files
```

---

## Troubleshooting

### Plugin Installation Failed

**Problem**: Plugin install command fails

**Solutions**:
```bash
# 1. Check Claude Code version (must support plugins)
claude --version

# 2. Check network connectivity
curl https://github.com/bdouble/pm-vibecode-ops

# 3. Restart Claude Code and try again
exit
claude
/plugin marketplace add bdouble/pm-vibecode-ops
/plugin install pm-vibecode-ops@pm-vibecode-ops
```

### Commands Not Showing Up

**Problem**: Slash commands don't appear in Claude Code

**Solutions**:
```bash
# 1. Verify plugin is installed
/plugin list
# Should show pm-vibecode-ops

# 2. Restart Claude Code
exit
claude

# 3. Reinstall plugin
/plugin uninstall pm-vibecode-ops
/plugin marketplace add bdouble/pm-vibecode-ops
/plugin install pm-vibecode-ops@pm-vibecode-ops
```

### "Already Installed" But Commands Don't Work

**Problem**: Claude Code says the plugin is "already installed" but commands aren't available

**Cause**: The plugin was previously installed with "Local" scope for a different project. The plugin registry shows it as installed, but it's only active in that specific project directory.

**Solution**: Clear the stale installation and reinstall with "User" scope:

```bash
# 1. Exit Claude Code
exit

# 2. Clear the plugin cache (in your terminal, not Claude Code)
rm -rf ~/.claude/plugins/cache/pm-vibecode-ops

# 3. Remove the stale registry entry
# Edit ~/.claude/plugins/installed_plugins.json and remove the pm-vibecode-ops entry
# Or delete the file to reset all plugins: rm ~/.claude/plugins/installed_plugins.json

# 4. Start Claude Code fresh
claude

# 5. Reinstall with User scope
/plugin marketplace add bdouble/pm-vibecode-ops
/plugin install pm-vibecode-ops@pm-vibecode-ops
# When prompted, select "User" scope
```

**Prevention**: Always select "User" scope when installing to make the plugin available everywhere.

### Skills Not Activating

**Problem**: Skills don't seem to be enforcing standards during development

**Note**: Skills activate based on context (what you're doing). They don't show in `/help` like commands do. To test, try asking Claude to write code with TODOs or workarounds - skills should block these patterns automatically.

### MCP Integration Not Working

**Problem**: Commands can't create Linear tickets or access MCP tools

**Solution**:
1. Verify Linear MCP is installed: `claude mcp list` (should show `linear-server`)
2. Authenticate via OAuth: Run `/mcp` command in Claude Code session
3. Test MCP connection: Ask Claude to list your Linear teams
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

**Need help?** Check [FAQ.md](../FAQ.md) or [Troubleshooting Guide](TROUBLESHOOTING.md)
