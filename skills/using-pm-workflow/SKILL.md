---
name: using-pm-workflow
description: Use when starting any PM workflow session. Establishes skill-checking behavior before ANY action including clarifying questions. Activates at session start, before responding to requests, when switching contexts, or when unsure which command to use. Lists all skills, commands, and trigger conditions for Product Managers building production code.
---

# PM Workflow Bootstrap

This skill establishes the foundational behavior for all PM workflow sessions. It ensures you leverage the full power of the workflow system by checking applicable skills before taking any action.

<EXTREMELY_IMPORTANT>
BEFORE responding to ANY request—including asking clarifying questions—you MUST:
1. Review the skills table below
2. Identify which skills apply to the current context
3. Load and follow those skills' guidance
4. THEN proceed with your response

This is not optional. Even simple questions may trigger production code standards or service reuse requirements.
</EXTREMELY_IMPORTANT>

## Available Skills

| Skill | Triggers When | What It Enforces |
|-------|---------------|------------------|
| `production-code-standards` | Writing ANY code, reviewing code, suggesting implementations | Zero workarounds, no temporary fixes, fail-fast patterns |
| `service-reuse` | Creating new services, APIs, or utilities | Must check service inventory first, prevent duplication |
| `testing-philosophy` | Writing tests, discussing test coverage | Fix broken tests before new tests, accuracy over coverage |
| `mvd-documentation` | Writing docs, comments, or explanations | Document "why" not "what", minimal viable documentation |
| `security-patterns` | Authentication, authorization, data handling, API design | OWASP compliance, security-first implementation |

## Workflow Commands

The PM workflow follows a strict sequence. Commands are divided into project-level (run once per project) and ticket-level (run for each ticket).

### Project-Level Commands (Phases 1-4)

Run these in order when starting a new project or major initiative:

| Phase | Command | Purpose |
|-------|---------|---------|
| 1 | `/generate_service_inventory` | Catalog existing code to prevent duplication |
| 2 | `/discovery` | Analyze patterns, architecture, and integration points |
| 3 | `/epic-planning` | Create business-focused epics with duplicate detection |
| 4 | `/planning` | Decompose epics into actionable sub-tickets |

### Ticket-Level Commands (Phases 5-10)

Run these for EACH ticket, in order:

| Phase | Command | Purpose |
|-------|---------|---------|
| 5 | `/adaptation` | Create implementation guide for specific ticket |
| 6 | `/implementation` | Write production code |
| 7 | `/testing` | Build comprehensive test suite |
| 8 | `/documentation` | Generate API docs and user guides |
| 9 | `/codereview` | Quality assurance review |
| 10 | `/security_review` | OWASP vulnerability assessment |

**Critical**: Only `/security_review` closes tickets and merges code to main.

## Red Flags: Stop and Check a Skill

If any of these thoughts cross your mind, STOP and consult the relevant skill:

| If You're Thinking... | Check This Skill |
|-----------------------|------------------|
| "Let me just add a quick workaround for now" | `production-code-standards` |
| "I'll create a new utility for this" | `service-reuse` |
| "Let me write some tests to get coverage up" | `testing-philosophy` |
| "I should document every function" | `mvd-documentation` |
| "I'll add authentication later" | `security-patterns` |
| "This fallback will handle edge cases" | `production-code-standards` |
| "The existing tests are flaky, I'll skip them" | `testing-philosophy` |
| "I need a helper function for this" | `service-reuse` |

## Working with Non-Engineers

Many users of this workflow are Product Managers and other non-engineers who are building production applications with AI assistance. This means:

- **Explain technical decisions** in plain language when relevant
- **Never assume familiarity** with programming concepts, patterns, or tooling
- **Provide context** for why certain approaches are required (security, maintainability, etc.)
- **Flag risks clearly** when suggesting approaches that require technical judgment

However, the production code standards apply equally regardless of who is building. The code that ships must be production-ready—no exceptions for "it's just a PM building this."

## Session Start Checklist

When beginning any session:

1. Identify the current workflow phase (project-level or ticket-level)
2. Determine which command applies to the current task
3. Load all potentially relevant skills for that phase
4. Proceed with skill guidance active

This bootstrap skill ensures you always work within the full PM workflow system, not around it.
