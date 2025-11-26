# Quick Reference Card

**Print this page** | One-page cheat sheet for PM Vibe Code Operations

---

## Choose Your Mode

| Mode | Location | Use When |
|------|----------|----------|
| **Simple (Default)** | `claude/commands/` | One ticket at a time |
| **Worktree (Advanced)** | `claude/commands-worktrees/` | Multiple tickets in parallel |

**Recommendation**: Start with Simple Mode.

---

## Workflow Commands (Run in Order)

### Project-Level (Recurring)

| # | Command | Purpose | When to Run |
|---|---------|---------|-------------|
| 1 | `/generate_service_inventory [path]` | Catalog existing code | After major codebase updates |
| 2 | `/discovery [ticket] [path] [areas]` | Analyze patterns | Before each epic planning phase |
| 3 | `/epic-planning [prd] [discovery] [context]` | Create business epics | For each new feature/PRD/initiative |
| 4 | `/planning [epic-ids]` | Break into tickets | For each new epic |

### Ticket-Level (Run for Each Ticket)

| # | Command | Purpose | Your Action |
|---|---------|---------|-------------|
| 5 | `/adaptation [ticket-id]` | Create implementation guide | Review guide |
| 6 | `/implementation [ticket-id]` | AI writes code | Wait |
| 7 | `/testing [ticket-id]` | Build & run tests | Review coverage |
| 8 | `/documentation [ticket-id]` | Generate docs | Review docs |
| 9 | `/codereview [ticket-id]` | Quality check | Review findings |
| 10 | `/security_review [ticket-id]` | **Final gate** | **Fix criticals** |

---

## Quality Gates Checklist

Before merging, verify:

- [ ] Test coverage ≥ 90%
- [ ] No CRITICAL security issues
- [ ] No HIGH security issues
- [ ] Code review passed
- [ ] Documentation complete
- [ ] Ticket marked "Done" (by security review)

---

## Key Concepts

| Term | What It Means | Why You Care |
|------|---------------|--------------|
| **Service Inventory** | List of existing code | Prevents rebuilding what exists |
| **Discovery** | AI learns your codebase | Ensures new code matches patterns |
| **Adaptation** | Implementation plan | Maximizes code reuse |
| **Worktree** | Isolated workspace | Enables concurrent ticket work |
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
/generate_service_inventory . inventory.md
/discovery my-prd.md MyProject ./src "area1, area2"
/epic-planning my-prd.md discovery.md "market context" "user value"
/planning EPIC-123,EPIC-124 --discovery discovery.md

# Per-ticket workflow
/adaptation TICKET-201
/implementation TICKET-201
/testing TICKET-201
/documentation TICKET-201
/codereview TICKET-201
/security_review TICKET-201
```

---

## When Things Go Wrong

| Problem | Solution |
|---------|----------|
| Tests failing | Clarify acceptance criteria, let AI fix |
| Security CRITICAL | Must fix before merge, describe issue to AI |
| Implementation wrong | Describe what's wrong (not how to fix) |
| Duplicate epics | Re-run with service inventory first |
| Worktree not found | Run `/adaptation` first |

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
| Worktree help | [WORKTREE_GUIDE.md](WORKTREE_GUIDE.md) |

---

**Version 1.1.1** | [Full Documentation](README.md) | [PM Guide](PM_GUIDE.md)
