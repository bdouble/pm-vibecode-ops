---
description: Recurring cross-epic entropy audit — mechanical census + judgment review with a machine-diffable scorecard (prose-only count, guard/ratchet inventory, dead machinery, test ballast) and a doc-truth sweep of project memory. The consolidator role no per-ticket phase performs.
workflow-phase: recurring-audit
closes-ticket: false
workflow-sequence: "runs between epics, every 3-6 months or N epics; not part of the ticket pipeline"
---

You are acting as a **Principal Engineer** performing a recurring entropy audit. Every other phase optimizes *within* a ticket or epic; nothing looks *across* epics — so projects accumulate parallel vocabularies for the same concept, duplicate matrices with no drift check, dead-but-maintained machinery, and stale project memory. This audit productizes that consolidator role, and its scorecard is the codebase dashboard a non-engineer operator can read unaided.

**Cadence:** every 3–6 months or every N epics (suggest 10). **Re-audit triggers:** any scorecard delta in the wrong direction, or any session discovering it acted on a project-memory claim that proved false.

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **Post report**: Use `mcp__linear-server__save_comment` on the project or a dedicated audit ticket
- **Search prior audits**: Use `mcp__linear-server__list_comments` / `mcp__linear-server__list_issues`
- **Create tickets** (rare, see Step 5): Use `mcp__linear-server__create_issue`

## Required Input

- **North star (REQUIRED).** A severity-calibration sentence in the operator's own words, e.g. `"workflow completion outranks cost strictness; maintainability outranks scale"`. Every finding is ranked against it. If missing, STOP and ask the user for one — do not invent a default.
- **Scope (optional)** — restrict the audit to a subtree (default: repo root).
- **Since (optional, YYYY-MM-DD)** — focus the judgment layer on code changed since the date (census always runs repo-wide).

## Two-Layer Design (facts first, judgment second — never blended)

Layer 1 is a mechanical census: counts with stated methods, no opinions. Layer 2 is judgment: reading real code on top of those facts and committing to verdicts. Complete Layer 1 fully before starting Layer 2, and keep the report sections clearly separated — census sections are fact, judgment sections are opinion.

## Step 1: Recover the Prior Scorecard (trend baseline)

1. Check `.swarm/entropy/` for the most recent `scorecard-*.json` (local machine).
2. If absent, search Linear for the previous audit comment (search "Entropy Audit Report" in the project) and extract the embedded scorecard JSON.
3. If neither exists, this is a **baseline run** — `deltas_vs_previous` is `null` and the report says so.

## Step 2: Mechanical Census (Layer 1 — facts only)

**Every number must state its method and blind spots** — a count that can't say what it scanned and what it missed is invalid. Populate:

1. **Canonical-pattern coverage** — for each convention the project claims (from AGENTS.md/CLAUDE.md/convention docs), measure actual adoption: e.g., grep route handlers for the mandated validation call; count compliant vs total. One row per concern.
2. **Prose-rule census** — grep project memory + docs for `[enforced:` and `[prose-only]` tags; count total convention rules, tagged-enforced, tagged-prose-only, and untagged (untagged rules are prose-only debt that isn't even counted yet).
3. **Guard/ratchet inventory** — glob `tests/guards/**`, `*.guard.test.*`, lint-config rules referencing project conventions; for ratchets, record current allowlist sizes (and prior sizes if the previous scorecard has them).
4. **Runtime-machinery inventory** — enumerate crons, sweeps, retry tiers, reconciliation jobs, recovery paths (grep for scheduler registrations, queue consumers, retry wrappers). For each: does it have an activation metric, and **has it fired since the problem it guards was fixed?** Zero-activation machinery is a retirement candidate list, not a deletion order.
5. **Test ballast** — mock:integration ratio (files importing mocks vs files touching real infrastructure) and call-count-assertion density (`toHaveBeenCalled*` per test). State the method.
6. **Parallel-vocabulary scan** — same concept under N names (grep candidate concept words across types/enums/tables; e.g., tier/plan/level/sku).

## Step 3: Doc-Truth Sweep (memory vs HEAD vs live)

Treat every load-bearing claim in project memory as a hypothesis: pattern-coverage claims, "X is handled by Y", migration completeness, env-flag postures, "pending" work that may have shipped. Verify against HEAD (grep/read) and, where reachable, the live environment. Each failed verification is a finding — and the correction ships with this audit (edit the stale doc lines directly). List every claim checked with its verdict.

## Step 4: Judgment Layer (Layer 2 — verdicts on top of facts)

Read the code the census flags (bounded sampling — you are judging, not re-running the census). Rules:

**The Pragmatism Filter — every finding must pay in one of five currencies, named explicitly:**
1. A bug class made impossible (a guard/ratchet/type chokepoint closes it)
2. A debugging session shortened (the 3am path gets simpler)
3. A likely change made local (the next probable feature touches one place instead of five)
4. Code deleted (dead machinery, duplicate implementations, ballast tests)
5. Real cost or latency (measured or directly computable, not vibes)

"Cleaner", "more consistent", "best practice", "more maintainable" are NOT currencies — findings justified only by them are CUT before the report. This single rule separates the audit from a refactor wishlist.

**Chesterton's Fence:** every keep/remove/change verdict names the cost of being wrong. "Remove the reconciliation cron (fired 0 times in 4 months)" must include: "if wrong, orphaned runs accumulate silently until the next audit — mitigate by keeping its activation counter and alerting on first fire."

**The Leave It Alone list (MANDATORY):** half the audit's value is the explicit list of things that look like debt but are correctly sized — it prevents the next session from "improving" them. For each entry: what it looks like, why it's actually right, and the cost of "fixing" it. An empty list requires an explicit argument.

**The Forced Stance (MANDATORY):** commit to ONE highest-conviction change — the single thing you'd do first and why it pays in its named currency — or state "nothing worth changing, here's why". Never both, never neither. A hedge-everything report is a failed report.

**Severity calibration:** rank findings against the operator's north star, not a generic rubric. Quote the north-star clause used for any severity call that could surprise.

**Judgment targets:** consolidation candidates (parallel vocabularies, duplicate matrices with no drift test — the fix is usually a rung-3 drift test); ladder promotions (prose-only rules whose nature allows a guard — see the production-code-standards skill's Enforcement Ladder, `codex/skills/production-code-standards/SKILL.md`); machinery retirement (zero-activation machinery whose motivating problem was fixed); test ballast concentration; systemic sources of doc drift.

**Self-validation gate before writing outputs (fix and re-check once if violated):**
- Every recommendation names its currency; every verdict names the cost of being wrong
- Leave It Alone list present (or explicitly argued empty); forced stance present — exactly one change or an argued "nothing"
- No census number restated as a judgment discovery; no opinion stated as fact

## Step 5: Write the Outputs

1. **Scorecard file**: `mkdir -p .swarm/entropy/` then write `scorecard-<YYYY-MM-DD>.json`. Schema (v1 — full field rules in `commands/references/entropy-scorecard-schema.md` of the pm-vibecode-ops repo; fixed top-level keys, deltas computed not estimated):

   ```json
   {
     "schema_version": 1,
     "date": "YYYY-MM-DD",
     "north_star": "<verbatim>",
     "scope": ".",
     "canonical_coverage": [{ "concern": "", "coverage_pct": 0, "method": "", "blind_spots": "" }],
     "prose_rules": { "total": 0, "prose_only": 0, "enforced": 0, "method": "" },
     "guards": { "count": 0, "inventory": [] },
     "ratchets": [{ "artifact": "", "allowlist_size": 0, "previous_size": null }],
     "runtime_machinery": { "count": 0, "zero_activation_count": 0, "method": "", "zero_activation_list": [] },
     "test_ballast": { "mock_to_integration_ratio": 0, "call_count_assertion_density": 0, "method": "" },
     "vocabulary": { "parallel_vocabularies_found": 0, "examples": [] },
     "deltas_vs_previous": null
   }
   ```

2. **Linear comment**: post the full audit report — census summary, doc-truth table, judgment findings, Leave It Alone list, forced stance, and the **complete scorecard JSON in a ```json block** (this is the durable cross-machine trend record).
3. **Tickets (optional, disciplined)**: recommendations the user approves become tickets ONLY if each names its concrete impact, with a ≤3 cap per audit. Most findings should land in the report, not the backlog — the audit's value is the scorecard trend and the one highest-conviction change.

## Step 6: Report to User

Lead with: the scorecard headline deltas (prose-only count ↓ is good, guard count ↑ is good, zero-activation machinery, mock:integration ratio ↑ is bad — each with direction arrows), the forced stance, and the doc-truth corrections applied. Then findings by currency, each with evidence (file:line). Keep it readable by a non-engineer — that is this audit's entire reason for existing.

## Report Format

```markdown
## 🧭 Entropy Audit Report — [date]

### Scorecard Headline (vs [previous date] / BASELINE RUN)
| Metric | Now | Δ | Direction |
|--------|-----|---|-----------|
| Prose-only rules | X | ±N | ✅/⚠️ |
| Guards | X | ±N | ✅/⚠️ |
| Zero-activation machinery | X | ±N | ✅/⚠️ |
| Mock:integration ratio | X | ±N | ✅/⚠️ |

### 🔍 Doc-Truth Sweep
| Claim (source) | Verification | Verdict | Correction |
|----------------|--------------|---------|------------|

### Findings (pragmatism-filtered)
| # | Finding | Currency | Evidence (file:line) | Recommendation | Cost if wrong |
|---|---------|----------|----------------------|----------------|---------------|

### Leave It Alone
| Looks like | Actually | Cost of "fixing" it |
|------------|----------|---------------------|

### Forced Stance
**Highest-conviction change**: [ONE change + its currency + first step]
*(or: "Nothing worth changing — [reasoning]")*

### Cut Findings (logged, not recommended)
- [finding] — cut because its only justification was [cleaner/consistency/etc.]

### Scorecard
[complete scorecard JSON in a fenced json block]
```

## Usage Examples

```
# Standard recurring audit
entropy-audit "workflow completion outranks cost strictness; maintainability outranks scale"

# Scoped to the API layer, focused on the last quarter's changes
entropy-audit "correctness outranks velocity" --scope src/api --since 2026-03-01
```
