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

## Pre-Closure Assessment Process

Follow this numbered procedure before any epic closure. No step may be skipped.

### 1. Query Sub-Ticket Status

Fetch all sub-tickets for the epic and categorize each by status:
- **Done** — work completed and verified
- **Cancelled** — explicitly descoped with documented reason
- **In Progress** — active work, not yet complete
- **Todo** — not started
- **Blocked** — cannot proceed due to external dependency

### 2. Evaluate Against Blocking Conditions

| Condition | Action |
|-----------|--------|
| Sub-ticket In Progress | BLOCK - Must complete or cancel |
| Sub-ticket Todo | BLOCK - Must complete or cancel |
| Sub-ticket Blocked | BLOCK - Must resolve blocker |
| Workaround shipped | BLOCK - Must fix before closure |
| Security issue unresolved | BLOCK - Must address finding |

If ANY blocking condition exists, stop. List all incomplete tickets with their current status and required action. Do not proceed to closure analysis.

### 3. Assess Business Value Delivery

See the Business Value Verification section below.

### 4. Scan for Workarounds

See the Workaround Detection section below.

### 5. Determine Closure Decision

Apply the decision matrix below to reach a closure verdict.

## Closure Decision Matrix

These five scenarios cover all possible epic states at closure time:

| Scenario | Sub-Ticket Status | Decision | Rationale |
|----------|-------------------|----------|-----------|
| All Done | Every ticket is Done | **Proceed to closure** | Standard path — all work delivered |
| Mix of Done + Cancelled | Some Done, some Cancelled, none active | **Proceed IF business value delivered** | Cancelled tickets may indicate scope refinement, not failure. Assess whether remaining Done tickets cover the epic's core goals |
| Any In Progress | One or more tickets still active | **BLOCK closure** | Active work must complete or be explicitly cancelled with documented reason |
| Any Todo or Blocked | Unstarted or stuck tickets remain | **BLOCK closure** | Unstarted work indicates incomplete planning; blocked work needs resolution |
| All Cancelled | Every ticket was cancelled | **Proceed ONLY if epic explicitly descoped** | Rare — requires confirmation that the business decision to abandon the epic is intentional and documented |

**For the "Mix of Done + Cancelled" scenario:**
1. Read the epic description and acceptance criteria
2. Map each Done ticket to the business capabilities it delivers
3. Map each Cancelled ticket to what capability was lost
4. If core capabilities are delivered, closure is valid
5. If critical capabilities were cancelled, block closure until replacement tickets are filed

## Business Value Verification

Before closure, verify the epic's original goals were actually achieved — not just that tickets were marked Done.

### Step 1: Retrieve Original Goals

Read the epic description and extract:
- Stated business objective (the "why" for the epic)
- Acceptance criteria or success metrics
- Key deliverables promised to stakeholders

### Step 2: Map Deliverables to Completed Work

For each stated deliverable:
- Identify which Done ticket(s) deliver it
- Verify the ticket's implementation report confirms the deliverable was built
- If a deliverable was split across multiple tickets, confirm all parts are Done

### Step 3: Identify Gaps

Flag any stated deliverable that:
- Has no corresponding Done ticket
- Was partially delivered (some tickets Done, some Cancelled)
- Was delivered but with noted limitations or reduced scope

### Step 4: Render Verdict

- **All deliverables mapped to Done tickets** — business value confirmed
- **Minor gaps with documented rationale** — acceptable if stakeholders were informed
- **Critical deliverables missing** — block closure, file replacement tickets

## Workaround Detection

Before closure, actively search for workarounds that may have shipped in completed tickets.

### Automated Search Patterns

Run these searches across files changed by the epic's tickets:

```
Grep for code workarounds:
  TODO, FIXME, HACK, WORKAROUND, TEMPORARY, XXX

Grep for deferred acceptance criteria:
  AC-DEFERRED (in Linear comments on sub-tickets)

Grep for incomplete implementations:
  "not implemented", "stub", "placeholder", "mock" (in production code, not tests)
```

### Manual Verification

Review each completed ticket's Linear comments for:
- Deferred Items tables with AC-DEFERRED classification
- Code review findings marked "accepted risk" or "deferred"
- Security review findings at MEDIUM severity or above that were noted but not fixed
- Implementation reports mentioning reduced scope or partial delivery

### Workaround Found — Actions

| Finding | Severity | Action |
|---------|----------|--------|
| TODO/FIXME in production code | HIGH | Block closure, create fix ticket |
| AC-DEFERRED item in any ticket | HIGH | Block closure unless user explicitly approved the deferral |
| Stub or placeholder in production | CRITICAL | Block closure, complete implementation |
| Known security finding unaddressed | CRITICAL | Block closure, fix before shipping |
| Minor code quality note deferred | LOW | Allow closure, create follow-up ticket in retrofit analysis |

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

## Additional Resources

- **`references/closure-decision-tree.md`** — Detailed decision matrix for closure scenarios, business value assessment, workaround detection, and retrofit triggers
- **`examples/mixed-closure-scenario.md`** — Walkthrough of a real mixed Done/Cancelled epic closure decision
