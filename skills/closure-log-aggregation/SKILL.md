---
name: closure-log-aggregation
description: Use when running `/close-epic`, when about to file the epic closure comment, when an operator asks "what did we consider but not pursue in this epic", or when about to summarize an epic's surfaced-but-deferred work. Also use when about to grep sub-ticket comments for closure-log entries by hand, when about to skip a `### Considered but not pursued` section because it "looks like" the duplicate of another, when h2 vs h3 heading drift would otherwise drop entries silently, or when about to omit closure-log content from the epic closure because none was found at the wrong heading level.
---

# Closure-Log Aggregation

## CRITICAL

<!-- @protected reason="foundational principle — the closure-log is the v4.6 anti-sprawl audit trail; silent aggregation drops are how sprawl reappears" -->
**The closure-log inside each phase report is the durable audit trail of what was considered-but-not-pursued during the epic. The epic-level closure comment MUST aggregate it. Silent aggregation drops are the failure mode this skill prevents.**
<!-- @end-protected -->

**Violating the letter of this rule is violating the spirit of this rule.** Aggregating "most" entries, deduplicating aggressively, paraphrasing into a shorter summary, or dropping entries because the heading was `##` instead of `###` is the same violation as not aggregating at all. The audit trail is preserved verbatim or it isn't preserved.

## What This Skill Activates Against

The closure-log lives inside individual phase reports as `### Considered but not pursued` sections. v4.6 introduced this discipline; v4.7 fixed the bookkeeping. Aggregation has three failure modes that this skill addresses explicitly:

| Failure mode | What it looks like | What this skill enforces |
|---|---|---|
| Heading-level drift | Some sub-tickets use `##`, others use `###` for the same section | Recognize BOTH heading levels when fetching; aggregate together |
| Silent omission on no-match | A sub-ticket has the section but the orchestrator's grep missed it | Fetch from every sub-ticket's phase comments explicitly — no "I'll grep for it" shortcut |
| Premature deduplication | Two entries that "look similar" get collapsed into one | Aggregate verbatim first, deduplicate ONLY for identical-string matches, preserve attribution |

## The Aggregation Algorithm

For every sub-ticket in the epic (Status: Done OR Cancelled), and for every phase comment posted to that ticket:

1. **Fetch the phase comment body** — full text, not summary.
2. **Extract the closure-log section** — match `(##|###)\s+Considered but not pursued` at line start, then capture until the next `(##|###)` header or end of comment. Tolerate both h2 (legacy v4.6.0) and h3 (canonical v4.6.1+).
3. **Stamp each entry with attribution** — `[from {TICKET-ID} / {phase}]` at the head of the entry.
4. **Aggregate stamped entries into the epic closure comment under `## Aggregated Closure-Log Across Sub-Tickets`** — preserve order: by ticket order in the epic, then by phase order (adaptation → security-review).
5. **Deduplicate ONLY when the entry body is byte-identical across two source tickets.** If two entries describe the same observation in different words, treat as separate entries — the attribution stamps tell the operator which surface each was observed in.

**Do not paraphrase. Do not collapse. Do not pre-judge what "matters."** The closure-log section is the operator's audit trail for what was considered-but-deemed-below-the-bar — paraphrasing collapses signal.

## Heading-Level Drift (the v4.6.0/v4.6.1 fingerprint)

v4.6.0 templates emitted `## Considered but not pursued` (h2). v4.6.1 standardized on `### Considered but not pursued` (h3) to keep the section under the phase report's `##` header. Tickets executed across the boundary contain both. Aggregation that matches only one level silently drops the other.

**Always match `(##|###)\s+Considered but not pursued` (regex), never just one form.** This is the single highest-value rule in this skill. The regression analysis (`context/regression-analysis-v4.5-v4.6.md` B3) documents the case where 176 closure-log entries existed in a session and zero made it to the orchestrator log because the aggregator matched only h3.

## When There's Nothing to Aggregate

If every sub-ticket's phase comments are scanned and no `(##|###)\s+Considered but not pursued` sections exist:

1. **Confirm by counting** — explicitly post the per-ticket scan result so the operator can audit ("Scanned 8 sub-tickets × ~5 phase comments each = 40 candidate locations; 0 closure-log sections found.").
2. **Do not invent placeholder content** — empty is empty. Note in the epic closure comment: "## Aggregated Closure-Log Across Sub-Tickets\n(none — no `### Considered but not pursued` sections found in sub-ticket phase reports.)"
3. **Flag as a discipline signal** — many sub-tickets and zero closure-log entries usually means agents are skipping the impact-bar discipline, not that nothing was considered. Reference `no-silent-deferrals` Part 2 in the epic closure comment so the operator sees the gap.

## Cross-Reference Requirements

This skill is **REQUIRED** when using the `epic-closure-validation` skill — the epic closure flow cannot complete without closure-log aggregation. The reverse is not true: closure-log aggregation can be invoked mid-epic for an operator question without triggering epic-closure-validation.

When `/close-epic` runs, the order is:
1. `epic-closure-validation` verifies all sub-tickets are Done/Cancelled
2. `closure-log-aggregation` (this skill) fetches and aggregates the closure-log entries
3. `no-silent-deferrals` Part 2 verifies the ≤3 follow-up cap on any candidate follow-up tickets
4. Epic closure comment is posted

Skipping this skill at step 2 means the epic ships without an audit trail of what was deemed-below-the-bar — the exact failure mode v4.6's discipline was designed to prevent.

## Observability Emission

After aggregation completes, the orchestrator emits one `epic_completed` event to `.swarm/observability/<epic-id>/_epic.jsonl` with `data.closure_log_entries_aggregated` set to the count. If the candidate follow-up count exceeded 3, ALSO emit `followup_cap_blocked`. Both are documented in `commands/references/observability-schema.md` — read it for the canonical envelope.

## Rationalization Prevention

| Excuse | Reality |
|---|---|
| "These two entries are basically the same — I'll merge" | Verbatim or not at all. Different wording is different signal. |
| "I'll just summarize the top 3" | The operator decides what's top. Aggregation is preservation, not curation. |
| "Most tickets won't have closure-log entries" | Count them explicitly. Assumption hides discipline gaps. |
| "Only h3 is canonical, h2 must be wrong" | Both ship in production data. Aggregate both. |
| "The orchestrator already has them in memory" | Memory drifts. Fetch from the phase comments. |
| "If `ticket-context-agent` summary doesn't mention closure-log, there isn't one" | The summary is lossy. Fetch the phase comment body. |

## Red-Flag Phrases

When these appear in your response while building the epic closure comment, **STOP and re-fetch verbatim**:

- "Roughly N entries..."
- "I'll consolidate the duplicates"
- "Most of these are similar"
- "Skipping the [h2 | h3] heading variant"
- "From memory, I recall..."
- "These don't seem important enough to..."

## Related Skills

- **epic-closure-validation** — required precondition; gates whether closure can even begin
- **no-silent-deferrals** — defines the impact bar that determined what landed in the closure-log in the first place
- **swarm-observability** — surfaces closure-log entry counts in `/swarm-stats` dashboards

## Extended Resources

- `commands/close-epic.md` — orchestrator-side aggregation logic; this skill operationalizes Step 3
- `commands/references/observability-schema.md` — `epic_completed` envelope including `closure_log_entries_aggregated`
- `context/regression-analysis-v4.5-v4.6.md` — B3 documents the original aggregation gap this skill prevents
