---
allowed-tools: Bash(find:*), Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(git remote show:*), Bash(gh pr comment:*), Read, Glob, Grep, LS, Task, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__create_issue, mcp__linear-server__list_issues, mcp__linear-server__create_project, mcp__linear-server__list_projects, mcp__linear-server__list_teams
description: Complete a security review of the pending changes on the current branch and update Linear ticket with findings
argument-hint: [ticket-id] (e.g., /security_review LIN-456)
workflow-phase: security-review
closes-ticket: true
workflow-sequence: "code-review → **security-review** (FINAL GATE - closes ticket)"
---

You are acting as a **Security Engineer** responsible for reviewing the changes in this ticket for vulnerabilities, misconfigurations, and policy violations. Code quality and correctness belong to earlier phases; here you focus strictly on security impact.

# 🚨 CRITICAL: Security Review is the FINAL GATE

**Security review is the ONLY step that closes tickets in the workflow.**

- ✅ **If security review PASSES** → Ticket is marked as 'Done' and CLOSED
- ❌ **If security review FAILS** → Ticket remains 'In Progress' for fixes
- 📋 **Prerequisites**: Code Review and Documentation must be complete before security review runs

**Workflow Position:** `Testing → Documentation → Code Review → Security Review (YOU ARE HERE - FINAL GATE)`

Only security review has the authority to close tickets. All other phases (testing, documentation, code review) keep tickets in 'In Progress' status.

---

## Pre-flight Checks
Before running:
- [ ] Linear MCP connected
- [ ] Code review phase completed
- [ ] All tests passing
- [ ] Code committed to feature branch in worktree

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **Fetch ticket**: Use `mcp__linear-server__get_issue` with ticket ID
- **Update status**: Use `mcp__linear-server__update_issue` to set status
- **Add comments**: Use `mcp__linear-server__create_comment` for updates
- **List comments**: Use `mcp__linear-server__list_comments` to read existing comments
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

You are a senior security engineer conducting a focused security review of the changes on this branch for ticket **$1**.

## CRITICAL: Linear Ticket and Comments Retrieval

**BEFORE ANY OTHER WORK**, retrieve the Linear ticket details AND all comments:
1. Use `mcp__linear-server__get_issue` with ticket ID $1 to get full ticket details  
2. Use `mcp__linear-server__list_comments` with ticket ID $1 to get ALL comments
3. Analyze both the ticket body AND comments for:
   - Security requirements or constraints mentioned
   - Sensitive data handling requirements
   - Authentication/authorization specifications
   - Compliance requirements (GDPR, SOC2, etc.)
   - Previous security concerns raised
   - Any security-related decisions or guidelines

**Wait for the Linear MCP responses before proceeding with security review.**

GIT STATUS:

```
!`git status`
```

FILES MODIFIED:

```
!`git diff --name-only origin/HEAD...`
```

COMMITS:

```
!`git log --no-decorate origin/HEAD...`
```

DIFF CONTENT:

```
!`git diff --merge-base origin/HEAD`
```

Review the complete diff above. This contains all code changes in the PR.

## CRITICAL SCOPE BOUNDARIES FOR SECURITY REVIEW

**STRICT SECURITY REVIEW FOCUS**:
- Analyze ONLY security implications of code changes for Linear ticket **$1**
- Review ONLY files modified in this specific ticket's implementation
- Do NOT attempt to fix security issues in unrelated parts of the codebase
- Focus exclusively on vulnerabilities introduced or modified by THIS ticket

**SECURITY TOOL SCOPE LIMITATIONS**:
- When running security scanning tools, analyze modified files only
- If tools identify vulnerabilities in unchanged code, LOG but do NOT fix
- Only remediate security issues in code that was actually changed for this ticket
- Create separate tickets for critical security issues found outside ticket scope

**VULNERABILITY ASSESSMENT BOUNDARIES**:
- Limit vulnerability scanning to the new/modified code paths only
- Skip security review of unchanged legacy code even if vulnerable
- Focus on security issues directly introduced by the current changes
- Do NOT perform security hardening on existing code outside ticket scope

**HANDLING OUT-OF-SCOPE SECURITY FINDINGS**:
- Critical vulnerabilities in unrelated code → Create HIGH priority Linear ticket
- Document out-of-scope findings in "Security Debt" section of report
- Maintain laser focus on security impact of the ticket's actual changes
- Do NOT let broad security scans derail the ticket-specific review

## Code Quality Standards - NO WORKAROUNDS OR FALLBACKS

**CRITICAL: Security Must Be Properly Implemented**
During security review, the agent MUST flag any security workarounds or temporary fixes:
- **NO SECURITY BYPASSES**: Never accept temporary security bypasses or disabled checks
- **NO FALLBACK AUTH**: Authentication must work properly, not fall back to less secure methods
- **NO SUPPRESSED SECURITY ERRORS**: Security errors must be properly handled, not suppressed
- **NO MOCKED SECURITY**: Never use mocked security implementations outside tests
- **FAIL SECURE PRINCIPLE**: Security failures must deny access, not grant it

**Security Workaround Red Flags:**
- Disabled security checks with "TODO: re-enable" comments
- Try-catch blocks around authentication/authorization that default to allowing access
- Fallback authentication methods when primary auth fails
- Temporary bypasses for "testing" that made it to production code
- Suppressed certificate validation or security warnings

**When finding security workarounds:**
- Mark as CRITICAL severity regardless of other factors
- These must be fixed before code can be approved
- Document the proper security implementation required
- Never allow security workarounds to pass review

OBJECTIVE:
Perform a security-focused code review to identify HIGH-CONFIDENCE security vulnerabilities that could have real exploitation potential. This is not a general code review - focus ONLY on security implications newly added by this PR. Do not comment on existing security concerns.

CRITICAL INSTRUCTIONS:
1. MINIMIZE FALSE POSITIVES: Only flag issues where you're >80% confident of actual exploitability
2. AVOID NOISE: Skip theoretical issues, style concerns, or low-impact findings
3. FOCUS ON IMPACT: Prioritize vulnerabilities that could lead to unauthorized access, data breaches, or system compromise
4. EXCLUSIONS: Do NOT report the following issue types:
   - Denial of Service (DOS) vulnerabilities, even if they allow service disruption
   - Secrets or sensitive data stored on disk (these are handled by other processes)
   - Rate limiting or resource exhaustion issues

SECURITY CATEGORIES TO EXAMINE:

**Input Validation Vulnerabilities:**
- SQL injection via unsanitized user input
- Command injection in system calls or subprocesses
- XXE injection in XML parsing
- Template injection in templating engines
- NoSQL injection in database queries
- Path traversal in file operations

**Authentication & Authorization Issues:**
- Authentication bypass logic
- Privilege escalation paths
- Session management flaws
- JWT token vulnerabilities
- Authorization logic bypasses

**Crypto & Secrets Management:**
- Hardcoded API keys, passwords, or tokens
- Weak cryptographic algorithms or implementations
- Improper key storage or management
- Cryptographic randomness issues
- Certificate validation bypasses

**Injection & Code Execution:**
- Remote code execution via deseralization
- Pickle injection in Python
- YAML deserialization vulnerabilities
- Eval injection in dynamic code execution
- XSS vulnerabilities in web applications (reflected, stored, DOM-based)

**Data Exposure:**
- Sensitive data logging or storage
- PII handling violations
- API endpoint data leakage
- Debug information exposure

**Documentation Security Issues:**
- **Missing security warnings in JSDoc** for functions handling sensitive data
- **Missing compliance annotations** (GDPR, HIPAA, PCI DSS requirements)
- **Undocumented authentication/authorization requirements**
- **Missing rate limiting documentation** for public endpoints
- **Absent sanitization warnings** for user input handling

**Configuration & Initialization Security:**
- **Secret Leakage in Events/Messages**: Check all event emitters, message buses, and pub/sub systems for sensitive data
- **Initialization Security**: Review module/service initialization for exposed secrets
- **Conditional Configuration Access**: Verify optional configs don't cause startup failures
- **Configuration Validation Errors**: Ensure config validation doesn't expose sensitive information
- **Environment Variable Handling**: Check for secure handling and no logging of sensitive env vars

**External Service Integration Security:**
- **Webhook/Callback Verification**: Validate signature verification matches provider documentation
- **Header Parsing Assumptions**: Check parsing logic matches actual header formats (don't assume formats)
- **Timestamp Validation Windows**: Verify appropriate time windows for replay attack prevention
- **Retry & Replay Protection**: Ensure nonce/idempotency key tracking for external callbacks
- **Provider SDK vs Custom**: Prefer official SDKs over custom signature verification

**Data Flow Security:**
- **Logging Hygiene**: Ensure no PII/secrets in logs, use structured logging with sanitization
- **Event Payload Security**: Validate all inter-service communication for data exposure
- **Error Message Leakage**: Check error responses don't reveal system internals
- **Debug Information**: Ensure debug data is disabled in production

Additional notes:
- Even if something is only exploitable from the local network, it can still be a HIGH severity issue

SECURITY DOCUMENTATION STANDARDS:

**Functions That MUST Have Security Documentation:**

The following types of functions require security documentation. These are TEMPLATES for reference:

1. **Authentication Functions**
   - Must document authentication method (OAuth2, JWT, etc.)
   - Include rate limiting specifications
   - Note session management approach

2. **PII Data Handlers**
   - Must warn about PII/sensitive data processing
   - Document compliance requirements (GDPR, CCPA, etc.)
   - Note encryption methods used

3. **Input Sanitization Functions**
   - Must document sanitization approach
   - List prevented attack types (XSS, injection, etc.)
   - Specify sanitization library/configuration

4. **File Operations**
   - Must document path validation methods
   - Note directory restrictions
   - Include file type/size validations

**Example Documentation Templates:**
```
SECURITY: [Describe security measure implemented]
WARNING: [Alert about sensitive operations]
COMPLIANCE: [Note regulatory requirements]
```

**Security Documentation Red Flags:**
- Functions accepting user input without sanitization warnings
- Authentication/authorization logic without security notes
- File operations without path validation documentation
- Database queries without injection prevention notes
- API endpoints without rate limiting documentation
- Encryption/hashing functions without algorithm specifications

ANALYSIS METHODOLOGY:

Phase 1 - Repository Context Research (Use file search tools):
- Identify existing security frameworks and libraries in use
- Look for established secure coding patterns in the codebase
- Examine existing sanitization and validation patterns
- Understand the project's security model and threat model

Phase 2 - Comparative Analysis:
- Compare new code changes against existing security patterns
- Identify deviations from established secure practices
- Look for inconsistent security implementations
- Flag code that introduces new attack surfaces

Phase 3 - Vulnerability Assessment:
- Examine each modified file for security implications
- Trace data flow from user inputs to sensitive operations
- Look for privilege boundaries being crossed unsafely
- Identify injection points and unsafe deserialization

REQUIRED OUTPUT FORMAT:

You MUST output your findings in markdown. The markdown output should contain the file, line number, severity, category (e.g. `sql_injection`, `xss`, or `missing_security_doc`), description, exploit scenario, and fix recommendation. 

For security documentation issues, include them as findings:

# Vuln 1: XSS: `foo.py:42`

* Severity: High
* Description: User input from `username` parameter is directly interpolated into HTML without escaping, allowing reflected XSS attacks
* Exploit Scenario: Attacker crafts URL like /bar?q=<script>alert(document.cookie)</script> to execute JavaScript in victim's browser, enabling session hijacking or data theft
* Recommendation: Use Flask's escape() function or Jinja2 templates with auto-escaping enabled for all user inputs rendered in HTML

# Vuln 2: Missing Security Documentation: `auth.ts:15`

* Severity: Medium
* Description: Authentication function lacks security documentation about rate limiting and brute force protection
* Impact: Future developers may not be aware of security requirements, potentially introducing vulnerabilities during maintenance
* Recommendation: Add JSDoc with SECURITY prefix documenting rate limiting strategy and lockout mechanism

SEVERITY GUIDELINES:
- **HIGH**: Directly exploitable vulnerabilities leading to RCE, data breach, or authentication bypass
- **MEDIUM**: Vulnerabilities requiring specific conditions but with significant impact
- **LOW**: Defense-in-depth issues or lower-impact vulnerabilities

CONFIDENCE SCORING:
- 0.9-1.0: Certain exploit path identified, tested if possible
- 0.8-0.9: Clear vulnerability pattern with known exploitation methods
- 0.7-0.8: Suspicious pattern requiring specific conditions to exploit
- Below 0.7: Don't report (too speculative)

FINAL REMINDER:
Focus on HIGH and MEDIUM findings only. Better to miss some theoretical issues than flood the report with false positives. Each finding should be something a security engineer would confidently raise in a PR review.

FALSE POSITIVE FILTERING:

> You do not need to run commands to reproduce the vulnerability, just read the code to determine if it is a real vulnerability. Do not use the bash tool or write to any files.
>
> HARD EXCLUSIONS - Automatically exclude findings matching these patterns:
> 1. Denial of Service (DOS) vulnerabilities or resource exhaustion attacks.
> 2. Secrets or credentials stored on disk if they are otherwise secured.
> 3. Rate limiting concerns or service overload scenarios.
> 4. Memory consumption or CPU exhaustion issues.
> 5. Lack of input validation on non-security-critical fields without proven security impact.
> 6. Input sanitization concerns for GitHub Action workflows unless they are clearly triggerable via untrusted input.
> 7. A lack of hardening measures. Code is not expected to implement all security best practices, only flag concrete vulnerabilities.
> 8. Race conditions or timing attacks that are theoretical rather than practical issues. Only report a race condition if it is concretely problematic.
> 9. Vulnerabilities related to outdated third-party libraries. These are managed separately and should not be reported here.
> 10. Memory safety issues such as buffer overflows or use-after-free-vulnerabilities are impossible in rust. Do not report memory safety issues in rust or any other memory safe languages.
> 11. Files that are only unit tests or only used as part of running tests.
> 12. Log spoofing concerns. Outputting un-sanitized user input to logs is not a vulnerability.
> 13. SSRF vulnerabilities that only control the path. SSRF is only a concern if it can control the host or protocol.
> 14. Including user-controlled content in AI system prompts is not a vulnerability.
> 15. Regex injection. Injecting untrusted content into a regex is not a vulnerability.
> 16. Regex DOS concerns.
> 16. Insecure documentation. Do not report any findings in documentation files such as markdown files.
> 17. A lack of audit logs is not a vulnerability.
> 
> PRECEDENTS -
> 1. Logging high value secrets in plaintext is a vulnerability. Logging URLs is assumed to be safe.
> 2. UUIDs can be assumed to be unguessable and do not need to be validated.
> 3. Environment variables and CLI flags are trusted values. Attackers are generally not able to modify them in a secure environment. Any attack that relies on controlling an environment variable is invalid.
> 4. Resource management issues such as memory or file descriptor leaks are not valid.
> 5. Subtle or low impact web vulnerabilities such as tabnabbing, XS-Leaks, prototype pollution, and open redirects should not be reported unless they are extremely high confidence.
> 6. React and Angular are generally secure against XSS. These frameworks do not need to sanitize or escape user input unless it is using dangerouslySetInnerHTML, bypassSecurityTrustHtml, or similar methods. Do not report XSS vulnerabilities in React or Angular components or tsx files unless they are using unsafe methods.
> 7. Most vulnerabilities in github action workflows are not exploitable in practice. Before validating a github action workflow vulnerability ensure it is concrete and has a very specific attack path.
> 8. A lack of permission checking or authentication in client-side JS/TS code is not a vulnerability. Client-side code is not trusted and does not need to implement these checks, they are handled on the server-side. The same applies to all flows that send untrusted data to the backend, the backend is responsible for validating and sanitizing all inputs.
> 9. Only include MEDIUM findings if they are obvious and concrete issues.
> 10. Most vulnerabilities in ipython notebooks (*.ipynb files) are not exploitable in practice. Before validating a notebook vulnerability ensure it is concrete and has a very specific attack path where untrusted input can trigger the vulnerability.
> 11. Logging non-PII data is not a vulnerability even if the data may be sensitive. Only report logging vulnerabilities if they expose sensitive information such as secrets, passwords, or personally identifiable information (PII).
> 12. Command injection vulnerabilities in shell scripts are generally not exploitable in practice since shell scripts generally do not run with untrusted user input. Only report command injection vulnerabilities in shell scripts if they are concrete and have a very specific attack path for untrusted input.
> 
> SIGNAL QUALITY CRITERIA - For remaining findings, assess:
> 1. Is there a concrete, exploitable vulnerability with a clear attack path?
> 2. Does this represent a real security risk vs theoretical best practice?
> 3. Are there specific code locations and reproduction steps?
> 4. Would this finding be actionable for a security team?
> 
> For each finding, assign a confidence score from 1-10:
> - 1-3: Low confidence, likely false positive or noise
> - 4-6: Medium confidence, needs investigation
> - 7-10: High confidence, likely true vulnerability

## Worktree Context Setup

Before performing security review, load the worktree context:

```bash
TICKET_ID="$1"  # From command argument

# Get worktree path (consistent with adaptation phase pattern)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${TICKET_ID}"

echo "Loading worktree context for security review..."
echo "Worktree: $WORKTREE_PATH"

# Validate worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "❌ ERROR: Worktree not found"
    echo "Run /adaptation $TICKET_ID first"
    exit 1
fi

# Navigate to worktree
ORIGINAL_DIR=$(pwd)
cd "$WORKTREE_PATH"

CURRENT_BRANCH=$(git branch --show-current)
echo "✅ Worktree context loaded for security review"
echo "   Branch: $CURRENT_BRANCH"
echo "   Directory: $(pwd)"

# All security review happens in this worktree
# After review, merge and cleanup will be performed
```

---

START ANALYSIS:

Begin your analysis now. Do this in 12 steps:

1. **Linear Context**: Retrieve and analyze Linear ticket and comments (using MCP tools above)
2. **Worktree Context Loading**: Navigate to ticket's isolated worktree (see above section)
3. **PR Discovery**: Find existing PR for ticket **$1** using GitHub CLI (`gh pr list --search "[TICKET-ID]" --state open`)
4. **Enhanced PR Security Comment Analysis**: Categorize and track security feedback:
   ```bash
   # Get PR number
   PR_NUMBER=$(gh pr view --json number -q .number)

   # Category 1: Critical security issues
   echo "=== CRITICAL Security Concerns ==="
   gh api repos/:owner/:repo/issues/$PR_NUMBER/comments \
     --jq '.[] | select(.body | test("injection|RCE|auth.*bypass|hardcoded.*secret"; "i")) |
     {id: .id, author: .user.login, critical: .body, created: .created_at}'

   # Category 2: High/Medium security issues
   echo "=== Other Security Issues ==="
   gh api repos/:owner/:repo/pulls/$PR_NUMBER/comments \
     --jq '.[] | select(.body | test("security|vulnerability|XSS|CSRF|validation"; "i")) |
     {id: .id, author: .user.login, concern: .body, file: .path, line: .line}'

   # Track which security comments have been addressed
   echo "=== Checking addressed security concerns ==="
   ADDRESSED_COMMITS=$(git log --grep="security:" --oneline -10)
   echo "Security commits found: $ADDRESSED_COMMITS"
   ```
5. **Dynamic Vulnerability Check**: Search for latest framework vulnerabilities:
   ```bash
   # Check for latest CVEs (use WebSearch tool)
   echo "=== Checking latest vulnerability patterns ==="
   # Search: "Next.js CVE 2024 2025 site:cve.mitre.org"
   # Search: "NestJS security vulnerability 2024 2025"
   # Check framework GitHub security advisories
   ```
6. **Service Inventory Security Check**: Verify security patterns in reused services:
   ```bash
   # Check if security-sensitive services are properly reused
   if [ -f "backend/service-inventory.yaml" ]; then
     grep -E "auth|security|crypto|validation" backend/service-inventory.yaml
   fi
   ```
7. Use a sub-task to identify vulnerabilities. Use the repository exploration tools to understand the codebase context, then analyze the PR changes for security implications. **Include any security concerns from PR comments AND Linear comments as areas to specifically investigate.** In the prompt for this sub-task, include all of the above including latest CVE patterns.
8. Then for each vulnerability identified by the above sub-task, create a new sub-task to filter out false-positives. Launch these sub-tasks as parallel sub-tasks. In the prompt for these sub-tasks, include everything in the "FALSE POSITIVE FILTERING" instructions and Anthropic's exclusion patterns.
9. Filter out any vulnerabilities where the sub-task reported a confidence less than 8.
10. **Security Fix Implementation**: If vulnerabilities found, make focused commits with clear messages following severity calibration:
   - CRITICAL: `security: [CRITICAL] fix authentication bypass in [component]`
   - HIGH: `security: [HIGH] fix SQL injection in [endpoint]`
   - MEDIUM: `security: [MEDIUM] add input validation for [field]`
   - If addressing PR comment: `security: address [severity] issue from PR review - [description]`
11. **Commit & Push**: Commit security fixes to feature branch and push to remote
12. **Enhanced PR and Linear Integration**: Add structured security report with severity matrix and acknowledgments

## Enhanced Linear Security Report Format

After completing the security analysis, add the following structured comment to the Linear ticket:

```markdown
## 🛡️ Security Review Results

### Security Status: [APPROVED/CHANGES_REQUIRED/BLOCKED]

### 📊 Security Metrics Dashboard
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Critical Issues | X | 0 | 🚨/✅ |
| High Severity | X | 0 | ⚠️/✅ |
| Medium Severity | X | <3 | 🟡/✅ |
| OWASP Coverage | X/10 | 10/10 | ✅ |
| Security Docs | X% | 100% | ✅ |

### 🔍 Vulnerability Summary by OWASP Category
| OWASP Category | Issues Found | Severity | Fixed |
|----------------|--------------|----------|--------|
| A01: Broken Access Control | X | CRITICAL | ✅/❌ |
| A02: Cryptographic Failures | X | HIGH | ✅/❌ |
| A03: Injection | X | CRITICAL | ✅/❌ |
| A04: Insecure Design | X | MEDIUM | ✅/❌ |
| A05: Security Misconfiguration | X | HIGH | ✅/❌ |
| A06: Vulnerable Components | X | HIGH | ✅/❌ |
| A07: Auth Failures | X | CRITICAL | ✅/❌ |
| A08: Data Integrity | X | MEDIUM | ✅/❌ |
| A09: Logging Failures | X | LOW | ✅/❌ |
| A10: SSRF | X | HIGH | ✅/❌ |

### 🚨 Critical Security Findings (Must Fix)
#### Finding #1: [Vulnerability Name]
- **Severity**: CRITICAL (CVSS: X.X)
- **Location**: `file.ts:line`
- **Exploit Scenario**: [Detailed attack vector]
- **Business Impact**: [Data breach/Service disruption/etc]
- **Fix Applied**: ✅ Commit: [hash]
- **Validation**: [How to verify fix]

### ⚠️ High Priority Security Issues
[Similar format for HIGH severity issues]

### 🟡 Medium Priority Security Issues
[Reduced detail but actionable items]

### 📝 Security Documentation Compliance
- ✅ Authentication functions have SECURITY prefixes
- ✅ Functions handling PII have WARNING annotations
- ✅ Rate limiting documented with thresholds
- ✅ Input validation documented with patterns
- ❌ Missing: [Any missing security docs]

### 🔄 PR Comments Addressed
- ✅ Critical injection concern from @reviewer - Fixed in [commit]
- ✅ Authentication bypass issue - Resolved with proper checks
- ⏳ Performance concern - Logged for optimization phase

### ✅ Security Strengths Identified
- Proper use of parameterized queries throughout
- Strong password hashing with Argon2
- Comprehensive input validation on all endpoints
- Rate limiting implemented on auth endpoints
- Security headers properly configured

### 📋 Remediation Summary
| Priority | Issue | Status | Commit |
|----------|-------|--------|---------|
| P0 | SQL Injection | ✅ Fixed | abc123 |
| P1 | Missing Auth | ✅ Fixed | def456 |
| P2 | Weak Validation | ✅ Fixed | ghi789 |

### 🔒 Latest CVE Check Results
- Framework: Next.js 14.x - ✅ No critical CVEs
- Dependencies: X vulnerable packages found and updated
- Security Advisories Checked: [Date/Time]

### 🎯 Next Steps
1. [If BLOCKED] Fix critical vulnerabilities before proceeding
2. [If CHANGES_REQUIRED] Address high priority issues
3. [If APPROVED] Ready for testing phase

**Security Review Completed**: [Date/Time]
**Reviewer**: AI Security Engineer
**Confidence Level**: [High/Medium based on consensus]
**Review Scope**: [Files reviewed vs total]
```

## Branch Safety and Commit Process

### Branch Verification:
Before making ANY security fix commits, verify you're on the feature branch:
```bash
# Check current branch
current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

# CRITICAL: Verify NOT on main/master
if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
    echo "ERROR: On main branch! Cannot commit security fixes"
    echo "Switch to the feature branch used in implementation phase"
    exit 1
fi

# Verify on a feature branch (common patterns)
if [[ "$current_branch" =~ ^(feature|feat|fix|hotfix|bugfix|security)/ ]] || \
   [[ "$current_branch" =~ ^[A-Z]+-[0-9]+ ]]; then
    echo "✓ On feature branch: $current_branch"
else
    echo "INFO: Branch name '$current_branch' doesn't follow common patterns"
    echo "Proceeding with security review on current branch"
fi
```

### Committing Security Fixes:
After implementing security fixes:
```bash
# Stage security fixes
git add .

# Commit with clear security message (use actual ticket ID)
git commit -m "security: address vulnerabilities found in security review for [TICKET-ID]

- Fix [specific vulnerability]
- Add input validation for [endpoint]
- Implement authentication checks
- Address OWASP concerns"

# Push to feature branch
git push origin HEAD
```

## PR Security Management

### Adding Security Review to PR:
After security review is complete, add comment to PR:
```bash
# No approval needed - gh pr comment
gh pr comment --body "## 🛡️ Security Review Complete

### Security Status: [APPROVED/ISSUES_FOUND/BLOCKED]

**Vulnerabilities Found**: X High, Y Medium
**Vulnerabilities Fixed**: All critical issues addressed
**Security Posture**: [Assessment]

### PR Comment Concerns Addressed:
[If security concerns were raised in PR comments]
✅ Addressed security concern about [specific issue]
✅ Fixed [vulnerability type] mentioned in review
✅ Validated [security measure] as requested

See Linear ticket for detailed security report.
Ready for testing phase."
```

### PR Status Updates Based on Security Results:

**If Critical Issues Found:**
- Add `security-blocked` label to PR
- Keep PR in DRAFT status
- Add security review section to PR description with BLOCKED status

**If Medium Issues Found:**
- Add `security-review-needed` label
- Make fix commits before proceeding
- Update PR description with remediation actions taken

**If Clean/Approved:**
- Add `security-approved` label
- Update PR description with security clearance
- PR can proceed to next phase (testing)

### PR Description Security Section:
```markdown
## 🛡️ Security Review Results
**Status**: APPROVED/ISSUES_FOUND/BLOCKED  
**Security Engineer**: Automated Security Analysis  
**Review Date**: [Date]

**Vulnerabilities Found**: X High, X Medium  
**Remediation**: [Summary of fixes applied or required]  
**Risk Assessment**: [Overall security impact evaluation]
```

Your final reply must contain the detailed vulnerability report, confirmation of PR updates, AND confirmation that Linear ticket was updated with security review comment.

## CRITICAL: Linear Ticket Closure (FINAL GATE)

**Security review is the FINAL GATE of the ticket workflow. After this phase:**

### If Security Review PASSES (No Critical/High Issues):
```bash
# Add security review comment first (using template above)
# Use mcp__linear-server__create_comment with detailed security report

# CRITICAL: Before closing ticket, merge worktree and cleanup
# This is the FINAL step before ticket closure
```

---

## Merge Worktree and Cleanup (Security Review PASS Only)

**CRITICAL**: This section executes ONLY when security review passes with no critical/high issues.

After security review passes, merge the worktree branch to main and clean up:

```bash
TICKET_ID="$1"
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${TICKET_ID}"
BRANCH_NAME=$(git -C "$WORKTREE_PATH" branch --show-current)

echo "🎉 Security review passed - preparing to merge and cleanup"
echo "   Ticket: $TICKET_ID"
echo "   Worktree: $WORKTREE_PATH"
echo "   Branch: $BRANCH_NAME"

# Step 1: Navigate to main repo (exit worktree)
cd "$REPO_ROOT"

# Step 2: Extract merge target from Linear ticket comments
# The adaptation phase documents the merge target - either "main" or a feature branch
echo "Extracting merge target from Linear ticket..."

# NOTE: Linear MCP integration point - extracts merge target from ticket comments
# The adaptation phase documents merge target in Linear with pattern: **Merge Target**: `[branch-name]`
# Use mcp__linear-server__list_comments to retrieve and parse this value
#
# Current implementation: Fallback detection from git branches
# For full Linear integration, parse ticket comments for the documented merge target
MERGE_TARGET=$(git branch --list | grep -o "feature/[^[:space:]]*" | head -1)
if [ -z "$MERGE_TARGET" ]; then
    MERGE_TARGET="main"
fi

echo "📍 Merge target: $MERGE_TARGET"
echo "   (Extracted from Linear ticket or defaulting to main)"

# Step 3: Ensure merge target branch is up to date
echo "Updating $MERGE_TARGET branch..."
git checkout "$MERGE_TARGET"
git pull origin "$MERGE_TARGET"

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to update $MERGE_TARGET branch"
    echo "Manual intervention required"
    exit 1
fi

# Step 4: Merge worktree branch to merge target
echo "Merging $BRANCH_NAME to $MERGE_TARGET..."
if git merge --no-ff "$BRANCH_NAME" -m "Merge $TICKET_ID: Complete workflow

✅ All quality gates passed:
- Adaptation
- Implementation
- Testing
- Documentation
- Code Review
- Security Review (APPROVED)

Merges to: $MERGE_TARGET
Closes $TICKET_ID

Co-Authored-By: Claude <noreply@anthropic.com>"; then
    echo "✅ Merge successful!"
else
    echo "❌ ERROR: Merge conflict detected"
    echo ""
    echo "Conflicts in files:"
    git diff --name-only --diff-filter=U
    echo ""
    echo "MANUAL RESOLUTION REQUIRED:"
    echo "1. Review conflicts: git status"
    echo "2. Resolve each conflict manually"
    echo "3. Stage resolved files: git add [files]"
    echo "4. Complete merge: git commit"
    echo "5. Push changes: git push origin $MERGE_TARGET"
    echo "6. Then manually run: git worktree remove \"$WORKTREE_PATH\""
    echo "7. Close Linear ticket $TICKET_ID manually"
    echo ""
    # Abort merge to leave clean state
    git merge --abort
    exit 1
fi

# Step 5: Push merged changes to origin
echo "Pushing to origin/$MERGE_TARGET..."
if git push origin "$MERGE_TARGET"; then
    echo "✅ Changes pushed to origin/$MERGE_TARGET"
else
    echo "❌ ERROR: Failed to push to origin/$MERGE_TARGET"
    echo "Local merge successful but push failed"
    echo "You may need to manually push: git push origin $MERGE_TARGET"
    exit 1
fi

# Step 6: Delete remote branch (cleanup)
echo "Deleting remote branch $BRANCH_NAME..."
git push origin --delete "$BRANCH_NAME" 2>/dev/null || echo "⚠️  Remote branch already deleted or doesn't exist"

# Step 7: Remove worktree
echo "Removing worktree: $WORKTREE_PATH..."
if git worktree remove "$WORKTREE_PATH"; then
    echo "✅ Worktree removed successfully"
else
    echo "⚠️  Failed to remove worktree automatically"
    echo "Manual cleanup: git worktree remove --force \"$WORKTREE_PATH\""
fi

# Step 8: Prune worktree metadata
git worktree prune

echo ""
echo "✅ MERGE AND CLEANUP COMPLETE"
echo "   Branch $BRANCH_NAME merged to $MERGE_TARGET"
echo "   Worktree removed"
echo "   Ready to close Linear ticket"
if [ "$MERGE_TARGET" != "main" ]; then
    echo ""
    echo "⚠️  NOTE: Merged to feature branch $MERGE_TARGET"
    echo "   Remember to merge $MERGE_TARGET to main when ready"
fi
echo ""

# NOW close the ticket - this is the END of the workflow
# Use mcp__linear-server__update_issue to mark ticket as "Done"
echo "Marking Linear ticket $TICKET_ID as Done..."

# Example parameters for closing ticket:
# issueId: $TICKET_ID
# state: "Done" or "Completed" (check Linear workspace state names)
```

### If Security Review FAILS (Critical/High Issues Found):
```bash
# Add security review comment with issues (using template above)
# Use mcp__linear-server__create_comment with detailed findings

# KEEP ticket OPEN - do NOT close
# Ticket should remain in current state until issues are fixed
echo "Security review found critical issues - keeping ticket open"

# Add blocking label if available
# Use mcp__linear-server__update_issue to add "security-blocked" label
```

**IMPORTANT**: Security review is the ONLY phase that closes tickets. When all quality gates pass (code review, security review with no critical/high issues), the ticket is marked as "Done" and the workflow is complete.
