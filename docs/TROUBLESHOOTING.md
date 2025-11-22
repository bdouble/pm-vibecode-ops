# Troubleshooting Guide

Quick solutions to common problems. If you're stuck, start here.

## Quick Fixes (Try These First)

Before diving into specific issues, try these universal fixes:

1. **Restart Claude Code** - Close and reopen the application
2. **Restart your terminal** - Close all terminal windows and open fresh
3. **Check your internet** - MCP servers need connectivity
4. **Verify API keys** - Run `echo $LINEAR_API_KEY` to check if set

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
1. Check your API key is set:
   ```bash
   echo $LINEAR_API_KEY
   ```
   Should show your key (starts with `lin_api_`)

2. Reinstall the server:
   ```bash
   claude mcp remove linear
   claude mcp add linear --scope user
   ```

3. Test directly:
   ```bash
   npx -y @modelcontextprotocol/server-linear
   ```
   If this fails, you'll see the actual error

### "Invalid API Key" Errors

- Check for extra spaces when you copied the key
- Verify the key in your Linear/Perplexity account settings
- Try generating a new key
- Make sure environment variable is exported (not just set):
  ```bash
  export LINEAR_API_KEY="your-key"  # Correct
  LINEAR_API_KEY="your-key"          # Wrong - not exported
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
1. Check commands are installed:
   ```bash
   ls ~/.claude/commands/
   ```
   Should show `.md` files

2. If empty, reinstall commands from the repository

3. Check file permissions:
   ```bash
   chmod 644 ~/.claude/commands/*.md
   ```

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

# Reinstall everything
npm install -g @anthropic-ai/claude-code
mkdir -p ~/.claude/commands ~/.claude/agents
# Then copy commands/agents from repository
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
echo $LINEAR_API_KEY | head -c 10  # Shows first 10 chars
echo $PERPLEXITY_API_KEY | head -c 10

# MCP status
claude mcp list

# Commands installed
ls ~/.claude/commands/

# Agents installed
ls ~/.claude/agents/
```

Copy-paste this output when asking for help.
