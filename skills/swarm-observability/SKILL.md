---
name: swarm-observability
description: Use when user asks "is the workflow actually working", "are we deferring too much", "what's our profile mix", "did the impact bar help", "how many follow-ups did this epic file", "what's the codex auto-fix rate", or any other meta-question about pm-vibecode-ops execution patterns. Also use when about to count Linear comments by hand to answer one of those questions, when about to grep `.swarm/observability/*.jsonl` directly, when reviewing a recently-closed epic for sprawl, or when investigating why a ticket halted. Also use when about to recommend a workflow change based on intuition rather than the observability stream.
---

# Swarm Observability

## CRITICAL

<!-- @protected reason="foundational routing rule — without it, operators reconstruct metrics by hand from Linear and produce stale, wrong answers (SkillOpt §3.6 protects slow-state content from rewrites)" -->
**Before answering any meta-question about workflow performance, consult the observability stream — not Linear comments, not orchestrator logs, not memory of recent sessions.** The JSONL stream is the single source of truth for what the workflow actually did. Linear shows what was reported; the stream shows what happened.

**Violating the letter of this rule is violating the spirit of this rule.** "I'll just check Linear quickly" or "I remember from last week" is the same violation as "I'll skip the verification command." Spirit over letter, always.

### Slow/Meta Update Log
<!-- Append one bullet per audit pass capturing what stayed true across iterations. Initially empty. -->
<!-- @end-protected -->

## The Two-Surface Interface

The observability layer has exactly two consumption surfaces. Pick the right one:

| Surface | When to use | What you get |
|---|---|---|
| `/swarm-stats <epic-id-or-ticket-id>` | Interactive operator question, single epic or ticket | Formatted dashboard, headline number, legacy badge for pre-v4.7 epics |
| `scripts/swarm-stats.sh <id> [--per-skill] [--audit-deltas]` | CI, batch comparison, scripting | Same output, no LLM in loop, parseable |

**Never read `.swarm/observability/*.jsonl` directly to answer a metrics question.** The stream has 15 event types with a common envelope; ad-hoc `jq` runs reproduce bugs that `swarm-stats.sh` already fixed (legacy detection, `_epic.jsonl` filtering, top-level vs nested `.data.profile`). Use the tool.

Direct stream reads are appropriate for ONE case: debugging the observability layer itself (an event that wasn't emitted, a field that's wrong). Always-default to the dashboard.

## The 15-Event Schema

Every event uses the same envelope: `{ts, epic_id, ticket_id, phase, event, data}`. The 15 event types fall into five families. The canonical reference is `commands/references/observability-schema.md` — read it before authoring new emission points or extending the schema.

| Family | Events | What it tells you |
|---|---|---|
| Profile lifecycle | `profile_assigned`, `profile_overridden` | Which workflow profile (MINIMAL/STANDARD/STRICT) each ticket ran, and when operators overrode auto-detection |
| Phase lifecycle | `phase_started`, `phase_completed`, `phase_skipped_na` | What ran live vs. N/A-skipped per profile; agent dispatch counts; per-phase tool-call metrics |
| Deferral discipline | `deferral_redispatch`, `deferral_accepted` | How often the orchestrator rejected an agent's deferral; how often a catastrophic justification held up |
| Judgment scaffolding (v4.6) | `impact_bar_rejected`, `boundary_question_answered`, `followup_cap_blocked` | How often the impact bar caught a low-value follow-up; cross-cutting concern resolutions; ≤3 cap interventions |
| Codex + lifecycle | `codex_finding_resolved`, `codex_scope_escape`, `ticket_completed`, `ticket_failed`, `epic_completed` | Codex auto-fix rates by disposition; ticket and epic outcomes |

A pre-v4.7 epic only has `profile_assigned` events. `swarm-stats` renders a "Pre-v4.7 epic — partial data only" badge and shows `—` for the other rows. **Do not infer or backfill missing v4.5/v4.6 data** — the inference would invent signal that isn't in the stream.

## Reading the Dashboard

The default dashboard answers five questions per epic. Map the user's question to the section first; don't dump the whole dashboard if one line answers it.

| User asks | Look at section |
|---|---|
| "Did discipline hold up?" | DEFERRAL DISCIPLINE — acceptance rate (accepted / re-dispatched). Healthy is <30%; degrading is rising |
| "Did sprawl reduction work?" | IMPACT BAR & CLOSURE-LOG (closure-log entries) + LIFECYCLE follow-up cap blocks. v4.6 baseline: PRO-1142 closed 1 follow-up vs PRO-793's 8 — 8x reduction |
| "Did profiles help?" | PHASES — N/A skipped count divided by total profile-expected phases. MINIMAL skips 4 of 7 (57%); STANDARD skips 0 |
| "Did codex carry its weight?" | CODEX REVIEW — auto-fixed / total. Healthy is >70% auto-fixed; <50% means humans are doing too much of codex's job |
| "Did the epic finish cleanly?" | LIFECYCLE — tickets completed vs failed; epic_completed event present means epic-closure actually fired |

The `--per-skill` flag exposes per-skill activation and compliance counts. Per SkillOpt (Yang et al., 2026): **always drill down per skill — aggregate workflow metrics hide per-skill movement of 20+ points**. A skill that activated 24× with 96% compliance and a skill that activated 2× with 50% compliance both contribute to the "97% workflow average," and acting on the average improves neither.

## Spotting Trends

Single-epic dashboards answer "what happened this time." Trends answer "is the workflow degrading or improving." Three reliable signals:

1. **Rising deferral acceptance rate (acceptance / re-dispatch) across consecutive epics.** Either justifications are getting stronger (good — workflow maturing) or the orchestrator is being permissive (bad — discipline drifting). Inspect the underlying `deferral_accepted` events: read 2-3 random `data.items[].catastrophic_condition` values to see whether the justifications are genuine or padded.
2. **Falling N/A rate across MINIMAL tickets.** The MINIMAL profile is designed to skip 4 of 7 phases. If N/A counts shrink without the ticket mix changing, MINIMAL tickets are being mis-classified as STANDARD upstream (profile selection bug, not an observability problem — but observability surfaces it first).
3. **Closure-log volume diverging from follow-up filings.** Many closure-log entries + zero follow-ups means the impact bar is doing its job. Few closure-log entries + many follow-ups means the closure-log discipline isn't firing — agents are still defaulting to "file a ticket" without considering the bar. Re-read `no-silent-deferrals` and `epic-closure-validation` if this pattern appears.

## When the Stream Is Wrong

If the dashboard shows a number that contradicts your direct observation (e.g., dashboard says 0 deferrals, Linear shows obvious deferred items):

1. **Don't trust the dashboard automatically.** Verify by reading 3-5 raw JSONL lines for the affected epic/phase.
2. **Suspect emission gaps before schema bugs.** The most common failure mode is "the orchestrator didn't emit the event at the documented Step." Check `commands/references/observability-schema.md` for the emission-point table; grep the relevant `commands/*.md` file for the event name to confirm the emission point exists in spec.
3. **File a follow-up if the gap is real.** Treat it as a Tier 3 regression (observability schema bug) and surface it via the standard impact-bar test — likely it clears, since silent observability gaps undermine every other discipline.

## Rationalization Prevention

These are the excuses for skipping the observability layer when answering a meta-question:

| Excuse | Reality |
|---|---|
| "I'll just check Linear quickly" | Linear shows what was reported, not what happened. The stream is the source of truth. |
| "I remember the answer from last week" | Memory drifts. The stream doesn't. Run `/swarm-stats`. |
| "The dashboard doesn't have what I need" | Either it does and you missed it, or the schema needs an event you haven't filed a ticket for. Check `commands/references/observability-schema.md` first. |
| "It's faster to grep the JSONL" | `swarm-stats.sh` already does the grep correctly. Re-implementing it ad-hoc reproduces fixed bugs. |
| "This is just a small question" | Small questions answered from intuition produce wrong-but-confident operator decisions. Same rule as `verify-implementation`: claims need evidence. |
| "Pre-v4.7 epics don't have the data" | Correct — and `swarm-stats` shows the legacy badge for those. Saying so explicitly is the answer, not inventing the missing numbers. |

## Red-Flag Phrases

When these appear in your response **STOP and run `/swarm-stats`**:

- "I think the workflow is..."
- "Based on what I remember..."
- "It seems like we're deferring less now"
- "Probably about [N] tickets..."
- "I'll just count the Linear comments..."

## Related Skills

- **no-silent-deferrals** — the deferral discipline the stream measures
- **epic-closure-validation** — the ≤3 follow-up cap the stream surfaces
- **codex-finding-resolution** — the disposition stream events
- **closure-log-aggregation** — required cross-reference when reading closure-log entries from the stream

## Extended Resources

- `commands/references/observability-schema.md` — canonical event catalog, common envelope, emission rules, emission point table
- `commands/swarm-stats.md` — slash command interface
- `scripts/swarm-stats.sh` — shell-script backend used by the slash command and CI
