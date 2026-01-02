# Workflow Commands

This directory contains the workflow slash commands for PM Vibe Code Operations.

## How It Works

The workflow uses standard git branches:
1. Each ticket gets a feature branch (`feature/TICKET-123-description`)
2. You work on the branch until complete
3. Security review merges to main
4. Branch is cleaned up

```
main ─────────────────────────────────────────────▶
      ╲                                          ╱
       ╲──── feature/TICKET-123 ────────────────╱
```

## Context Window Best Practice

**Important:** Run each command in a separate, fresh Claude Code session.

After completing a command and reviewing its output, close Claude Code and start a new session for the next command. This prevents context overflow and ensures optimal performance for each phase.

**Why:**
- Each command generates substantial context (discovery findings, code analysis, etc.)
- Running multiple commands in one session can overflow your context window
- Fresh context = better performance and more accurate results

**Example:**
1. Open Claude Code → Run `/discovery` → Review → Close
2. Open new session → Run `/epic-planning` → Review → Close
3. Open new session → Run `/planning` → Continue...

All progress is saved in tickets, PRs, and code—starting fresh sessions doesn't lose work.

## Commands

| Command | Description |
|---------|-------------|
| `/generate_service_inventory` | Catalog existing codebase services |
| `/discovery` | Analyze patterns and architecture |
| `/epic-planning` | Create business-focused epics |
| `/planning` | Decompose epics into tickets |
| `/adaptation` | Create implementation guide for a ticket |
| `/implementation` | Write production code |
| `/testing` | Build and run test suite |
| `/documentation` | Generate docs |
| `/codereview` | Quality assessment |
| `/security_review` | Final gate - closes ticket |

**Remember:** Run each command in its own fresh session for best results.

## Installation

To use these commands in Claude Code:
1. Copy this `commands/` directory to your Claude Code commands location: `cp commands/*.md ~/.claude/commands/`
2. Or symlink it: `ln -s /path/to/pm-vibecode-ops/commands ~/.claude/commands`

Commands will be available as `/command-name` in Claude Code.
