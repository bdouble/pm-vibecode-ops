# Skills: Auto-Activated Quality Enforcement

Skills are contextual capabilities that Claude automatically activates based on what you're doing. Unlike slash commands (which you explicitly invoke with `/command`), skills activate proactively when relevant.

**Official Documentation**: [Claude Code Skills](https://code.claude.com/docs/en/skills)

## How Skills Work

**Commands** = Explicit workflow phases you invoke (`/implementation`, `/testing`)
**Skills** = Standards that auto-activate during development

```
Skills (preventive)     →  Your Work  →  Commands (verification)
"Enforce while working"    [code/docs]    "Review what was done"
```

Skills shift enforcement LEFT - catching issues during creation rather than at review phases.

## Available Skills

### 1. production-code-standards

**Activates when**: Writing code, implementing features, fixing bugs, creating services — and (v5.0) establishing any convention or "always/never" rule other code must follow

**Enforces**:
- No workarounds or temporary solutions
- No fallback logic that hides errors
- No TODO/FIXME/HACK comments
- No mocked services in production code
- No speculative abstractions or "flexibility" nobody requested
- Fail-fast error handling
- Repository pattern for data access
- **The enforcement ladder (v5.0)**: conventions ship their structural guard in the same PR — rung 1 (type chokepoint), 2 (static-guard test), 3 (drift test), 4 (ratchet), 5 (runtime assert), or 6 (prose, tagged `[prose-only]` with rationale). Guarded rules get one-line `[enforced:]` pointers. Full recipes: `references/enforcement-ladder.md`

**Example trigger**: "Implement the user registration endpoint" or "I'll document the convention for future agents"

### 2. service-reuse

**Activates when**: Creating new services, utilities, helpers, middleware, guards, infrastructure

**Enforces**:
- Check service inventory before creating anything new — the inventory is context ("where things live in this codebase"), not policing
- Reuse existing authentication services
- Reuse existing validation utilities
- Extend existing base classes
- Use event-driven patterns over direct coupling

**Why it survived the v5.0 recalibration**: duplication is the one AI-era code-quality failure that never faded — GitClear's 211M-line longitudinal data shows duplicated blocks up 8x and copy/paste exceeding refactoring for the first time (see `docs/MODEL_CALIBRATION.md`)

**Example trigger**: "Create a new email notification service"

### 3. testing-philosophy

**Activates when**: Writing tests, debugging test failures, improving coverage — or when tempted to skip/delete a failing test, chase a coverage number, or assert how a function was called rather than what it produced

**Enforces**:
- Fix existing broken tests BEFORE writing new tests (Gate 0); never remove, skip, or edit a failing test just to make it pass
- Verify actual API via code reading before testing
- Tests must compile (zero TypeScript errors)
- Tests must execute (zero runtime errors)
- Strategic test creation (quality over coverage)
- No hard-coded values or special-casing to make specific test inputs pass
- **Anti-Ballast Doctrine (v5.0)**: test mass is not confidence — assert behavior and contracts, not call shapes; a handful of real-infrastructure integration tests outrank thousands of mocked unit tests for the data layer; static guards count as tests; watch the mock:integration ratio (`/entropy-audit` trends it)

**Example trigger**: "Write tests for the payment module"

### 4. mvd-documentation

**Activates when**: Writing JSDoc, README files, API docs, inline comments — or documenting a convention in project memory (CLAUDE.md, convention docs)

**Enforces**:
- Document "why", not "what" (TypeScript shows "what")
- No type duplication in JSDoc for TypeScript
- Security-sensitive functions require documentation
- No placeholder content (TODO, TBD)
- Complete documentation or none
- **Status tags + pruning (v5.0)**: every documented convention carries `[enforced: <artifact>]` (guarded — prose retires to a one-line pointer) or `[prose-only]` (with one line on why no guard can express it); when a guard ships, the paragraph is pruned in the same change. The `[prose-only]` count is the trendable discipline-debt metric

**Example trigger**: "Document the authentication API"

### 5. security-patterns

**Activates when**: Writing auth code, input handling, API endpoints, database queries

**Enforces**:
- Authentication on every protected endpoint
- Authorization checks on data access
- Parameterized queries (no SQL injection)
- Input validation at system boundaries
- No sensitive data in error responses
- Security event logging
- **Recurring rules become guards (v5.0, Step 5)**: recurring security rules ("every mutation handler validates input", "all webhook handlers verify signatures") are prime rung-2 guard candidates — ship the source-scanning guard test instead of re-flagging the rule per-surface at review time

**Example trigger**: "Add login endpoint with password validation"

### 6. model-aware-behavior

**Activates when**: About to act on a claim from docs, project memory, or a ticket without verifying it against the actual code; tempted to guess a signature or import path from memory; or about to make unrequested improvements ("while I'm here…")

**Enforces** (rewritten in v5.0 — Verification Over Recall + Scope Control):
- Docs, project memory, and tickets are hypotheses about the code, not facts — verify load-bearing claims against HEAD before acting on them
- A claim that fails verification is itself a finding; fixing the stale memory is part of the ticket
- Read what you modify; verify what you rely on — never speculate about code not yet inspected
- Make only requested changes (no unrequested improvements, refactors, or "flexibility" for hypothetical futures — the most common way strong models damage a codebase today)
- No helpers/utilities for one-time operations
- The three-question gate before any change beyond the explicit request: Was it requested? Is it required? Is this the smallest change that works?

**Example trigger**: "The CLAUDE.md says the migration is complete" or "While I'm here, I'll also refactor this"

### 7. using-pm-workflow

**Activates when**: User asks "what command do I run", "where do I start", "what's next", or is unsure which workflow phase to invoke

**Enforces**:
- Follow the correct workflow phase sequence
- Use project-level commands (phases 1-4) for new projects
- Use ticket-level commands (phases 5-10) for each ticket — `/execute-ticket` recommended
- `/close-epic` after all tickets complete; **`/entropy-audit` (v5.0)** as recurring maintenance every 3–6 months or ~10 epics, or when project memory looks stale
- Explain technical decisions clearly for non-engineers

**Example trigger**: Session start, or "What command should I use?"

### 8. verify-implementation

**Activates when**: Claiming any work is complete, fixed, or passing; before committing, creating PRs, or marking tickets done

**Enforces**:
- Never claim completion without verification evidence
- Run actual tests before saying "tests pass"
- Execute builds before saying "build succeeds"
- Demonstrate features before saying "feature works"
- Show output/evidence for every completion claim — a claim without a tool result behind it is a fabrication
- Avoid speculation phrases like "should work" or "probably passes"
- Verify subagent success reports independently (check the diff, run the tests) — an agent's self-report is a claim, not evidence

**Why it was strengthened in v5.0**: fabricated completion claims are the one agentic failure mode that has *worsened* with model capability (see `docs/MODEL_CALIBRATION.md`) — this is the best-supported guardrail class in the toolkit

**Example trigger**: "I've finished implementing the feature"

### 9. divergent-exploration

**Activates when**: Creating features, designing architecture, planning epics, solving complex problems

**Enforces**:
- Generate 3-5 genuinely distinct approaches before converging
- Never jump to "the obvious solution" without exploring alternatives
- Evaluate trade-offs across dimensions (user impact, complexity, time, dependencies)
- Present options with clear pros/cons before recommending
- Document why alternatives were rejected

**Example trigger**: "Design the notification system architecture"

### 10. epic-closure-validation

**Activates when**: Closing epics, marking epics complete, finishing epic-level work — or when the epic established a convention whose guard may not exist yet

**Enforces**:
- ALL sub-tickets must be Done or Cancelled before epic closure
- No workarounds or temporary solutions shipped in any ticket
- Business value was delivered against original success criteria
- **Convention Guard Audit (v5.0, Step 4.5)**: every convention the epic established has a verified guard artifact (enforcement-ladder rung 1–5) or an explicit `[prose-only]` tag with rationale — neither present is a CRITICAL finding that blocks closure
- Follow-up discipline: ≤3 closure-generated tickets, each past the impact bar; ratchets preferred over propagation tickets
- Block closure if any sub-ticket is incomplete

**Example trigger**: "Close EPIC-123" or "Mark epic as done"

### 11. systematic-debugging

**Activates when**: Encountering bugs, test failures, build errors, runtime exceptions, or unexpected behavior

**Enforces**:
- Root cause investigation before any fix attempt
- 4-phase process: investigate → analyze → hypothesize → implement
- No guessing, no "quick fixes", no multiple changes at once
- 3-fix architectural stop: if 3 consecutive fixes fail, escalate to user
- State hypothesis explicitly before changing code
- Before/after evidence for every bug fix (ties to verify-implementation)

**Example trigger**: "Tests are failing" or "This endpoint returns a 500 error"

### 12. no-silent-deferrals

**Activates when**: An agent is about to defer in-scope work — especially when saying "I'll defer", "follow-up ticket", "TODO", "out of scope", "future work", "subsequent iteration", "downstream", "punt to". Also when writing a Deferred Items table entry for any acceptance-criterion-related work, or (v5.0) when proposing defensive runtime machinery — a retry tier, reconciliation job, sweep, or recovery cron — "just in case".

**Enforces**:
- Default disposition: complete the work in scope. Deferral is the most expensive disposition.
- Four catastrophic conditions are the ONLY valid deferral reasons (external dep unavailable, schema collision with in-flight ticket, unobtainable stakeholder info, AC modification requiring user authorization)
- No time-based or effort-based escape hatch ("complex," "tricky," "would take time" are all invalid)
- AC-DEFERRED entries MUST include the `### Deferral Justification (CATASTROPHIC — required)` block with four populated fields
- Orchestrator re-dispatches agents that defer without valid justification (max 1 re-dispatch per phase)
- Silent deferrals (work omitted without a Deferred Items entry) are detected at code review as SCOPE_GAP
- **The Symmetric Bar (v5.0)**: the impact bar applies symmetrically to ADDING defensive machinery — building a retry tier/sweep/reconciliation job requires a concrete observed failure (an incident, a red test, a logged error), not "this could theoretically fail". Machinery that clears the bar ships with its activation metric; `/entropy-audit` later flags zero-activation machinery for retirement. Same rigor for new vendor/SaaS dependencies
- Cross-cutting concerns answer the boundary question — a guard or ratchet beats per-surface propagation tickets (field data: 14 opened / 0 closed)

**Example trigger**: "This edge case is tricky, I'll create a follow-up ticket" or "A reconciliation cron here would make this more resilient"

### 13. codex-finding-resolution

**Activates when**: A Codex review report is open and findings need triage; an agent is about to file a follow-up ticket from a Codex review; or the operator asks how to handle a specific finding.

**Enforces**:
- P1/P2 default disposition is fix-now in the current branch (no follow-up sprawl)
- P3 findings go to the closure-log, never to a standalone ticket
- `SCOPE_EXPANSION_ESCAPE` (file a ticket instead of fixing) requires touching a different module entirely OR 3+ files outside the ticket's AC scope, with an impact-bar rationale — "complex", "tricky", "would take a while" are disqualifying
- Findings are paired to a disposition record (`codex_finding_resolved` or `codex_scope_escape`) in the observability stream for auditability

**Example trigger**: "Codex flagged a P2 missing-null-check in three places — should I file a follow-up?"

### 14. swarm-phase-reporting

**Activates when**: Inside `/epic-swarm` after a phase completes for a ticket; the orchestrator is about to advance to the next phase without posting the prior phase's Linear comment.

**Enforces**:
- Every phase posts its structured report to the sub-ticket as a Linear comment BEFORE the next phase begins
- Phase reports follow the canonical template (Status / Summary / Files Changed / Issues / Recommendations)
- Per-phase required-field validation — the Code Review report (v5.0) must include a Convention Guard Verification section alongside Review Status, Requirements Checklist, and Files Reviewed
- The hard checkpoint at the end of the per-ticket pipeline verifies all 7 phase reports exist; a missing report blocks the ticket from advancing to merge

**Example trigger**: Phase transition inside `/epic-swarm` after testing completes for a sub-ticket

### 15. swarm-observability (v4.7)

**Activates when**: Operator asks any meta-question about workflow performance ("is the workflow working", "are we deferring too much", "what's our profile mix", "did the impact bar help", "how many follow-ups did this epic file", "what's the codex auto-fix rate"). Also when about to count Linear comments by hand to answer one of those questions or about to grep `.swarm/observability/*.jsonl` directly.

**Enforces**:
- Consult the observability stream FIRST — not Linear comments, not orchestrator logs, not memory
- Use `/swarm-stats` or `scripts/swarm-stats.sh`, never ad-hoc `jq` on the JSONL (re-introduces bugs the dashboard already fixed)
- The stream's 17 event types (v5.0) fall into six families — profile lifecycle, phase lifecycle, deferral discipline, judgment scaffolding, convention guards + audit (`convention_guard_check`, `entropy_scorecard_recorded`), and codex + lifecycle
- Map the user's question to the dashboard section that answers it; don't dump the whole dashboard for one question
- Pre-v4.7 epics get a legacy badge; do NOT infer or backfill missing v4.5/v4.6 data

**Example trigger**: "Did the impact bar reduce sprawl on the last epic?" or "Are we deferring too aggressively this quarter?"

### 16. closure-log-aggregation (v4.7)

**Activates when**: Running `/close-epic`; about to file the epic closure comment; the operator asks "what did we consider but not pursue in this epic"; or about to summarize the surfaced-but-deferred work.

**Enforces**:
- Fetch the closure-log section from every sub-ticket's phase comments — no "I'll grep for it" shortcut
- Recognize BOTH `##` and `###` heading levels (v4.6.0 vs v4.6.1+ drift); aggregating only one form drops entries silently
- Aggregate verbatim with per-ticket attribution stamps; deduplicate ONLY when entries are byte-identical
- Empty is empty — never invent placeholder content; many sub-tickets with zero closure-log entries is a discipline signal, not a clean result

**Example trigger**: `/close-epic EPIC-456` reaches Step 3 (closure-log aggregation)

## Skills vs Commands vs Agents

| Aspect | Skills | Commands | Agents |
|--------|--------|----------|--------|
| **Invocation** | Auto (contextual) | Explicit (`/command`) | Via commands |
| **Purpose** | Enforce standards | Execute workflow phases | Provide expertise |
| **Timing** | During work | Deliberate phases | During phases |
| **Output** | Inline guidance | Deliverables | Task completion |

## How Skills Complement the Workflow

The pm-vibecode-ops workflow has 11 phases (4 project-level + 6 ticket-level + 1 epic-level). Sixteen skills add a proactive enforcement layer:

```
Traditional:
  /implementation → code with issues → /codereview catches issues → fix

With Skills:
  /implementation → skill prevents issues → /codereview (fewer issues)
```

**Example flow**:

1. You run `/implementation` for a ticket
2. **production-code-standards** skill activates as Claude writes code
3. Claude refuses to add a TODO comment (skill enforcement)
4. Claude uses existing auth service (service-reuse skill)
5. You run `/codereview`
6. Fewer issues found because skills prevented them

## Skill Strictness

All skills in this repo use **strict enforcement**:
- Skills actively block prohibited patterns
- Claude will refuse to write code that violates skills
- No "warnings only" - violations are blocked

## Installation

### Plugin Installation (Recommended)

Skills are automatically installed when you install the PM workflow plugin:

```bash
# Add the marketplace
/plugin marketplace add bdouble/pm-vibecode-ops

# Install from marketplace
/plugin install pm-vibecode-ops@pm-vibecode-ops
```

This installs all 16 skills automatically along with commands, agents, and hooks.

### Manual Installation (Not Recommended)

If you prefer to install skills manually:

```bash
# Global installation (all projects)
mkdir -p ~/.claude/skills
cp -r skills/* ~/.claude/skills/

# Project-specific installation
mkdir -p .claude/skills
cp -r /path/to/pm-vibecode-ops/skills/* .claude/skills/
```

### Verify Installation

For plugin installation:
```bash
/plugin list
# Should show: pm-vibecode-ops
```

For manual installation, skills should be in:
- **Global**: `~/.claude/skills/[skill-name]/SKILL.md`
- **Project**: `.claude/skills/[skill-name]/SKILL.md`

## Repository Location

In this repository, skill definitions are stored in:
```
skills/
├── closure-log-aggregation/    # v4.7 — aggregate considered-but-not-pursued entries at epic close
├── codex-finding-resolution/   # P1/P2 fix-now, P3 closure-log, scope-expansion escape gate
├── divergent-exploration/
├── epic-closure-validation/
├── model-aware-behavior/
├── mvd-documentation/
├── no-silent-deferrals/        # impact bar + four-catastrophic-condition deferral gate
├── production-code-standards/
├── security-patterns/
├── service-reuse/
├── swarm-observability/        # v4.7 — when to consult /swarm-stats vs reconstruct from Linear
├── swarm-phase-reporting/      # per-phase Linear comment posting + hard-checkpoint
├── systematic-debugging/
├── testing-philosophy/
├── using-pm-workflow/
└── verify-implementation/
```

## SkillOpt Protected Regions (v4.7)

Thirteen skills carry a `<!-- @protected -->` envelope around their foundational "Violating the letter is violating the spirit" principle. Per SkillOpt §3.6 (Yang et al., 2026), protected regions are the highest-ablation safety mechanism for skill files — removing the analog cost SpreadsheetBench 22 points (77.5 → 55.0).

CI gate: `bash scripts/validate-skill-invariants.sh main` fails (exit 2) if a protected region is modified without an adjacent `<!-- @override approved-by="<name>" reason="<one-line>" -->` marker in the same diff hunk. The validator aligns to the merge-base (so PR validation isn't fooled by main moving forward), detects pure insertions inside protected regions, and pairs each override marker to its specific hunk so a single marker cannot silence multiple unrelated edits.

Three reference skills are intentionally NOT wrapped (no foundational principle to protect): `using-pm-workflow`, `codex-finding-resolution`, `swarm-phase-reporting`. See `docs/SKILL_AUDIT_PLAYBOOK.md` for the discipline-vs-reference classification and the operator workflow for proposing audit-driven changes.

## Creating Custom Skills

To add a new skill to your installation:

1. Create directory: `~/.claude/skills/[skill-name]/` (global) or `.claude/skills/[skill-name]/` (project)
2. Create `SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: When to activate. Use keywords that match user intent.
---

# Skill Title

Instructions for Claude when skill is active...
```

**Key points**:
- `description` determines when skill activates - use specific trigger keywords
- Name must be lowercase with hyphens (max 64 chars)
- Instructions should be actionable and enforceable

## Troubleshooting

**Skill not activating?**
- Ensure skill is installed to `~/.claude/skills/[name]/SKILL.md` or `.claude/skills/[name]/SKILL.md`
- Check the `description` field has relevant keywords
- Verify YAML frontmatter syntax is valid

**Skill too aggressive?**
- Refine the description to be more specific about when to activate
- Add "Use when" phrases to narrow context

**Skill conflicts with command?**
- Skills provide standards, commands provide workflow
- They should complement, not conflict
- If conflict occurs, command takes precedence during its phase
