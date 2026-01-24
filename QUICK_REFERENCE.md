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
| `/execute-ticket [ticket-id]` | **Runs all 6 phases automatically** | Fix blocking issues only |

**Why agentic workflow?** 8x faster, zero intervention for passing tickets, consistent quality, full traceability.

The command handles: adaptation, implementation, testing, documentation, code review, and security review. Creates branch, draft PR, adds labels, and converts to ready when security passes.

### Ticket-Level: Individual Phases (Advanced)

For special cases requiring phase-by-phase control:

| # | Command | Purpose | Your Action |
|---|---------|---------|-------------|
| 5 | `/adaptation [ticket-id]` | Create implementation guide | Review guide |
| 6 | `/implementation [ticket-id]` | AI writes code | Wait |
| 7 | `/testing [ticket-id]` | Build & run tests | Review coverage |
| 8 | `/documentation [ticket-id]` | Generate docs | Review docs |
| 9 | `/codereview [ticket-id]` | Quality check | Review findings |
| 10 | `/security-review [ticket-id]` | **Final gate** | **Fix criticals** |

Use individual phases when debugging a specific phase or needing manual intervention.

### Epic-Level (Run After All Tickets Done)

| # | Command | Purpose | Your Action |
|---|---------|---------|-------------|
| 11 | `/close-epic [epic-id]` | **Final epic gate** | Review report |

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

**Version 2.14.0** | [Full Documentation](README.md) | [PM Guide](PM_GUIDE.md)
