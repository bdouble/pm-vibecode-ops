---
name: epic-closure-validation
description: |
  Validates epic completion before closure. Use when:
  - Closing epics: "close epic", "finish epic", "complete epic", "epic done", "mark epic complete"
  - Checking status: "are all tickets done", "check epic status", "verify epic completion"
  - Discussing epic IDs with closure intent (EPIC-*, EPc-*)
  - Epic closure workflows

  Blocks closing epics with incomplete sub-tickets. Requires all sub-tickets Done/Cancelled
  before epic can be closed. Prevents premature closure and ensures business value delivered.
  Also blocks closure when a convention the epic established lacks a structural guard or
  [prose-only] tag, and replaces per-surface propagation tickets with ratchets.
---

# Epic Closure Validation

Validates that ALL sub-tickets are complete before an epic can be closed.

## Enforcement Workflow

1. **Before closure**: Verify all sub-tickets are Done or Cancelled
2. **Block if incomplete**: List incomplete tickets and required actions
3. **Check for workarounds**: Verify no temporary solutions shipped
4. **Validate business value**: Ensure original goals were met
5. **Audit convention guards**: Every pattern the epic established has a structural guard or an explicit `[prose-only]` tag (see Convention Guard Audit below)

## Blocking Conditions

| Condition | Action |
|-----------|--------|
| Sub-ticket In Progress | BLOCK - Must complete or cancel |
| Sub-ticket Todo | BLOCK - Must complete or cancel |
| Sub-ticket Blocked | BLOCK - Must resolve blocker |
| Workaround shipped | BLOCK - Must fix before closure |
| Security issue unresolved | BLOCK - Must address finding |
| Convention established without guard or `[prose-only]` tag | BLOCK - Ship the guard (rung 1-5) or obtain explicit user approval for prose-only status |

## Required Before Closure

| Check | Requirement |
|-------|-------------|
| Sub-tickets | ALL must be Done or Cancelled |
| Security reviews | ALL implementation tickets passed |
| Workarounds | NONE in production code |
| Business value | Original goals must be met |
| Convention guards | Every pattern the epic established has a guard (rung 1-5) or an explicit `[prose-only]` tag |

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

## Convention Guard Audit

An epic that introduced a canonical pattern cannot close until the pattern's guard exists. Prose rules don't propagate across amnesiac agent sessions; guards do (field data: guarded conventions had zero post-merge regressions; the most-documented prose rule regressed four times).

1. **Enumerate conventions the epic established.** Sources: implementation reports, adaptation guides, and any "always/never" rules added to project memory or convention docs during the epic.
2. **For each convention, verify ONE of:**
   - A guard artifact exists on the enforcement ladder (rungs 1-5: type chokepoint, static-guard test, drift test, ratchet, runtime assert) — confirm the artifact file exists and its test passes, don't take the report's word for it.
   - The rule carries an explicit `[prose-only]` tag with a one-line rationale for why no guard can express it.
3. **Neither present → CRITICAL finding, blocks closure** — same severity as a shipped workaround. Resolution: ship the guard now (typically a ~200-line rung-2 test, 1-2 hours — see the production-code-standards skill, enforcement ladder) or surface to the user for explicit prose-only approval.

Record the audit in the closure comment as a `### Convention Guards` table: Convention | Guard artifact + rung (or `[prose-only]` + rationale) | Verified.

## Follow-Up Discipline

When closure IS valid, capture lessons and disciplined follow-ups:

1. **What worked well** - Patterns to replicate
2. **What could improve** - Process adjustments
3. **Downstream impacts** - Other epics/systems affected
4. **Follow-up candidates** - New work identified during the epic — most land in the closure-log, not as tickets

Default disposition for any candidate is the **Considered-but-not-pursued closure-log**, NOT a ticket. This replaces the prior "one retrofit ticket per finding" behavior, which produced backlog sprawl.

## Filing Follow-Up Tickets (≤3, each clears the impact bar)

Each filed follow-up MUST clear the impact bar — complete this sentence with concrete content:

> "Without this, **[specific production behavior / user experience / cost / security control]** changes for **[identified code path / user-operator segment]**."

Generic "for" content ("users", "the codebase", "maintainability", "consistency") fails the bar → the item moves to the closure-log.

**Absolute cap: ≤3 filed follow-ups per closure.** More than 3 surviving candidates means the impact bar or boundary question was not applied properly — re-apply it or surface to the user. A filed follow-up looks like:

```markdown
## [Follow-up]: [Finding Title]

**Impact-bar sentence**: [the completed sentence above]
**Context**: [Which epic, what was learned]
**Recommendation**: [Specific action to take]
**Effort**: [T-shirt size estimate]
**Priority**: [Suggested priority]
```

### Cross-Cutting Concerns: Ratchet First, Never Per-Surface

When the epic established a pattern that future or existing work could violate, do NOT file one ticket per remaining surface. Answer the boundary question first:

> "Is there a single point of enforcement that makes the unsafe version impossible to produce — and if so, has this epic installed it?"

- **Enforcement exists or was installed by this epic** → no propagation tickets. Remaining un-migrated surfaces become a ratchet allowlist that shrinks opportunistically.
- **No single chokepoint is expressible** → attempt a **ratchet first** (shrink-only allowlist guard test — it usually replaces the propagation ticket entirely; field data: propagation tickets went 14 opened / 0 closed, ratchets cost ~1-2 hours and never rot). Only if neither a guard nor a ratchet is technically expressible: file ONE propagation ticket with all remaining surfaces enumerated as a checklist in its description. Never one per surface.

Before falling back to a propagation ticket, write one sentence stating what boundary mechanism (including a ratchet) was considered and why it isn't expressible here — argued from the architecture. "Not viable" cannot be a free-form opt-out. See the production-code-standards skill (enforcement ladder) for the ratchet recipe.

---

## How to Use This Skill in Codex

Include this skill's content in your Codex prompt when:
- About to close an epic
- Reviewing epic status for completion
- Performing follow-up discipline analysis
- Creating follow-up work from completed epics

Copy the blocking conditions checklist to ensure no incomplete epics are closed prematurely.
