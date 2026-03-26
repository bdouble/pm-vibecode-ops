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

# Escape the content for JSON embedding.
# Prefer python3 when available, but keep a fallback so the hook works
# in environments where python3 is not installed.
if command -v python3 >/dev/null 2>&1; then
  JSON_CONTENT=$(printf '%s' "$SKILL_CONTENT" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
else
  JSON_CONTENT=$(printf '%s' "$SKILL_CONTENT" | awk '
    BEGIN { printf "\""; first = 1 }
    {
      if (!first) printf "\\n";
      first = 0;
      gsub(/\\/,"\\\\");
      gsub(/"/,"\\\"");
      gsub(/\t/,"\\t");
      gsub(/\r/,"\\r");
      printf "%s", $0
    }
    END { printf "\"" }
  ')
fi

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
