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

**Activates when**: Writing code, implementing features, fixing bugs, creating services

**Enforces**:
- No workarounds or temporary solutions
- No fallback logic that hides errors
- No TODO/FIXME/HACK comments
- No mocked services in production code
- Fail-fast error handling
- Repository pattern for data access

**Example trigger**: "Implement the user registration endpoint"

### 2. service-reuse

**Activates when**: Creating new services, utilities, helpers, middleware, guards, infrastructure

**Enforces**:
- Check service inventory before creating anything new
- Reuse existing authentication services
- Reuse existing validation utilities
- Extend existing base classes
- Use event-driven patterns over direct coupling

**Example trigger**: "Create a new email notification service"

### 3. testing-philosophy

**Activates when**: Writing tests, debugging test failures, improving coverage

**Enforces**:
- Fix existing broken tests BEFORE writing new tests
- Verify actual API via code reading before testing
- Tests must compile (zero TypeScript errors)
- Tests must execute (zero runtime errors)
- Strategic test creation (quality over coverage)

**Example trigger**: "Write tests for the payment module"

### 4. mvd-documentation

**Activates when**: Writing JSDoc, README files, API docs, inline comments

**Enforces**:
- Document "why", not "what" (TypeScript shows "what")
- No type duplication in JSDoc for TypeScript
- Security-sensitive functions require documentation
- No placeholder content (TODO, TBD)
- Complete documentation or none

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

**Example trigger**: "Add login endpoint with password validation"

### 6. model-aware-behavior

**Activates when**: Exploring codebases, proposing code changes, making architectural decisions, using tools for code modification

**Enforces**:
- Read all relevant files before proposing any changes
- Never speculate about code not yet inspected
- Search for existing implementations before creating new ones
- Make only requested changes (no unrequested improvements)
- No helpers/utilities for one-time operations
- Parallel tool execution when operations are independent

**Example trigger**: "Implement the user profile feature"

### 7. using-pm-workflow

**Activates when**: Starting any PM workflow session, before responding to requests, when switching contexts, or when unsure which command to use

**Enforces**:
- Check which skills apply BEFORE any action (including clarifying questions)
- Follow the correct workflow phase sequence
- Use project-level commands (phases 1-4) for new projects
- Use ticket-level commands (phases 5-10) for each ticket
- Explain technical decisions clearly for non-engineers

**Example trigger**: Session start, or "What command should I use?"

### 8. verify-implementation

**Activates when**: Claiming any work is complete, fixed, or passing; before committing, creating PRs, or marking tickets done

**Enforces**:
- Never claim completion without verification evidence
- Run actual tests before saying "tests pass"
- Execute builds before saying "build succeeds"
- Demonstrate features before saying "feature works"
- Show output/evidence for every completion claim
- Avoid speculation phrases like "should work" or "probably passes"

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

**Activates when**: Closing epics, marking epics complete, finishing epic-level work

**Enforces**:
- ALL sub-tickets must be Done or Cancelled before epic closure
- No workarounds or temporary solutions shipped in any ticket
- Business value was delivered against original success criteria
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

**Activates when**: An agent is about to defer in-scope work — especially when saying "I'll defer", "follow-up ticket", "TODO", "out of scope", "future work", "subsequent iteration", "downstream", "punt to". Also when writing a Deferred Items table entry for any acceptance-criterion-related work.

**Enforces**:
- Default disposition: complete the work in scope. Deferral is the most expensive disposition.
- Four catastrophic conditions are the ONLY valid deferral reasons (external dep unavailable, schema collision with in-flight ticket, unobtainable stakeholder info, AC modification requiring user authorization)
- No time-based or effort-based escape hatch ("complex," "tricky," "would take time" are all invalid)
- AC-DEFERRED entries MUST include the `### Deferral Justification (CATASTROPHIC — required)` block with four populated fields
- Orchestrator re-dispatches agents that defer without valid justification (max 1 re-dispatch per phase)
- Silent deferrals (work omitted without a Deferred Items entry) are detected at code review as SCOPE_GAP

**Example trigger**: "This edge case is tricky, I'll create a follow-up ticket" or "Adding TODO for the rate limit"

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
- The hard checkpoint at the end of the per-ticket pipeline verifies all 7 phase reports exist; a missing report blocks the ticket from advancing to merge

**Example trigger**: Phase transition inside `/epic-swarm` after testing completes for a sub-ticket

### 15. swarm-observability (v4.7)

**Activates when**: Operator asks any meta-question about workflow performance ("is the workflow working", "are we deferring too much", "what's our profile mix", "did the impact bar help", "how many follow-ups did this epic file", "what's the codex auto-fix rate"). Also when about to count Linear comments by hand to answer one of those questions or about to grep `.swarm/observability/*.jsonl` directly.

**Enforces**:
- Consult the observability stream FIRST — not Linear comments, not orchestrator logs, not memory
- Use `/swarm-stats` or `scripts/swarm-stats.sh`, never ad-hoc `jq` on the JSONL (re-introduces bugs the dashboard already fixed)
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
