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
#   0 — no violations (no protected-region changes, OR every violating hunk carries a paired @override marker, OR
#       the change was a fresh introduction of a new protected region)
#   1 — usage error
#   2 — protected region modified without paired @override marker (CI blocker)
#   3 — runtime error (git unavailable, malformed skill file: nested/unclosed @protected)
#
# What counts as a violation (per hunk):
#   - A line that EXISTED inside a <!-- @protected ... --> ... <!-- @end-protected --> block in the MERGE-BASE
#     of HEAD and the given base ref is added, modified, or deleted in HEAD
#   - OR a pure insertion lands strictly inside the base protected range (between two in-range lines)
#   - AND the same hunk does not contain an added <!-- @override approved-by="<name>" reason="<text>" --> marker
#
#   Pairing is per-hunk: one @override marker satisfies one hunk. Two separate hunks that each touch protected
#   content require two separate @override markers. This is the script-enforced analog of SkillOpt's "one
#   bounded-edit decision per operator approval."
#
# What does NOT count as a violation:
#   - A brand-new protected region introduced by this PR (no merge-base content to protect)
#   - Whitespace-only changes outside protected regions
#   - Changes outside protected regions (the rest of the SKILL.md is mutable freely)
#
# Why merge-base, not BASE_REF tip:
#   `git diff BASE_REF...HEAD` uses the MERGE-BASE for old-side line numbers, but `git show BASE_REF:file` returns
#   the tip snapshot. When main moves forward (the normal case during a PR's lifetime), those two line spaces
#   diverge, and protected-region modifications slip through unflagged. We resolve both to the merge-base.
#
# Override marker grammar:
#   <!-- @override approved-by="brian" reason="v4.7 audit pass — see context/skill-audits/no-silent-deferrals.md" -->
#
# Portability:
#   - bash 3.2+ (macOS default) and POSIX-ish awk (no gawk extensions).
#   - Requires git and grep. No jq, sed -i, or Python.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

# Resolve to the merge-base so BASE_CONTENT line numbers and diff old-side line numbers
# share the same line space. Without this, protected-region edits silently pass whenever
# the base ref has moved forward since the branch forked.
MERGE_BASE="$(git -C "$REPO_ROOT" merge-base "$BASE_REF" HEAD 2>/dev/null || true)"
if [[ -z "$MERGE_BASE" ]]; then
  echo "could not compute merge-base of '$BASE_REF' and HEAD" >&2
  exit 3
fi

# Helper: extract protected ranges from stdin.
# Emits one "start end" pair per closed @protected ... @end-protected block.
# Exits 3 on malformed input (nested/unclosed @protected, orphan @end-protected).
extract_protected_ranges() {
  awk '
    /<!-- @protected/ {
      if (start) {
        printf "ERROR: nested or unclosed @protected at line %d (previous opener at line %d)\n", NR, start > "/dev/stderr"
        exit 3
      }
      start = NR
      next
    }
    /<!-- @end-protected/ {
      if (!start) {
        printf "ERROR: orphan @end-protected at line %d (no matching opener)\n", NR > "/dev/stderr"
        exit 3
      }
      print start " " NR
      start = 0
    }
    END {
      if (start) {
        printf "ERROR: unclosed @protected (opener at line %d, no closing @end-protected)\n", start > "/dev/stderr"
        exit 3
      }
    }
  '
}

# Helper: an EXISTING line falls inside any protected range (inclusive of marker lines).
line_in_any_range() {
  local line="$1"
  local ranges="$2"
  local range range_start range_end
  while IFS= read -r range; do
    [[ -z "$range" ]] && continue
    range_start="${range%% *}"
    range_end="${range##* }"
    if (( line >= range_start && line <= range_end )); then
      return 0
    fi
  done <<<"$ranges"
  return 1
}

# Helper: an INSERTION point lands strictly inside a protected range.
# Convention: a diff hunk "@@ -N,0 +M,K @@" inserts content AFTER old line N.
# The insertion is "inside" range [s,e] iff s <= N < e — the point sits between
# two lines that are both within the protected envelope.
insertion_point_in_protected() {
  local line="$1"
  local ranges="$2"
  local range range_start range_end
  while IFS= read -r range; do
    [[ -z "$range" ]] && continue
    range_start="${range%% *}"
    range_end="${range##* }"
    if (( line >= range_start && line < range_end )); then
      return 0
    fi
  done <<<"$ranges"
  return 1
}

# Find SKILL.md files this branch changed relative to the merge-base.
CHANGED_SKILLS=$(git -C "$REPO_ROOT" diff --name-only "$MERGE_BASE" HEAD -- 'skills/*/SKILL.md' || true)

if [[ -z "$CHANGED_SKILLS" ]]; then
  echo "No SKILL.md files changed against $BASE_REF — nothing to validate."
  exit 0
fi

VIOLATIONS=0
SCANNED=0

# Hunk-scoped state (mutated by walk_diff and read by close_hunk).
hunk_violated=0
hunk_has_override=0
hunk_old_start=0
hunk_old_count=0
in_hunk=0

close_hunk() {
  if (( in_hunk && hunk_violated && ! hunk_has_override )); then
    echo "✗ $SKILL_NAME — protected region modified without paired @override marker" >&2
    echo "    file: $skill" >&2
    echo "    hunk: old line $hunk_old_start (count $hunk_old_count)" >&2
    echo "    fix:  add inside the same hunk:" >&2
    echo "          <!-- @override approved-by=\"<your-name>\" reason=\"<one-line justification>\" -->" >&2
    echo "" >&2
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
  hunk_violated=0
  hunk_has_override=0
}

while IFS= read -r skill; do
  [[ -z "$skill" ]] && continue
  SCANNED=$((SCANNED + 1))
  SKILL_NAME=$(basename "$(dirname "$skill")")

  # Skip deletions — nothing to validate on a removed file.
  if [[ ! -f "$REPO_ROOT/$skill" ]]; then
    continue
  fi

  # Pull merge-base content so its line numbers match the diff's old side.
  BASE_CONTENT=$(git -C "$REPO_ROOT" show "$MERGE_BASE:$skill" 2>/dev/null || true)
  if [[ -z "$BASE_CONTENT" ]]; then
    continue   # New skill in this branch — no merge-base content to protect.
  fi

  # `set -e` does NOT propagate exit codes through command substitution, so we
  # cannot let `extract_protected_ranges`'s exit 3 (malformed input) silently
  # collapse to empty output here — the caller would `continue` past it and the
  # malformed skill ships. Capture stderr + exit code explicitly and surface them.
  BASE_PROTECTED_ERR=$(mktemp)
  if ! BASE_PROTECTED_RANGES=$(printf '%s\n' "$BASE_CONTENT" | extract_protected_ranges 2>"$BASE_PROTECTED_ERR"); then
    cat "$BASE_PROTECTED_ERR" >&2
    echo "  (in $skill at merge-base $MERGE_BASE)" >&2
    rm -f "$BASE_PROTECTED_ERR"
    exit 3
  fi
  rm -f "$BASE_PROTECTED_ERR"
  if [[ -z "$BASE_PROTECTED_RANGES" ]]; then
    continue   # No protected regions in the merge-base version — nothing to enforce.
  fi

  DIFF=$(git -C "$REPO_ROOT" diff -U0 "$MERGE_BASE" HEAD -- "$skill" || true)
  if [[ -z "$DIFF" ]]; then
    continue
  fi

  # Walk the diff one hunk at a time. Each hunk must carry its OWN @override marker
  # (added on the new side) when it touches a base protected range. This pairing
  # closes the loophole where a single @override marker silently covered multiple
  # unrelated protected-region edits in the same file.
  in_hunk=0
  hunk_violated=0
  hunk_has_override=0
  hunk_old_start=0
  hunk_old_count=0

  while IFS= read -r dline; do
    if [[ "$dline" =~ ^@@\ -([0-9]+)(,([0-9]+))?\ \+([0-9]+)(,([0-9]+))? ]]; then
      # Close the previous hunk (if any) before starting a new one.
      close_hunk
      hunk_old_start="${BASH_REMATCH[1]}"
      hunk_old_count="${BASH_REMATCH[3]:-1}"
      in_hunk=1

      if (( hunk_old_count == 0 )); then
        # Pure insertion at point old_start. Flag if the insertion point is strictly
        # inside a protected range (between two in-range lines).
        if insertion_point_in_protected "$hunk_old_start" "$BASE_PROTECTED_RANGES"; then
          hunk_violated=1
        fi
      else
        # Lines [hunk_old_start, hunk_old_start + hunk_old_count) are touched.
        i=0
        while (( i < hunk_old_count )); do
          if line_in_any_range "$((hunk_old_start + i))" "$BASE_PROTECTED_RANGES"; then
            hunk_violated=1
            break
          fi
          i=$((i + 1))
        done
      fi
    elif (( in_hunk )) && [[ "$dline" == "+"* ]] && [[ "$dline" != "+++"* ]]; then
      # Added line — does it carry an @override marker?
      if printf '%s' "$dline" | grep -qE '<!-- @override approved-by="[^"]+" reason="[^"]+" -->'; then
        hunk_has_override=1
      fi
    fi
  done <<<"$DIFF"

  # Close the final hunk for this skill.
  close_hunk
  in_hunk=0
done <<<"$CHANGED_SKILLS"

if (( VIOLATIONS > 0 )); then
  echo "" >&2
  echo "validate-skill-invariants.sh: $VIOLATIONS protected-region modification(s) without paired @override markers." >&2
  echo "Per SkillOpt §3.6, protected regions enforce bounded-edit discipline. Each change requires an explicit" >&2
  echo "operator decision recorded inline. See docs/SKILL_AUDIT_PLAYBOOK.md for the audit process." >&2
  exit 2
fi

echo ""
echo "validate-skill-invariants.sh: scanned $SCANNED skill(s), no protected-region violations."
exit 0
