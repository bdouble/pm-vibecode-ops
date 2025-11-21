# Worktree Mode Commands (Experimental)

This directory contains **experimental worktree-based workflow** commands for advanced concurrent development.

## When to Use Worktree Mode

- You need to work on multiple tickets simultaneously
- Your team has multiple AI agents working in parallel
- You're comfortable with git worktrees
- You want complete isolation between concurrent work

## How It Works

Worktree mode uses git worktrees for isolation:
1. Each ticket gets an isolated worktree in `.worktrees/TICKET-ID/`
2. Multiple tickets can be worked on simultaneously
3. Security review merges the worktree branch to main
4. Worktree is automatically cleaned up after merge

```
repo/                           # Main repository
├── .git/
├── src/
├── .worktrees/
│   ├── TICKET-101/            # Isolated worktree
│   │   ├── src/
│   │   └── ...
│   └── TICKET-102/            # Another isolated worktree
│       ├── src/
│       └── ...
```

## Benefits

| Without Worktrees | With Worktrees |
|-------------------|----------------|
| Work on 1 ticket at a time | Work on multiple tickets simultaneously |
| Agents conflict when working in parallel | Zero conflicts between concurrent work |
| Must wait for one ticket to finish | Start new tickets anytime |
| Complex branch switching | Each ticket is fully isolated |

## Context Window Best Practice

**Important:** Run each command in a separate, fresh Claude Code session.

Even with worktree isolation for files, each command should run in its own fresh Claude Code session to prevent context overflow and ensure optimal performance.

**Why:**
- Each workflow phase generates substantial context (analysis, findings, reports)
- Running multiple commands sequentially can overflow the context window
- Fresh context ensures each phase works with focused, relevant information

**Example workflow:**
1. Open Claude Code → Run `/adaptation TICKET-123` → Review → Close
2. Open new session → Run `/implementation TICKET-123` → Review → Close
3. Open new session → Run `/testing TICKET-123` → Continue...

The worktree isolation handles file conflicts; fresh sessions handle context management. Both work together for optimal results.

## Commands

| Command | Description |
|---------|-------------|
| `_worktree_helpers` | Shared worktree utility functions |
| `/generate_service_inventory` | Catalog existing codebase services |
| `/discovery` | Analyze patterns and architecture |
| `/epic-planning` | Create business-focused epics |
| `/planning` | Decompose epics into tickets |
| `/adaptation` | Create worktree + implementation guide |
| `/implementation` | Write code in isolated worktree |
| `/testing` | Build and run tests in worktree |
| `/documentation` | Generate docs in worktree |
| `/codereview` | Quality assessment in worktree |
| `/security_review` | Final gate - merges worktree, closes ticket |

**Remember:** Run each command in its own fresh session for best results.

## Additional Documentation

- [Worktree Guide](../../docs/WORKTREE_GUIDE.md) - Complete worktree reference
- [Migration Guide](../../docs/WORKTREE_MIGRATION_GUIDE.md) - Switching between modes

## Installation

To use these commands in Claude Code:
1. Copy this `commands-worktrees/` directory to your project's `.claude/commands/`
2. Or symlink it: `ln -s /path/to/pm-vibecode-ops/claude/commands-worktrees .claude/commands`

**Important**: Only use ONE mode at a time. Don't mix simple and worktree commands.

## Status: Experimental

This mode is experimental. We're still validating:
- Complex merge scenarios
- Edge cases in worktree cleanup
- Performance with many concurrent worktrees

Report issues and feedback to improve this workflow.
