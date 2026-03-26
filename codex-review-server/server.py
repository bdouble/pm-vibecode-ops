"""Codex Review MCP Server.

Exposes codex_review and codex_fix tools via MCP stdio transport.
Uses Codex CLI (ChatGPT subscription auth) to access OpenAI models.

Install:
    claude mcp add codex-review-server -- python3 /path/to/server.py

Configure via environment variables:
    CODEX_REVIEW_MODEL=gpt-5.3-codex
    CODEX_REVIEW_REASONING=xhigh
    CODEX_REVIEW_TIMEOUT=300
    CODEX_REVIEW_AUTO_FIX=false
    CODEX_REVIEW_MIN_SEVERITY=medium
    CODEX_REVIEW_FOCUS=all
"""

import sys
import os
import json

# Add server directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp import FastMCP
from config import Config
from codex_runner import run_codex, CodexRateLimitError, CodexNotFoundError, CodexError
from output_parser import parse_review_output, parse_fix_output

server = FastMCP("codex-review-server")

# Validate config on startup
warnings = Config.validate()
for w in warnings:
    print(f"[codex-review-server] WARNING: {w}", file=sys.stderr)


REVIEW_SYSTEM_PROMPT = """You are a senior code reviewer performing a cross-model adversarial review.
Your job is to find issues that another AI model may have missed during implementation.

Focus on: runtime bugs, edge cases, security vulnerabilities, logic errors, missing error handling,
race conditions, null/undefined dereferences, off-by-one errors, resource leaks, and injection risks.

DO NOT focus on: code style, naming conventions, formatting, minor organization preferences,
or theoretical concerns without concrete evidence.

Return your findings as a JSON array. Each finding must have:
{
  "severity": "critical|high|medium|low",
  "category": "bug|security|performance|logic|edge-case",
  "file": "path/to/file.ts",
  "line": 42,
  "description": "Clear description of the issue",
  "evidence": "The specific code that demonstrates the problem",
  "suggested_fix": "How to fix it",
  "confidence": 0.95
}

If no issues are found, return an empty array: []

Be precise. Every finding must have concrete evidence from the code. No speculation."""


FIX_SYSTEM_PROMPT = """You are a surgical code fixer. Given a specific finding from a code review,
generate the minimal fix that addresses the issue without changing anything else.

Return a JSON object:
{
  "patch": "The complete fixed version of the affected code section",
  "explanation": "Brief explanation of what was changed and why",
  "risk_assessment": "Low|Medium|High - assessment of fix risk",
  "tests_to_verify": ["list of test files or test names to run"]
}

Rules:
- Change ONLY what is necessary to fix the identified issue
- Preserve all surrounding code exactly
- Do not refactor, rename, or reorganize
- Do not add features or improvements beyond the fix
- If the fix requires changes to multiple locations, include all of them"""


@server.tool()
def codex_review(
    diff: str,
    context: str = "",
    focus: str = "",
    depth: str = "",
) -> str:
    """Review a code diff using OpenAI Codex to find bugs, security issues, and edge cases.

    Args:
        diff: Git diff content to review
        context: Additional context (ticket description, acceptance criteria, etc.)
        focus: Review focus area - "bugs", "security", "performance", or "all" (default: from config)
        depth: Reasoning depth - "low", "medium", "high", "xhigh" (default: from config)

    Returns:
        JSON string with structured findings
    """
    effective_focus = focus or Config.FOCUS
    effective_depth = depth or Config.REASONING

    # Override reasoning for this call if specified
    original_reasoning = Config.REASONING
    if depth:
        Config.REASONING = depth

    focus_instruction = ""
    if effective_focus != "all":
        focus_instruction = f"\nFocus specifically on {effective_focus} issues."

    prompt = f"""{REVIEW_SYSTEM_PROMPT}
{focus_instruction}

## Context
{context}

## Code Diff to Review
```diff
{diff}
```

Return findings as a JSON array. Be thorough but precise — only report issues with concrete evidence."""

    try:
        raw_output = run_codex(prompt, sandbox="read-only")
        result = parse_review_output(raw_output)
        return json.dumps(result, indent=2)
    except CodexRateLimitError as e:
        return json.dumps({
            "error": "rate_limit",
            "message": str(e),
            "findings": [],
        })
    except CodexNotFoundError as e:
        return json.dumps({
            "error": "codex_not_found",
            "message": str(e),
            "findings": [],
        })
    except CodexError as e:
        return json.dumps({
            "error": "codex_error",
            "message": str(e),
            "findings": [],
        })
    finally:
        Config.REASONING = original_reasoning


@server.tool()
def codex_fix(
    finding: str,
    file_content: str,
    context: str = "",
) -> str:
    """Generate a fix for a specific finding from codex_review.

    Args:
        finding: JSON string of a single finding object from codex_review
        file_content: Current content of the affected file
        context: Additional context about the codebase

    Returns:
        JSON string with patch, explanation, and risk assessment
    """
    prompt = f"""{FIX_SYSTEM_PROMPT}

## Finding to Fix
```json
{finding}
```

## Current File Content
```
{file_content}
```

## Additional Context
{context}

Generate the minimal fix. Return as JSON."""

    try:
        raw_output = run_codex(prompt, sandbox="read-only")
        result = parse_fix_output(raw_output)
        return json.dumps(result, indent=2)
    except CodexRateLimitError as e:
        return json.dumps({
            "error": "rate_limit",
            "message": str(e),
        })
    except CodexError as e:
        return json.dumps({
            "error": "codex_error",
            "message": str(e),
        })


if __name__ == "__main__":
    server.run(transport="stdio")
