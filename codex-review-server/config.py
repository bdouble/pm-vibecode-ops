"""Configuration for the Codex Review MCP Server.

All settings loaded from environment variables with sensible defaults.
"""

import os


class Config:
    """Server configuration loaded from environment variables."""

    # Model configuration (OpenAI models only)
    MODEL: str = os.getenv("CODEX_REVIEW_MODEL", "gpt-5.3-codex")
    REASONING: str = os.getenv("CODEX_REVIEW_REASONING", "xhigh")

    # Timeouts
    TIMEOUT: int = int(os.getenv("CODEX_REVIEW_TIMEOUT", "300"))

    # Review behavior
    MIN_SEVERITY: str = os.getenv("CODEX_REVIEW_MIN_SEVERITY", "medium")
    FOCUS: str = os.getenv("CODEX_REVIEW_FOCUS", "all")

    # Fix behavior
    AUTO_FIX: bool = os.getenv("CODEX_REVIEW_AUTO_FIX", "false").lower() == "true"

    # Severity ordering for filtering
    SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}

    # Allowed file extensions for review (text-based only)
    ALLOWED_EXTENSIONS = {
        ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java",
        ".rb", ".php", ".swift", ".kt", ".cs", ".c", ".cpp", ".h",
        ".html", ".css", ".scss", ".less", ".json", ".yaml", ".yml",
        ".toml", ".xml", ".sql", ".sh", ".bash", ".zsh", ".md",
        ".txt", ".env.example", ".gitignore", ".dockerignore",
        ".tf", ".tfvars", ".prisma", ".graphql", ".proto",
    }

    # Blocked paths (never include in review context)
    BLOCKED_PATHS = {
        ".ssh", ".gnupg", ".aws", ".env", ".netrc", "credentials",
        "secrets", ".git/config", ".claude/", ".codex/", ".config",
        ".kube", ".docker/config",
    }

    @classmethod
    def validate(cls) -> list[str]:
        """Validate configuration. Returns list of warnings."""
        warnings = []

        # Model must be an OpenAI model
        if not (cls.MODEL.startswith("gpt-") or cls.MODEL.startswith("o")):
            warnings.append(
                f"CODEX_REVIEW_MODEL='{cls.MODEL}' does not look like an OpenAI model. "
                f"Expected prefix 'gpt-' or 'o'."
            )

        # Reasoning must be valid
        valid_reasoning = {"none", "low", "medium", "high", "xhigh"}
        if cls.REASONING not in valid_reasoning:
            warnings.append(
                f"CODEX_REVIEW_REASONING='{cls.REASONING}' is not valid. "
                f"Expected one of: {', '.join(sorted(valid_reasoning))}"
            )

        # Severity must be valid
        if cls.MIN_SEVERITY not in cls.SEVERITY_ORDER:
            warnings.append(
                f"CODEX_REVIEW_MIN_SEVERITY='{cls.MIN_SEVERITY}' is not valid. "
                f"Expected one of: {', '.join(cls.SEVERITY_ORDER.keys())}"
            )

        return warnings
