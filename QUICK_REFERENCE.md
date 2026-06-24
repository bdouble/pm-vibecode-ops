# Quick Reference Card

**Print this page** | One-page cheat sheet for PM Vibe Code Operations

---

## Workflow Commands (Run in Order)

### Project-Level (Recurring)

| # | Command | Purpose | When to Run |
|---|---------|---------|-------------|
| 1 | `/generate-service-inventory [path]` | Catalog existing code | After major codebase updates |
| 2 | `/discovery [ticket] [path] [areas]` | Analyze patterns | Before each epic planning phase |
| 3 | `/epic-planning [prd] [discovery] [context]` | Create business epics | For each new feature/PRD/initiative |
| 4 | `/planning [epic-ids]` | Break into tickets | For each new epic |

### Ticket-Level: Agentic Workflow (Recommended)

| Command | Purpose | Your Action |
|---------|---------|-------------|
| `/execute-ticket [ticket-id]` | **Runs all 7 phases automatically** (incl. Codex review) | Fix blocking issues only |

**Why agentic workflow?** 8x faster, zero intervention for passing tickets, consistent quality, full traceability.

The command handles: adaptation, implementation, testing, documentation, code review, cross-model Codex review, and security review. Creates branch, draft PR, adds labels, and converts to ready when security passes.

### Ticket-Level: Individual Phases (Advanced)

For special cases requiring phase-by-phase control:

| # | Command | Purpose | Your Action |
|---|---------|---------|-------------|
| 5 | `/adaptation [ticket-id]` | Create implementation guide | Review guide |
| 6 | `/implementation [ticket-id]` | AI writes code | Wait |
| 7 | `/testing [ticket-id]` | Build & run tests | Review coverage |
| 8 | `/documentation [ticket-id]` | Generate docs | Review docs |
| 9 | `/codereview [ticket-id]` | Quality check | Review findings |
| 9.5 | `/codex-review [ticket-id]` | Cross-model review | Approve fixes |
| 10 | `/security-review [ticket-id]` | **Final gate** | **Fix criticals** |

Use individual phases when debugging a specific phase or needing manual intervention.

### Epic-Level (Run After All Tickets Done)

| # | Command | Purpose | Your Action |
|---|---------|---------|-------------|
| 11 | `/close-epic [epic-id]` | **Final epic gate** | Review report |

### Epic Execution (Redesigned in 4.0)

| Command | Purpose | Your Action |
|---------|---------|-------------|
| `/epic-swarm [epic-id]` | **Run all tickets through full pipeline** | Approve tier plan, review Codex findings, resolve conflicts |

Processes each ticket through ALL 7 phases (adaptation → security scan) before starting the next. Every ticket's adaptation examines code built by prior tickets. Hard checkpoint verifies all 7 phase reports exist before merge. Dual security review. Persistent swarm state enables resume. Parallelism available via `--parallel` flag (opt-in, user confirms).

### Observability (v4.7)

| Command | Purpose | Your Action |
|---------|---------|-------------|
| `/swarm-stats [epic-id-or-ticket-id]` | **Workflow dashboard** — deferral rate, impact-bar hits, follow-up filings, codex auto-fix rate, profile mix, phase outcomes | Read the dashboard before acting on intuition |

Backed by the 17-event JSONL stream at `.swarm/observability/<epic-id>/<ticket-id>.jsonl`. Use this instead of grepping Linear or recalling from memory. Pre-v4.7 epics render with a legacy badge. v5.0 adds the Discipline Debt section (prose-only vs enforced rules, guard checks, latest entropy scorecard).

### Recurring Maintenance (v5.0)

| Command | Purpose | Your Action |
|---------|---------|-------------|
| `/entropy-audit "<north-star>"` | **Cross-epic health audit** — census of conventions/guards/dead machinery/test ballast + a judgment review with one forced highest-conviction change; emits a machine-diffable scorecard | Run every 3–6 months or ~10 epics; watch the prose-only count trend down |

### Dynamic Workflow (v4.8)

| Command | Purpose | Your Action |
|---------|---------|-------------|
| `/epic-swarm-workflow [epic-id] [--dry-run] [--push] [--no-push] [--in-place] [--max-tickets N] [--skills a,b,c] [--context-file PATH] [guidance…]` | **Run the epic as a dynamic workflow** — per-ticket pipeline sized to effort (no-code / small / standard), reviews fail-closed, every agent failure isolated. Integrates in a **dedicated worktree** so different epics run concurrently in one repo; a merge blocked by new test failures gets a fix-forward pass. `--push` opens the epic PR (default local-only); `--max-tickets N` (N ≥ 1) caps scope; text after the id / `--skills` / `--context-file` thread guidance into every agent | Start with `--dry-run`; review the reconciled summary |

Same intent as `/epic-swarm`, run on Claude Code's `Workflow` runtime. Right-sizes each ticket, blocks merges only on *new* test failures (test-diff gate), and always finishes with a done/blocked/unprocessed summary. Requires [dynamic workflows](https://code.claude.com/docs/en/workflows) enabled. Details in [workflows/](workflows/).

---

## Quality Gates Checklist

Before merging, verify:

- [ ] Test coverage ≥ 90%
- [ ] No CRITICAL security issues
- [ ] No HIGH security issues
- [ ] Code review passed
- [ ] Documentation complete
- [ ] Ticket marked "Done" (by security review)
- [ ] Epic marked "Done" (by close-epic, after all tickets)

---

## Key Concepts

| Term | What It Means | Why You Care |
|------|---------------|--------------|
| **Service Inventory** | List of existing code | Prevents rebuilding what exists |
| **Discovery** | AI learns your codebase | Ensures new code matches patterns |
| **Adaptation** | Implementation plan | Maximizes code reuse |
| **Skills** | Auto-activated quality rules | Enforces standards during development |
| **Quality Gates** | Automated checks | Ensures production-ready code |
| **Epic Swarm** | Parallel ticket execution | Faster epic completion |
| **Cross-Model Review** | Codex reviews Claude's code | Catches different bugs |
| **Observability Stream** | 17-event JSONL log of what the workflow did | Answer "is it working" from data, not intuition |
| **Protected Region** | `<!-- @protected -->` envelope around skill foundational principles | Prevents silent rewrites of the rules the workflow depends on |
| **Enforcement Ladder** | Conventions ship as guards (lint rule, guard test, drift test, ratchet), not prose | Prose regresses; guards don't — and you can verify "test: green" without reading code |
| **Discipline Debt** | Count of `[prose-only]` rules not yet backed by a guard | The codebase-health number you can watch go down |
| **Entropy Audit** | Recurring cross-epic review with a machine-diffable scorecard | Catches drift no per-ticket phase looks for |

---

## PRD Essentials

Your PRD must include:

1. **Problem Statement** - Why does this matter?
2. **User Personas** - Who benefits?
3. **Success Criteria** - How do we measure?
4. **User Stories** - What can users do?
5. **Acceptance Criteria** - Specific, testable requirements
6. **Scope** - What's in/out of v1?

---

## Common Commands Quick Copy

```bash
# Full workflow for new feature
/generate-service-inventory . inventory.md
/discovery my-prd.md MyProject ./src "area1, area2"
/epic-planning my-prd.md DISC-001 "market context" "user value"
/planning EPIC-123,EPIC-124 --discovery DISC-001

# Per-ticket workflow (recommended - agentic)
/execute-ticket TICKET-201

# Per-ticket workflow (advanced - individual phases)
/adaptation TICKET-201
/implementation TICKET-201
/testing TICKET-201
/documentation TICKET-201
/codereview TICKET-201
/security-review TICKET-201

# Epic closure (after all tickets in epic are Done)
/close-epic EPIC-123

# Concurrent execution (new in 3.0)
/epic-swarm EPIC-123

# Epic as a dynamic workflow (new in 4.8) — preview the plan first
/epic-swarm-workflow EPIC-123 --dry-run
/epic-swarm-workflow EPIC-123

# Cross-model review (standalone)
/codex-review TICKET-201
```

---

## When Things Go Wrong

| Problem | Solution |
|---------|----------|
| Tests failing | Clarify acceptance criteria, let AI fix |
| Security CRITICAL | Must fix before merge, describe issue to AI |
| Implementation wrong | Describe what's wrong (not how to fix) |
| Duplicate epics | Re-run with service inventory first |
| Branch not found | Run `/adaptation` first |

---

## Success Metrics to Track

- **Velocity**: Time from PRD to production (target: 50% reduction)
- **Quality**: Test coverage (target: 90%+)
- **Reuse**: Service reuse rate (target: 70%+)
- **Security**: Critical issues found pre-production (target: 100%)

---

## Documentation Map

| Need | Read |
|------|------|
| Complete workflow guide | [PM_GUIDE.md](PM_GUIDE.md) |
| Real examples | [EXAMPLES.md](EXAMPLES.md) |
| Common questions | [FAQ.md](FAQ.md) |
| Technical terms | [GLOSSARY.md](GLOSSARY.md) |
| Command details | [README.md](README.md) |
| Skills reference | [SKILLS.md](SKILLS.md) |

---

**Version 5.3.0** | [Full Documentation](README.md) | [PM Guide](PM_GUIDE.md)
