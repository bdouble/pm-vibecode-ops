---
allowed-tools: Task, Read, Write, Glob, Grep, LS, Bash(git log:*), Bash(git diff:*), Bash(git show:*), Bash(git rev-parse:*), Bash(mkdir:*), Bash(cat:*), Bash(jq:*), Bash(date:*), Bash(wc:*), Bash(echo:*), Bash(printf:*), Bash(test:*), mcp__linear-server__get_issue, mcp__linear-server__list_issues, mcp__linear-server__list_projects, mcp__linear-server__save_comment, mcp__linear-server__create_issue, mcp__linear-server__list_comments
description: Recurring cross-epic entropy audit — mechanical census + judgment review with a machine-diffable scorecard (prose-only count, guard/ratchet inventory, dead machinery, test ballast) and a doc-truth sweep of project memory. The consolidator role no per-ticket phase performs.
argument-hint: "<north-star>" [--scope path] [--since YYYY-MM-DD] (e.g., /entropy-audit "workflow completion outranks cost strictness; maintainability outranks scale")
workflow-phase: recurring-audit
closes-ticket: false
workflow-sequence: "runs between epics, every 3-6 months or N epics; not part of the ticket pipeline"
---

## MANDATORY: Agent Invocation Required

**You MUST use the Task tool to invoke the `entropy-auditor-agent` for the judgment layer of this audit.** The orchestrator (YOU) runs the mechanical census, recovers the prior scorecard, invokes the agent with both, and writes the outputs.

## Why this command exists

Every other phase optimizes *within* a ticket or epic, and does it well. Nothing looks *across* epics — so projects accumulate parallel vocabularies for the same concept, duplicate matrices with no drift check, dead-but-maintained machinery, and stale project memory. No agent volunteers this analysis because no phase frames it; a non-engineer operator can't see it because they can't read code. This command productizes the consolidator role, and its scorecard is the codebase dashboard an operator can read unaided.

**Cadence:** every 3–6 months or every N epics (suggest 10). **Re-audit triggers:** any scorecard delta in the wrong direction, or any agent reporting it acted on a project-memory claim that proved false.

## Arguments

- **`$1` — north star (required).** A severity-calibration sentence in the operator's own words, e.g. `"workflow completion outranks cost strictness; maintainability outranks scale; surface scale skeletons but mark them defer-ok"`. The judgment layer ranks every finding against it. If missing, STOP and ask the user for one — do not invent a default.
- **`--scope <path>`** — restrict the audit to a subtree (default: repo root).
- **`--since <YYYY-MM-DD>`** — focus the judgment layer on code changed since the date (census always runs repo-wide).

## Step 1: Recover the prior scorecard (trend baseline)

1. Check `.swarm/entropy/` for the most recent `scorecard-*.json` (local machine).
2. If absent, search Linear for the previous audit comment (search for "Entropy Audit Report" in the project) and extract the embedded scorecard JSON.
3. If neither exists, this is a **baseline run** — `deltas_vs_previous` will be `null` and the report says so.

## Step 2: Mechanical census (Layer 1 — facts only, no opinions)

Run the census yourself with Grep/Glob/Bash. **Every number must state its method and blind spots** — a count that can't say what it scanned and what it missed is invalid. Populate the scorecard fields per `commands/references/entropy-scorecard-schema.md`:

1. **Canonical-pattern coverage** — for each convention the project claims (from CLAUDE.md/convention docs), measure actual adoption: e.g., grep route handlers for the mandated validation call; count compliant vs total. One row per concern.
2. **Prose-rule census** — grep CLAUDE.md + docs for `[enforced:` and `[prose-only]` tags; count total convention rules, tagged-enforced, tagged-prose-only, and untagged (untagged rules are prose-only debt that isn't even counted yet).
3. **Guard/ratchet inventory** — glob `tests/guards/**`, `*.guard.test.*`, lint-config rules referencing project conventions; for ratchets, record current allowlist sizes (and prior sizes if the previous scorecard has them).
4. **Runtime-machinery inventory** — enumerate crons, sweeps, retry tiers, reconciliation jobs, recovery paths (grep for scheduler registrations, queue consumers, retry wrappers). For each: does it have an activation metric (counter/log), and **has it fired since the problem it guards was fixed?** Zero-activation machinery is a retirement candidate list, not a deletion order.
5. **Test ballast** — mock:integration ratio (files importing mocks vs files touching real infrastructure) and call-count-assertion density (`toHaveBeenCalled` per test). State the method.
6. **Parallel-vocabulary scan** — same concept under N names (grep candidate concept words across types/enums/tables; e.g., tier/plan/level/sku).

## Step 3: Doc-truth sweep (memory vs HEAD vs live)

Treat every load-bearing claim in project memory as a hypothesis: pattern-coverage claims, "X is handled by Y", migration completeness, env-flag postures, "pending" work that may have shipped. Verify against HEAD (grep/read) and, where reachable, the live environment. Each failed verification is a finding — and the correction ships with this audit (edit the stale CLAUDE.md/doc lines directly). List every claim checked with its verdict.

## Step 4: Invoke the entropy-auditor-agent (Layer 2 — judgment on top of facts)

Use the Task tool with `entropy-auditor-agent`. Embed in the prompt: the north star verbatim, the complete census tables from Step 2, the doc-truth results from Step 3, the prior scorecard + computed deltas, and the scope/since arguments. The agent reads real code on top of the census facts and returns the structured report (see the agent file for its contract): pragmatism-filtered findings, the Leave It Alone list, the forced stance, and recommendation rationales.

**Validation gate (re-dispatch once if violated):**
- Every recommendation names its currency (one of five: bug class made impossible, debugging session shortened, likely change made local, code deleted, real cost/latency) — "cleaner/more consistent/best practice" findings are rejected.
- Every keep/remove verdict names the cost of being wrong (Chesterton's fence).
- The "Leave It Alone" section exists and is non-empty unless explicitly argued ("nothing looks deceptively like debt here because…").
- The forced stance exists: ONE highest-conviction change, or "nothing worth changing, here's why." A hedge-everything report is a failed report.

## Step 5: Write the outputs

1. **Scorecard file**: `mkdir -p .swarm/entropy/` then write `scorecard-<YYYY-MM-DD>.json` per the schema (computed in Step 2, deltas against Step 1).
2. **Linear comment**: post the full audit report to the project (or a dedicated audit ticket) with `mcp__linear-server__save_comment` — census summary, doc-truth table, judgment findings, Leave It Alone list, forced stance, and the **complete scorecard JSON in a ```json block** (this is the durable cross-machine trend record).
3. **Observability**: append one `entropy_scorecard_recorded` event to `.swarm/observability/_audit.jsonl`:
   ```json
   {"ts":"<iso8601>","epic_id":null,"ticket_id":null,"phase":null,"event":"entropy_scorecard_recorded","data":{"scorecard_path":".swarm/entropy/scorecard-<date>.json","north_star":"<verbatim>","headline_deltas":{...}|null,"highest_conviction_change":"<one line>"}}
   ```
4. **Tickets (optional, disciplined)**: recommendations the user approves become tickets ONLY through the impact bar (`no-silent-deferrals` Part 2), with the ≤3 cap. Most findings should land in the report, not the backlog — the audit's value is the scorecard trend and the one highest-conviction change.

## Step 6: Report to user

Lead with: the scorecard headline deltas (prose-only count, guard count, zero-activation machinery, mock:integration ratio — each with direction arrows), the forced stance, and the doc-truth corrections applied. Then findings by currency. Keep it readable by a non-engineer — that is this command's entire reason for existing.

## Required Skills
- **swarm-observability** — workflow-performance questions route to `/swarm-stats`, not this audit; this audit covers the *codebase*
- **no-silent-deferrals** — the impact bar gates any ticket this audit files; the symmetric bar informs the machinery census
- **model-aware-behavior** — verification over recall is the doc-truth sweep's doctrine
- **verify-implementation** — every census number needs its method; every claim needs evidence

## Usage Examples

```bash
# Standard recurring audit
/entropy-audit "workflow completion outranks cost strictness; maintainability outranks scale"

# Scoped to the API layer, focused on the last quarter's changes
/entropy-audit "correctness outranks velocity" --scope src/api --since 2026-03-01
```
