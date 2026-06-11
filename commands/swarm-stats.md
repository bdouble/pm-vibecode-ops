---
description: Render an observability dashboard for an epic or solo ticket — phase activity, deferral discipline, impact-bar rejections, codex findings, follow-up cap, profile distribution. Shells out to scripts/swarm-stats.sh.
allowed-tools: Bash, Bash(jq:*), Bash(ls:*), Read
argument-hint: <epic-id-or-ticket-id> [--per-skill] [--audit-deltas]
---

# /swarm-stats

Render a single dashboard view of the JSONL observability stream (v5.0 schema, 17 event types) for an epic (or a standalone `/execute-ticket` run). Discoverable in-session interface for the same logic that powers `scripts/swarm-stats.sh` — CI/dashboards/alerts call the shell script directly; operators use this slash command.

## Input

- `$ARGUMENTS` — required. Either:
  - An epic ID (e.g., `PRO-1156`) — renders the full epic dashboard from `.swarm/observability/<epic-id>/`
  - A ticket ID (e.g., `PRO-1167`) — renders a single-ticket view (looks in `_solo/` first, then walks epic dirs)
- Optional flags:
  - `--per-skill` — render per-skill activation + compliance drill-down (SkillOpt principle: aggregate metrics hide per-skill movement)
  - `--audit-deltas` — render audit-pass compliance trajectory from `.swarm/skill-audits/<skill>/edit-apply-report.jsonl` (Tier 5f deliverable; renders empty if no audit infrastructure yet)

## What it does

1. **Locate target**: Validate `$ARGUMENTS` resolves to an existing observability stream. If `.swarm/observability/<epic-id>/` doesn't exist and `_solo/<ticket-id>.jsonl` doesn't exist, fail with a clear message naming the locations checked.

2. **Detect legacy data**: Pre-v4.7 JSONL files only contain `profile_assigned` events. Render with a "**Pre-v4.7 epic — partial data only**" badge in the dashboard header; missing-metric cells display `—`. Per Tier 3 decision #5: no backfill in v4.7.

3. **Shell out**: Resolve `scripts/swarm-stats.sh` against the repo root and call it with the parsed argv, NOT a single quoted blob. `bash $REPO_ROOT/scripts/swarm-stats.sh $TARGET $FLAGS` (let the shell word-split `$ARGUMENTS` into TARGET + flags first; passing `"$ARGUMENTS"` as one quoted argv slot collapses `PRO-1156 --per-skill` into a single TARGET string and the flag never reaches arg parsing). Stream the output verbatim. The shell script owns formatting and aggregation logic — keep this slash command thin so CI and operators see identical output.

4. **Surface the headline number**: After the dashboard prints, add a one-line summary highlighting the most important signal: deferral acceptance rate trend, impact-bar rejection count, or follow-up cap compliance.

## Expected dashboard layout (default, no flags)

Matches what `scripts/swarm-stats.sh` actually emits. Counts come from the per-ticket stream (`.swarm/observability/<epic-id>/<ticket-id>.jsonl`) except `IMPACT BAR & CLOSURE-LOG` and `LIFECYCLE: Epics completed`, which read the epic-level stream (`_epic.jsonl`).

```
EPIC PRO-1156 — 10 ticket(s)
PROFILES
├── MINIMAL:  3 ticket(s)
├── STANDARD: 7 ticket(s)
└── STRICT:   0 ticket(s)   (overrides: 0)

PHASES
├── Live dispatched:  47 (47 completed)
└── Skipped via N/A:  23

DEFERRAL DISCIPLINE
├── Re-dispatched:   9
└── Accepted:        3   (catastrophic-justified)

IMPACT BAR & CLOSURE-LOG
├── Closure-log entries:  28
├── Boundary-question:    2
└── Follow-up cap blocks: 0

CODEX REVIEW
├── Findings resolved:   23
├── Auto-fixed:          18
├── User-escalated:      2
├── Closure-log (P3):    3
└── SCOPE_ESCAPE filed:  0

LIFECYCLE
├── Tickets completed:   10
├── Tickets failed:      0
└── Epics completed:     1

DISCIPLINE DEBT (conventions & guards)
├── Guard checks emitted:     11
├── Missing guards flagged:   0   (should be 0 — each blocked a review or closure)
├── Prose-only rules (last epic_completed): 22   (↓ is better)
└── Enforced rules (last epic_completed):   15   (↑ is better)

ENTROPY AUDIT (latest scorecard: scorecard-2026-06-11.json)
├── Prose-only: 22   Guards: 10   Zero-activation machinery: 5
└── Mock:integration ratio: 5.4

Headline: 12 deferral attempt(s) — 9 rejected (75%), 3 accepted as catastrophic-justified.
```

The `DISCIPLINE DEBT` section is the operator-readable enforcement dashboard (v5.0): prose-only counts should trend down as guards ship; missing-guard flags should be zero. The deferral/redispatch counters double as **recalibration signals** — machinery that fires ~0 times across many consecutive epics is a retirement candidate per the countermeasure ledger in `docs/MODEL_CALIBRATION.md`. The `ENTROPY AUDIT` block appears only when `.swarm/entropy/` scorecards exist (see `/entropy-audit`).

## Expected dashboard with `--per-skill`

**Status (v4.7):** The `--per-skill` flag is wired into the script but its data source — `skill_activated` JSONL events from Tier 5 audit instrumentation — is **not yet emitted in v4.7**. The flag currently renders a placeholder:

```
------------------------------------------------------------
PER-SKILL ACTIVATION (SkillOpt principle: drill down, never trust aggregate)

  (per-skill metrics require skill_activated events from Tier 5 audit instrumentation.
   These events are NOT yet emitted in v4.7 — Tier 5 deliverable. Placeholder for now.)
```

The target shape, once `skill_activated` events ship in v4.8+, will look like:

```
SKILL                          ACTIVATIONS  COMPLIANCE  NOTES
no-silent-deferrals            24×          96%         1 violation: PRO-1158 silent defer
production-code-standards      47×          100%
service-reuse                  11×          91%         1 new service when reuse possible
verify-implementation          19×          100%
testing-philosophy              7×          100%
mvd-documentation              14×           93%        1 over-documented internal helper
security-patterns               7×          100%
codex-finding-resolution        7×           86%        1 P3 ticket filed vs closure-log
epic-closure-validation         1×          100%
systematic-debugging            0×          —          (no debugging activations this epic)
```

## Expected dashboard with `--audit-deltas`

```
EPIC PRO-1156 — skill audit-pass trajectory
(reads .swarm/skill-audits/<skill>/edit-apply-report.jsonl per Tier 5f)

SKILL                          PASS 1   PASS 2   PASS 3   TEST-SET
no-silent-deferrals            +0.08    +0.05    REJECTED 0.91
service-reuse                  +0.12    +0.04    —        0.89
testing-philosophy             +0.06    —        —        0.94
...

(empty until Tier 5f infrastructure populated)
```

## Legacy file rendering

If only `profile_assigned` events are present (pre-v4.7 epic):

```
EPIC PRO-1142 — Pre-v4.7 epic, partial data only

PROFILES (only metric available pre-v4.7)
├── MINIMAL:  1 ticket
├── STANDARD: 6 tickets
└── STRICT:   0 tickets

(All other metrics require v4.7 instrumentation. Re-run on a v4.7+ epic to see the full dashboard.)
```

## Errors and edge cases

- **No `.swarm/` directory**: Report "no observability data — was the workflow run in this repo?" and exit.
- **Argument not an epic or ticket ID**: Report "`<arg>` matched no observability stream. Checked `.swarm/observability/<arg>/` and `.swarm/observability/_solo/<arg>.jsonl`."
- **Malformed JSONL line**: Skip with a stderr warning showing the file + line number, continue processing remaining lines.
- **Mixed pre/post-v4.7 events in one file**: Render full dashboard (don't downgrade to legacy badge if any v4.7 event exists).

## Performance

- Single-epic dashboards complete in <1 second on a 10-ticket epic.
- `--per-skill` may add ~2 seconds for skill cross-referencing.
- `--audit-deltas` is bounded by the skill-audits directory size; expect <5 seconds.

## Implementation note

This slash command is intentionally thin — it shells out to `scripts/swarm-stats.sh`. Reasons:

1. **CI/cron/dashboards** need the same logic without an LLM in the loop.
2. **Performance**: jq aggregation in shell is faster than asking the model to count JSONL lines.
3. **Testability**: the shell script can be unit-tested with synthetic JSONL fixtures.

If the shell script returns non-zero, surface stderr to the user and stop. Do not retry or improvise output.

## Related

- Canonical event schema: `commands/references/observability-schema.md`
- Backend: `scripts/swarm-stats.sh`
- Emission points: `commands/execute-ticket.md` (Steps 1.5, 3, 3.6, 3.8, 4), `commands/epic-swarm.md` (§§1.5.7, 3.2, 3.5, 3.6, 3.8), `commands/close-epic.md` (Phase 2.5, Step 4), `commands/entropy-audit.md` (Step 5 → `_audit.jsonl`)
