#!/usr/bin/env bash
# PM Workflow Session Start Hook
# Injects context about PM workflow skills and commands for non-engineer users

set -euo pipefail

cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<EXTREMELY_IMPORTANT>\nThis session is using the PM Workflow system designed for Product Managers and non-engineers to produce production-quality code.\n\nBEFORE ANY ACTION, you MUST:\n1. Check which skills apply to the current task\n2. Follow skill enforcement strictly - skills are NOT optional\n3. Use the structured workflow commands in sequence\n\nAVAILABLE SKILLS (auto-activate based on context):\n- production-code-standards: Blocks workarounds, temporary code, fallbacks, TODO comments\n- service-reuse: REQUIRES checking service inventory before creating ANY new service\n- testing-philosophy: Fix broken tests BEFORE writing new tests; verify actual APIs\n- mvd-documentation: Document 'why' not 'what'; no placeholder content\n- security-patterns: Auth on every endpoint; parameterized queries; input validation\n- model-aware-behavior: Read ALL relevant files before proposing changes; no speculation\n- using-pm-workflow: Guide users through workflow phases correctly\n- verify-implementation: Verify work before marking tasks complete\n- divergent-exploration: Explore alternative approaches before converging on solution\n\nWORKFLOW COMMANDS (execute in sequence):\nProject-Level:\n  /generate_service_inventory - Catalog existing services first\n  /discovery - Analyze patterns and architecture\n  /epic-planning - Create business-focused epics\n  /planning - Decompose epics into technical tickets\n\nTicket-Level:\n  /adaptation - Create implementation guide\n  /implementation - Write production code\n  /testing - Build comprehensive test suite\n  /documentation - Generate API docs\n  /codereview - Quality assurance review\n  /security_review - OWASP assessment (closes ticket on pass)\n\nCRITICAL REMINDERS:\n- Users are often non-engineers - explain technical decisions clearly\n- ALL code must be production-ready - no shortcuts, no 'we can fix it later'\n- Skills BLOCK prohibited patterns - respect their enforcement\n- Only /security_review closes tickets - other phases keep tickets open\n</EXTREMELY_IMPORTANT>"
  }
}
EOF

exit 0
