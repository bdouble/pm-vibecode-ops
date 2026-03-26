#!/usr/bin/env bash
# PM Workflow Session Start Hook
# Reads the using-pm-workflow meta-skill and injects it as session context.
# This ensures all skills are checked before every response.

set -euo pipefail

# Resolve the plugin root directory (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SKILL_FILE="$PLUGIN_ROOT/skills/using-pm-workflow/SKILL.md"

if [ -f "$SKILL_FILE" ]; then
  # Read the skill content, stripping the YAML frontmatter (between --- markers)
  SKILL_CONTENT=$(awk 'BEGIN{skip=0} /^---$/{skip++; next} skip>=2{print}' "$SKILL_FILE")
else
  SKILL_CONTENT="WARNING: Meta-skill file not found at $SKILL_FILE. Skills may not auto-activate."
fi

# Escape the content for JSON embedding
# Replace backslashes, double quotes, newlines, tabs, and carriage returns
JSON_CONTENT=$(printf '%s' "$SKILL_CONTENT" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')

# Output the hook response with the skill content as additionalContext
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": ${JSON_CONTENT}
  }
}
EOF

exit 0
