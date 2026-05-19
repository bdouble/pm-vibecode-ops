# Infrastructure Security Patterns

Security patterns for CI/CD, containers, secrets, and dependencies. These complement the application-layer patterns in OWASP Top 10 (see `owasp-patterns.md`).

## Secrets Detection

Known secret prefixes to scan for (in code AND git history):

| Prefix | Service |
|--------|---------|
| `AKIA` | AWS access key IDs |
| `sk-` | OpenAI, Stripe secret keys |
| `ghp_`, `gho_`, `github_pat_` | GitHub tokens |
| `xoxb-`, `xoxp-`, `xapp-` | Slack tokens |
| `SG.` | SendGrid API keys |
| `sk_live_`, `pk_live_` | Stripe live keys |

When any of these patterns appear in tracked files OR git history, rotate the credential immediately. Removing the file does not remove the secret from history; rotate first.

## CI/CD Security

When reviewing `.github/workflows/` or other CI configuration:

- All third-party actions MUST be pinned to a SHA, not a tag (tags are mutable; SHAs are not)
- `pull_request_target` trigger requires extra scrutiny — fork PRs run with write access to the base repo's secrets
- `${{ github.event.* }}` interpolated into `run:` steps is script injection — pass values via environment variables instead
- Secrets should be scoped to the steps that need them, not the entire job
- Outputs from third-party actions are untrusted; treat them as user input

## Container Security

When reviewing Dockerfiles:

- MUST include a `USER` directive — never run as root in production images
- Secrets MUST NOT appear as `ARG` or `ENV` in builds (they persist in image history)
- `.env` files MUST NOT be `COPY`ed into images
- Use multi-stage builds to exclude build-time dependencies from production images
- Pin base images to a SHA or specific version (not `:latest`)
- Run vulnerability scans (Trivy, Snyk, Grype) against built images before deploying

## Dependency Security

When reviewing package manifests (`package.json`, `requirements.txt`, `Cargo.toml`, etc.):

- Lockfile MUST exist AND be tracked by git
- Production dependencies with install scripts are a supply chain risk — verify they are necessary
- Pin exact versions for production dependencies (no `^` or `~` on critical packages)
- Audit dependencies regularly (`npm audit`, `pip-audit`, `cargo audit`)
- Verify dependencies are not typosquatted (similar names to popular packages)
