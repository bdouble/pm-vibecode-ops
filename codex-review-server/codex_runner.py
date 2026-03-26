"""Codex CLI subprocess management.

Handles spawning codex exec processes, timeout enforcement, and output capture.
Uses ChatGPT subscription auth (via `codex login`), not API keys.
"""

import subprocess
import shutil
import json
from config import Config


class CodexError(Exception):
    """Raised when Codex CLI execution fails."""
    pass


class CodexRateLimitError(CodexError):
    """Raised when Codex returns a rate limit error."""
    pass


class CodexNotFoundError(CodexError):
    """Raised when Codex CLI is not installed."""
    pass


def find_codex_binary() -> str:
    """Find the codex CLI binary."""
    path = shutil.which("codex")
    if path is None:
        raise CodexNotFoundError(
            "Codex CLI not found. Install with: brew install codex-cli\n"
            "Then authenticate with: codex login"
        )
    return path


def run_codex(
    prompt: str,
    sandbox: str = "read-only",
    timeout: int | None = None,
) -> str:
    """Run a prompt through Codex CLI and return the response text.

    Args:
        prompt: The prompt to send to Codex
        sandbox: Sandbox mode - "read-only" for review, "workspace-write" for fixes
        timeout: Timeout in seconds (defaults to Config.TIMEOUT)

    Returns:
        The model's response text, with Codex CLI chrome stripped.

    Raises:
        CodexNotFoundError: Codex CLI not installed
        CodexRateLimitError: Rate limit hit
        CodexError: Other execution failures
    """
    codex_bin = find_codex_binary()
    timeout = timeout or Config.TIMEOUT

    cmd = [
        codex_bin, "exec",
        "--model", Config.MODEL,
        "--reasoning-effort", Config.REASONING,
        "--sandbox", sandbox,
        "--skip-git-repo-check",
        "--color", "never",
        prompt,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd="/tmp",  # Run in /tmp to avoid repo interference
        )
    except subprocess.TimeoutExpired:
        raise CodexError(
            f"Codex CLI timed out after {timeout}s. "
            f"Try increasing CODEX_REVIEW_TIMEOUT or reducing diff size."
        )

    if result.returncode != 0:
        stderr = result.stderr.strip()
        if "rate limit" in stderr.lower() or "429" in stderr:
            raise CodexRateLimitError(
                "Codex rate limit reached. Wait a few minutes and retry, "
                "or continue without cross-model review."
            )
        raise CodexError(f"Codex CLI failed (exit {result.returncode}): {stderr}")

    return _strip_codex_chrome(result.stdout)


def _strip_codex_chrome(output: str) -> str:
    """Strip Codex CLI header/footer lines from output.

    Codex CLI wraps responses with metadata lines containing
    'codex', 'thinking', 'tokens used', etc. Strip these to
    get just the model's response.
    """
    lines = output.split("\n")
    content_lines = []
    skip_markers = {"codex", "thinking", "tokens used", "model:", "sandbox:"}

    for line in lines:
        lower = line.lower().strip()
        if any(marker in lower for marker in skip_markers):
            continue
        content_lines.append(line)

    # Strip leading/trailing blank lines
    text = "\n".join(content_lines).strip()
    return text
