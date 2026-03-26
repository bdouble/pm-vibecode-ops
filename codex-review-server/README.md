# Codex Review MCP Server

An MCP server that gives Claude Code access to OpenAI's Codex models for cross-model code review. Uses Codex CLI with ChatGPT subscription authentication — no API key billing required.

## What It Does

- **`codex_review`** — Sends a code diff to GPT-5.3-Codex (or configured model) for adversarial bug detection, security analysis, and edge case identification
- **`codex_fix`** — Generates minimal, surgical fixes for specific findings

## Prerequisites

- Python 3.10+
- [Codex CLI](https://github.com/openai/codex) installed and authenticated
- A ChatGPT Plus or Pro subscription

```bash
brew install codex-cli
codex login
```

## Installation

```bash
# Clone
git clone https://github.com/bdouble/codex-review-server.git ~/.claude/mcp/codex-review-server

# Install dependencies
pip install -r ~/.claude/mcp/codex-review-server/requirements.txt

# Register with Claude Code
claude mcp add codex-review-server -- python3 ~/.claude/mcp/codex-review-server/server.py
```

## Configuration

All settings via environment variables (set in shell or `.claude/settings.json`):

| Variable | Default | Description |
|----------|---------|-------------|
| `CODEX_REVIEW_MODEL` | `gpt-5.3-codex` | OpenAI model ID (must start with `gpt-` or `o`) |
| `CODEX_REVIEW_REASONING` | `xhigh` | Reasoning effort: none, low, medium, high, xhigh |
| `CODEX_REVIEW_TIMEOUT` | `300` | Timeout in seconds per call |
| `CODEX_REVIEW_AUTO_FIX` | `false` | Auto-approve all findings without user interaction |
| `CODEX_REVIEW_MIN_SEVERITY` | `medium` | Minimum severity to report |
| `CODEX_REVIEW_FOCUS` | `all` | Focus: bugs, security, performance, all |

Example in `.claude/settings.json`:
```json
{
  "env": {
    "CODEX_REVIEW_MODEL": "gpt-5.3-codex",
    "CODEX_REVIEW_REASONING": "xhigh"
  }
}
```

## Usage

Once installed, Claude Code can call the tools directly:

```
Use codex_review to analyze this diff for bugs and security issues
```

Or use the `/codex-review` command from the [pm-vibecode-ops](https://github.com/bdouble/pm-vibecode-ops) workflow plugin for full Linear integration.

## How It Works

```
Claude Code → MCP stdio → server.py → codex exec subprocess → GPT response
```

The server runs Codex CLI in a subprocess with read-only sandbox mode. Authentication is handled by Codex CLI's stored credentials from `codex login` (ChatGPT subscription, not API key).

## Uninstall

```bash
claude mcp remove codex-review-server
rm -rf ~/.claude/mcp/codex-review-server
```
