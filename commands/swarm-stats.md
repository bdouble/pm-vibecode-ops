---
description: Render an observability dashboard for an epic or solo ticket — phase activity, deferral discipline, impact-bar rejections, codex findings, follow-up cap, profile distribution. Shells out to scripts/swarm-stats.sh.
allowed-tools: Bash, Bash(scripts/swarm-stats.sh:*), Bash(jq:*), Bash(ls:*), Read
argument-hint: <epic-id-or-ticket-id> [--per-skill] [--audit-deltas]
---

# /swarm-stats

Render a single dashboard view of the v4.7 JSONL observability stream for an epic (or a standalone `/execute-ticket` run). Discoverable in-session interface for the same logic that powers `scripts/swarm-stats.sh` — CI/dashboards/alerts call the shell script directly; operators use this slash command.

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

3. **Shell out**: Call `scripts/swarm-stats.sh "$ARGUMENTS" [flags]` and stream the output verbatim. The shell script owns formatting and aggregation logic — keep this slash command thin so CI and operators see identical output.

4. **Surface the headline number**: After the dashboard prints, add a one-line summary highlighting the most important signal: deferral acceptance rate trend, impact-bar rejection count, or follow-up cap compliance.

## Expected dashboard layout (default, no flags)

```
EPIC PRO-1156 — 10 tickets, MINIMAL/STANDARD mix
Wall clock: 14h22m | Started 2026-05-24 | Closed 2026-05-25

PROFILES
├── MINIMAL:  3 tickets
├── STANDARD: 7 tickets
└── STRICT:   0 tickets   (overrides: 0)

PHASES
├── Live dispatched: 47 of 70 expected     (33% N/A via profile — working)
├── Re-dispatched:    2 (sufficiency stall on PRO-1158/testing)
└── Failed phases:    1 (PRO-1163/codereview — CHANGES_REQUESTED, recovered)

DEFERRAL DISCIPLINE
├── Re-dispatch attempted: 12
├── Re-dispatch accepted:  3   (all met catastrophic condition)
└── Re-dispatch rejected:  9   (rate: 75% — discipline holding)

IMPACT BAR & CLOSURE-LOG
├── Closure-log entries:  28
├── P3 tickets filed:      0
└── Follow-up cap blocks:  0   (capacity within ≤3)

CODEX REVIEW
├── Findings resolved:        23
├── Auto-fixed:               18
├── User-escalated:            2
├── Closure-log only (P3):     3
└── SCOPE_EXPANSION_ESCAPE:    0

EPIC CLOSURE
├── Follow-ups filed:     1 of 3 cap
├── Closure-log items:    8 aggregated across sub-tickets
└── Boundary-question:    2 invoked, 1 single-enforcement, 1 cross-cutting
```

## Expected dashboard with `--per-skill`

```
EPIC PRO-1156 — per-skill activation and compliance

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
- Emission points: `commands/execute-ticket.md` (Steps 1.5, 3, 3.6, 3.8, 4), `commands/epic-swarm.md` (§§1.5.7, 3.2, 3.5, 3.6, 3.8), `commands/close-epic.md` (Step 4)
