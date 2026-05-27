# Workflow Observability JSONL Schema (v4.7)

Canonical reference for `.swarm/observability/<epic>/<ticket-id>.jsonl` event streams. Both `/epic-swarm` and `/execute-ticket` emit to these files. The `/swarm-stats` command and `scripts/swarm-stats.sh` consume them.

---

## File layout

```
.swarm/observability/
├── <epic-id>/
│   ├── <ticket-id-1>.jsonl     # per-ticket event stream when run inside an epic
│   ├── <ticket-id-2>.jsonl
│   └── _epic.jsonl             # epic-level events only (epic_completed,
│                               # followup_cap_blocked, impact_bar_rejected,
│                               # boundary_question_answered) emitted by
│                               # /close-epic. Distinct from per-ticket
│                               # files: aggregators MUST NOT mix them
│                               # into per-ticket metrics — see
│                               # scripts/swarm-stats.sh "two streams" pattern.
└── _solo/
    └── <ticket-id>.jsonl       # standalone /execute-ticket runs (no epic context)
```

Each `.jsonl` file is append-only. One JSON object per line. Never modify or delete prior lines — the file IS the audit trail.

**Three audiences for the file split:**
- Per-ticket files (`<epic-id>/<ticket-id>.jsonl`) — phase-loop, deferral, codex, ticket-lifecycle events. Single ticket's audit trail.
- Epic-level file (`<epic-id>/_epic.jsonl`) — closure-time events that have no single ticket parent: epic_completed, followup_cap_blocked, impact_bar_rejected, boundary_question_answered. Emitted by `/close-epic`.
- Solo files (`_solo/<ticket-id>.jsonl`) — `/execute-ticket` invoked against a ticket with no epic parent. Same event types as per-ticket files; no epic-level file exists for solo runs.

---

## Common envelope

Every event has the same five fields. Event-specific data goes under `data`.

```json
{
  "ts": "2026-05-27T14:22:11Z",
  "epic_id": "PRO-1156",
  "ticket_id": "PRO-1167",
  "phase": "implementation",
  "event": "<event-name>",
  "data": { ... event-specific payload ... }
}
```

- **`ts`** — ISO8601 UTC. Required.
- **`epic_id`** — Parent epic ID. `null` for `_solo/` runs. Required field, nullable value.
- **`ticket_id`** — Ticket the event pertains to. Required.
- **`phase`** — Phase name from `PHASES_BY_PROFILE` (or `null` for ticket-/epic-level events). Required field, nullable value.
- **`event`** — Event name from the catalog below. Required.
- **`data`** — Event-specific payload. Required (may be `{}`).

---

## Event catalog (15 types)

### Profile / configuration events

#### `profile_assigned` *(exists in v4.5/v4.6)*

Emitted by `/execute-ticket` Step 1.5 after the profile decision lands in Linear.

```json
{
  "event": "profile_assigned",
  "data": {
    "profile": "MINIMAL | STANDARD | STRICT",
    "selection_source": "auto-detected | CLI flag --strict | CLI flag --profile | resumed-from-prior-comment",
    "matched_criteria": ["label:docs-only", "no-AC-mentions-logic", "..."]
  }
}
```

#### `profile_overridden` *(NEW v4.7)*

Emitted when the user passed `--profile` or `--strict` explicitly, overriding what auto-detection would have chosen. Lets `/swarm-stats` measure how often operators disagree with auto-selection.

```json
{
  "event": "profile_overridden",
  "data": {
    "auto_would_have_chosen": "MINIMAL | STANDARD",
    "operator_chose": "STANDARD | STRICT",
    "flag": "--profile=STRICT | --strict"
  }
}
```

---

### Phase lifecycle events (per ticket, per phase)

#### `phase_started` *(NEW v4.7)*

Emitted at agent dispatch, before the agent receives the prompt.

```json
{
  "event": "phase_started",
  "data": {
    "agent": "architect-agent | backend-engineer-agent | ...",
    "redispatch_count": 0
  }
}
```

#### `phase_completed` *(NEW v4.7)*

Emitted immediately after the orchestrator parses the agent's structured report. Supersedes the v4.5/v4.6 per-phase observability line (which had partial coverage and was emitted only by `/epic-swarm`).

```json
{
  "event": "phase_completed",
  "data": {
    "agent": "architect-agent | ...",
    "status": "DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT | ISSUES_FOUND",
    "tool_calls": 23,
    "write_calls": 4,
    "edit_calls": 7,
    "report_bytes": 4577,
    "files_changed_count": 3
  }
}
```

#### `phase_skipped_na` *(NEW v4.7)*

Emitted when the orchestrator posts the explicit N/A report for a phase outside the active profile.

```json
{
  "event": "phase_skipped_na",
  "data": {
    "profile": "MINIMAL",
    "reason": "phase not in active profile's phase list"
  }
}
```

---

### Deferral events (per attempt)

#### `deferral_redispatch` *(NEW v4.7 — partially specified in v4.5)*

Emitted when the orchestrator rejects an agent's deferral and re-dispatches with a supplemental directive. Pairs with the new Linear `## Deferral Rejected` comment from Tier 1 B5.

```json
{
  "event": "deferral_redispatch",
  "data": {
    "pass": 1,
    "rejection_reason": "DEFERRAL_INVALID | DEFERRAL_OVERRIDDEN",
    "items": [
      {"title": "QuotaIndicator extraction", "classification": "AC-DEFERRED", "severity": "MEDIUM"}
    ]
  }
}
```

#### `deferral_accepted` *(NEW v4.7)*

Emitted when a deferral passes orchestrator validation — one of the four catastrophic conditions is documented or user explicitly approved at a pause prompt.

```json
{
  "event": "deferral_accepted",
  "data": {
    "items": [
      {"title": "...", "classification": "AC-DEFERRED", "catastrophic_condition": 2}
    ],
    "approval_source": "agent-justified | user-override"
  }
}
```

---

### Impact-bar / closure-log events

#### `impact_bar_rejected` *(NEW v4.7)*

Emitted each time a candidate item lands in the closure-log instead of becoming a follow-up ticket. The aggregate count proves the sprawl-reduction discipline is working.

```json
{
  "event": "impact_bar_rejected",
  "data": {
    "candidate_summary": "Add rate limit on admin login",
    "why_below_bar": "Defense-in-depth, admin-only endpoint, no current exploit path"
  }
}
```

#### `boundary_question_answered` *(NEW v4.7)*

Emitted when a cross-cutting concern surfaces and the boundary question is answered (Part 3 of `no-silent-deferrals` skill).

```json
{
  "event": "boundary_question_answered",
  "data": {
    "concern": "CSRF protection across form routes",
    "decision": "single-enforcement-point | per-surface-tickets",
    "outcome_tickets_filed": 0
  }
}
```

#### `followup_cap_blocked` *(NEW v4.7)*

Emitted when 4 or more candidates would have been filed and the ≤3 cap forced a re-application of the impact bar (per `epic-closure-validation` Rule C).

```json
{
  "event": "followup_cap_blocked",
  "data": {
    "candidate_count_pre_cap": 6,
    "candidate_count_post_cap": 3,
    "escalated_to_user": false
  }
}
```

---

### Codex review events

#### `codex_finding_resolved` *(NEW v4.7)*

One record per finding. Severity + disposition let `/swarm-stats` chart auto-fixed vs human-escalated vs closure-logged trends.

```json
{
  "event": "codex_finding_resolved",
  "data": {
    "finding_id": "F12",
    "severity": "P1 | P2 | P3",
    "disposition": "auto_fixed | user_decision | closure_log | scope_escape_ticket",
    "file": "src/auth/login.ts:45"
  }
}
```

#### `codex_scope_escape` *(NEW v4.7)*

Emitted when SCOPE_EXPANSION_ESCAPE fires and a follow-up ticket gets filed because the fix would expand scope. Should be rare.

```json
{
  "event": "codex_scope_escape",
  "data": {
    "finding_id": "F4",
    "severity": "P1 | P2",
    "filed_ticket_id": "PRO-XXXX"
  }
}
```

---

### Ticket lifecycle events

#### `ticket_completed` *(NEW v4.7)*

Emitted when hard checkpoint passes AND security review (if active in profile) returns no CRITICAL/HIGH AND the orchestrator transitions Linear to Done.

```json
{
  "event": "ticket_completed",
  "data": {
    "profile": "MINIMAL | STANDARD | STRICT",
    "phases_run_live": ["adaptation", "implementation", "codereview"],
    "phases_na": ["testing", "documentation", "codex-review", "security-review"],
    "wall_clock_seconds": 1842
  }
}
```

#### `ticket_failed` *(NEW v4.7)*

Emitted on any halt: hard-checkpoint failure, security-blocked, merge conflict the user couldn't resolve, or unresolved deferral-rejection loop after Pass 2.

```json
{
  "event": "ticket_failed",
  "data": {
    "halt_phase": "security-review | hard-checkpoint | merge",
    "halt_reason": "CRITICAL finding F8 unresolved",
    "recovery_options_offered_to_user": ["retry phase", "manual review", "reduce scope"]
  }
}
```

---

### Epic lifecycle events

#### `epic_completed` *(EXISTS but only emitted for PRO-1142 historically — made universal in v4.7)*

Emitted by `/close-epic` after all sub-tickets are Done/Cancelled and the closure comment lands in Linear.

```json
{
  "event": "epic_completed",
  "data": {
    "subticket_count": 10,
    "followups_filed": 1,
    "closure_log_items": 8,
    "boundary_question_invocations": 2,
    "epic_wall_clock_seconds": 86400
  }
}
```

---

## Emission rules

1. **Append-only writes.** Use `>>` redirection or equivalent; never rewrite the file.
2. **Atomic JSON lines.** One JSON object, one line, no trailing comma, terminated with `\n`.
3. **No read-modify-write cycles.** If a value needs aggregation (e.g., total redispatches per ticket), `/swarm-stats` aggregates from the stream; the orchestrator just appends raw events.
4. **No PII / no secrets in `data`.** Event payloads can be inspected by anyone with read access to `.swarm/`.
5. **Idempotency.** Resume that re-runs a phase MUST re-emit `phase_started` / `phase_completed`. The downstream aggregation handles "agent dispatched 3 times for PRO-1158/testing" correctly — duplicate-suppression on the emit side would lose the retry signal.

---

## Where each event is emitted

**Routing convention:** events with `epic_id` + `ticket_id` populated land in `<epic-id>/<ticket-id>.jsonl` (or `_solo/<ticket-id>.jsonl`). Events with `epic_id` populated but `ticket_id: null` land in `<epic-id>/_epic.jsonl`. Aggregators key off this routing — keeping epic-level events out of per-ticket files prevents the "inflated per-ticket metric" failure mode.

| Event | `/execute-ticket` | `/epic-swarm` | `/close-epic` | File |
|---|:-:|:-:|:-:|:-:|
| `profile_assigned` | Step 1.5 (existing) | §1.5.7 (existing) | — | per-ticket |
| `profile_overridden` | Step 1.5 when `--profile` or `--strict` passed | §1.5.7 same | — | per-ticket |
| `phase_started` | Step 3 dispatch loop, before agent invoke | §3.2.2 before agent invoke | — | per-ticket |
| `phase_completed` | Step 3 dispatch loop, after report parsed | §3.2.7 after report parsed | — | per-ticket |
| `phase_skipped_na` | Step 1.5 after posting each N/A report | §3.2.5b after posting each N/A | — | per-ticket |
| `deferral_redispatch` | Step 3.6 (existing JSONL is here, supplement with new schema) | §3.6 same | — | per-ticket |
| `deferral_accepted` | Step 3.6 / Step 3.9 user-decision branches | §3.6 / §3.9 same | — | per-ticket |
| `impact_bar_rejected` | — | — | Phase 3 — one event per candidate moved to closure-log (see `commands/close-epic.md` Phase 3 emission block) | epic-level (`_epic.jsonl`) |
| `boundary_question_answered` | — | — | Phase 3 — one event per cross-cutting candidate's Rule B answer (see `commands/close-epic.md` Phase 3 emission block) | epic-level (`_epic.jsonl`) |
| `followup_cap_blocked` | — | — | Step 6 when candidate count > 3 pre-cap | epic-level (`_epic.jsonl`) |
| `codex_finding_resolved` | Step 3.8 per finding | §3.8 per finding | — | per-ticket |
| `codex_scope_escape` | Step 3.8 SCOPE_EXPANSION_ESCAPE branch | §3.8 same | — | per-ticket |
| `ticket_completed` | Step 4 after Linear set to Done | §3.5.6 after Linear set to Done | — | per-ticket |
| `ticket_failed` | Step 4 on any halt | §3.2.7 / §3.3 fail / §3.5 conflict | — | per-ticket |
| `epic_completed` | — | — | Step 6 after closure comment lands | epic-level (`_epic.jsonl`) |

---

## Legacy file handling (pre-v4.7)

v4.5/v4.6 JSONL files only contain `profile_assigned` events. `/swarm-stats` MUST NOT crash on them:

- Detect legacy files by absence of any event other than `profile_assigned` AND file `mtime < 2026-05-27`.
- Render with a "Pre-v4.7 epic — partial data only" badge in the dashboard header.
- Available metrics show; the rest displays `—`.
- No backfill migration in v4.7 (re-deriving events from phase reports is possible but adds maintenance surface; defer to v4.8 if there is demand).

---

## Adding a new event type later

If v4.8+ needs a new event type:

1. Add the event spec to this file with the same envelope contract.
2. Update the emission table.
3. Update `scripts/swarm-stats.sh` to recognize and chart it.
4. Bump the schema version comment at the top of `swarm-stats.sh`.
5. Existing JSONL files don't need migration — additive only.
