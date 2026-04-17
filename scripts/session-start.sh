#!/usr/bin/env bash
# PM Workflow Session Start Hook
#
# Injects a brief nudge to auto-activate skills via the Skill tool.
#
# We intentionally do NOT inline skill catalogs here. Per Jesse Vincent's
# writing-skills guidance: when skill rules are pre-loaded as prose, Claude
# absorbs the gist from the description and skips invoking the full skill
# body. The Claude Code harness already lists all available skills in a
# system reminder; our job is just to remind Claude to call them.

set -euo pipefail

NUDGE='Skills are available via the Skill tool. Before responding to any coding, testing, debugging, documentation, or review request, scan the available skill list and invoke every skill whose description matches the task at hand. Do not paraphrase or follow the spirit of a skill without loading it — invoke the Skill tool to load the full body, including gotchas and prohibited patterns. Skills are enforcement mechanisms, not suggestions.'

if command -v python3 >/dev/null 2>&1; then
  JSON_CONTENT=$(printf '%s' "$NUDGE" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
else
  JSON_CONTENT=$(printf '"%s"' "$(printf '%s' "$NUDGE" | sed 's/\\/\\\\/g; s/"/\\"/g')")
fi

cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": ${JSON_CONTENT}
  }
}
EOF

exit 0
