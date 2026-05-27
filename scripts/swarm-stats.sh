#!/usr/bin/env bash
# swarm-stats.sh — render an observability dashboard for a v4.7 JSONL event stream.
#
# Schema version: 1 (v4.7 — 15 event types)
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

EPIC_DIR=""
SOLO_FILE=""

if [[ -d "$OBS_ROOT/$TARGET" ]]; then
  EPIC_DIR="$OBS_ROOT/$TARGET"
elif [[ -f "$OBS_ROOT/_solo/$TARGET.jsonl" ]]; then
  SOLO_FILE="$OBS_ROOT/_solo/$TARGET.jsonl"
else
  # Walk epic dirs looking for the ticket
  for d in "$OBS_ROOT"/*/; do
    [[ -d "$d" ]] || continue
    if [[ -f "$d$TARGET.jsonl" ]]; then
      EPIC_DIR="${d%/}"
      break
    fi
  done
fi

if [[ -z "$EPIC_DIR" && -z "$SOLO_FILE" ]]; then
  echo "no observability stream found for '$TARGET'" >&2
  echo "  checked: $OBS_ROOT/$TARGET/" >&2
  echo "  checked: $OBS_ROOT/_solo/$TARGET.jsonl" >&2
  echo "  also walked: $OBS_ROOT/*/" >&2
  exit 2
fi

# ---------- collect stream into a single concatenated jsonl ----------

STREAM=$(mktemp -t swarm-stats.XXXXXX)
trap 'rm -f "$STREAM"' EXIT

if [[ -n "$EPIC_DIR" ]]; then
  for f in "$EPIC_DIR"/*.jsonl; do
    [[ -f "$f" ]] || continue
    # _epic.jsonl holds epic-level events (epic_completed, followup_cap_blocked) that
    # are NOT per-ticket events — including it inflates all per-ticket metric counts.
    [[ "$(basename "$f")" == "_epic.jsonl" ]] && continue
    cat "$f" >> "$STREAM"
  done
elif [[ -n "$SOLO_FILE" ]]; then
  cat "$SOLO_FILE" >> "$STREAM"
fi

if [[ ! -s "$STREAM" ]]; then
  echo "stream is empty for '$TARGET'" >&2
  exit 2
fi

# ---------- detect legacy vs v4.7 ----------

LEGACY=0
EVENT_TYPES=$(jq -rs '[.[].event] | unique | .[]' "$STREAM" 2>/dev/null || echo "")
# Count distinct event types that are NOT profile_assigned. grep -v returning no matches
# yields exit code 1 under pipefail, so guard with `|| true` (intentional under set -e).
NON_PROFILE=$(printf '%s\n' "$EVENT_TYPES" | grep -cv '^profile_assigned$' || true)
NON_PROFILE=${NON_PROFILE:-0}
if [[ "$NON_PROFILE" == "0" ]]; then
  LEGACY=1
fi

# ---------- header ----------

if [[ -n "$EPIC_DIR" ]]; then
  TICKET_COUNT=$(ls "$EPIC_DIR"/*.jsonl 2>/dev/null | grep -v '_epic.jsonl' | wc -l | tr -d ' ')
  HEADER_LABEL="EPIC $TARGET — $TICKET_COUNT ticket(s)"
else
  TICKET_COUNT=1
  HEADER_LABEL="TICKET $TARGET (standalone /execute-ticket)"
fi

echo "$HEADER_LABEL"
if [[ "$LEGACY" == "1" ]]; then
  echo "** Pre-v4.7 epic — partial data only **"
  echo "(Only profile_assigned events present. All other metrics: —)"
  echo ""
fi

# ---------- aggregations ----------

count_event() { jq -rs --arg e "$1" '[.[] | select(.event==$e)] | length' "$STREAM"; }

# .data.profile = execute-ticket envelope format; .profile = epic-swarm legacy top-level format
PROFILES_MINIMAL=$(jq -rs '[.[] | select(.event=="profile_assigned" and ((.data.profile // .profile) == "MINIMAL"))] | length' "$STREAM")
PROFILES_STANDARD=$(jq -rs '[.[] | select(.event=="profile_assigned" and ((.data.profile // .profile) == "STANDARD"))] | length' "$STREAM")
PROFILES_STRICT=$(jq -rs '[.[] | select(.event=="profile_assigned" and ((.data.profile // .profile) == "STRICT"))] | length' "$STREAM")
OVERRIDES=$(count_event profile_overridden)

PHASES_STARTED=$(count_event phase_started)
PHASES_COMPLETED=$(count_event phase_completed)
PHASES_NA=$(count_event phase_skipped_na)

REDISPATCH=$(count_event deferral_redispatch)
ACCEPTED=$(count_event deferral_accepted)

IMPACT_REJ=$(count_event impact_bar_rejected)
BOUNDARY=$(count_event boundary_question_answered)
CAP_BLOCKED=$(count_event followup_cap_blocked)

CODEX_RES=$(count_event codex_finding_resolved)
CODEX_AUTO=$(jq -rs '[.[] | select(.event=="codex_finding_resolved" and .data.disposition=="auto_fixed")] | length' "$STREAM")
CODEX_USER=$(jq -rs '[.[] | select(.event=="codex_finding_resolved" and .data.disposition=="user_decision")] | length' "$STREAM")
CODEX_LOG=$(jq -rs '[.[] | select(.event=="codex_finding_resolved" and .data.disposition=="closure_log")] | length' "$STREAM")
CODEX_ESCAPE=$(count_event codex_scope_escape)

TICKETS_DONE=$(count_event ticket_completed)
TICKETS_FAILED=$(count_event ticket_failed)
EPICS_DONE=$(count_event epic_completed)

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

if [[ "$LEGACY" == "0" ]]; then
  if [[ "$REDISPATCH" -gt 0 ]]; then
    acceptance=$(( ACCEPTED * 100 / REDISPATCH ))
    echo "Headline: deferral acceptance rate $acceptance% ($ACCEPTED of $REDISPATCH)."
  elif [[ "$IMPACT_REJ" -gt 0 ]]; then
    echo "Headline: $IMPACT_REJ closure-log entries — sprawl-reduction discipline active."
  elif [[ "$TICKETS_DONE" -gt 0 ]]; then
    echo "Headline: $TICKETS_DONE ticket(s) completed cleanly."
  else
    echo "Headline: $PHASES_STARTED phase(s) dispatched — run in progress."
  fi
fi
