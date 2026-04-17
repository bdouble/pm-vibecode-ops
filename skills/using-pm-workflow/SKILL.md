---
name: using-pm-workflow
description: Use when user says "what command do I run", "where do I start", "what's next", or is unsure which workflow phase to invoke. Also use when deciding between /execute-ticket vs individual phase commands, when starting a new project, or when user references epic vs ticket workflow.
---

# PM Workflow Router

Guides workflow phase selection. This skill does NOT enforce other skills — the Claude Code harness auto-lists every installed skill; invoke each via the Skill tool when its description matches.

## Workflow Overview

**Project-Level (run once per project):**
1. `/generate-service-inventory` — Catalog existing code
2. `/discovery` — Analyze patterns and architecture
3. `/epic-planning` — Create business-focused epics
4. `/planning` — Decompose into sub-tickets

**Ticket-Level (RECOMMENDED — Agentic Workflow):**
5. `/execute-ticket <ticket-id>` — Orchestrates all phases automatically (adaptation, implementation, testing, documentation, codereview, codex-review, security-review). Pauses only for blocking issues. Resumes from last completed phase if interrupted.

**Epic-Level (RECOMMENDED — Batch Workflow):**
- `/epic-swarm <epic-id>` — Sequentially runs `/execute-ticket` on every sub-ticket in dependency order, with worktree isolation.

**Ticket-Level (ADVANCED — Individual Phases):**
Use only when a specific phase needs manual control, rerun, or debugging:

| Phase | Command | Purpose |
|-------|---------|---------|
| 5a | `/adaptation` | Implementation guide |
| 6 | `/implementation` | Write production code |
| 7 | `/testing` | Build test suite |
| 8 | `/documentation` | Generate docs |
| 9 | `/codereview` | Quality review |
| 9b | `/codex-review` | Cross-model review |
| 10 | `/security-review` | OWASP assessment (closes tickets) |

**Epic-Level (after all tickets complete):**
11. `/close-epic` — Close epic with retrofit analysis

## Closure Rules

- **Only `/security-review` closes tickets** — marks ticket Done when no critical/high issues found.
- **`/execute-ticket` closes automatically** — runs security-review as final phase.
- **Only `/close-epic` closes epics** — all sub-tickets must be Done or Cancelled first.

## Session Management

- **One command per session** unless using `/execute-ticket` or `/epic-swarm` (they manage context internally).
- **Each phase spawns a fresh agent** via the Task/Agent tool, so orchestrator context stays lean.
- **Resume gracefully** — `/execute-ticket` detects completed phases from Linear comments and picks up where it left off.

## Quick Decision Tree

```
Starting a new project?          → /generate-service-inventory → /discovery → /epic-planning → /planning
Standard ticket to implement?    → /execute-ticket <ticket-id>
Whole epic ready to execute?     → /epic-swarm <epic-id>
Rerun one phase on a ticket?     → individual phase command (e.g., /testing <ticket-id>)
All tickets in an epic done?     → /close-epic <epic-id>
Unsure where to start?           → /generate-service-inventory → /discovery
```
