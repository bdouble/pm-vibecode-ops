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
#   0 — no protected-region changes, OR all changes have @override markers
#   1 — usage error
#   2 — protected region modified without @override marker (CI blocker)
#   3 — runtime error (git unavailable, malformed skill file)
#
# What counts as a violation:
#   - Any line inside <!-- @protected ... --> ... <!-- @end-protected --> changed in the diff against <base-ref>
#   - AND the same PR does not introduce or update a <!-- @override approved-by="<name>" reason="<text>" --> marker
#     adjacent to the modified region
#
# Override marker grammar:
#   <!-- @override approved-by="brian" reason="v4.7 audit pass — see context/skill-audits/no-silent-deferrals.md" -->
#
# The script is intentionally strict: it does not "guess" intent. A protected-region change without an override marker
# blocks the PR even if the change looks benign. This is the SkillOpt invariant — silent drift is exactly the failure
# mode protected regions exist to prevent.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BASE_REF="${1:-main}"

if ! command -v git >/dev/null 2>&1; then
  echo "validate-skill-invariants.sh requires git" >&2
  exit 3
fi

# Resolve base ref. Accept either a local ref ("main") or remote ("origin/main").
if ! git -C "$REPO_ROOT" rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "base ref '$BASE_REF' not found — pass an explicit ref or fetch first" >&2
  exit 1
fi

# Find all SKILL.md files changed against the base.
CHANGED_SKILLS=$(git -C "$REPO_ROOT" diff --name-only "$BASE_REF"...HEAD -- 'skills/*/SKILL.md' || true)

if [[ -z "$CHANGED_SKILLS" ]]; then
  echo "No SKILL.md files changed against $BASE_REF — nothing to validate."
  exit 0
fi

VIOLATIONS=0
SCANNED=0

for skill in $CHANGED_SKILLS; do
  SCANNED=$((SCANNED + 1))
  SKILL_NAME=$(basename "$(dirname "$skill")")

  # Skip if the file was deleted (no need to check protected regions on a removed file).
  if [[ ! -f "$REPO_ROOT/$skill" ]]; then
    continue
  fi

  # Step 1: identify the line ranges of @protected blocks in the CURRENT version of the file.
  # awk emits "start end" pairs for every open/close block.
  PROTECTED_RANGES=$(awk '
    /<!-- @protected/ { start = NR }
    /<!-- @end-protected/ { if (start) { print start " " NR; start = 0 } }
  ' "$REPO_ROOT/$skill")

  if [[ -z "$PROTECTED_RANGES" ]]; then
    continue   # No protected regions in this skill — nothing to validate.
  fi

  # Step 2: pull the diff for this file against the base ref (unified=0 for tight ranges).
  DIFF=$(git -C "$REPO_ROOT" diff -U0 "$BASE_REF"...HEAD -- "$skill" || true)

  if [[ -z "$DIFF" ]]; then
    continue   # File listed as changed but the diff is empty (e.g., only mode change) — skip.
  fi

  # Step 3: parse the diff hunks to find which line ranges of the NEW file were touched.
  # Hunk header format: @@ -<old_start>,<old_count> +<new_start>,<new_count> @@
  CHANGED_LINES=$(printf '%s\n' "$DIFF" | awk '
    /^@@ / {
      match($0, /\+([0-9]+)(,([0-9]+))?/, m)
      start = m[1] + 0
      count = (m[3] == "") ? 1 : m[3] + 0
      if (count == 0) next   # Pure deletion — no NEW lines to flag (deletion-only handled below)
      for (i = 0; i < count; i++) print (start + i)
    }
  ')

  # Step 4: for each protected range, check whether any changed line falls inside it.
  REGION_VIOLATED=0
  while read -r range; do
    [[ -z "$range" ]] && continue
    range_start=${range%% *}
    range_end=${range##* }
    while read -r line; do
      [[ -z "$line" ]] && continue
      if (( line >= range_start && line <= range_end )); then
        REGION_VIOLATED=1
        break 2
      fi
    done <<<"$CHANGED_LINES"
  done <<<"$PROTECTED_RANGES"

  # Step 5: pure-deletion check — if a hunk has +count==0 but -count>0 against a base-ref line that fell inside
  # a protected range in the OLD version, that's also a violation. Use the OLD-side protected ranges from the base.
  BASE_CONTENT=$(git -C "$REPO_ROOT" show "$BASE_REF:$skill" 2>/dev/null || true)
  if [[ -n "$BASE_CONTENT" ]]; then
    BASE_PROTECTED_RANGES=$(printf '%s\n' "$BASE_CONTENT" | awk '
      /<!-- @protected/ { start = NR }
      /<!-- @end-protected/ { if (start) { print start " " NR; start = 0 } }
    ')
    DELETED_LINES=$(printf '%s\n' "$DIFF" | awk '
      /^@@ / {
        match($0, /-([0-9]+)(,([0-9]+))?/, m)
        start = m[1] + 0
        count = (m[3] == "") ? 1 : m[3] + 0
        for (i = 0; i < count; i++) print (start + i)
      }
    ')
    while read -r range; do
      [[ -z "$range" ]] && continue
      range_start=${range%% *}
      range_end=${range##* }
      while read -r line; do
        [[ -z "$line" ]] && continue
        if (( line >= range_start && line <= range_end )); then
          REGION_VIOLATED=1
          break 2
        fi
      done <<<"$DELETED_LINES"
    done <<<"$BASE_PROTECTED_RANGES"
  fi

  if [[ "$REGION_VIOLATED" == "1" ]]; then
    # Step 6: check whether the diff also introduces an @override marker for this skill.
    OVERRIDE_FOUND=$(printf '%s\n' "$DIFF" | grep -E '^\+.*<!-- @override approved-by="[^"]+" reason="[^"]+" -->' || true)
    if [[ -z "$OVERRIDE_FOUND" ]]; then
      VIOLATIONS=$((VIOLATIONS + 1))
      echo "✗ $SKILL_NAME — protected region modified without @override marker" >&2
      echo "    file: $skill" >&2
      echo "    fix:  add a marker adjacent to the change, e.g.:" >&2
      echo "          <!-- @override approved-by=\"<your-name>\" reason=\"<one-line justification>\" -->" >&2
      echo "" >&2
    else
      echo "✓ $SKILL_NAME — protected region modified, @override marker present"
    fi
  fi
done

if (( VIOLATIONS > 0 )); then
  echo "" >&2
  echo "validate-skill-invariants.sh: $VIOLATIONS skill(s) modified protected regions without @override markers." >&2
  echo "Per SkillOpt §3.6, protected regions enforce bounded-edit discipline. Each change requires an explicit" >&2
  echo "operator decision recorded inline. See docs/SKILL_AUDIT_PLAYBOOK.md for the audit process." >&2
  exit 2
fi

echo ""
echo "validate-skill-invariants.sh: scanned $SCANNED skill(s), no protected-region violations."
exit 0
