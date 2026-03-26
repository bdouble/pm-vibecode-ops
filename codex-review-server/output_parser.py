"""Parse Codex CLI text output into structured findings.

The review prompt instructs Codex to return JSON-formatted findings.
This module handles parsing that output, with fallback for
non-JSON responses.
"""

import json
import re
from config import Config


def parse_review_output(raw_output: str) -> dict:
    """Parse Codex review output into structured findings.

    Attempts to extract JSON from the response. Falls back to
    text-based parsing if JSON extraction fails.

    Returns:
        {
            "findings": [...],
            "summary": "...",
            "model": "...",
            "reasoning_effort": "...",
            "raw_output": "..."
        }
    """
    findings = _try_json_parse(raw_output)

    if findings is None:
        findings = _fallback_text_parse(raw_output)

    # Filter by minimum severity
    min_level = Config.SEVERITY_ORDER.get(Config.MIN_SEVERITY, 2)
    filtered = [
        f for f in findings
        if Config.SEVERITY_ORDER.get(f.get("severity", "low"), 3) <= min_level
    ]

    # Sort by severity (critical first)
    filtered.sort(key=lambda f: Config.SEVERITY_ORDER.get(f.get("severity", "low"), 3))

    summary_parts = []
    for sev in ["critical", "high", "medium", "low"]:
        count = sum(1 for f in filtered if f.get("severity") == sev)
        if count > 0:
            summary_parts.append(f"{count} {sev}")

    return {
        "findings": filtered,
        "summary": f"Found {len(filtered)} issues: {', '.join(summary_parts)}" if filtered else "No issues found",
        "model": Config.MODEL,
        "reasoning_effort": Config.REASONING,
        "raw_output": raw_output,
    }


def parse_fix_output(raw_output: str) -> dict:
    """Parse Codex fix output into a structured patch.

    Returns:
        {
            "patch": "...",
            "explanation": "...",
            "risk_assessment": "...",
        }
    """
    result = _try_json_parse_single(raw_output)
    if result:
        return result

    # Fallback: treat entire output as explanation with no structured patch
    return {
        "patch": None,
        "explanation": raw_output,
        "risk_assessment": "Unable to parse structured fix output. Manual review required.",
    }


def _try_json_parse(text: str) -> list | None:
    """Try to extract a JSON array of findings from text."""
    # Look for JSON array in the text
    match = re.search(r'\[[\s\S]*?\](?=\s*$|\s*```)', text)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass

    # Look for JSON object with "findings" key
    match = re.search(r'\{[\s\S]*"findings"[\s\S]*\}', text)
    if match:
        try:
            data = json.loads(match.group())
            if "findings" in data and isinstance(data["findings"], list):
                return data["findings"]
        except json.JSONDecodeError:
            pass

    return None


def _try_json_parse_single(text: str) -> dict | None:
    """Try to extract a single JSON object from text."""
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None


def _fallback_text_parse(text: str) -> list:
    """Best-effort parsing of non-JSON review output.

    Looks for patterns like:
    - **CRITICAL**: description (file:line)
    - [HIGH] description - file.ts:42
    """
    findings = []
    severity_pattern = re.compile(
        r'(?:^|\n)\s*(?:\*\*|[\[\(])?(CRITICAL|HIGH|MEDIUM|LOW)(?:\*\*|[\]\)])?[:\s-]+(.+?)(?:\n|$)',
        re.IGNORECASE | re.MULTILINE,
    )

    for match in severity_pattern.finditer(text):
        severity = match.group(1).lower()
        description = match.group(2).strip()

        # Try to extract file:line from description
        file_match = re.search(r'(\S+\.\w+):(\d+)', description)
        file_path = file_match.group(1) if file_match else None
        line = int(file_match.group(2)) if file_match else None

        findings.append({
            "severity": severity,
            "category": "unknown",
            "file": file_path,
            "line": line,
            "description": description,
            "evidence": "",
            "suggested_fix": "",
            "confidence": 0.5,
        })

    return findings
