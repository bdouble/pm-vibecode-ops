# MCP Server Setup Guide

This guide walks you through setting up the Model Context Protocol (MCP) servers required for this workflow. MCP allows Claude Code to interact with external services like Linear, perform web searches, and use enhanced reasoning.

## Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [Required: Linear MCP](#required-linear-mcp)
3. [Recommended: Perplexity MCP](#recommended-perplexity-mcp)
4. [Recommended: Sequential Thinking MCP](#recommended-sequential-thinking-mcp)
5. [Optional: Playwright MCP](#optional-playwright-mcp)
6. [Complete Configuration Example](#complete-configuration-example)
7. [Verification and Testing](#verification-and-testing)
8. [Troubleshooting](#troubleshooting)

---

## What is MCP?

**Model Context Protocol (MCP)** is an open standard protocol developed by Anthropic that enables AI applications to connect with external tools, services, and data sources through a standardized interface. Think of it like installing extensions in your browser—each MCP server gives AI assistants new capabilities.

**Without MCP servers**, Claude Code can read/write files and run terminal commands locally.

**With MCP servers**, Claude Code can:
- Create and manage Linear tickets and projects
- Search the web for current information (via Perplexity)
- Use enhanced reasoning for complex, multi-step problems
- Control a web browser for automated testing (via Playwright)
- Access remote data sources, APIs, and specialized tools

### How MCP Works

MCP uses a client-server architecture with three key components:

1. **Host**: The AI application (e.g., Claude Desktop, Claude Code, VS Code)
2. **Client**: The connector within the host that communicates via MCP protocol
3. **Server**: The service providing capabilities (tools, resources, prompts)

```
You → Claude Code (Host + Client) → MCP Server → External Service
                                          ↓
                                    Linear, Perplexity, etc.
```

MCP servers communicate using JSON-RPC message format through either:
- **stdio transport**: Local processes communicating via standard input/output (most common)
- **HTTP/SSE transport**: Remote servers accessible over the network

When you run a command like `/epic-planning`, Claude Code uses the Linear MCP server to create tickets directly in Linear through authenticated API calls.

### Platform Support

**MCP is supported by**:
- ✅ **Claude Desktop** - Official support via configuration files
- ✅ **Claude Code CLI** - Official support via `claude mcp add` command
- ✅ **VS Code** - Via MCP extension and workspace configuration
- ✅ **Cursor IDE** - Native MCP support through settings
- ✅ **OpenAI API** - Remote MCP servers via Responses API (as of November 2025)
- ✅ **Cline** - VS Code extension with MCP integration

**MCP is NOT directly supported in**:
- ❌ **Claude.ai (web interface)** - Does not support local MCP servers (use Claude Desktop or Claude Code instead)
- ❌ **ChatGPT web interface** - OpenAI only supports MCP via API, not web UI

---

## Required: Linear MCP

Linear MCP is **required** for this workflow. It allows Claude Code to create and manage issues, projects, and comments in Linear.

### Step 1: Get Your Linear API Key

1. Log in to [Linear](https://linear.app)
2. Click your profile icon (bottom left)
3. Go to **Settings** → **API**
4. Click **Create Key**
5. Give it a name like "Claude Code"
6. Copy the key (starts with `lin_api_...`)

**Important**: Save this key securely. You won't be able to see it again.

### Step 2: Set the Environment Variable

**On Mac/Linux:**
```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export LINEAR_API_KEY="lin_api_your_key_here"

# Reload your profile
source ~/.zshrc
```

**On Windows (PowerShell):**
```powershell
[Environment]::SetEnvironmentVariable("LINEAR_API_KEY", "lin_api_your_key_here", "User")
# Restart PowerShell
```

### Step 3: Install Linear MCP

**Method A: Using Claude Code CLI (Recommended)**

```bash
claude mcp add linear --scope user
```

When prompted, confirm the installation. This will automatically configure the Linear MCP server for Claude Code.

**Method B: Using Official Linear Remote Server**

Linear provides an official remote MCP server (as of 2025) that doesn't require local installation:

For Claude Desktop config:
```json
{
  "mcpServers": {
    "linear": {
      "url": "https://mcp.linear.app/sse",
      "transport": "sse",
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

**Method C: Community Implementation (Alternative)**

Using the community-maintained package:
```bash
claude mcp add --transport stdio linear npx -y @larryhudson/linear-mcp-server
```

### Step 4: Verify Connection

```bash
# Check MCP status
claude mcp list
```

You should see `linear` in the list of active servers with status "running".

### Alternative: Manual Configuration

If automatic installation doesn't work, you can configure manually.

**Configuration file locations:**
- **Mac (Claude Desktop)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows (Claude Desktop)**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux (Claude Desktop)**: `~/.config/claude/claude_desktop_config.json`
- **Claude Code**: `~/.claude.json`

**For Claude Desktop (Mac/Linux):**

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-linear"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

**For Claude Desktop (Windows):**
```json
{
  "mcpServers": {
    "linear": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-linear"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

**For Claude Code (all platforms):**
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-linear"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

**Note**: After editing configuration files, you must restart Claude Desktop or Claude Code for changes to take effect.

---

## Recommended: Perplexity MCP

Perplexity MCP allows Claude Code to search the web for current information and perform deep research. This is valuable when:
- Researching best practices during discovery
- Looking up framework documentation
- Finding solutions to common problems
- Conducting comprehensive analysis on complex topics

### Step 1: Get Your Perplexity API Key

1. Go to [Perplexity API Platform](https://www.perplexity.ai/api-platform)
2. Create an account or log in
3. Navigate to API keys in your account settings
4. Generate an API key
5. Copy the key (starts with `pplx-`)

**Official Package**: `@perplexity-ai/mcp-server` (maintained by Perplexity AI)

### Pricing Information (as of 2025)

Perplexity uses token-based and request-based pricing:

**Search API**:
- $5.00 per 1,000 requests (no token costs)

**Sonar Models** (with token-based pricing):
- **Sonar**: $1/M input tokens, $1/M output tokens
- **Sonar Pro**: $3/M input tokens, $15/M output tokens
- **Sonar Reasoning**: $1/M input tokens, $5/M output tokens
- **Sonar Reasoning Pro**: $2/M input tokens, $8/M output tokens

**Sonar Deep Research** (comprehensive research):
- $2/M input tokens
- $8/M output tokens
- $2/M citation tokens
- $5 per 1,000 search queries
- $3/M reasoning tokens

**Typical Usage**:
- Simple search query: ~$0.006 per query
- Deep research query: ~$0.40 per query
- Typical PM workflow: $10-30/month for regular use

### Step 2: Set the Environment Variable

**On Mac/Linux:**
```bash
export PERPLEXITY_API_KEY="pplx-your-key-here"
```

Add to your shell profile (`~/.zshrc` or `~/.bashrc`) for permanence.

**On Windows:**
```powershell
[Environment]::SetEnvironmentVariable("PERPLEXITY_API_KEY", "pplx-your-key-here", "User")
```

### Step 3: Install Perplexity MCP

**Using Claude Code CLI:**
```bash
claude mcp add perplexity --scope user
```

**Using official package directly:**
```bash
claude mcp add --transport stdio perplexity npx -y @perplexity-ai/mcp-server
```

### Alternative: Manual Configuration

**For Claude Desktop (Mac/Linux):**
```json
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@perplexity-ai/mcp-server"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}",
        "PERPLEXITY_TIMEOUT_MS": "600000"
      }
    }
  }
}
```

**For Claude Desktop (Windows):**
```json
{
  "mcpServers": {
    "perplexity": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@perplexity-ai/mcp-server"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}",
        "PERPLEXITY_TIMEOUT_MS": "600000"
      }
    }
  }
}
```

**Note**: The `PERPLEXITY_TIMEOUT_MS` setting (5 minutes) allows for deep research queries that take longer to complete.

---

## Recommended: Sequential Thinking MCP

Sequential Thinking MCP enhances Claude's reasoning for complex, multi-step problems by providing structured, iterative problem-solving capabilities. It's particularly useful during:
- Architecture planning in `/discovery`
- Complex bug analysis in `/implementation`
- Security reasoning in `/security_review`
- Multi-step technical decomposition in `/planning`

**No API key required** — this runs locally.

**Official Package**: `@modelcontextprotocol/server-sequential-thinking` (maintained by Anthropic)

### How It Works

The Sequential Thinking tool enables:
- **Step-by-step reasoning**: Breaks down complex problems into manageable thoughts
- **Revision capability**: Can revise previous thoughts as understanding deepens
- **Branching**: Explore alternative reasoning paths
- **Dynamic planning**: Adjust total thought count as problem complexity becomes clear
- **Context preservation**: Maintains reasoning state across multiple steps

### Installation

**Using Claude Code CLI:**
```bash
claude mcp add sequential-thinking --scope user
```

**Using official package directly:**
```bash
claude mcp add --transport stdio sequential-thinking npx -y @modelcontextprotocol/server-sequential-thinking
```

### Alternative: Manual Configuration

**For Claude Desktop (Mac/Linux):**
```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {
        "DISABLE_THOUGHT_LOGGING": "false"
      }
    }
  }
}
```

**For Claude Desktop (Windows):**
```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {
        "DISABLE_THOUGHT_LOGGING": "false"
      }
    }
  }
}
```

**Note**: Set `DISABLE_THOUGHT_LOGGING` to `"true"` if you want to suppress thought logging for privacy or performance reasons.

---

## Optional: Playwright MCP

Playwright MCP allows Claude Code to control a web browser for automated testing, visual testing, and E2E testing. It revolutionizes browser automation by providing AI systems with semantic accessibility information rather than raw screenshots.

**Official Package**: `@playwright/mcp` (maintained by Microsoft)

### Key Capabilities

- **Browser automation**: Click, fill forms, navigate, interact with web elements
- **Accessibility-based interaction**: Uses semantic element descriptions (roles, labels) instead of screenshots
- **Test generation**: Generate automated tests from natural language descriptions
- **Visual testing**: Take screenshots and PDFs
- **Multi-browser support**: Chromium, Firefox, WebKit
- **File upload handling**: Automate file upload scenarios

### When to Install

**Install if:**
- Your project has a web UI that needs testing
- You want automated E2E or visual regression testing
- You're building user-facing features requiring browser verification
- You need to generate test suites from requirements

**Skip if:**
- You're building backend-only services
- You don't need E2E testing
- You prefer manual browser testing exclusively

### Installation

**Using Claude Code CLI:**
```bash
claude mcp add playwright --scope user
```

**Using official package with isolated browser profile:**
```bash
claude mcp add --transport stdio playwright npx @playwright/mcp@latest -- --isolated
```

**Using persistent browser state:**
```bash
claude mcp add --transport stdio playwright npx @playwright/mcp@latest -- --isolated --storage-state=/path/to/storage.json
```

### Alternative: Manual Configuration

**For Claude Desktop (Mac/Linux) - Isolated Mode:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--isolated"]
    }
  }
}
```

**For Claude Desktop (Windows) - Isolated Mode:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "@playwright/mcp@latest", "--isolated"]
    }
  }
}
```

**For Docker Deployment (Headless Only):**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--init",
        "--pull=always",
        "mcr.microsoft.com/playwright/mcp"
      ]
    }
  }
}
```

### First-Time Setup

After installing Playwright MCP, you may need to install browser binaries:

```bash
# This may happen automatically, or you can run:
npx playwright install
```

**Note**: The `--isolated` flag creates a fresh browser profile for each session, ensuring clean test environments.

---

## Complete Configuration Example

Here's a complete config file with all recommended MCP servers:

### Claude Desktop Configuration (Mac/Linux)

**File**: `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `~/.config/claude/claude_desktop_config.json` (Linux)

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-linear"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    },
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@perplexity-ai/mcp-server"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}",
        "PERPLEXITY_TIMEOUT_MS": "600000"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {
        "DISABLE_THOUGHT_LOGGING": "false"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--isolated"]
    }
  }
}
```

### Claude Desktop Configuration (Windows)

**File**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linear": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-linear"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    },
    "perplexity": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@perplexity-ai/mcp-server"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}",
        "PERPLEXITY_TIMEOUT_MS": "600000"
      }
    },
    "sequential-thinking": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {
        "DISABLE_THOUGHT_LOGGING": "false"
      }
    },
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "@playwright/mcp@latest", "--isolated"]
    }
  }
}
```

### Claude Code Configuration (All Platforms)

**File**: `~/.claude.json`

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-linear"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    },
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@perplexity-ai/mcp-server"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}",
        "PERPLEXITY_TIMEOUT_MS": "600000"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {
        "DISABLE_THOUGHT_LOGGING": "false"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--isolated"]
    }
  }
}
```

**Note for Windows users running Claude Code**: The Claude Code CLI handles Windows command wrapping automatically, so you don't need `cmd /c` in the `~/.claude.json` file.

### Environment Variables Setup

Create or update your shell profile with the required MCP server API keys.

**Note**: Claude Code authentication is handled separately—you don't need to set an ANTHROPIC_API_KEY environment variable.

**Mac/Linux** (`~/.zshrc` or `~/.bashrc`):
```bash
# MCP Server API Keys
export LINEAR_API_KEY="lin_api_your-linear-key"
export PERPLEXITY_API_KEY="pplx-your-perplexity-key"
```

**Windows** (run in PowerShell as Administrator):
```powershell
[Environment]::SetEnvironmentVariable("LINEAR_API_KEY", "lin_api_your-linear-key", "User")
[Environment]::SetEnvironmentVariable("PERPLEXITY_API_KEY", "pplx-your-perplexity-key", "User")
```

---

## Verification and Testing

After setting up MCP servers, verify everything works:

### Step 1: Check MCP Server Status

```bash
claude mcp list
```

Expected output:
```
Active MCP Servers:
- linear (running)
- perplexity (running)
- sequential-thinking (running)
- playwright (running)
```

### Step 2: Test Linear Connection

Start Claude Code and run:
```
Can you list my Linear teams?
```

Claude should use `mcp__linear-server__list_teams` and show your Linear teams.

### Step 3: Test Perplexity Connection

```
Search the web for "best practices for REST API design 2024"
```

Claude should use `mcp__perplexity__search` and return current information.

### Step 4: Test Sequential Thinking

```
Think through the architectural implications of adding real-time notifications to a monolithic application.
```

Claude should use `mcp__sequential-thinking__sequentialthinking` for structured reasoning.

---

## Troubleshooting

### MCP Server Won't Start

**Symptoms**: Server shows as "not running" or "error" in `claude mcp list`

**Solutions**:

1. **Check Node.js is installed**:
   ```bash
   node --version
   ```
   Must be v18 or higher.

2. **Clear npx cache**:
   ```bash
   npx clear-npx-cache
   ```

3. **Try manual npx run**:
   ```bash
   npx -y @modelcontextprotocol/server-linear
   ```
   This should start the server. If it fails, you'll see the actual error.

4. **Check environment variables**:
   ```bash
   echo $LINEAR_API_KEY
   echo $PERPLEXITY_API_KEY
   ```
   Should show your keys, not empty strings.

### "Invalid API Key" Errors

**For Linear**:
- Verify key starts with `lin_api_`
- Check for extra spaces when copying
- Try generating a new key

**For Perplexity**:
- Verify key starts with `pplx-`
- Check your Perplexity account has API access enabled
- Verify billing is set up if on paid tier

### Windows-Specific Issues

**Problem**: MCP servers don't start on Windows

**Solution**: Ensure you're using the Windows-specific config format with `cmd /c npx`:
```json
{
  "command": "cmd",
  "args": ["/c", "npx", "-y", "package-name"]
}
```

**Problem**: Environment variables not recognized

**Solution**:
1. Set variables using System Properties (not just PowerShell export)
2. Restart your terminal completely
3. Verify with `echo $env:LINEAR_API_KEY` in PowerShell

### Config File Not Found

If Claude Code can't find your config:

1. **Find the correct path**:
   ```bash
   # Mac
   ls ~/Library/Application\ Support/Claude/

   # Linux
   ls ~/.config/claude/

   # Windows (PowerShell)
   dir $env:APPDATA\Claude\
   ```

2. **Create the directory and file if missing**:
   ```bash
   # Mac
   mkdir -p ~/Library/Application\ Support/Claude
   touch ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

### Servers Disconnect Randomly

**Cause**: Network issues or server timeouts

**Solutions**:
1. Restart Claude Code
2. Check your internet connection
3. Verify API keys haven't expired
4. Try reinstalling the problematic server:
   ```bash
   claude mcp remove linear
   claude mcp add linear --scope user
   ```

---

## Security Best Practices

### API Key Safety

1. **Never commit keys to git**:
   - Add `.env` to `.gitignore`
   - Use environment variables, not hardcoded values

2. **Use scoped keys when possible**:
   - Linear keys can be scoped to specific teams
   - Create dedicated keys for Claude Code

3. **Rotate keys periodically**:
   - Every 90 days for production use
   - Immediately if you suspect exposure

### Principle of Least Privilege

Only install the MCP servers you need:
- **Always needed**: Linear
- **Usually helpful**: Perplexity, Sequential Thinking
- **Only if needed**: Playwright

### Audit Usage

Periodically review:
- Linear API key usage in Linear settings
- Perplexity API costs in your account

---

## Next Steps

With MCP servers configured:

1. **Return to the main guide** — See [PM_GUIDE.md](../PM_GUIDE.md) for workflow instructions

2. **Run your first discovery** — Test that Linear integration works

3. **Review troubleshooting** — See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if you encounter issues

---

## MCP Architecture and Transport Types

### Transport Mechanisms

MCP servers communicate via two main transport types:

#### stdio Transport (Most Common)
- **How it works**: MCP server runs as a local process, communicating via standard input/output
- **Best for**: Local tools, filesystem access, local databases
- **Security**: Process is isolated to the client that launched it
- **Example**: Sequential Thinking, local Linear MCP server

#### HTTP/SSE Transport
- **How it works**: MCP server runs as a remote HTTP endpoint with Server-Sent Events
- **Best for**: Remote services, shared resources, cloud-hosted tools
- **Security**: Requires authentication (typically OAuth 2.1 or Bearer tokens)
- **Example**: Linear official remote server (mcp.linear.app/sse)

### Configuration Hierarchy

MCP configuration follows a priority order (highest to lowest):

1. **Enterprise managed policies**: `/Library/Application Support/ClaudeCode/managed-mcp.json` (Mac) or `C:\ProgramData\ClaudeCode\managed-mcp.json` (Windows)
2. **Command-line arguments**: Temporary overrides for specific sessions
3. **Local project settings**: `.claude/settings.local.json` (per-machine within project)
4. **Shared project settings**: `.claude/settings.json` (team-wide, version controlled)
5. **User settings**: `~/.claude/settings.json` or `~/.claude.json` (personal defaults)

More specific configurations always override global defaults.

---

## Platform Support Matrix

| Platform | MCP Support | Configuration Method | Config File Location |
|----------|-------------|---------------------|---------------------|
| **Claude Desktop** | ✅ Full | JSON configuration | `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)<br>`%APPDATA%\Claude\claude_desktop_config.json` (Windows)<br>`~/.config/claude/claude_desktop_config.json` (Linux) |
| **Claude Code CLI** | ✅ Full | `claude mcp add` command or JSON | `~/.claude.json` |
| **Claude Web (claude.ai)** | ❌ No | N/A | Does not support local MCP servers |
| **VS Code** | ✅ Full | MCP extension + workspace config | `.vscode/mcp.json` |
| **Cursor IDE** | ✅ Full | Settings UI or JSON config | `~/.cursor/mcp.json` or project `.mcp.json` |
| **Cline (VS Code Extension)** | ✅ Full | Extension settings | Via Cline extension configuration |
| **OpenAI API (Responses API)** | ✅ Remote only | API request inline | No config file (specified per API call) |
| **ChatGPT Web** | ❌ No | N/A | Not supported |

### Key Takeaways

- **For local development**: Use Claude Desktop or Claude Code CLI
- **For team collaboration**: Use VS Code or Cursor with version-controlled `.mcp.json`
- **For web-based usage**: Claude.ai does NOT support MCP—use Claude Desktop instead
- **For OpenAI integration**: Use Responses API with remote MCP servers only

---

## Quick Reference

| MCP Server | Required? | API Key Needed? | Official Package | What It Does |
|------------|-----------|-----------------|------------------|--------------|
| Linear | **Yes** | Yes (`lin_api_...`) | `@modelcontextprotocol/server-linear` | Creates/manages tickets and projects |
| Perplexity | Recommended | Yes (`pplx-...`) | `@perplexity-ai/mcp-server` | Web search and deep research |
| Sequential Thinking | Recommended | No | `@modelcontextprotocol/server-sequential-thinking` | Enhanced multi-step reasoning |
| Playwright | Optional | No | `@playwright/mcp` | Browser automation and testing |

**Install command pattern**:
```bash
claude mcp add <server-name> --scope user
```

**Check status**:
```bash
claude mcp list
```

**Restart required**: After editing configuration files manually, restart Claude Desktop or Claude Code completely.
