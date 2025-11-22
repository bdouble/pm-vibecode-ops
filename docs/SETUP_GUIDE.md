# Complete Setup Guide for Beginners

This guide will walk you through setting up everything you need to use this workflow, starting from zero technical experience. If you've never used a terminal before, start here.

## Table of Contents

1. [Before You Begin](#before-you-begin)
2. [Terminal Basics](#terminal-basics)
3. [Installing Prerequisites](#installing-prerequisites)
4. [Installing Claude Code](#installing-claude-code)
5. [Installing the Workflow](#installing-the-workflow)
6. [Verifying Your Setup](#verifying-your-setup)
7. [Alternative: OpenAI Codex Setup](#alternative-openai-codex-setup)
8. [Troubleshooting](#troubleshooting)

---

## Before You Begin

### What You'll Need

**Time**: 30-45 minutes for first-time setup

**Required**:
- A computer (Mac, Windows, or Linux)
- Internet connection
- Claude Code account (Pro, Max, or API access via console.anthropic.com)
- A Linear account with API access — [Sign up here](https://linear.app/)

**Helpful but optional**:
- A code editor like VS Code (we'll install this)
- An existing codebase to work with

### What We'll Install

1. **Terminal** — Your command center for running commands
2. **Claude Code** — The AI coding assistant (includes authentication)
3. **Node.js** — Required for MCP servers (Linear, Perplexity, etc.)
4. **Git** — Version control for your code
5. **This workflow** — Commands and agents that orchestrate development

---

## Terminal Basics

If you've never used a terminal before, this section is for you. If you're comfortable with command-line basics, skip to [Installing Prerequisites](#installing-prerequisites).

### What is a Terminal?

A terminal (also called "command line" or "shell") is a text-based way to interact with your computer. Instead of clicking icons, you type commands. It looks intimidating at first, but you'll only need a few basic commands.

**Don't worry**: You cannot break your computer by typing wrong commands. The worst that typically happens is an error message.

### Opening the Terminal

**On Mac**:
1. Press `Cmd + Space` to open Spotlight
2. Type "Terminal"
3. Press Enter

**On Windows**:
1. Press `Windows key`
2. Type "PowerShell" or "Terminal"
3. Click "Windows Terminal" or "PowerShell"

**On Linux**:
1. Press `Ctrl + Alt + T`
2. Or search for "Terminal" in your applications

### Essential Commands You'll Need

Here are the only commands you need to know:

| Command | What It Does | Example |
|---------|--------------|---------|
| `cd` | Change directory (folder) | `cd Documents` |
| `cd ..` | Go up one folder | `cd ..` |
| `ls` | List files in current folder | `ls` |
| `pwd` | Show current folder path | `pwd` |
| `mkdir` | Create a new folder | `mkdir myproject` |

### Understanding File Paths

File paths tell the computer where to find things:

- **Absolute path**: Full path from root — `/Users/yourname/Documents/project`
- **Relative path**: Path from where you are — `Documents/project`
- **Home folder**: Represented by `~` — `~/Documents` means `/Users/yourname/Documents`

### Copying and Pasting in Terminal

**On Mac**:
- Copy: `Cmd + C`
- Paste: `Cmd + V`

**On Windows**:
- Copy: `Ctrl + C` (or right-click)
- Paste: `Ctrl + V` (or right-click)

**Pro tip**: You can often paste commands directly from this guide into your terminal.

### Your First Terminal Exercise

Let's make sure you're comfortable:

1. Open your terminal
2. Type `pwd` and press Enter — this shows where you are
3. Type `ls` and press Enter — this shows what files are here
4. Type `cd ~` and press Enter — this goes to your home folder
5. Type `pwd` again — you should see something like `/Users/yourname`

If these worked, you're ready to continue!

---

## Installing Prerequisites

### Step 1: Install Node.js

Node.js is required to run Claude Code and MCP servers.

#### On Mac

**Option A: Direct Download (Simplest)**
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the "LTS" version (the one that says "Recommended")
3. Run the installer, click through all the prompts
4. Restart your terminal

**Option B: Using Homebrew (Recommended for Mac users who want more control)**
```bash
# First, install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node.js
brew install node
```

#### On Windows

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the "LTS" version
3. Run the installer
4. **Important**: Check the box that says "Automatically install necessary tools"
5. Complete the installation
6. Restart your terminal (close and reopen PowerShell)

#### On Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Node.js
sudo apt install nodejs npm
```

#### Verify Node.js Installation

Open a **new** terminal window and run:

```bash
node --version
npm --version
```

You should see version numbers like `v20.10.0` and `10.2.3`. The exact numbers may differ—that's okay!

**If you see "command not found"**: Close your terminal completely and open a new one. If it still doesn't work, restart your computer.

---

### Step 2: Install Git

Git tracks changes to your code and enables collaboration.

#### On Mac

**Option A: Xcode Command Line Tools (Easiest)**
```bash
xcode-select --install
```
Click "Install" when prompted.

**Option B: Homebrew**
```bash
brew install git
```

#### On Windows

1. Go to [git-scm.com](https://git-scm.com/download/win)
2. Download the installer
3. Run the installer with default settings
4. Restart your terminal

#### On Linux (Ubuntu/Debian)

```bash
sudo apt install git
```

#### Verify Git Installation

```bash
git --version
```

You should see something like `git version 2.39.0`.

#### Configure Git (First Time Only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and email.

---

### Step 3: Install a Code Editor (Optional but Recommended)

While you don't need to write code, having a code editor helps you:
- Read PRDs and documentation
- Review AI-generated files
- Navigate project structures

**Recommended: Visual Studio Code (VS Code)**

1. Go to [code.visualstudio.com](https://code.visualstudio.com/)
2. Download for your operating system
3. Install with default settings

---

## Installing Claude Code

Claude Code is Anthropic's official CLI tool. Installation is straightforward and **does not require manual API key setup**—authentication happens automatically when you first run it.

### Step 1: Install Claude Code

**For complete, official installation instructions, visit:**
👉 **[https://code.claude.com/docs/en/setup](https://code.claude.com/docs/en/setup)**

**Quick install options**:

**macOS/Linux (Homebrew - Recommended)**:
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

### Step 2: Verify Installation

After installation, check that Claude Code is available:

```bash
claude --version
```

You should see a version number (e.g., `1.2.3` or similar).

### Step 3: First Run and Authentication

When you first run Claude Code, it will guide you through authentication:

```bash
claude
```

You'll be prompted to authenticate via one of these methods:
- **Claude Console** (requires active billing at console.anthropic.com)
- **Claude App** (for Pro or Max subscribers)
- **Enterprise Platforms** (Amazon Bedrock, Google Vertex AI, or Microsoft Foundry)

**No manual API key setup is required**—just follow the prompts.

### Step 4: Test Claude Code

Once authenticated, try a simple command:

```bash
claude "Hello, are you working?"
```

If Claude responds, you're ready!

---

## Installing the Workflow

This workflow provides commands and agents for both Claude Code and OpenAI Codex. The installation process differs based on your chosen platform.

### Platform and Mode Selection

**For Claude Code users:**
| Mode | Location | Best For |
|------|----------|----------|
| **Simple Mode** (Recommended) | `claude/commands/` | Most users, one ticket at a time |
| **Worktree Mode** (Advanced) | `claude/commands-worktrees/` | Concurrent development with git worktrees |

**For OpenAI Codex users:**
| Type | Location | Notes |
|------|----------|-------|
| **Platform-Agnostic Prompts** | `codex/prompts/` | No agent references, works with any AI |

### Understanding Global vs. Local Installation

| Installation | Location | Best For |
|--------------|----------|----------|
| **Global** | `~/.claude/` or `~/.codex/` | Using workflow across multiple projects |
| **Local** | `your-project/.claude/` | Keeping workflow specific to one project |

**Recommendation**: Start with **global installation** for easier management.

## Claude Code Installation

### Global Installation (Recommended)

#### Step 1: Clone the Repository

```bash
# Go to a folder where you want to keep the source
cd ~/Documents  # or wherever you prefer

# Clone the repository
git clone https://github.com/YOUR_ORG/pm-vibecode-ops.git
cd pm-vibecode-ops
```

#### Step 2: Create Claude Config Directories

```bash
# Create the directories if they don't exist
mkdir -p ~/.claude/commands
mkdir -p ~/.claude/agents
```

#### Step 3: Copy Files Based on Your Mode Choice

**For Simple Mode (Recommended for beginners):**
```bash
# Copy Simple Mode commands and agents
cp claude/commands/*.md ~/.claude/commands/
cp claude/agents/*.md ~/.claude/agents/
```

**For Worktree Mode (Advanced users only):**
```bash
# Copy Worktree Mode commands and agents
cp claude/commands-worktrees/*.md ~/.claude/commands/
cp claude/agents/*.md ~/.claude/agents/  # Same agents for both modes
```

#### Step 4: Verify Installation

```bash
# List installed commands
ls ~/.claude/commands/
# You should see: adaptation.md, codereview.md, discovery.md, etc.

# List installed agents
ls ~/.claude/agents/
# You should see: architect_agent.md, backend_engineer_agent.md, etc.
```

### Local Installation (Project-Specific)

If you prefer to keep the workflow within a specific project:

```bash
# Navigate to your project
cd /path/to/your/project

# Create local Claude directories
mkdir -p .claude/commands
mkdir -p .claude/agents

# Copy files based on your mode choice
# For Simple Mode:
cp /path/to/pm-vibecode-ops/claude/commands/*.md .claude/commands/
cp /path/to/pm-vibecode-ops/claude/agents/*.md .claude/agents/

# OR for Worktree Mode:
cp /path/to/pm-vibecode-ops/claude/commands-worktrees/*.md .claude/commands/
cp /path/to/pm-vibecode-ops/claude/agents/*.md .claude/agents/
```

**Note**: Local installation takes precedence over global installation for that project.

## OpenAI Codex Installation

### Option 1: Reference Prompts Directly

```bash
# Clone the repository
cd ~/Documents
git clone https://github.com/YOUR_ORG/pm-vibecode-ops.git

# Reference prompts directly from the cloned repository
# When using Codex, navigate to:
cd pm-vibecode-ops/codex/prompts/

# View available prompts
ls *.md
```

### Option 2: Copy to Codex Directory

```bash
# Create Codex prompt directory (if your setup uses one)
mkdir -p ~/.codex/prompts

# Copy prompts
cp pm-vibecode-ops/codex/prompts/*.md ~/.codex/prompts/

# Verify installation
ls ~/.codex/prompts/
```

### Using Codex Prompts

Unlike Claude Code's slash commands, Codex prompts are used by copying their content:

```bash
# View a prompt
cat ~/.codex/prompts/discovery.md

# Copy the content and paste into your Codex session
```

For Codex-specific behavior (personas, simple-mode assumptions, and Linear MCP usage), see `codex/README.md`.

---

## Verifying Your Setup

Let's make sure everything is working.

### Checklist

Run each command and check for expected output:

```bash
# 1. Node.js installed?
node --version
# Expected: v18.x.x or higher

# 2. npm installed?
npm --version
# Expected: 9.x.x or higher

# 3. Git installed?
git --version
# Expected: git version 2.x.x

# 4. Claude Code installed?
claude --version
# Expected: Version number

# 5. Commands installed?
ls ~/.claude/commands/ | head -5
# Expected: List of .md files

# 6. Agents installed?
ls ~/.claude/agents/ | head -5
# Expected: List of .md files
```

### Test Claude Code

```bash
# Start Claude Code in a test directory
cd ~/Documents
mkdir test-setup
cd test-setup

# Initialize a git repo (required for Claude Code)
git init

# Start Claude Code
claude
```

If you see the Claude Code prompt, type:
```
/help
```

You should see available commands, including the ones you just installed.

### Clean Up Test Directory

```bash
cd ..
rm -rf test-setup
```

---

## Alternative: OpenAI Codex Setup

If you're using OpenAI's Codex instead of Claude Code, this workflow provides platform-agnostic prompts.

### Step 1: Install Codex CLI

**For complete, official installation instructions, visit:**
👉 **[OpenAI Codex CLI Documentation](https://developers.openai.com/codex/cli)**
👉 **[OpenAI Help Center - Getting Started](https://help.openai.com/en/articles/11096431-openai-codex-cli-getting-started)**

**Quick install via npm**:
```bash
npm i -g @openai/codex
```

**Verify installation**:
```bash
codex --version
```

### Step 2: Authenticate

When you first run Codex, you'll be prompted to authenticate:

```bash
codex
```

**Authentication requires**: ChatGPT Plus, Pro, Business, Edu, or Enterprise account

Follow the prompts to sign in with your ChatGPT account. No manual API key setup is required for standard usage.

### Step 3: Use Platform-Agnostic Prompts

The `/codex/prompts/` directory contains prompts that work with Codex:

```bash
ls codex/prompts/
```

These prompts don't reference Claude-specific agents, making them compatible with Codex and other AI platforms.

### Using Codex Prompts

Instead of slash commands, you'll copy the prompt content and paste it into Codex:

```bash
# Read the prompt
cat codex/prompts/discovery.md

# Copy the content and use it in your Codex session
```

For detailed Codex-specific behavior (personas, simple-mode assumptions, and Linear MCP usage), see `codex/README.md`.

---

## Troubleshooting

### "command not found" Errors

**Problem**: `claude: command not found` or `node: command not found`

**Solutions**:
1. Close and reopen your terminal
2. Restart your computer
3. Verify the installation completed without errors
4. Check your PATH (advanced—see below)

**Checking PATH (Advanced)**:
```bash
echo $PATH
# Should include paths like /usr/local/bin or ~/.npm-global/bin
```

### Permission Denied Errors

**Problem**: `EACCES: permission denied` when installing npm packages

**Solution on Mac/Linux**:
```bash
sudo npm install -g @anthropic-ai/claude-code
```

**Better long-term solution**: Configure npm to use a different directory:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Authentication Issues

**Problem**: Claude Code says authentication failed or can't connect

**Solutions**:
1. Run `claude` again and follow the authentication prompts
2. Verify you have an active Claude Pro/Max subscription OR active billing on console.anthropic.com
3. Check your internet connection
4. Try logging out and back in to Claude Console or Claude App
5. For API access, verify your API keys are active at [Anthropic Console](https://console.anthropic.com/)

### Slash Commands Not Appearing

**Problem**: Your custom commands don't show in `/help`

**Solutions**:
1. Verify files are in the correct location:
```bash
ls ~/.claude/commands/
```
2. Check file permissions:
```bash
chmod 644 ~/.claude/commands/*.md
```
3. Restart Claude Code

### MCP Server Won't Connect

See [MCP_SETUP.md](MCP_SETUP.md) for detailed MCP troubleshooting.

### Git Errors

**Problem**: "fatal: not a git repository"

**Solution**: Initialize a git repository in your project:
```bash
cd /path/to/your/project
git init
```

### Windows-Specific Issues

**Problem**: Commands don't work in PowerShell

**Solutions**:
1. Use Windows Terminal instead of basic PowerShell
2. Run as Administrator for installation commands
3. For npm global installs, use:
```powershell
npm install -g @anthropic-ai/claude-code --prefix $env:APPDATA\npm
```

---

## Next Steps

Now that your setup is complete:

1. **Set up MCP integrations** — See [MCP_SETUP.md](MCP_SETUP.md) for Linear, Perplexity, and other required integrations

2. **Read the PM Guide** — See [PM_GUIDE.md](../PM_GUIDE.md) to understand the workflow

3. **Important: Context Window Best Practice** — Run each workflow command in a fresh Claude Code session. After completing a command and reviewing its output, close Claude Code and start a new session for the next command. This prevents context overflow and ensures optimal performance. Each command creates persistent artifacts (tickets, code, PRs), so you won't lose progress.

4. **Try your first feature** — Follow the quick start in the PM Guide, remembering to start fresh sessions between commands

5. **Bookmark these resources**:
   - [FAQ.md](../FAQ.md) — Common questions
   - [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — When things go wrong
   - [GLOSSARY.md](../GLOSSARY.md) — Technical terms explained

---

## Getting Help

If you're stuck:

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
2. Review [FAQ.md](../FAQ.md) for answers
3. Open an issue on GitHub with:
   - Your operating system
   - The exact error message
   - What command you were running
   - Output of `node --version` and `claude --version`

Welcome to AI-powered development!
