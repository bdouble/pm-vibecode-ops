#!/usr/bin/env bash
# swarm-stats.sh — render an observability dashboard for a JSONL event stream.
#
# Schema version: 2 (v5.0 — 17 event types: + convention_guard_check, entropy_scorecard_recorded)
# Canonical event spec: commands/references/observability-schema.md
#
# Usage:
#   scripts/swarm-stats.sh <epic-id-or-ticket-id> [--per-skill] [--audit-deltas]
#
# Exit codes:
#   0 — dashboard rendered (including legacy-data banner)
#   1 — usage error (missing argument, bad flag)
#   2 — target not found (no observability stream for the given ID)
#   3 — runtime error (jq missing, file read failure)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OBS_ROOT="$REPO_ROOT/.swarm/observability"
AUDITS_ROOT="$REPO_ROOT/.swarm/skill-audits"

# ---------- arg parsing ----------

if [[ $# -lt 1 ]]; then
  echo "usage: swarm-stats.sh <epic-id-or-ticket-id> [--per-skill] [--audit-deltas]" >&2
  exit 1
fi

TARGET="$1"
shift
PER_SKILL=0
AUDIT_DELTAS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --per-skill) PER_SKILL=1; shift ;;
    --audit-deltas) AUDIT_DELTAS=1; shift ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

if ! command -v jq >/dev/null 2>&1; then
  echo "swarm-stats.sh requires jq (brew install jq)" >&2
  exit 3
fi

# ---------- locate stream ----------
#
# Three input modes:
#   1. TARGET is an epic-id (dir at $OBS_ROOT/$TARGET) → epic-wide dashboard
#   2. TARGET is a solo ticket-id ($OBS_ROOT/_solo/$TARGET.jsonl) → single-ticket dashboard
#   3. TARGET is a sub-ticket of an epic (found by walking epic dirs) → single-ticket dashboard
#      scoped to JUST that ticket's stream (NOT the epic's other tickets)

EPIC_DIR=""             # epic-level surface (only set in mode 1)
TICKET_FILE=""          # specific ticket's jsonl (set in modes 2 and 3)
MODE=""

if [[ -d "$OBS_ROOT/$TARGET" ]]; then
  EPIC_DIR="$OBS_ROOT/$TARGET"
  MODE="epic"
elif [[ -f "$OBS_ROOT/_solo/$TARGET.jsonl" ]]; then
  TICKET_FILE="$OBS_ROOT/_solo/$TARGET.jsonl"
  MODE="ticket-solo"
else
  # Walk epic dirs looking for the ticket. When found, scope to JUST that
  # ticket's file — do NOT promote to epic mode (would silently expand scope).
  for d in "$OBS_ROOT"/*/; do
    [[ -d "$d" ]] || continue
    if [[ -f "$d$TARGET.jsonl" ]]; then
      TICKET_FILE="$d$TARGET.jsonl"
      EPIC_DIR="${d%/}"   # retained for the _epic.jsonl side-stream below
      MODE="ticket-in-epic"
      break
    fi
  done
fi

if [[ -z "$EPIC_DIR" && -z "$TICKET_FILE" ]]; then
  echo "no observability stream found for '$TARGET'" >&2
  echo "  checked: $OBS_ROOT/$TARGET/" >&2
  echo "  checked: $OBS_ROOT/_solo/$TARGET.jsonl" >&2
  echo "  also walked: $OBS_ROOT/*/" >&2
  exit 2
fi

# ---------- collect streams into temp files ----------
#
# Two streams maintained separately so per-ticket metrics never see epic-level
# events (epic_completed, followup_cap_blocked, impact_bar_rejected,
# boundary_question_answered all land in _epic.jsonl per observability-schema.md).
#
#   $STREAM      — per-ticket events (the source for PROFILES, PHASES, DEFERRAL,
#                  CODEX, ticket lifecycle)
#   $EPIC_STREAM — epic-level events (the source for EPICS_DONE, CAP_BLOCKED,
#                  IMPACT_REJ, BOUNDARY counts)
#
# Per-ticket mode ("ticket-solo" and "ticket-in-epic") loads only one file into
# $STREAM. "ticket-in-epic" mode still reads its parent's _epic.jsonl into
# $EPIC_STREAM so the operator sees epic-level signals that mention this ticket.

STREAM=$(mktemp -t swarm-stats.XXXXXX)
EPIC_STREAM=$(mktemp -t swarm-stats-epic.XXXXXX)
trap 'rm -f "$STREAM" "$EPIC_STREAM"' EXIT

case "$MODE" in
  epic)
    for f in "$EPIC_DIR"/*.jsonl; do
      [[ -f "$f" ]] || continue
      if [[ "$(basename "$f")" == "_epic.jsonl" ]]; then
        cat "$f" >> "$EPIC_STREAM"
      else
        cat "$f" >> "$STREAM"
      fi
    done
    ;;
  ticket-solo)
    cat "$TICKET_FILE" >> "$STREAM"
    ;;
  ticket-in-epic)
    cat "$TICKET_FILE" >> "$STREAM"
    # Pick up the parent epic's _epic.jsonl too (epic-level signals are
    # operationally relevant when zooming into a single ticket of an epic).
    if [[ -f "$EPIC_DIR/_epic.jsonl" ]]; then
      cat "$EPIC_DIR/_epic.jsonl" >> "$EPIC_STREAM"
    fi
    ;;
esac

if [[ ! -s "$STREAM" && ! -s "$EPIC_STREAM" ]]; then
  echo "stream is empty for '$TARGET'" >&2
  exit 2
fi

# ---------- detect legacy vs v4.7 ----------
#
# Legacy = an existing per-ticket stream contains only profile_assigned events
# AND nothing else has been emitted. The first jq returning empty (parse error)
# is NOT legacy — it's a parse failure that should surface, not silently mask
# as a full-coverage v4.7 stream.

LEGACY=0
JQ_PARSED=1
EVENT_TYPES=$(jq -rs '[.[].event] | unique | .[]' "$STREAM" 2>/dev/null) || JQ_PARSED=0

if [[ "$JQ_PARSED" == "0" ]]; then
  echo "warning: failed to parse '$STREAM' as JSONL — metrics suppressed" >&2
  LEGACY=1   # render with all-dashes; do NOT claim full coverage on parse failure
elif [[ -z "$EVENT_TYPES" ]]; then
  # Empty stream is a degenerate case but not legacy. Leave LEGACY=0 so the
  # dashboard renders zeros honestly.
  :
else
  # Use grep -E with newline-separated input. -c counts matching lines; flip to
  # "non-profile event types" by inverting the regex match in awk to avoid the
  # pipefail / "no matches → exit 1" trap of grep -v.
  NON_PROFILE=$(printf '%s\n' "$EVENT_TYPES" | awk '$0 != "profile_assigned" && NF > 0 {n++} END {print n+0}')
  if [[ "$NON_PROFILE" == "0" ]]; then
    LEGACY=1
  fi
fi

# ---------- header ----------
#
# TICKET_COUNT only meaningful in epic mode. Use find (no pipefail trap) instead
# of the prior ls|grep|wc pipeline that crashes when the directory contains
# only _epic.jsonl.

case "$MODE" in
  epic)
    TICKET_COUNT=$(find "$EPIC_DIR" -maxdepth 1 -type f -name '*.jsonl' ! -name '_epic.jsonl' 2>/dev/null | wc -l | tr -d ' ')
    HEADER_LABEL="EPIC $TARGET — $TICKET_COUNT ticket(s)"
    ;;
  ticket-solo)
    TICKET_COUNT=1
    HEADER_LABEL="TICKET $TARGET (standalone /execute-ticket)"
    ;;
  ticket-in-epic)
    TICKET_COUNT=1
    parent_epic=$(basename "$EPIC_DIR")
    HEADER_LABEL="TICKET $TARGET (sub-ticket of epic $parent_epic)"
    ;;
esac

echo "$HEADER_LABEL"
if [[ "$LEGACY" == "1" ]]; then
  echo "** Pre-v4.7 epic — partial data only **"
  echo "(Only profile_assigned events present. All other metrics: —)"
  echo ""
fi

# ---------- aggregations ----------
#
# count_event() reads $STREAM (per-ticket events).
# count_epic_event() reads $EPIC_STREAM (epic-level events).
# An empty/missing source is gracefully handled by `[ -s "$file" ] && ... || echo 0`.

count_event()      { [[ -s "$STREAM"      ]] && jq -rs --arg e "$1" '[.[] | select(.event==$e)] | length' "$STREAM"      || echo 0; }
count_epic_event() { [[ -s "$EPIC_STREAM" ]] && jq -rs --arg e "$1" '[.[] | select(.event==$e)] | length' "$EPIC_STREAM" || echo 0; }

# .data.profile = execute-ticket envelope format; .profile = epic-swarm legacy top-level format
PROFILES_MINIMAL=$( [[ -s "$STREAM" ]] && jq -rs '[.[] | select(.event=="profile_assigned" and ((.data.profile // .profile) == "MINIMAL"))]  | length' "$STREAM" || echo 0)
PROFILES_STANDARD=$([[ -s "$STREAM" ]] && jq -rs '[.[] | select(.event=="profile_assigned" and ((.data.profile // .profile) == "STANDARD"))] | length' "$STREAM" || echo 0)
PROFILES_STRICT=$(  [[ -s "$STREAM" ]] && jq -rs '[.[] | select(.event=="profile_assigned" and ((.data.profile // .profile) == "STRICT"))]   | length' "$STREAM" || echo 0)
OVERRIDES=$(count_event profile_overridden)

PHASES_STARTED=$(count_event phase_started)
PHASES_COMPLETED=$(count_event phase_completed)
PHASES_NA=$(count_event phase_skipped_na)

REDISPATCH=$(count_event deferral_redispatch)
ACCEPTED=$(count_event deferral_accepted)

# impact_bar_rejected and boundary_question_answered are EPIC-LEVEL events
# emitted by /close-epic Phase 3 (see commands/close-epic.md and
# commands/references/observability-schema.md). Per-ticket streams will not
# contain them; read from $EPIC_STREAM.
IMPACT_REJ=$(count_epic_event impact_bar_rejected)
BOUNDARY=$(count_epic_event boundary_question_answered)
CAP_BLOCKED=$(count_epic_event followup_cap_blocked)

# convention_guard_check is dual-routed (per-ticket at codereview; epic-level at
# /close-epic Phase 2.5) — count both streams. "missing" entries are the signal.
GUARD_CHECKS=$(( $(count_event convention_guard_check) + $(count_epic_event convention_guard_check) ))
GUARD_MISSING=$({ [[ -s "$STREAM" ]] && jq -rs '[.[] | select(.event=="convention_guard_check") | (.data.missing // []) | length] | add // 0' "$STREAM" || echo 0; })
GUARD_MISSING_EPIC=$({ [[ -s "$EPIC_STREAM" ]] && jq -rs '[.[] | select(.event=="convention_guard_check") | (.data.missing // []) | length] | add // 0' "$EPIC_STREAM" || echo 0; })
GUARD_MISSING_TOTAL=$(( GUARD_MISSING + GUARD_MISSING_EPIC ))

# Discipline-debt census from the most recent epic_completed payload (v5.0 additive
# fields; pre-v5.0 events lack them → "n/a").
PROSE_ONLY=$({ [[ -s "$EPIC_STREAM" ]] && jq -rs '[.[] | select(.event=="epic_completed")] | last | .data.prose_only_count // "n/a"' "$EPIC_STREAM" || echo "n/a"; })
ENFORCED=$({   [[ -s "$EPIC_STREAM" ]] && jq -rs '[.[] | select(.event=="epic_completed")] | last | .data.enforced_count   // "n/a"' "$EPIC_STREAM" || echo "n/a"; })

CODEX_RES=$(count_event codex_finding_resolved)
CODEX_AUTO=$([[ -s "$STREAM" ]] && jq -rs '[.[] | select(.event=="codex_finding_resolved" and .data.disposition=="auto_fixed")]    | length' "$STREAM" || echo 0)
CODEX_USER=$([[ -s "$STREAM" ]] && jq -rs '[.[] | select(.event=="codex_finding_resolved" and .data.disposition=="user_decision")] | length' "$STREAM" || echo 0)
CODEX_LOG=$( [[ -s "$STREAM" ]] && jq -rs '[.[] | select(.event=="codex_finding_resolved" and .data.disposition=="closure_log")]   | length' "$STREAM" || echo 0)
CODEX_ESCAPE=$(count_event codex_scope_escape)

TICKETS_DONE=$(count_event ticket_completed)
TICKETS_FAILED=$(count_event ticket_failed)
# epic_completed lands in _epic.jsonl per close-epic.md Step 6 — read from epic stream.
EPICS_DONE=$(count_epic_event epic_completed)

# ---------- render core dashboard ----------

show() { if [[ "$LEGACY" == "1" ]]; then echo "—"; else echo "$1"; fi; }

echo "PROFILES"
echo "├── MINIMAL:  $PROFILES_MINIMAL ticket(s)"
echo "├── STANDARD: $PROFILES_STANDARD ticket(s)"
echo "└── STRICT:   $PROFILES_STRICT ticket(s)   (overrides: $OVERRIDES)"
echo ""

echo "PHASES"
echo "├── Live dispatched:  $(show "$PHASES_STARTED") ($(show "$PHASES_COMPLETED") completed)"
echo "└── Skipped via N/A:  $(show "$PHASES_NA")"
echo ""

echo "DEFERRAL DISCIPLINE"
echo "├── Re-dispatched:   $(show "$REDISPATCH")"
echo "└── Accepted:        $(show "$ACCEPTED")   (catastrophic-justified)"
echo ""

echo "IMPACT BAR & CLOSURE-LOG"
echo "├── Closure-log entries:  $(show "$IMPACT_REJ")"
echo "├── Boundary-question:    $(show "$BOUNDARY")"
echo "└── Follow-up cap blocks: $(show "$CAP_BLOCKED")"
echo ""

echo "CODEX REVIEW"
echo "├── Findings resolved:   $(show "$CODEX_RES")"
echo "├── Auto-fixed:          $(show "$CODEX_AUTO")"
echo "├── User-escalated:      $(show "$CODEX_USER")"
echo "├── Closure-log (P3):    $(show "$CODEX_LOG")"
echo "└── SCOPE_ESCAPE filed:  $(show "$CODEX_ESCAPE")"
echo ""

echo "LIFECYCLE"
echo "├── Tickets completed:   $(show "$TICKETS_DONE")"
echo "├── Tickets failed:      $(show "$TICKETS_FAILED")"
echo "└── Epics completed:     $(show "$EPICS_DONE")"
echo ""

# Discipline debt (v5.0): the operator-readable enforcement dashboard. Prose-only
# should trend DOWN (rules migrating to guards); guard checks with missing entries
# should be 0. The deferral/redispatch counters above double as RECALIBRATION
# SIGNALS — machinery that fires ~0 times across many epics is a retirement
# candidate per docs/MODEL_CALIBRATION.md's countermeasure ledger.
echo "DISCIPLINE DEBT (conventions & guards)"
echo "├── Guard checks emitted:     $(show "$GUARD_CHECKS")"
echo "├── Missing guards flagged:   $(show "$GUARD_MISSING_TOTAL")   (should be 0 — each blocked a review or closure)"
echo "├── Prose-only rules (last epic_completed): $(show "$PROSE_ONLY")   (↓ is better)"
echo "└── Enforced rules (last epic_completed):   $(show "$ENFORCED")   (↑ is better)"
echo ""

# Latest entropy-audit scorecard, if any (repo-level: .swarm/entropy/ + _audit.jsonl).
ENTROPY_DIR="$REPO_ROOT/.swarm/entropy"
if [[ -d "$ENTROPY_DIR" ]]; then
  latest_card=$(find "$ENTROPY_DIR" -maxdepth 1 -type f -name 'scorecard-*.json' 2>/dev/null | sort | tail -1)
  if [[ -n "$latest_card" ]]; then
    echo "ENTROPY AUDIT (latest scorecard: $(basename "$latest_card"))"
    jq -r '"├── Prose-only: \(.prose_rules.prose_only // "?")   Guards: \(.guards.count // "?")   Zero-activation machinery: \(.runtime_machinery.zero_activation_count // "?")\n└── Mock:integration ratio: \(.test_ballast.mock_to_integration_ratio // "?")"' "$latest_card" 2>/dev/null || echo "└── (scorecard unreadable)"
    echo ""
  fi
fi

# ---------- optional: per-skill drill-down ----------

if [[ "$PER_SKILL" == "1" ]]; then
  echo "------------------------------------------------------------"
  echo "PER-SKILL ACTIVATION (SkillOpt principle: drill down, never trust aggregate)"
  echo ""
  if [[ "$LEGACY" == "1" ]]; then
    echo "  (per-skill metrics unavailable — pre-v4.7 stream has no skill_activated events)"
  else
    echo "  (per-skill metrics require skill_activated events from Tier 5 audit instrumentation."
    echo "   These events are NOT yet emitted in v4.7 — Tier 5 deliverable. Placeholder for now.)"
  fi
  echo ""
fi

# ---------- optional: audit-pass deltas ----------

if [[ "$AUDIT_DELTAS" == "1" ]]; then
  echo "------------------------------------------------------------"
  echo "SKILL AUDIT-PASS TRAJECTORY"
  echo ""
  if [[ ! -d "$AUDITS_ROOT" ]]; then
    echo "  (no audit infrastructure yet — $AUDITS_ROOT does not exist."
    echo "   This is populated by Tier 5f. Returning empty.)"
  else
    for skill_dir in "$AUDITS_ROOT"/*/; do
      [[ -d "$skill_dir" ]] || continue
      report="$skill_dir/edit-apply-report.jsonl"
      if [[ -f "$report" ]]; then
        skill_name=$(basename "$skill_dir")
        echo "  $skill_name:"
        jq -rs '[.[] | {pass: .audit_pass, accepted: .accepted, sel: .selection_delta, test: (.test_delta // "—")}] | group_by(.pass) | .[] | "    pass \(.[0].pass): \(length) edits, accepted \(map(select(.accepted)) | length)"' "$report" 2>/dev/null || echo "    (malformed report)"
      fi
    done
  fi
  echo ""
fi

# ---------- one-line headline ----------
#
# Each headline expresses a SINGLE counter and what it means — no derived ratios.
# The earlier "deferral acceptance rate ACCEPTED*100/REDISPATCH" was mathematically
# wrong: deferral_accepted and deferral_redispatch are INDEPENDENT events per
# observability-schema.md §3.6, so the ratio is not a rate and can exceed 100%.
# Prefer absolute counts with a deferral-discipline interpretation.

if [[ "$LEGACY" == "0" ]]; then
  TOTAL_DEFERRALS=$(( ACCEPTED + REDISPATCH ))
  if [[ "$TOTAL_DEFERRALS" -gt 0 ]]; then
    # Of all deferral attempts (= accepted + rejected-and-redispatched), what
    # fraction were rejected? Rising rejection rate = discipline holding.
    rej_pct=$(( REDISPATCH * 100 / TOTAL_DEFERRALS ))
    echo "Headline: $TOTAL_DEFERRALS deferral attempt(s) — $REDISPATCH rejected ($rej_pct%), $ACCEPTED accepted as catastrophic-justified."
  elif [[ "$IMPACT_REJ" -gt 0 ]]; then
    echo "Headline: $IMPACT_REJ closure-log entries — sprawl-reduction discipline active."
  elif [[ "$EPICS_DONE" -gt 0 ]]; then
    echo "Headline: $EPICS_DONE epic(s) closed, $TICKETS_DONE ticket(s) completed."
  elif [[ "$TICKETS_DONE" -gt 0 ]]; then
    echo "Headline: $TICKETS_DONE ticket(s) completed cleanly."
  else
    echo "Headline: $PHASES_STARTED phase(s) dispatched — run in progress."
  fi
fi
