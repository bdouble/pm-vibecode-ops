---
description: Codex-specific usage guide for PM Vibe Code Operations prompts.
---

# Codex Prompts Overview

This directory contains **platform-agnostic prompts** designed for use with the OpenAI Codex CLI (and similar tools). They mirror the Claude Code workflow but use plain Markdown prompts instead of slash commands or agent configs.

## Prerequisites

Before using these prompts, you need OpenAI Codex installed:

**Installation** (see [official docs](https://developers.openai.com/codex/cli)):
```bash
npm i -g @openai/codex
codex --version  # Verify installation
codex            # Authenticate (requires ChatGPT Plus/Pro/Business/Edu/Enterprise)
```

For complete installation instructions, see:
- [OpenAI Codex CLI Documentation](https://developers.openai.com/codex/cli)
- [OpenAI Help Center - Getting Started](https://help.openai.com/en/articles/11096431-openai-codex-cli-getting-started)

## Key Goals

- Keep behavior as close as possible to the Claude Code workflow.
- Use **simple mode** only: standard git branches.
- Assume MCP-style integrations for ticketing (Linear) when available.

## Files and Phases

Each prompt corresponds to a workflow phase:

- `generate_service_inventory.md` – Project-level service inventory
- `discovery.md` – Technical discovery and architecture mapping
- `epic-planning.md` – Epic creation from PRDs
- `planning.md` – Ticket decomposition and planning
- `adaptation.md` – Ticket-level implementation planning
- `implementation.md` – Production implementation
- `testing.md` – Test design and execution
- `documentation.md` – Documentation phase
- `codereview.md` – Code review
- `security_review.md` – Security review (final gate)

Prompts are designed to be copied into Codex sessions or referenced from your own CLI wrappers.

## Simple-Mode Assumptions

Codex prompts assume:

- A single working copy of the repo.
- A **feature branch per ticket**, created from `main` or a parent feature branch.
- Linear as the primary ticket system, accessed via MCP tools when available.

Each prompt includes a **“Repository and Branch Context (Simple Mode)”** section to keep the model anchored to:

```bash
git rev-parse --show-toplevel
git branch --show-current
```

## MCP and Linear Integration

Where possible, prompts use **Linear MCP** naming and behavior:

- `mcp__linear-server__get_issue`
- `mcp__linear-server__list_comments`
- `mcp__linear-server__create_comment`
- `mcp__linear-server__update_issue`
- `mcp__linear-server__list_issues`, `list_projects`, `create_project`, etc.

If MCP is not available in your Codex environment, you can adapt those steps to:

- Manual use of the Linear web UI, or
- Direct HTTP API calls (outside the prompt).

## Personas (Option A)

Each prompt starts with a short **persona paragraph** describing the role:

- Architect / Discovery Engineer (`adaption.md`, `discovery.md`, `planning.md`)
- Implementation Engineer (`implementation.md`)
- QA Engineer (`testing.md`)
- Technical Writer (`documentation.md`)
- Senior Code Reviewer (`codereview.md`)
- Security Engineer (`security_review.md`)

These personas mirror the **Claude agents** but stay within a single prompt so Codex can use them without extra configuration.

## Context Window Best Practice

**Important:** Run each prompt in a fresh Codex session. After completing a workflow phase and reviewing the output, close your Codex session and start a new one for the next prompt.

**Why this matters:**
- Each workflow phase generates substantial context (discovery findings, code analysis, test results, etc.)
- Running multiple prompts in sequence can overflow the context window
- Cross-phase context pollution reduces effectiveness (e.g., security review seeing implementation details)
- Fresh context ensures each phase works optimally

**In practice:**
1. Open Codex → Paste adaptation prompt → Review output → Close Codex
2. Open new Codex session → Paste implementation prompt → Review output → Close Codex
3. Open new Codex session → Paste testing prompt → Continue...

Each prompt creates persistent artifacts (Linear tickets, code commits, PRs), so you won't lose progress when starting fresh sessions.

## Recommended Usage Patterns

### Direct Copy-Paste

```bash
# View a prompt
cat codex/prompts/adaptation.md

# Copy its contents into your Codex session
```

Then, in Codex:
- Paste the prompt.
- Provide the required inputs (e.g., ticket ID, PRD path).
- Let Codex respond and follow its instructions.
- **Close the session after completion** and start fresh for the next prompt.

### Alias-Based Usage

For frequent use, create shell aliases:

```bash
alias codex_adaptation='cat /path/to/pm-vibecode-ops/codex/prompts/adaptation.md'
alias codex_implementation='cat /path/to/pm-vibecode-ops/codex/prompts/implementation.md'
```

Then:

```bash
codex_adaptation | pbcopy   # macOS example
# Paste into Codex
```

### Custom Wrappers

You can also wrap these prompts into your own CLI or scripts:

- Pre-fill ticket IDs or PRD paths.
- Inject repository-specific defaults (paths, frameworks).
- Log prompt usage for process auditing.

## Behavior Differences vs Claude Code

Compared to the `claude/` commands:

- No slash commands – prompts are copy-paste or wrapped.
- No explicit Task tool or agent configs – personas are inline.
- Linear integration is **recommended but optional**; if you don’t use MCP, adapt the steps.

The **quality gates and philosophy (no workarounds, service reuse, security-first)** are kept aligned with the Claude workflow wherever possible.

## Example 1: Ticket-Level Flow (Adaptation → Implementation → Testing)

Scenario: You have a Linear ticket `APP-123` and you want to run the ticket-level phases with Codex.

1. **Adaptation**
   - In your terminal (from the repo root):
     ```bash
     cat codex/prompts/adaptation.md
     ```
   - Copy the content into a Codex session.
   - When prompted, provide:
     - Linear ticket ID: `APP-123`
     - Any discovery report or extra context (if available).
   - Let Codex produce an adaptation report and proposed feature branch name (for example `feature/APP-123-user-invitations`), and ensure it documents that branch in the Linear comment.

2. **Implementation**
   - Check out the feature branch mentioned in the adaptation report (or create it if needed).
   - In the terminal:
     ```bash
     cat codex/prompts/implementation.md
     ```
   - Paste into Codex, provide:
     - Linear ticket ID: `APP-123`
     - Any additional implementation notes you want Codex to consider.
   - Let Codex guide and perform implementation changes on the feature branch.

3. **Testing**
   - Stay on the same feature branch.
   - In the terminal:
     ```bash
     cat codex/prompts/testing.md
     ```
   - Paste into Codex, provide:
     - Linear ticket ID: `APP-123`
     - Optional coverage target and test types (for example, “80% coverage, unit + integration”).
   - Follow the prompt’s Gate 0 (fix existing tests first), then let Codex design and refine new tests.

After these three phases, you can continue with:
- `codex/prompts/documentation.md`
- `codex/prompts/codereview.md`
- `codex/prompts/security_review.md`

## Example 2: Project-Level Flow (Discovery → Planning from a PRD)

Scenario: You have a PRD at `docs/user-notifications-prd.md` and want to generate tickets in Linear.

1. **Discovery**
   - From the repo root:
     ```bash
     cat codex/prompts/discovery.md
     ```
   - Paste into Codex and provide:
     - Project name and/or identifier.
     - Any existing service inventory files (if present).
   - Let Codex map the architecture, patterns, and integration points, and create/update a Linear discovery ticket.

2. **Planning**
   - Once discovery is done and recorded in Linear, run:
     ```bash
     cat codex/prompts/planning.md
     ```
   - Paste into Codex and provide:
     - PRD path: `docs/user-notifications-prd.md`
     - Any discovery report links or ticket IDs.
     - Scope or priority instructions (e.g., “v1 only, focus on email + in-app notifications”).
   - Let Codex:
     - Decide whether to create a Linear project/epic.
     - Decompose the PRD into well-scoped Linear tickets.
     - Ensure reuse checks against discovery/service inventory.

You can then pick up individual ticket IDs from the planning output and run the ticket-level flow (Example 1) for each one using Codex.

