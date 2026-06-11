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
| `/generate-service-inventory` | Catalog existing codebase services |
| `/discovery` | Analyze patterns and architecture (incl. doc-truth verification of project memory) |
| `/epic-planning` | Create business-focused epics |
| `/planning` | Decompose epics into tickets (convention tickets get their guard written into the ACs) |
| `/execute-ticket` | Orchestrate all ticket phases automatically (recommended) |
| `/epic-swarm` | Run every ticket in an epic sequentially with checkpoints |
| `/epic-swarm-workflow` | Run the epic pipeline as a dynamic workflow (right-sized tiers) |
| `/adaptation` | Create implementation guide for a ticket |
| `/implementation` | Write production code |
| `/testing` | Build and run test suite |
| `/documentation` | Generate docs |
| `/codereview` | Quality assessment (incl. Convention Guard Verification) |
| `/codex-review` | Cross-model adversarial review |
| `/security-review` | Final gate - closes ticket |
| `/close-epic` | Close completed epic (Convention Guard Audit + prose pruning + follow-up discipline) |
| `/swarm-stats` | Observability dashboard (incl. Discipline Debt section) |
| `/entropy-audit` | Recurring cross-epic health audit with machine-diffable scorecard |

**Remember:** Run each command in its own fresh session for best results.

## Installation

**Plugin Installation (Recommended)**:
```bash
# Add the marketplace
/plugin marketplace add bdouble/pm-vibecode-ops

# Install from marketplace
/plugin install pm-vibecode-ops@pm-vibecode-ops
```

This automatically installs all commands, agents, skills, and hooks.

**Manual Installation (Not Recommended)**:
```bash
mkdir -p ~/.claude/commands
cp commands/*.md ~/.claude/commands/
```

Commands will be available as `/command-name` in Claude Code.
