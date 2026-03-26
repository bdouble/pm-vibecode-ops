---
name: using-pm-workflow
description: Establishes PM workflow skill enforcement and guides through workflow phases. Use when starting a session, asking about workflow phases, or unsure which command to use next.
---

# PM Workflow Skill Enforcement

This skill is injected at every session start. It establishes how you find and use skills in this workflow.

## The Skill Rule

**If there is even a 1% chance a skill might apply to what you are doing, you MUST invoke it using the Skill tool.** Do not read skill files with the Read tool -- use the Skill tool to load them.

Skills are NOT optional suggestions. They are enforcement mechanisms that override default behavior. When a skill is active, follow it exactly.

**Priority order:** User instructions > Skill enforcement > Default system prompt behavior.

## Skill Catalog

Before responding to ANY request, scan this table and invoke every skill that might apply:

| Skill | Invoke When |
|-------|-------------|
| `production-code-standards` | Writing, editing, or reviewing production code |
| `service-reuse` | About to create a new service, helper, utility, middleware, or shared module |
| `testing-philosophy` | Writing, editing, or debugging tests; test failures; CI pipeline issues |
| `mvd-documentation` | Adding comments, JSDoc, README content, or any documentation |
| `security-patterns` | Code handles auth, user input, database queries, secrets, sessions, tokens, webhooks, file uploads |
| `model-aware-behavior` | About to propose code changes, especially to files not yet read |
| `verify-implementation` | About to claim work is complete, fixed, passing, or ready for review |
| `divergent-exploration` | Facing a non-trivial design decision, architecture choice, or approach selection |
| `epic-closure-validation` | Closing an epic or checking if all sub-tickets are complete |
| `systematic-debugging` | Encountering a bug, test failure, build error, or unexpected behavior |

## Red Flags -- STOP and Check Skills

If you catch yourself thinking any of these, STOP. You are about to skip a skill that applies.

| Rationalization | Reality |
|-----------------|---------|
| "This is a simple change, no skill needed" | Simple changes are where standards slip. Invoke the skill. |
| "I already know what the skill says" | You think you do. The skill has specifics you'll miss. Invoke it. |
| "The skill doesn't quite apply here" | If it's even close, invoke it. The skill will tell you if it doesn't apply. |
| "Loading the skill will slow me down" | Skipping the skill will cause rework. Invoke it. |
| "I'll follow the spirit of the skill without loading it" | The spirit isn't enough. The letter has enforcement rules you need. Invoke it. |
| "This is just test/docs/config, not real code" | Test code leaks credentials. Docs mislead. Config breaks prod. Invoke the skill. |
| "I read the skill earlier in this session" | Context compaction may have dropped it. Invoke it again if in doubt. |
| "The user didn't ask me to follow skills" | Skills are automatic. The user installed them because they want enforcement. |

## Workflow Overview

**Project-Level (run once per project):**
1. `/generate-service-inventory` -- Catalog existing code
2. `/discovery` -- Analyze patterns and architecture
3. `/epic-planning` -- Create business-focused epics
4. `/planning` -- Decompose into sub-tickets

**Ticket-Level (RECOMMENDED -- Agentic Workflow):**
5. `/execute-ticket <ticket-id>` -- Orchestrate ALL phases automatically (adaptation, implementation, testing, documentation, codereview, security-review). Pauses only for blocking issues. Resumes from last completed phase if interrupted.

**Ticket-Level (ADVANCED -- Individual Phases):**
Use only when specific phases need manual control, reruns, or debugging:

| Phase | Command | Purpose |
|-------|---------|---------|
| 5a | `/adaptation` | Implementation guide |
| 6 | `/implementation` | Write production code |
| 7 | `/testing` | Build test suite |
| 8 | `/documentation` | Generate docs |
| 9 | `/codereview` | Quality review |
| 10 | `/security-review` | OWASP assessment (closes tickets) |

**Epic-Level (after all tickets complete):**
11. `/close-epic` -- Close epic with retrofit analysis

## Ticket Closure Rules

- **Only `/security-review` closes tickets** -- marks ticket Done when no critical/high issues found
- **`/execute-ticket` closes automatically** -- runs security-review as final phase
- Other phases do NOT close tickets
- Tickets remain In Progress until security review passes

## Epic Closure Rules

- **Only `/close-epic` closes epics** -- all sub-tickets must be Done or Cancelled
- Verify all sub-tickets passed security review before running `/close-epic`

## Session Management

- **One command per session** unless using `/execute-ticket` (which manages context internally)
- **`/execute-ticket` manages its own context** -- each phase spawns a fresh agent via Task tool
- **Resume gracefully** -- `/execute-ticket` detects completed phases from Linear comments

## Quick Decision Tree

```
Standard ticket?           → /execute-ticket <ticket-id>
Rerun one phase?           → individual phase command (e.g., /testing <ticket-id>)
Starting new project?      → /discovery → /epic-planning → /planning
All tickets in epic done?  → /close-epic
"Where do I start?"        → /generate-service-inventory → /discovery
```
