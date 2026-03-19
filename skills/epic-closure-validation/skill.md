---
name: epic-closure-validation
description: |
  This skill should be used when validating epic completion before closure. Activate when:
  - User says: "close epic", "finish epic", "complete epic", "epic done", "mark epic complete"
  - User says: "are all tickets done", "check epic status", "verify epic completion"
  - User mentions: epic IDs with closure intent (EPIC-*, EPc-*)
  - Using commands: /close-epic, epic closure workflows

  Blocks closing epics with incomplete sub-tickets. Requires all sub-tickets Done/Cancelled
  before epic can be closed. Prevents premature closure and ensures business value delivered.
---

# Epic Closure Validation

Validates that ALL sub-tickets are complete before an epic can be closed.

## Enforcement Workflow

1. **Before closure**: Verify all sub-tickets are Done or Cancelled
2. **Block if incomplete**: List incomplete tickets and required actions
3. **Check for workarounds**: Verify no temporary solutions shipped
4. **Validate business value**: Ensure original goals were met

## Blocking Conditions

| Condition | Action |
|-----------|--------|
| Sub-ticket In Progress | BLOCK - Must complete or cancel |
| Sub-ticket Todo | BLOCK - Must complete or cancel |
| Sub-ticket Blocked | BLOCK - Must resolve blocker |
| Workaround shipped | BLOCK - Must fix before closure |
| Security issue unresolved | BLOCK - Must address finding |

## Required Before Closure

| Check | Requirement |
|-------|-------------|
| Sub-tickets | ALL must be Done or Cancelled |
| Security reviews | ALL implementation tickets passed |
| Workarounds | NONE in production code |
| Business value | Original goals must be met |

## When Closure is Blocked

If epic closure is blocked:

1. **LIST** all incomplete tickets with their current status
2. **IDENTIFY** what action is needed for each
3. **DO NOT** proceed with closure analysis
4. **REPORT** clear guidance on next steps

**Block epic closure when work is incomplete. Report all blocking items with clear guidance on required next steps.**

## Valid Closure Scenarios

| Scenario | Valid? | Notes |
|----------|--------|-------|
| All tickets Done | Yes | Standard closure |
| Mix of Done + Cancelled | Yes | If business value delivered |
| Some tickets In Progress | NO | Must complete first |
| All tickets Cancelled | Maybe | Only if epic descoped entirely |

## Additional Resources

- **`references/closure-decision-tree.md`** — Detailed decision matrix for closure scenarios, business value assessment, workaround detection, and retrofit triggers
- **`examples/mixed-closure-scenario.md`** — Walkthrough of a real mixed Done/Cancelled epic closure decision
