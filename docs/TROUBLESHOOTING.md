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
