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

**Project-Level (run once):**
1. `/generate-service-inventory` - Catalog existing code
2. `/discovery` - Analyze patterns and architecture
3. `/epic-planning` - Create business-focused epics
4. `/planning` - Decompose into sub-tickets

**Ticket-Level (run per ticket):**
5. `/adaptation` - Implementation guide
6. `/implementation` - Write production code
7. `/testing` - Build test suite
8. `/documentation` - Generate docs
9. `/codereview` - Quality review
10. `/security-review` - OWASP assessment (closes tickets)

**Epic-Level (after all tickets complete):**
11. `/close-epic` - Close epic with retrofit analysis

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
  → /adaptation → /implementation → /testing
  → /documentation → /codereview → /security-review

All tickets in epic done?
  → /close-epic (retrofit analysis, creates follow-up tickets)

"Where do I start?"
  → Check if service inventory exists
  → No: /generate-service-inventory first
  → Yes: /discovery
```

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
