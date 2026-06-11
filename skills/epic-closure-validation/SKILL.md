---
name: epic-closure-validation
description: Use when about to call /close-epic, when about to mark an epic state=Done, when evaluating epic completion, or when user says "close this epic", "epic done", "is the epic complete", or references an epic ID with closure intent. Also use when any sub-ticket is Todo, In Progress, Blocked, or shipped with a workaround — any of these block closure. Also use when writing the epic closure comment, when deciding whether to file retrofit or follow-up tickets, when about to file more than 3 follow-up tickets per closure, when filing per-surface tickets for a cross-cutting concern, when writing or validating the "Considered but not pursued" closure-log section, when evaluating whether a candidate follow-up clears the impact bar, or when the epic established a convention or pattern whose guard may not exist yet.
---

# Epic Closure Validation

Validates that ALL sub-tickets are complete before an epic can be closed, AND that the closure comment honestly accounts for items considered during the epic — without producing a fan-out of low-value follow-up tickets.

<!-- @protected reason="foundational principle from v4.6; SkillOpt §3.6 protects slow-state content from automated rewrites — removing the analog cost SpreadsheetBench 22pts" -->
**Violating the letter of this skill is violating the spirit of this skill.** Closing an epic with one sub-ticket left "almost done", auto-cancelling unfinished work to clear the queue, accepting an `AC-DEFERRED` without justification, marking a workaround "good enough for now", filing per-surface retrofit tickets to look thorough, or padding the closure-log with non-candidates — all bypass the spirit. Closure requires the work to be done or explicitly descoped, follow-up tickets to clear the impact bar, and the closure-log to reflect honest rejections, not theater. Spirit over letter, always.

### Slow/Meta Update Log
<!-- Append one bullet per audit pass capturing what stayed true across iterations. Initially empty. -->
<!-- @end-protected -->

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
| Convention established without guard or `[prose-only]` tag | BLOCK - Ship the guard (rung 1–5) or obtain explicit user approval for prose-only status |

If ANY blocking condition exists, stop. List all incomplete tickets with their current status and required action. Do not proceed to closure analysis.

### 3. Assess Business Value Delivery

See the Business Value Verification section below.

### 4. Scan for Workarounds

See the Workaround Detection section below.

### 4.5. Audit Convention Guards

See the Convention Guard Audit section below.

### 5. Apply the Follow-Up-Ticket Cap and Boundary Question

See the Follow-Up Ticket Discipline section below.

### 6. Determine Closure Decision

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
| AC-DEFERRED item WITHOUT Deferral Justification block (or with invalid block) | CRITICAL | Block closure immediately. Re-dispatch the deferring agent with "do it now" or surface for user override. See `no-silent-deferrals` skill. |
| AC-DEFERRED item WITH valid Deferral Justification block (catastrophic 1-4) | HIGH | Block closure unless user has dispositioned this specific item as `ACCEPT_DEFERRAL` in an end-of-workflow review |
| Stub or placeholder in production | CRITICAL | Block closure, complete implementation |
| Known security finding unaddressed | CRITICAL | Block closure, fix before shipping |
| Minor code quality note in closure-log (no AC match, impact-bar disqualifying phrasing) | LOW | Allow closure, item stays in closure-log only — do NOT promote to ticket |

## Convention Guard Audit

An epic that introduced a canonical pattern cannot close until the pattern's guard exists. Prose rules don't propagate across amnesiac agent sessions; guards do (field data: guarded conventions had zero post-merge regressions; the most-documented prose rule regressed four times).

### Procedure

1. **Enumerate conventions the epic established.** Sources: the orchestrator log's "Patterns Used" and "Key Interfaces Defined" sections, adaptation reports, and any "always/never" rules added to CLAUDE.md or convention docs during the epic.
2. **For each convention, verify ONE of:**
   - A guard artifact exists on the enforcement ladder (rungs 1–5: type chokepoint, static-guard test, drift test, ratchet, runtime assert) — confirm the artifact file exists and its test passes, don't take the report's word for it.
   - The rule carries an explicit `[prose-only]` tag with a one-line rationale for why no guard can express it.
3. **Neither present → CRITICAL finding, blocks closure** — same severity as a shipped workaround. Resolution: ship the guard now (typically a ~200-line rung-2 test, 1–2 hours — see `production-code-standards` → `references/enforcement-ladder.md`) or surface to the user for explicit prose-only approval.

### Output

The closure comment's `### Convention Guards` table records the audit: Convention | Guard artifact + rung (or `[prose-only]` + rationale) | Verified. This feeds the `convention_guard_check` observability event and the prose-only/enforced counts in `epic_completed`.

## Follow-Up Ticket Discipline

This section replaces the prior "create one retrofit ticket per remaining surface" behavior. Three rules govern when closure can produce follow-up tickets and how many.

### Rule 1: Every Filed Follow-Up Must Clear the Impact Bar

For every ticket the closure phase is about to file (retrofit, deferred-recovery, propagation, or otherwise), the agent must be able to complete this sentence with concrete content:

> "Without this, **[a specific production behavior, user experience, cost, security control, or operational property]** changes for **[an identified code path, user/operator segment, or named operation/system]**."

If either slot is generic ("users", "developers", "the codebase", "maintainability", "code quality", "consistency", "future-proofing"), the item does NOT earn a ticket — it is a closure-log entry. See `no-silent-deferrals` Part 2 for the full impact-bar specification and the disqualifying phrasings list.

### Rule 2: Cross-Cutting Concerns — Answer the Boundary Question First

When the epic established a pattern that future or existing work could violate (a check, a constraint, a guard, a process control, a quality standard), do NOT file one ticket per remaining surface. Apply this decision:

> **"Is there a single point of enforcement that makes the unsafe version impossible to produce — and if so, has this epic installed it?"**

- **Enforcement exists or was installed by this epic** → no propagation tickets. The pattern cannot be skipped by future work. Remaining un-migrated surfaces become a closure-log entry, or a ratchet allowlist that shrinks opportunistically.
- **No single chokepoint is expressible AND the impact bar clears for remaining surfaces** → attempt a **ratchet first** (shrink-only allowlist guard test — it usually replaces the propagation ticket entirely; field data: propagation tickets went 14 opened / 0 closed, ratchets cost ~1-2 hours and never rot). Only if neither a guard nor a ratchet is technically expressible: file ONE propagation epic/ticket with all remaining surfaces enumerated as a checklist in its description. Never one per surface — a propagation epic of per-surface tickets is an anti-pattern.
- **No enforcement viable AND no remaining surface clears the impact bar** → all remaining surfaces become closure-log entries with "no enforcement viable, no current named-impact concern" rationale.

Before falling back to outcomes 2 or 3, the agent must write one sentence stating what boundary mechanism (including a ratchet) was considered and why it isn't expressible here — argued from the architecture. "Not viable" cannot be a free-form opt-out.

See `no-silent-deferrals` Part 3 for the full boundary-question specification and `production-code-standards` → `references/enforcement-ladder.md` for the ratchet recipe.

### Rule 3: Absolute Cap on Closure-Generated Tickets

| Tickets Generated by Closure | Status |
|------------------------------|--------|
| 0–2 | Normal — expected outcome under impact-bar discipline |
| 3 | At the cap — verify each one clears the impact bar; no exceptions |
| 4+ | BLOCK closure — signals impact-bar or boundary-question was not properly applied. Surface to user with the full follow-up list and rationales; user must approve or reject each. |

This replaces the prior "retrofit ticket count > 50% of original sub-ticket count = HIGH" rule. The new cap is absolute and small — it reflects the design intent that closure should mostly produce a closure-log, not a backlog.

**Exception (rare):** if the epic was scoped specifically to *enumerate* known cross-cutting work (e.g., an audit epic whose sole purpose was to catalog surfaces), the cap may be exceeded. The agent must explicitly cite this exception and the original epic AC must support it. Generic "this is a big epic" reasoning does NOT qualify.

## The Considered-But-Not-Pursued Section (Required)

Every epic closure comment must include this section. It is durable, visible to any reviewer, and is the audit trail for what the agent observed and rejected.

### Required Format

```markdown
### Considered but not pursued in this epic

- **[Item]** — Why considered: [the observation]. Why below the bar: [which disqualifying phrasing applies, or which slot of the impact-bar sentence couldn't be filled]. What would change to re-evaluate: [the named condition that would promote this to a real ticket].
- **[Item]** — [same structure]
- (or: "None — all considered items were either completed or filed as tickets.")
```

### Validation Rules

- **Section must exist.** Empty is allowed and is a positive signal — it means the epic scope was well-defined and nothing adjacent surfaced.
- **Items above the bar cannot be parked here.** If the agent can write a passing impact-bar sentence for the item, it must be completed (during the epic) or filed as a ticket (at closure). The closure-log is for rejections only.
- **Items here do not block closure.** They are explicit rejections; closure proceeds normally.
- **Reviewers may promote any item.** A reviewer who disagrees with a rejection creates a regular Linear ticket referencing the closure comment line. No special promotion mechanism is needed.

### Anti-Padding (the new failure mode)

The closure-log will inflate if agents pad it to look thorough. Constrain at closure time:

- Items belong here only if they were one filled-out impact-bar sentence away from being filed as a ticket. Passing thoughts, trivial observations, and items the agent could not have plausibly considered filing get omitted entirely.
- One-line entries only. Bulleted, not narrative.
- If an entry runs more than two short sentences, the agent has probably written a ticket — re-evaluate whether it clears the bar.
- "Considered: variable naming" / "considered: minor style inconsistencies" / "considered: code could be DRYer" — these are NOT closure-log candidates. They are not observations; they are noise.

If the closure-log contains more than ~8 items, the agent is probably padding. Block closure and surface for user review.

## Required Before Closure

| Check | Requirement |
|-------|-------------|
| Sub-tickets | ALL must be Done or Cancelled |
| Security reviews | ALL implementation tickets passed |
| Workarounds | NONE in production code |
| Business value | Original goals must be met |
| Convention guards | Every pattern the epic established has a guard (rung 1–5) or an explicit `[prose-only]` tag |
| Follow-up tickets | ≤3 total, each clears the impact bar, cross-cutting concerns answered the boundary question |
| Considered-but-not-pursued section | Present (may be "None"), reviewed against anti-padding rules |

## When Closure is Blocked

If epic closure is blocked:

1. **LIST** all incomplete tickets with their current status
2. **IDENTIFY** what action is needed for each
3. **DO NOT** proceed with closure analysis
4. **REPORT** clear guidance on next steps

**Block epic closure when work is incomplete. Report all blocking items with clear guidance on required next steps.**

## Red Flags — STOP

When you notice ANY of these in your own thinking or writing, you are about to close an epic that should remain open or fan-out tickets that shouldn't exist. Stop and run the full pre-closure assessment.

- "Almost all tickets are Done, close enough"
- "The remaining tickets are minor, we can ship"
- "There's a TODO in there but it's just a note"
- "AC-DEFERRED items don't really block closure"
- "The workaround works, we'll fix it next quarter"
- "Cancelled tickets are basically done"
- "The security finding is just medium severity"
- "Retrofit tickets will catch anything we missed"
- "I should file one retrofit per remaining surface to be thorough"
- "The pattern is documented in CLAUDE.md, that's enough for closure"
- "The closure-log is empty, let me add some items so it looks complete"
- "The user asked me to close it, so close it"
- A follow-up ticket count growing past 2 as you assess (smell — impact bar not applied)
- A closure-log with more than ~8 items (smell — padding)

**All of these mean: run the assessment procedure** — query sub-tickets, evaluate blocking conditions, scan for workarounds, verify business value, apply the impact bar and boundary question, write the closure-log honestly, then decide. Do not shortcut.

## Rationalizations — STOP

If you think any of these, you are about to close an epic that isn't actually done OR file tickets that shouldn't exist.

| Excuse | Reality |
|--------|---------|
| "Most tickets are Done, the rest can be follow-ups" | Closure requires ALL sub-tickets Done or Cancelled. "Most" is not "all". |
| "The remaining work is minor" | Minor work shipped as a retrofit ticket is more expensive than minor work shipped in the original epic. |
| "The AC-DEFERRED item has a good reason" | "A reason" isn't enough. It needs a Deferral Justification block matching one of four catastrophic conditions — and even then, only if the user has dispositioned it. See `no-silent-deferrals`. |
| "Cancelling the remaining tickets clears the queue" | Cancellation requires a documented reason and business-value verification. It isn't a closure shortcut. |
| "The workaround is acceptable for now" | Workarounds in production code block closure. Period. |
| "Retrofit analysis will catch any gaps" | Retrofit tickets are evidence of failed prevention. Don't pre-emptively rely on them to justify closure. |
| "I should file a ticket per remaining surface for the new pattern" | Apply the boundary question. One enforcement point beats ten propagation tickets. A ratchet usually replaces the propagation ticket entirely; only when neither a guard nor a ratchet is expressible does ONE propagation epic get filed — never N tickets. |
| "The convention is documented, the guard can come later" | An epic that introduced a canonical pattern cannot close until the pattern's guard exists or the user approves `[prose-only]` status. Prose regresses; guards don't. |
| "Codex/lint flagged it so it must be ticket-worthy" | Tool flags are input. Apply the impact bar. Most flagged items below P1 are closure-log. |
| "More items in the closure-log shows I was thorough" | The closure-log is for rejections of plausible ticket candidates. Padding it with trivia is the new failure mode. Trim it. |
| "This generates ten retrofit tickets but that's just how big this epic is" | If closure generates more than 3 follow-ups, the impact bar wasn't applied properly. Block closure, surface to user. |

## Related Skills
- **no-silent-deferrals**: Defines the catastrophic conditions for AC-deferral, the impact bar for would-be tickets, the closure-log outcome, and the boundary question for cross-cutting concerns. Closure validation enforces all four.
- **verify-implementation**: Business value claims ("delivered the epic's goal") require evidence, not assertion
- **production-code-standards**: Workarounds in production code block closure; the enforcement ladder (`references/enforcement-ladder.md`) defines the guards and ratchets the Convention Guard Audit verifies
- **codex-finding-resolution**: Codex P1/P2 findings fix-in-branch; P3 → closure-log. Closure must not file tickets for P3 findings.
- **using-pm-workflow**: Epic closure is the final phase; tickets must have passed security review first

## Additional Resources

- **`references/closure-decision-tree.md`** — Detailed decision matrix for closure scenarios, business value assessment, workaround detection, and follow-up ticket discipline
- **`examples/mixed-closure-scenario.md`** — Walkthrough of a real mixed Done/Cancelled epic closure decision under the new follow-up discipline
