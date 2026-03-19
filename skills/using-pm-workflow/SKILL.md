---
name: using-pm-workflow
description: |
  This skill should be used when guiding users through PM workflow phases and command sequence. Activate when:
  - User says: "what command", "which phase", "where do I start", "what's next", "workflow"
  - User says: "new project", "new session", "help me plan", "kick off", "get started"
  - User asks: "how do I use this", "what are the commands", "workflow overview"
  - User mentions: /discovery, /planning, /adaptation, /implementation, /testing, /codereview
  - Session start or context switch between project-level and ticket-level work

  Provides workflow sequence guidance (discovery → epic-planning → planning → adaptation →
  implementation → testing → documentation → codereview → security-review). Ensures skills load.
---

# PM Workflow Bootstrap

This skill establishes the foundational behavior for all PM workflow sessions.

**CRITICAL — BEFORE responding to ANY request (including clarifying questions):**

1. Review the applicable skills
2. Identify which skills apply to the current context
3. Load and follow those skills' guidance
4. THEN proceed with the response

## Workflow Overview

**Project-Level (run once per project):**
1. `/generate-service-inventory` - Catalog existing code
2. `/discovery` - Analyze patterns and architecture
3. `/epic-planning` - Create business-focused epics
4. `/planning` - Decompose into sub-tickets

**Ticket-Level (run per ticket):**

**RECOMMENDED — Agentic Workflow:**
5. `/execute-ticket <ticket-id>` - Orchestrate ALL 6 phases automatically (adaptation, implementation, testing, documentation, codereview, security-review). Pauses only for blocking issues requiring user decision. Resumes from the last completed phase if interrupted. This is the standard approach for most tickets.

**ADVANCED — Individual Phases:**
Use individual commands only when specific phases need manual control, reruns, or debugging:

| Phase | Command | Purpose |
|-------|---------|---------|
| 5a | `/adaptation` | Implementation guide |
| 6 | `/implementation` | Write production code |
| 7 | `/testing` | Build test suite |
| 8 | `/documentation` | Generate docs |
| 9 | `/codereview` | Quality review |
| 10 | `/security-review` | OWASP assessment (closes tickets) |

**Epic-Level (after all tickets complete):**
11. `/close-epic` - Close epic with retrofit analysis

## Choosing Your Workflow

### Use `/execute-ticket` (Recommended) When:
- Working through a standard ticket from start to finish
- Ticket has clear acceptance criteria and a defined scope
- No need to pause between phases for external review or manual intervention
- First time implementing a ticket (the command handles the full sequence)

**Benefits:** Single command for all 6 phases, automatic resume on interruption, consistent phase reports posted to Linear, branch and PR management handled automatically.

### Use Individual Phase Commands When:
- Rerunning a single phase after fixing issues (e.g., `/testing` after code changes)
- Debugging a specific phase that produced unexpected results
- Skipping or reordering phases intentionally (rare, requires justification)
- Onboarding or learning the workflow step-by-step
- Working on a ticket type that only needs certain phases (e.g., docs-only tickets)

### Decision Quick Reference

```
Standard ticket?
  → /execute-ticket <ticket-id>

Need to rerun just one phase?
  → Use the individual phase command (e.g., /testing <ticket-id>)

Debugging a phase failure?
  → Use the individual phase command with additional context

Docs-only or config-only ticket?
  → /adaptation → /implementation → /security-review (skip testing/docs phases)
```

## Session Management

Each workflow command operates best in a fresh Claude session to maximize available context:

- **One command per session** — avoid running `/implementation` and `/testing` in the same session unless using `/execute-ticket` (which manages context internally)
- **Start fresh after compaction** — if the session compacts, start a new session for the next phase
- **`/execute-ticket` manages its own context** — each phase spawns a fresh agent via the Task tool, so context is managed automatically across all 6 phases
- **Resume gracefully** — `/execute-ticket` detects completed phases from Linear comments and resumes from the last incomplete phase, so interruptions do not lose progress
- **Context window matters** — models with 1M token context run all phases with full verbatim reports; smaller context windows trigger budget mode with condensed extracts

## Ticket Closure Rules

Understanding which commands close tickets prevents premature or missed closures:

- **Only `/security-review` closes tickets** — marks the ticket as Done when no critical/high severity issues are found
- **`/execute-ticket` closes tickets automatically** — because it runs `/security-review` as its final phase
- Documentation, code review, testing, and implementation phases do NOT close tickets
- Tickets remain In Progress until security review completes successfully
- If security review finds critical/high issues, the ticket stays In Progress and blocks until issues are resolved

## Epic Closure Rules

- **Only `/close-epic` closes epics** — marks the epic as Done when all sub-tickets are Done or Cancelled
- `/close-epic` performs retrofit analysis and creates follow-up tickets for improvements discovered during implementation
- Verify all sub-tickets passed `/security-review` before running `/close-epic`
- For epics with 7 or more tickets, `/close-epic` spawns parallel `ticket-context-agent` instances to gather context without exhausting the context window

## Session Start Checklist

1. Identify current workflow phase (project or ticket level)
2. Determine which command applies
3. Load relevant skills for that phase
4. Proceed with skill guidance active

**Quick Decision Tree:**
```
Starting new project?
  → /discovery → /epic-planning → /planning

Working on a ticket?
  → /execute-ticket <ticket-id> (RECOMMENDED)
  → Or individual phases: /adaptation → /implementation → /testing
    → /documentation → /codereview → /security-review

All tickets in epic done?
  → /close-epic (retrofit analysis, creates follow-up tickets)

"Where do I start?"
  → Check if service inventory exists
  → No: /generate-service-inventory first
  → Yes: /discovery
```

## Common Workflow Mistakes

Avoid these patterns that undermine the workflow:

| Mistake | Why It Fails | Correct Approach |
|---------|-------------|------------------|
| Skipping `/discovery` for "simple" projects | Misses existing patterns, leads to duplication | Always run discovery — even a brief one surfaces reuse opportunities |
| Running `/implementation` before `/adaptation` | No implementation guide means no scope boundaries | Run adaptation first to establish file targets and approach |
| Closing tickets manually instead of via `/security-review` | Bypasses security gate, no security audit trail | Let `/security-review` (or `/execute-ticket`) close tickets |
| Running multiple commands in one session | Context exhaustion degrades quality in later phases | One command per session, or use `/execute-ticket` |
| Skipping `/generate-service-inventory` | New services created that duplicate existing ones | Inventory first, then discovery |

## Phase-Skill Activation Matrix

Each workflow phase activates specific skills automatically. This matrix shows which skills apply at each phase:

| Phase | Active Skills |
|-------|---------------|
| `/discovery` | `service-reuse`, `divergent-exploration` |
| `/epic-planning` | `divergent-exploration`, `using-pm-workflow` |
| `/planning` | `service-reuse`, `using-pm-workflow` |
| `/adaptation` | `divergent-exploration`, `model-aware-behavior` |
| `/implementation` | `production-code-standards`, `service-reuse`, `security-patterns`, `model-aware-behavior` |
| `/testing` | `testing-philosophy`, `production-code-standards` |
| `/documentation` | `mvd-documentation` |
| `/codereview` | `production-code-standards`, `verify-implementation` |
| `/security-review` | `security-patterns`, `verify-implementation` |
| `/close-epic` | `epic-closure-validation` |

## Core Skills

| Skill | When It Activates |
|-------|-------------------|
| `production-code-standards` | Writing or reviewing code |
| `service-reuse` | Creating new services/APIs |
| `testing-philosophy` | Writing tests |
| `mvd-documentation` | Writing docs/comments |
| `security-patterns` | Auth, data handling, APIs |

See `references/command-reference.md` for complete command details, skill triggers, and red flags.

This bootstrap skill ensures work stays within the full PM workflow system, not around it.
