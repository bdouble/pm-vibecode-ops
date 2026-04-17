# Troubleshooting Guide

Quick solutions to common problems. If you're stuck, start here.

## Quick Fixes (Try These First)

Before diving into specific issues, try these universal fixes:

1. **Restart Claude Code** - Close and reopen the application
2. **Restart your terminal** - Close all terminal windows and open fresh
3. **Check your internet** - MCP servers need connectivity
4. **Verify MCP authentication** - For Linear: authenticate via `/mcp` command. For Perplexity: check `echo $PERPLEXITY_API_KEY`

---

## Installation Issues

### "command not found: claude"

**Cause**: Claude Code isn't installed or not in your PATH

**Solutions**:
1. Reinstall Claude Code:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
2. If you get permission errors, use:
   ```bash
   sudo npm install -g @anthropic-ai/claude-code
   ```
3. Restart your terminal after installation

### "command not found: node" or "command not found: npm"

**Cause**: Node.js isn't installed

**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/) - download the LTS version

### Permission Denied Errors

**On Mac/Linux**:
```bash
sudo npm install -g @anthropic-ai/claude-code
```

**Better long-term fix**:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

---

## MCP Connection Issues

### Linear MCP Won't Connect

**Symptoms**: "Linear server not running" or can't create tickets

**Fixes**:
1. Authenticate with OAuth:
   ```bash
   claude
   # In Claude Code session:
   /mcp
   ```
   Follow the OAuth prompts to authenticate with Linear.

2. Clear authentication cache and retry:
   ```bash
   rm -rf ~/.mcp-auth
   ```
   Then authenticate again via `/mcp`.

3. Verify Linear MCP is installed:
   ```bash
   claude mcp list
   ```
   Should show `linear-server` in the list.

4. Reinstall if needed:
   ```bash
   claude mcp remove linear-server
   claude mcp add --transport http linear-server https://mcp.linear.app/mcp
   ```

5. Test the remote server:
   ```bash
   curl https://mcp.linear.app/mcp
   ```
   Should return a response (not an error).

### "Invalid API Key" Errors

**For Linear**:
Linear uses OAuth 2.1, not API keys. If you see authentication errors:
- Clear auth cache: `rm -rf ~/.mcp-auth`
- Re-authenticate via `/mcp` command in Claude Code
- Ensure you have access to the Linear workspace
- Verify OAuth succeeded (you should see browser confirmation)

**For Perplexity** (which does use API keys):
- Check for extra spaces when you copied the key
- Verify the key in your Perplexity account settings
- Try generating a new key
- Make sure environment variable is exported (not just set):
  ```bash
  export PERPLEXITY_API_KEY="your-key"  # Correct
  PERPLEXITY_API_KEY="your-key"          # Wrong - not exported
  ```

### MCP Servers Keep Disconnecting

1. Check your internet connection
2. Restart Claude Code
3. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

---

## Workflow Command Issues

### Slash Commands Not Appearing

**Symptoms**: `/epic-planning` or other commands don't show in help

**Fixes**:
1. Verify plugin is installed:
   ```bash
   /plugin list
   ```
   Should show `pm-vibecode-ops`

2. Reinstall the plugin:
   ```bash
   /plugin uninstall pm-vibecode-ops
   /plugin marketplace add bdouble/pm-vibecode-ops
   /plugin install pm-vibecode-ops@pm-vibecode-ops
   ```

3. Restart Claude Code (exit and start a new session)

### "Not a git repository" Error

**Cause**: Claude Code requires a git repo

**Fix**:
```bash
cd /path/to/your/project
git init
```

### Commands Run But Nothing Happens in Linear

1. Verify Linear MCP is connected:
   ```bash
   claude mcp list
   ```
   Should show `linear` as running

2. Check you have access to the Linear project
3. Try a simple test: ask Claude to list your Linear teams

---

## Common Error Messages

### "Rate limit exceeded"

**Cause**: Too many API requests

**Fix**: Wait 1-2 minutes and try again. Consider upgrading your API plan if this happens frequently.

### "Context length exceeded"

**Cause**: Too much information for one request

**Fix**:
- Use `/clear` to reset conversation
- Break large tasks into smaller steps
- Focus on one ticket at a time

### "Tool not found: mcp__linear-server__..."

**Cause**: Linear MCP not properly configured

**Fix**: See [MCP Setup Guide](MCP_SETUP.md) and reinstall Linear MCP

---

## Windows-Specific Issues

### MCP Servers Don't Start

Ensure your config uses Windows format:
```json
{
  "command": "cmd",
  "args": ["/c", "npx", "-y", "package-name"]
}
```

### Environment Variables Not Working

Set them via System Properties:
1. Search "Environment Variables" in Windows
2. Add under "User variables"
3. Restart all terminals

### Path Issues

Use full paths or ensure npm global bin is in PATH:
```powershell
$env:PATH += ";$env:APPDATA\npm"
```

---

## When Nothing Else Works

### Nuclear Reset

If everything is broken, start fresh:

```bash
# Remove Claude Code
npm uninstall -g @anthropic-ai/claude-code

# Remove config (backup first if needed)
rm -rf ~/.claude

# Remove MCP config
rm ~/Library/Application\ Support/Claude/claude_desktop_config.json  # Mac
# or
rm ~/.config/claude/claude_desktop_config.json  # Linux

# Reinstall Claude Code
npm install -g @anthropic-ai/claude-code

# Start Claude Code and reinstall the plugin
claude
/plugin marketplace add bdouble/pm-vibecode-ops
/plugin install pm-vibecode-ops@pm-vibecode-ops
```

### Getting Help

If you're still stuck:

1. **Search existing issues** on GitHub
2. **Open a new issue** with:
   - Your operating system (Mac/Windows/Linux)
   - Node version: `node --version`
   - Claude Code version: `claude --version`
   - Exact error message
   - What command you were running
3. **Check the FAQ**: [FAQ.md](../FAQ.md)

---

## Quick Diagnostic Commands

Run these to gather info for troubleshooting:

```bash
# System info
node --version
npm --version
git --version
claude --version

# MCP Environment Variables
# Note: Linear uses OAuth (no API key needed)
echo $PERPLEXITY_API_KEY | head -c 10  # Shows first 10 chars

# MCP status
claude mcp list

# Plugin status (in Claude Code session)
/plugin list
```

Copy-paste this output when asking for help.

---

## External Hook & Settings Issues (discovered during Opus 4.7 regression analysis)

These are **outside this repo** — they live in your personal `~/.claude/` configuration and your target project's `.claude/` directory. They interact with epic-swarm runs in subtle ways and can cause the "extreme permission prompts" and silent hook failures the workflow is sensitive to.

### Issue: Prompt-based Bash hook adds 1–3s latency to every shell call

**Symptom:** `epic-swarm` feels like it is pausing mid-run on every Bash call, even though the JSONL transcript shows no rejection events.

**Root cause:** A `PreToolUse` Bash hook in `~/.claude/settings.json` with `"type": "prompt"` spawns an LLM evaluation for every Bash command (commonly used to block patterns like `sed -i`). Under `/effort xhigh` this prompt-hook penalty compounds across thousands of Bash calls in a long swarm run.

**Fix:** In `~/.claude/settings.json`, change the hook `type` from `"prompt"` to `"command"` and point it at a small shell script that does the check in ~50ms instead of a multi-second LLM call. Example:

```bash
#!/usr/bin/env bash
# ~/.claude/hooks/block-sed-inplace.sh
cmd=$(jq -r '.tool_input.command // ""')
if echo "$cmd" | grep -qE '(^|[^a-zA-Z_-])sed\s+(-[a-zA-Z]*i|--in-place)'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "sed -i is blocked. Use Edit or Write instead."
    }
  }'
fi
exit 0
```

Then in `settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "$HOME/.claude/hooks/block-sed-inplace.sh" }]
    }]
  }
}
```

### Issue: Project-local hooks fail schema validation and silently bypass

**Symptom:** A hook you wrote to deny a specific command (e.g., `biome check`) appears to work, but during swarm runs the command runs anyway, then the session log shows a `hook_non_blocking_error` with `"Hook JSON output validation failed — hookSpecificOutput is missing required field 'hookEventName'"`.

**Root cause:** The hook's JSON output is missing `hookEventName` inside `hookSpecificOutput`. Claude Code rejects the response and treats the hook as a non-blocking error, so the permission decision is discarded.

**Fix:** Every hook script that emits `hookSpecificOutput` must include `hookEventName`. Example for a PreToolUse Bash hook:

```bash
#!/usr/bin/env bash
jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "Direct biome commands are blocked. Use pnpm lint."
  }
}'
```

Validate a hook by running it manually and piping the output to `jq .` — if it parses, it will likely validate against the Claude Code schema. If it shows up in your session transcript as `hook_non_blocking_error`, something is wrong.

### Issue: Slash command narrows the Bash allowlist and triggers interactive prompts

**Symptom:** A command like `/epic-swarm` runs dozens of `pnpm`, `npx`, `cd`, `mkdir` commands and each one pops an interactive approval prompt — even though your global `~/.claude/settings.json` has `Bash(pnpm:*)` and friends in its `permissions.allow` list.

**Root cause:** The slash command's `allowed-tools` frontmatter REPLACES the session-scope Bash allowlist for the duration of the command. Any Bash subcommand not listed in `allowed-tools` prompts. This is visible in the session JSONL as a `command_permissions` attachment near the start of the session.

**Fix (this repo):** `commands/epic-swarm.md` and `commands/execute-ticket.md` were updated in v4.4.0 to include a generous Bash allowlist (pnpm, npx, cd, mkdir, chmod, docker, etc.) in their `allowed-tools` frontmatter. If you see the same symptom in a command you've authored locally, audit its frontmatter and add the missing `Bash(<tool>:*)` entries.

**Diagnostic:** grep the session transcript for `command_permissions`:
```bash
jq -c 'select(.type == "attachment" and .attachmentType == "command_permissions")' \
  ~/.claude/projects/*/*.jsonl | head -3
```
The listed tools are the actual session allowlist. If `Bash(pnpm:*)` isn't there, add it to the command's frontmatter.
