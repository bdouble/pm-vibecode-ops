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

**For complete official documentation, visit:**
👉 **[https://linear.app/docs/mcp](https://linear.app/docs/mcp)**

### Step 1: Install Linear MCP

Linear provides an **official remote MCP server** that is centrally hosted and managed. Authentication uses OAuth 2.1 with dynamic client registration.

**Method A: Using Claude Code CLI (Recommended)**

```bash
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```

Then run `/mcp` in a Claude Code session to authenticate via OAuth.

**Method B: Using Claude Desktop**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or equivalent:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]
    }
  }
}
```

**Method C: Using Cursor**

Install via [deeplink](cursor://anysphere.cursor-deeplink/mcp/install?name=Linear&config=eyJ1cmwiOiJodHRwczovL21jcC5saW5lYXIuYXBwL3NzZSJ9) or search "Linear" in MCP tools.

**Method D: Using VSCode/Windsurf/Zed**

Use the command configuration:
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]
    }
  }
}
```

### Step 2: Authenticate

The official Linear MCP server uses **OAuth 2.1 authentication** (no API key required in configuration files).

**For Claude Code:**
After installation, run:
```bash
claude
# Then in the session:
/mcp
```

Follow the OAuth prompts to authenticate with your Linear account.

**For Claude Desktop/Cursor/VSCode:**
Authentication happens automatically when you first use Linear tools. Follow the OAuth prompts in your browser.

**Troubleshooting Authentication:**
If you need to re-authenticate or clear auth cache:
```bash
rm -rf ~/.mcp-auth
```

### Step 3: Verify Connection

**For Claude Code:**
```bash
claude mcp list
```

You should see `linear-server` in the list of active servers.

**For Claude Desktop/Cursor:**
Test by asking Claude to list your Linear teams or projects.

### Alternative: Community MCP Servers (Advanced Users)

If you prefer community implementations or need API key-based authentication:

**Community server using API keys:**
```bash
# Get your Linear API key from: https://linear.app/settings/api

# Set environment variable
export LINEAR_API_KEY="lin_api_your_key_here"

# Install community server
claude mcp add --transport stdio linear npx -y @larryhudson/linear-mcp-server
```

**Note**: Community implementations may have different features and support levels. The official Linear MCP server is recommended for most users.

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

**For complete official documentation, visit:**
👉 **[https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking)**

**Official Package**: `@modelcontextprotocol/server-sequential-thinking` (maintained by Anthropic)

### How It Works

The Sequential Thinking tool enables:
- **Step-by-step reasoning**: Breaks down complex problems into manageable thoughts
- **Revision capability**: Can revise previous thoughts as understanding deepens
- **Branching**: Explore alternative reasoning paths
- **Dynamic planning**: Adjust total thought count as problem complexity becomes clear
- **Context preservation**: Maintains reasoning state across multiple steps

### Installation

The Sequential Thinking MCP server is available as an npm package and can be run locally without any API keys or authentication.

**Using Claude Code CLI (Recommended):**
```bash
claude mcp add sequential-thinking --scope user
```

**Using official package directly:**
```bash
claude mcp add --transport stdio sequential-thinking npx -y @modelcontextprotocol/server-sequential-thinking
```

**Using Docker:**
```bash
docker run --rm -i mcp/sequentialthinking
```

### Alternative: Manual Configuration

**For Claude Desktop (Mac/Linux) - NPX:**
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

**For Claude Desktop (Windows) - NPX:**
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

**For Claude Desktop (Mac/Linux/Windows) - Docker:**
```json
{
  "mcpServers": {
    "sequentialthinking": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "mcp/sequentialthinking"
      ]
    }
  }
}
```

**Note**: Set `DISABLE_THOUGHT_LOGGING` to `"true"` if you want to suppress thought logging for privacy or performance reasons. Docker configuration does not support environment variables in this format.

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
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]
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

**Note**: Linear MCP uses OAuth 2.1 authentication—no API key needed in configuration.

### Claude Desktop Configuration (Windows)

**File**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linear": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "mcp-remote", "https://mcp.linear.app/mcp"]
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

**Note**: Linear MCP uses OAuth 2.1 authentication—no API key needed in configuration.

### Claude Code Configuration (All Platforms)

**Recommended**: Use `claude mcp add` commands instead of manual configuration:

```bash
# Linear (OAuth-based, no API key needed)
claude mcp add --transport http linear-server https://mcp.linear.app/mcp

# Perplexity (requires API key)
claude mcp add perplexity --scope user

# Sequential Thinking (no API key needed)
claude mcp add sequential-thinking --scope user

# Playwright (no API key needed)
claude mcp add playwright --scope user
```

**Alternative: Manual Configuration File**

If you prefer manual configuration, edit `~/.claude.json`:

```json
{
  "mcpServers": {
    "linear-server": {
      "transport": "http",
      "url": "https://mcp.linear.app/mcp"
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

**Note**: Linear MCP uses OAuth 2.1 authentication—authenticate via `/mcp` command in Claude Code. No API key configuration required.

### Environment Variables Setup

Only Perplexity MCP requires an API key to be set as an environment variable. Linear uses OAuth authentication (no environment variable needed).

**Note**: Claude Code authentication is handled separately—you don't need to set an ANTHROPIC_API_KEY environment variable.

**Mac/Linux** (`~/.zshrc` or `~/.bashrc`):
```bash
# Perplexity API Key (required for Perplexity MCP)
export PERPLEXITY_API_KEY="pplx-your-perplexity-key"
```

**Windows** (run in PowerShell as Administrator):
```powershell
[Environment]::SetEnvironmentVariable("PERPLEXITY_API_KEY", "pplx-your-perplexity-key", "User")
```

**Linear Authentication**: Linear MCP uses OAuth 2.1. Authenticate via `/mcp` command in Claude Code or through browser prompts in Claude Desktop/Cursor.

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
```bash
claude
# Authenticate with Linear first:
/mcp

# Then ask:
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

Claude should use `mcp__sequential-thinking__sequentialthinking` for structured reasoning with step-by-step thought process, revisions, and dynamic planning.

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

3. **For Linear MCP, try testing the remote server**:
   ```bash
   curl https://mcp.linear.app/mcp
   ```
   Should return a response (not an error).

4. **Check authentication**:
   For Linear: Authenticate via `/mcp` in Claude Code or follow OAuth prompts.
   For Perplexity: Check environment variable:
   ```bash
   echo $PERPLEXITY_API_KEY
   ```
   Should show your key (starts with `pplx-`), not empty string.

### "Invalid API Key" Errors

**For Linear**:
Linear MCP uses OAuth 2.1 authentication, not API keys. If you see authentication errors:
- Clear auth cache: `rm -rf ~/.mcp-auth`
- Re-authenticate via `/mcp` command in Claude Code
- Ensure you have access to the Linear workspace
- Check that OAuth succeeded (you should see a browser confirmation)

**For Perplexity**:
- Verify key starts with `pplx-`
- Check for extra spaces when copying the key
- Verify your Perplexity account has API access enabled
- Ensure billing is set up if on paid tier

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

| MCP Server | Required? | Authentication | Official Package/Server | What It Does |
|------------|-----------|----------------|------------------------|--------------|
| Linear | **Yes** | OAuth 2.1 (no API key) | Official remote server: `https://mcp.linear.app/mcp` | Creates/manages tickets and projects |
| Perplexity | Recommended | API Key (`pplx-...`) | `@perplexity-ai/mcp-server` | Web search and deep research |
| Sequential Thinking | Recommended | None | `@modelcontextprotocol/server-sequential-thinking` | Enhanced multi-step reasoning |
| Playwright | Optional | None | `@playwright/mcp` | Browser automation and testing |

**Install command pattern**:
```bash
claude mcp add <server-name> --scope user
```

**Check status**:
```bash
claude mcp list
```

**Restart required**: After editing configuration files manually, restart Claude Desktop or Claude Code completely.
