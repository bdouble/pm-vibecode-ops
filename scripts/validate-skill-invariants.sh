#!/usr/bin/env bash
# validate-skill-invariants.sh — fail CI if a skill's protected region was modified without an explicit override marker.
#
# Per SkillOpt §3.6 (Yang et al., 2026): protected regions are the single most important safety mechanism for skill
# files — removing the analog cost SpreadsheetBench 22 points (77.5 → 55.0). This script enforces that bounded-edit
# discipline at PR time. A protected region containing foundational principles, Iron Law statements, or descriptions
# is mutable only with an explicit operator decision recorded inline.
#
# Usage:
#   scripts/validate-skill-invariants.sh                    # validate against main
#   scripts/validate-skill-invariants.sh <base-ref>         # validate against arbitrary ref (e.g., origin/release)
#
# Exit codes:
#   0 — no violations (no protected-region changes, OR all changes have @override markers, OR the change was a
#       fresh introduction of a new protected region)
#   1 — usage error
#   2 — pre-existing protected region modified without @override marker (CI blocker)
#   3 — runtime error (git unavailable, malformed skill file)
#
# What counts as a violation:
#   - A line that EXISTED inside a <!-- @protected ... --> ... <!-- @end-protected --> block in the base ref
#     was added, modified, or deleted in HEAD
#   - AND the PR does not introduce an adjacent <!-- @override approved-by="<name>" reason="<text>" --> marker
#
# What does NOT count as a violation:
#   - A brand-new protected region introduced by this PR (no pre-existing content to protect)
#   - Whitespace-only changes outside protected regions
#   - Changes outside protected regions (the whole rest of the SKILL.md is mutable freely)
#
# Override marker grammar:
#   <!-- @override approved-by="brian" reason="v4.7 audit pass — see context/skill-audits/no-silent-deferrals.md" -->
#
# Portability:
#   - Uses POSIX-ish awk (no gawk extensions). Tested on macOS BWK awk and GNU gawk.
#   - Requires git and grep. No jq, sed -i, or Python.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Validate the repo the user is INSIDE, not the repo where the script lives. This lets the same script
# operate on any consumer repo without per-install pathing.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

BASE_REF="${1:-main}"

if ! command -v git >/dev/null 2>&1; then
  echo "validate-skill-invariants.sh requires git" >&2
  exit 3
fi

if ! git -C "$REPO_ROOT" rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "base ref '$BASE_REF' not found — pass an explicit ref or fetch first" >&2
  exit 1
fi

# Helper: extract protected ranges (start_line end_line pairs, one per line) from stdin.
# Portable awk — no match($0, regex, arr).
extract_protected_ranges() {
  awk '
    /<!-- @protected/ { start = NR; next }
    /<!-- @end-protected/ { if (start) { print start " " NR; start = 0 } }
  '
}

# Helper: from a unified-diff (-U0) on stdin, extract NEW-side line numbers that were added or modified.
# Hunk header format: @@ -<old_start>[,<old_count>] +<new_start>[,<new_count>] @@
# Portable approach: grep the @@ lines, then awk-parse the +N,M token without using gawk's match-with-array.
extract_new_changed_lines() {
  grep '^@@ ' || true
}

# Helper: from a unified-diff on stdin, extract OLD-side line numbers that were modified or deleted.
extract_old_changed_lines() {
  grep '^@@ ' || true
}

# Helper: parse the "+start,count" token from a single hunk header line.
# Echoes one line number per affected NEW-side line.
parse_new_hunk_lines() {
  local hunk="$1"
  # Grab the "+N" or "+N,M" token (the second numeric token after @@).
  local token
  token=$(printf '%s\n' "$hunk" | grep -oE '\+[0-9]+(,[0-9]+)?' | head -1)
  [[ -z "$token" ]] && return
  local start count
  start=$(printf '%s' "$token" | sed 's/^+//' | cut -d, -f1)
  if [[ "$token" == *","* ]]; then
    count=$(printf '%s' "$token" | cut -d, -f2)
  else
    count=1
  fi
  # count==0 means pure deletion — no NEW-side lines to flag (handled separately via old-side scan).
  [[ "$count" == "0" ]] && return
  local i=0
  while (( i < count )); do
    echo $((start + i))
    i=$((i + 1))
  done
}

# Helper: parse the "-start,count" token from a single hunk header line.
parse_old_hunk_lines() {
  local hunk="$1"
  local token
  token=$(printf '%s\n' "$hunk" | grep -oE '\-[0-9]+(,[0-9]+)?' | head -1)
  [[ -z "$token" ]] && return
  local start count
  start=$(printf '%s' "$token" | sed 's/^-//' | cut -d, -f1)
  if [[ "$token" == *","* ]]; then
    count=$(printf '%s' "$token" | cut -d, -f2)
  else
    count=1
  fi
  [[ "$count" == "0" ]] && return
  local i=0
  while (( i < count )); do
    echo $((start + i))
    i=$((i + 1))
  done
}

# Helper: check whether a line number falls inside any of the provided ranges.
# Returns 0 (true) on match, 1 (false) otherwise.
line_in_any_range() {
  local line="$1"
  local ranges="$2"
  while IFS= read -r range; do
    [[ -z "$range" ]] && continue
    local range_start="${range%% *}"
    local range_end="${range##* }"
    if (( line >= range_start && line <= range_end )); then
      return 0
    fi
  done <<<"$ranges"
  return 1
}

# Find all SKILL.md files changed against the base.
CHANGED_SKILLS=$(git -C "$REPO_ROOT" diff --name-only "$BASE_REF"...HEAD -- 'skills/*/SKILL.md' || true)

if [[ -z "$CHANGED_SKILLS" ]]; then
  echo "No SKILL.md files changed against $BASE_REF — nothing to validate."
  exit 0
fi

VIOLATIONS=0
SCANNED=0

while IFS= read -r skill; do
  [[ -z "$skill" ]] && continue
  SCANNED=$((SCANNED + 1))
  SKILL_NAME=$(basename "$(dirname "$skill")")

  # Skip if the file was deleted (no need to check protected regions on a removed file).
  if [[ ! -f "$REPO_ROOT/$skill" ]]; then
    continue
  fi

  # The KEY rule: only flag changes that touch protected regions that EXISTED IN THE BASE REF.
  # A brand-new protected region added by this PR is fine — there was nothing to protect before.
  BASE_CONTENT=$(git -C "$REPO_ROOT" show "$BASE_REF:$skill" 2>/dev/null || true)
  if [[ -z "$BASE_CONTENT" ]]; then
    continue   # New skill — no base content to validate against, no protection invariants to enforce.
  fi

  BASE_PROTECTED_RANGES=$(printf '%s\n' "$BASE_CONTENT" | extract_protected_ranges)
  if [[ -z "$BASE_PROTECTED_RANGES" ]]; then
    continue   # No protected regions in the base version — nothing to enforce.
  fi

  # Pull the diff hunks for this file (unified=0 for tight line ranges).
  DIFF=$(git -C "$REPO_ROOT" diff -U0 "$BASE_REF"...HEAD -- "$skill" || true)
  if [[ -z "$DIFF" ]]; then
    continue
  fi

  # Collect all hunk headers, then expand them to per-line OLD-side numbers.
  HUNKS=$(printf '%s\n' "$DIFF" | grep '^@@ ' || true)
  if [[ -z "$HUNKS" ]]; then
    continue
  fi

  OLD_TOUCHED_LINES=""
  while IFS= read -r hunk; do
    [[ -z "$hunk" ]] && continue
    expanded=$(parse_old_hunk_lines "$hunk")
    if [[ -n "$expanded" ]]; then
      OLD_TOUCHED_LINES+="${expanded}"$'\n'
    fi
  done <<<"$HUNKS"

  # Check whether any OLD-side touched line falls inside a BASE protected range.
  REGION_VIOLATED=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if line_in_any_range "$line" "$BASE_PROTECTED_RANGES"; then
      REGION_VIOLATED=1
      break
    fi
  done <<<"$OLD_TOUCHED_LINES"

  if [[ "$REGION_VIOLATED" == "1" ]]; then
    # Check whether the diff also introduces an @override marker for this skill.
    OVERRIDE_FOUND=$(printf '%s\n' "$DIFF" | grep -E '^\+.*<!-- @override approved-by="[^"]+" reason="[^"]+" -->' || true)
    if [[ -z "$OVERRIDE_FOUND" ]]; then
      VIOLATIONS=$((VIOLATIONS + 1))
      echo "✗ $SKILL_NAME — pre-existing protected region modified without @override marker" >&2
      echo "    file: $skill" >&2
      echo "    fix:  add a marker adjacent to the change, e.g.:" >&2
      echo "          <!-- @override approved-by=\"<your-name>\" reason=\"<one-line justification>\" -->" >&2
      echo "" >&2
    else
      echo "✓ $SKILL_NAME — pre-existing protected region modified, @override marker present"
    fi
  fi
done <<<"$CHANGED_SKILLS"

if (( VIOLATIONS > 0 )); then
  echo "" >&2
  echo "validate-skill-invariants.sh: $VIOLATIONS skill(s) modified pre-existing protected regions without @override markers." >&2
  echo "Per SkillOpt §3.6, protected regions enforce bounded-edit discipline. Each change requires an explicit" >&2
  echo "operator decision recorded inline. See docs/SKILL_AUDIT_PLAYBOOK.md for the audit process." >&2
  exit 2
fi

echo ""
echo "validate-skill-invariants.sh: scanned $SCANNED skill(s), no protected-region violations."
exit 0
