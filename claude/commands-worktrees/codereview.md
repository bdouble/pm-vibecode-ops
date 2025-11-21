---
description: Perform code quality review to ensure implementation meets standards, patterns, and architectural consistency. Security issues are logged but not fixed.
allowed-tools: Task, Read, Write, Edit, Grep, Glob, LS, TodoWrite, Bash, Bash(find:*), Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(gh pr comment:*), WebSearch, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__create_issue, mcp__linear-server__list_issues, mcp__linear-server__create_project, mcp__linear-server__list_projects, mcp__linear-server__list_teams
argument-hint: [ticket-id] [implementation-branch] [review-depth]
workflow-phase: code-review
closes-ticket: false
workflow-sequence: "documentation → **code-review** → security-review"
---

You are acting as a **Senior Code Reviewer** responsible for assessing code quality, maintainability, and adherence to established patterns. Focus on SOLID principles, design patterns, test quality, and architectural consistency.

# ⚠️ WORKFLOW POSITION: Code Review Runs AFTER Documentation, BEFORE Security Review

**Code review does NOT close tickets.**

- Code review comes after documentation and before security review
- After code review passes, ticket proceeds to security review (final gate)
- Only security review has authority to close tickets
- Status remains 'In Progress' throughout code review

**Workflow Position:** `Testing → Documentation → Code Review (YOU ARE HERE) → Security Review (closes ticket)`

---

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **Fetch ticket**: Use `mcp__linear-server__get_issue` with ticket ID
- **Update status**: Use `mcp__linear-server__update_issue` to set status
- **Add comments**: Use `mcp__linear-server__create_comment` for updates
- **List comments**: Use `mcp__linear-server__list_comments` to read existing comments
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

Perform code quality review for ticket **$1** to ensure implementation meets best practices and quality standards.

Implementation branch: **$2**
Review depth: ${3:-"standard"}

## CRITICAL: Linear Ticket and Comments Retrieval

**BEFORE ANY OTHER WORK**, retrieve the Linear ticket details AND all comments:
1. Use `mcp__linear-server__get_issue` with ticket ID $1 to get full ticket details
2. Use `mcp__linear-server__list_comments` with ticket ID $1 to get ALL comments
3. Analyze both the ticket body AND comments for:
   - Review criteria or quality standards mentioned
   - Specific patterns or conventions to check
   - Architecture decisions that affect review
   - Known issues or areas of concern
   - Previous review feedback that needs verification

**Wait for the Linear MCP responses before proceeding with code review.**

Use the **code-reviewer-agent** to review code quality, patterns, and architecture. Security issues found are LOGGED ONLY - not fixed (handled by security review phase).

## Worktree Context Setup

Before performing code review, load the worktree context where implementation, tests, and documentation reside:

```bash
TICKET_ID="$1"  # From command argument

# Get worktree path (consistent with adaptation phase pattern)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${TICKET_ID}"

echo "Loading worktree context for code review..."
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
echo "✅ Worktree context loaded for review"
echo "   Branch: $CURRENT_BRANCH"
echo "   Directory: $(pwd)"

# All code review happens in this worktree
# Return to original at end: cd "$ORIGINAL_DIR"
```

---

## CRITICAL SCOPE BOUNDARIES FOR CODE REVIEW

**STRICT REVIEW FOCUS**:
- Review ONLY code changes directly related to the Linear ticket **$1** and its comments
- Focus review on files modified for this specific ticket (use `git diff` to identify scope)
- Do NOT attempt to fix unrelated code quality issues found elsewhere in the codebase
- Do NOT expand review beyond the ticket's implementation boundaries

**LINTING AND TYPE CHECK SCOPE**:
- When running lint/typecheck tools, focus analysis on modified files only
- If tools report issues in unmodified files, LOG them but do NOT fix
- Only fix quality issues in code that was actually changed for this ticket
- Document out-of-scope issues separately for future cleanup tickets

**REVIEW BOUNDARIES**:
- Limit pattern compliance checks to the new/modified code only
- Skip reviewing unchanged legacy code even if it violates current standards
- Focus duplication analysis on whether NEW code duplicates existing services
- Do NOT refactor existing code outside the ticket scope

**HANDLING OUT-OF-SCOPE FINDINGS**:
- If critical issues are found in unrelated code, create a separate Linear ticket
- Document out-of-scope findings in a "Future Improvements" section
- Keep the review laser-focused on the ticket's actual changes

## Code Quality Standards - NO WORKAROUNDS OR FALLBACKS

**CRITICAL: Flag and Fix Production-Ready Code Violations**
During code review, the agent MUST identify and fix any workarounds or temporary code:
- **IDENTIFY FALLBACK LOGIC**: Flag any fallback behavior, workarounds, or temporary fixes
- **REMOVE TEMPORARY CODE**: Fix any non-production code found (except in test files)
- **ENFORCE FAIL FAST**: Replace silent error suppression with proper error propagation
- **ELIMINATE MOCKED CODE**: Remove any mocked/stubbed implementations outside tests
- **CLEAR TODO COMMENTS**: Either complete TODOs or create separate tickets for them
- **FIX ERROR SUPPRESSION**: Replace empty catch blocks with proper error handling

**Review Focus Areas:**
- Check for try-catch blocks that suppress errors instead of handling them
- Identify any "temporary" or "workaround" comments in code
- Flag fallback logic that masks proper errors
- Ensure all error paths fail fast with clear messages
- Verify no placeholder or stubbed implementations exist

**When finding workarounds:**
- Fix them immediately if within ticket scope
- If out of scope, create a new Linear ticket for removal
- Document the proper solution that should replace the workaround
- Never approve code with workarounds or temporary solutions

## Review Workflow

1. **Linear Context Loading**: Load ticket details and all comments (using MCP tools above)
2. **Worktree Context Loading**: Navigate to ticket's isolated worktree (see Worktree Context Setup section)
3. **Context Loading**: Load implementation branch, architectural guidelines (within worktree)
4. **Service Inventory Check**: Load service-inventory.yaml from frontend/backend roots to verify reuse (within worktree)
5. **Adaptation Guide Review**: Check adaptation guide for mandated service reuse requirements (from Linear comments)
6. **PR Discovery**: Find existing PR for the ticket/branch using GitHub CLI
7. **Enhanced PR Comment Analysis**: Parse and categorize existing review feedback:
   - Security concerns to validate
   - Pattern violations to check
   - Performance issues raised
   - Track which comments have been addressed in commits
8. **Workaround Detection Scan**: Run automated detection for temporary code patterns
9. **Static Analysis**: Run automated linting and type checking
10. **Duplication Analysis**: Verify against service inventory matrix
11. **Code Quality Review**: Analyze architecture alignment, pattern consistency, business logic, addressing PR feedback
12. **Security Documentation Check**: Verify security-sensitive functions have proper JSDoc
13. **Security Issue Logging**: If security issues noticed, LOG them in Linear (do NOT fix)
14. **Fix Implementation**: Make focused commits for NON-SECURITY and DUPLICATION issues (including those from PR comments)
15. **Commit & Push**: Commit fixes to worktree branch and push to remote
16. **PR State Change**: Move PR from DRAFT to READY FOR REVIEW using `gh pr ready` (BEFORE adding comments)
17. **PR Comment with Acknowledgments**: Add review results acknowledging addressed feedback
18. **PR Labels & Description**: Add `code-reviewed` label and update PR description with review summary
19. **Enhanced Linear Update**: Use structured report template with metrics dashboard
20. **Return to Original Directory**: `cd "$ORIGINAL_DIR"` to exit worktree context

## Documentation Standards for Code Review (MVD Approach)

### What Good Documentation Looks Like
- **Complex Business Logic**: Clear explanation of the "why" behind the approach
- **Security Functions**: Explicit warnings about sensitive data handling
- **Algorithms**: Step-by-step explanations with references for non-obvious approaches
- **TypeScript Files**: NO type duplication - let TypeScript provide the "what"
- **Simple Functions**: Self-documenting through clear naming - no JSDoc needed

### Red Flags in Documentation
- Type annotations in JSDoc when TypeScript types are present
- Multi-paragraph descriptions for simple functions
- Missing security warnings on functions handling PII/credentials
- Documentation that just restates the function name
- Comments explaining "what" instead of "why"

### Examples of Proper Documentation
```typescript
// ✅ GOOD: Documents security implications
/**
 * SECURITY: Rate limits authentication attempts.
 * Implements exponential backoff after 3 failed attempts.
 */
async function authenticate(email: string, password: string): Promise<Session>

// ❌ BAD: Redundant type information
/**
 * @param {string} id - The user ID
 * @returns {Promise<User>} - The user object
 */
async function getUser(id: string): Promise<User>

// ✅ GOOD: Self-documenting, no JSDoc needed
async function getUserById(id: string): Promise<User>
```

## Review Categories

### Duplication Prevention Checklist (CRITICAL)
- [ ] **No Recreation of Existing Infrastructure**: Verify no custom implementations of existing middleware, guards, decorators, or interceptors
- [ ] **No Custom Implementations of Solved Problems**: Check that existing utilities, validators, and helpers are used
- [ ] **Decoupled Patterns Used**: Confirm events/messaging used where available instead of direct service coupling
- [ ] **Service Reuse Justification**: All new services have clear "why not reuse" documentation
- [ ] **Repository Pattern Compliance**: Existing repositories and data access patterns leveraged
- [ ] **Shared Utilities Usage**: Common operations use shared utilities (formatting, validation, transformation)
- [ ] **Cross-cutting Concerns**: Authentication, logging, error handling use existing infrastructure
- [ ] **New Implementation Documentation**: Any necessary new implementations have clear justification

### Architectural Pattern Consistency (CRITICAL)
- [ ] **Single Implementation Rule**: Each architectural pattern has only ONE base implementation
- [ ] **Data Access Patterns**: Consistent data access layer usage (no mixing direct DB access with abstraction layers)
- [ ] **Base Class Duplication**: Search for multiple base/abstract classes serving the same purpose
- [ ] **Pattern Adherence**: Verify established patterns are followed consistently across all modules
- [ ] **Abstraction Layer Bypass**: Check for code that bypasses abstraction layers to access lower levels directly

### Module & Dependency Hygiene
- [ ] **Explicit Dependencies**: All module dependencies are explicitly declared, not implicitly assumed
- [ ] **Circular Dependencies**: Document any circular dependencies with justification
- [ ] **Global Dependencies**: No reliance on globally available modules without explicit import
- [ ] **Factory Pattern Dependencies**: All dependencies for factory providers are properly injected
- [ ] **Configuration Dependencies**: Config modules explicitly imported where needed

### Code Quality Assessment
- **Structure & Organization**: File organization, module boundaries, dependency management
- **Naming & Conventions**: Variable/function naming, coding style consistency
- **Code Reusability**: Proper abstraction levels, DRY principles, utility extraction
- **Maintainability**: Code clarity, documentation quality, complexity management
- **Documentation Quality (MVD Approach)**:
  - Complex logic has meaningful JSDoc explaining "why"
  - Security-sensitive functions have appropriate warnings
  - NO redundant type annotations in TypeScript files
  - Trivial functions appropriately left self-documenting
  - Algorithm explanations present for non-obvious approaches
- **Error Handling**: Proper error catching, logging, and user feedback

### Architectural Review
- **Pattern Consistency**: Adherence to established architectural patterns
- **Component Design**: Proper separation of concerns, single responsibility
- **Data Flow**: Logical data flow and state management
- **Integration Points**: Clean interfaces and API contracts
- **Service Reuse Compliance**: Verify adaptation guide mandates were followed

### Performance Review (Non-Security)
- **Database Queries**: N+1 query detection, proper indexing, query optimization
- **Caching**: Appropriate caching strategies and cache invalidation
- **Async Operations**: Proper async/await usage, no blocking operations
- **Resource Management**: Memory usage, connection pooling, cleanup procedures

### Security Issue Logging (NOT Fixing)
If security issues are noticed during review:
- **LOG ONLY**: Document security concerns in Linear ticket comment
- **DO NOT FIX**: Leave security fixes for security review phase
- **Examples to Log**: Missing validation, exposed sensitive data, auth issues
- **Action**: Add note "Security concern identified - will be addressed in security review phase"

## Review Output Format

```markdown
## Code Review: [Component/Feature Name]

### ✅ Correctly Implemented
- [List elements that meet quality standards]
- **Service Reuse**: [List of successfully reused services/components]

### 🔄 Duplication Prevention Analysis
- **Infrastructure Reuse**: [✓/✗] All existing middleware, guards, decorators used
- **Service Reuse**: [✓/✗] No recreation of existing services
- **Event Patterns**: [✓/✗] Events/messaging used where available
- **Utility Reuse**: [✓/✗] Shared utilities leveraged appropriately
- **Reuse Score**: [X%] of implementation uses existing components

### ⚠️ Code Quality Issues (Fix Now)
- **Issue**: [Description] vs [Expected]
  - **Fix**: [Specific correction needed]

### 🚫 Duplication Issues (Fix Now)
- **Duplicated Service**: [Service name] recreates existing [existing service]
  - **Fix**: Replace with existing service from [location]
- **Custom Implementation**: [Feature] has existing solution in [utility/helper]
  - **Fix**: Use existing implementation from [location]

### 📝 Documentation Issues (Fix Now - MVD Approach)
- **Over-Documentation**: [Function name] has redundant type annotations in TypeScript
  - **Fix**: Remove @param/@returns types, keep only meaningful descriptions
- **Under-Documentation**: [Complex function] lacks explanation of business logic
  - **Fix**: Add JSDoc explaining the "why" behind the algorithm
- **Missing Security Warning**: [Function handling PII/sensitive data] lacks security documentation
  - **Fix**: Add SECURITY or WARNING prefix with compliance requirements
- **Missing Reuse Justification**: New [service/component] lacks "why not reuse" documentation
  - **Fix**: Document why existing solutions couldn't be used

### 🔒 Security Concerns (Logged for Security Review)
- **Concern**: [Security issue noticed]
  - **Status**: Logged - will be addressed in security review phase
  - **Severity**: [Estimated severity for security team]

### 📊 Quality Metrics
- Code Quality: [Pass/Fail with details]
- Pattern Compliance: [Adherence to architecture]
- Performance: [Basic performance assessment]

### 🎯 Review Status
- **Overall Status**: [APPROVED/CHANGES_REQUESTED]
- **Security Notes**: [Any security concerns logged for later review]
- **Next Steps**: [Code quality fixes needed before security review]
```

## Quality Gates

### Must Pass Requirements (Code Quality Focus)
- No breaking changes to existing APIs
- Code follows established architectural patterns
- Proper error handling implemented
- No obvious performance regressions

### Should Pass Requirements
- Clean code principles followed
- Appropriate abstraction levels
- Clear naming conventions
- **JSDoc present for all public functions/classes/methods**
- **@param and @returns tags properly documented**
- **Complex logic has inline explanatory comments**

### Security Handling
- Security issues are LOGGED ONLY, not fixed in this phase
- Security review phase will handle all security concerns
- This phase focuses on code quality, patterns, and maintainability

## Branch Safety and Commit Process

### Branch Verification:
Before making ANY commits, verify you're on the feature branch:
```bash
# Check current branch
current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

# CRITICAL: Verify NOT on main/master
if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
    echo "ERROR: On main branch! Cannot commit review fixes"
    echo "Switch to the feature branch used in implementation phase"
    exit 1
fi

# Verify on a feature branch (common patterns)
if [[ "$current_branch" =~ ^(feature|feat|fix|hotfix|bugfix)/ ]] || \
   [[ "$current_branch" =~ ^[A-Z]+-[0-9]+ ]]; then
    echo "✓ On feature branch: $current_branch"
else
    echo "INFO: Branch name '$current_branch' doesn't follow common patterns"
    echo "Proceeding with review on current branch"
fi
```

### Committing Review Fixes:
After implementing fixes for review issues:
```bash
# Stage changes
git add .

# Commit with clear message about review fixes (use actual ticket ID)
git commit -m "fix: address code review feedback for [TICKET-ID]

- Fix [specific issue]
- Improve [component/pattern]
- Note: Security concerns logged but not fixed
- Update based on review comments"

# Push to feature branch
git push origin HEAD
```

## PR Management Strategy

### Finding the Existing PR
Use GitHub CLI to find the PR associated with the ticket or branch:
```bash
# Option 1: Search by ticket ID in PR title
gh pr list --search "[TICKET-ID]" --state open

# Option 2: Find PR for current branch
gh pr list --head "$(git branch --show-current)" --state open

# Option 3: Get PR number directly if on feature branch
gh pr view --json number
```

### Enhanced PR Comment Analysis & Tracking
After finding the PR, systematically analyze and categorize all review feedback:
```bash
# Get PR number
PR_NUMBER=$(gh pr view --json number -q .number)

# Fetch and categorize all PR comments
echo "=== Analyzing existing review feedback ==="

# Category 1: Security concerns
echo "--- Security Concerns ---"
gh api repos/:owner/:repo/issues/$PR_NUMBER/comments \
  --jq '.[] | select(.body | test("security|vulnerability|injection|auth|XSS|CSRF|SQL"; "i")) |
  {id: .id, author: .user.login, concern: .body, created: .created_at}'

# Category 2: Pattern violations
echo "--- Pattern & Architecture Issues ---"
gh api repos/:owner/:repo/pulls/$PR_NUMBER/comments \
  --jq '.[] | select(.body | test("pattern|architecture|design|SOLID|DRY"; "i")) |
  {id: .id, author: .user.login, issue: .body, path: .path, line: .line}'

# Category 3: Performance concerns
echo "--- Performance Issues ---"
gh api repos/:owner/:repo/pulls/$PR_NUMBER/comments \
  --jq '.[] | select(.body | test("performance|optimization|N\\+1|cache|slow"; "i")) |
  {id: .id, author: .user.login, concern: .body, path: .path}'

# Track addressed comments by checking commit messages
echo "=== Checking which comments have been addressed ==="
COMMITS_SINCE_REVIEW=$(gh pr view --json commits --jq '.commits[-5:] | .[].messageHeadline')
for comment_id in $(gh api repos/:owner/:repo/issues/$PR_NUMBER/comments --jq '.[].id'); do
  # Check if comment was addressed in recent commits
  echo "Comment $comment_id status: [check commit messages for reference]"
done

# Identify unaddressed high-priority issues
echo "=== Unaddressed High Priority Issues ==="
gh pr view --json reviews --jq '.reviews[] | select(.state == "CHANGES_REQUESTED") |
  {author: .author.login, date: .submittedAt, body: .body}'
```

### Addressing Review Comments
When fixing issues from PR comments:
```bash
# After addressing a specific comment, acknowledge it
# No approval needed - gh pr comment
gh pr comment --body "✅ Addressed in commit [hash]: 
- Fixed [specific issue mentioned]
- Applied [pattern/convention suggested]
- Improved [component] based on feedback"

# Mark review comments as resolved using GitHub web UI or API
gh api --method PUT repos/:owner/:repo/pulls/comments/:comment_id/replies \
  --field body="Fixed in commit [hash]"
```

### Moving PR from Draft to Ready for Review:
**CRITICAL: This must happen BEFORE adding review comments**
```bash
# Get PR number
PR_NUMBER=$(gh pr view --json number -q .number)

# Move PR from draft to ready for review
echo "=== Moving PR from draft to ready for review ==="
gh pr ready $PR_NUMBER

# Verify PR is now ready for review
gh pr view --json isDraft -q .isDraft
if [ "$(gh pr view --json isDraft -q .isDraft)" = "false" ]; then
    echo "✅ PR successfully moved to ready for review"
else
    echo "⚠️ PR is still in draft state - manual intervention may be needed"
fi

# Add the code-reviewed label
gh pr edit --add-label "code-reviewed"
```

### Adding Review Comments to PR:
After moving PR to ready state, add summary to PR:
```bash
# No approval needed - gh pr comment
gh pr comment --body "## 📋 Code Review Complete

### Review Status: [APPROVED/CHANGES_REQUESTED]

**Code Quality Issues Found**: X issues
**Code Quality Issues Fixed**: All non-security issues addressed
**Security Concerns Logged**: Y concerns (for security review phase)
**Quality Metrics**: Pattern compliance ✅, Performance ✅

See Linear ticket for detailed review report.
Ready for security review phase."
```

### Commit Message Standards for Fixes
- `fix: address code review feedback - [specific issue]`
- `fix: remove duplicated service - use existing [service name]`
- `fix: replace custom implementation with shared utility`
- `fix: apply event pattern instead of direct coupling`

## Workaround Detection Automation

### Automated Workaround Scanning
Run this automated scan early in the review process:
```bash
echo "=== Scanning for workarounds and temporary code ==="

# Find TODO/FIXME/HACK comments
echo "--- TODO/FIXME/HACK Comments ---"
grep -rn "TODO\|FIXME\|HACK\|WORKAROUND\|TEMPORARY" \
  --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist \
  | head -20

# Find empty catch blocks
echo "--- Empty Catch Blocks ---"
grep -rn "catch.*{[[:space:]]*}" \
  --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
  --exclude-dir=node_modules

# Find fallback patterns
echo "--- Fallback/Default Patterns ---"
grep -rn "||.*\(default\|fallback\|backup\)" \
  --include="*.ts" --include="*.js" --exclude="*.test.*" --exclude="*.spec.*"

# Find suppressed errors
echo "--- Suppressed Errors ---"
grep -rn "catch.*=>[[:space:]]*{\|catch.*=>[[:space:]]*null\|\.catch(() => {})" \
  --include="*.ts" --include="*.js"

# Find mocked services outside tests
echo "--- Mocked Services in Production Code ---"
grep -rn "\(mock\|stub\|fake\)" \
  --include="*.ts" --include="*.js" \
  --exclude="*.test.*" --exclude="*.spec.*" --exclude="*.mock.*"

# Find disabled features
echo "--- Disabled Features ---"
grep -rn "disabled.*=.*true\|feature.*=.*false\|skip.*=.*true" \
  --include="*.ts" --include="*.js" --include="*.tsx"

# Count total workarounds found
WORKAROUND_COUNT=$(grep -r "TODO\|FIXME\|HACK\|WORKAROUND" --include="*.ts" --include="*.js" | wc -l)
echo "=== Total workarounds found: $WORKAROUND_COUNT ==="
if [ $WORKAROUND_COUNT -gt 0 ]; then
  echo "⚠️ CRITICAL: Workarounds must be fixed before approval"
fi
```

## Service Inventory Verification

### Loading Service Inventories
```bash
# Check for frontend service inventory
if [ -f "frontend/service-inventory.yaml" ] || [ -f "frontend/service-inventory.json" ]; then
    echo "✓ Frontend service inventory found - checking for duplication"
    cat frontend/service-inventory.yaml 2>/dev/null || cat frontend/service-inventory.json 2>/dev/null
else
    echo "⚠️ WARNING: No frontend service inventory found"
    echo "Cannot verify frontend service duplication"
fi

# Check for backend service inventory
if [ -f "backend/service-inventory.yaml" ] || [ -f "backend/service-inventory.json" ]; then
    echo "✓ Backend service inventory found - checking for duplication"
    cat backend/service-inventory.yaml 2>/dev/null || cat backend/service-inventory.json 2>/dev/null
else
    echo "⚠️ WARNING: No backend service inventory found"
    echo "Cannot verify backend service duplication"
fi

# Check adaptation guide for reuse mandates
if [ -f "context/adaptation-guide-[TICKET-ID].md" ]; then
    echo "✓ Adaptation guide found - verifying compliance"
    grep -A 5 "Services to Reuse" context/adaptation-guide-[TICKET-ID].md
    grep -A 5 "Infrastructure to Apply" context/adaptation-guide-[TICKET-ID].md
else
    echo "⚠️ No adaptation guide found for verification"
fi
```

### Duplication Detection Process

Perform systematic duplication checks using these steps:

#### 1. Service Duplication Check
Use Grep and Read tools to detect recreated services:
```bash
# Search for new service implementations
echo "Checking for service duplication..."

# For each new service in the implementation:
# 1. Use Grep to search for similar service names in codebase
# 2. Use Read to examine service inventory for existing implementations
# 3. Document any duplications found
```

#### 2. Utility Duplication Check
Search for custom implementations of common patterns:
```bash
# Check for common utilities that might already exist
COMMON_PATTERNS=(
  "validation"
  "authentication"
  "error-handling"
  "logging"
  "caching"
  "rate-limiting"
)

for pattern in "${COMMON_PATTERNS[@]}"; do
  echo "Checking for existing $pattern utilities..."
  # Use Grep to find existing implementations
done
```

#### 3. Event Pattern Verification
Check for direct coupling where events should be used:
```bash
# Search for direct service dependencies
echo "Checking for missing event pattern usage..."

# Look for patterns like:
# - Direct service injection/imports
# - Synchronous service calls that could be async
# - Tight coupling between modules
```

#### 4. Create Duplication Report
Document all findings:
```bash
# Generate duplication report
cat > duplication-report.md << EOF
## Duplication Analysis Report

### Service Duplications Found:
[List any services that recreate existing functionality]

### Utility Duplications:
[List custom implementations of existing utilities]

### Missing Event Patterns:
[List places where events should be used instead of direct coupling]

### Recommended Fixes:
[Provide specific remediation steps for each issue]
EOF
```
- `refactor: improve [component] based on review feedback`
- `style: fix formatting and code style issues`
- `docs: add missing JSDoc to [functions/classes]`
- `docs: complete JSDoc with @param/@returns/@throws tags`
- `docs: add inline comments for complex logic`
NOTE: NO security fixes in this phase - security issues are logged only

### PR Status Management
- **ALWAYS after fixes are complete**: Move PR from DRAFT to READY FOR REVIEW using `gh pr ready`
- **Order is critical**: Change PR state BEFORE adding review comments
- **If Approved**: Add `code-reviewed` label after moving to ready state
- **Always**: Update PR description with review summary and key findings

### PR Description Updates
Add comprehensive review section to existing PR description:
```markdown
## 📋 Code Review Results
**Status**: APPROVED/CHANGES_REQUESTED  
**Reviewer**: Security Review Agent  
**Review Date**: [Date]

### Key Findings
- [Summary of major findings]

### Quality Metrics
- [Coverage, security, performance results]
```

## Linear Code Review Report Format

After completing the code review, add the following structured comment to the Linear ticket:

```markdown
## 📋 Code Review Complete

### Review Status: [APPROVED/CHANGES_REQUESTED/BLOCKED]

### ✅ Correctly Implemented
- [List elements that meet quality standards]
- [Patterns properly followed]
- [Architecture alignment confirmed]
- **Services Successfully Reused**: [List of reused components]

### 🔄 Duplication Prevention Analysis
- **Infrastructure Reuse**: [✓/✗] All existing middleware, guards, decorators used
- **Service Reuse**: [✓/✗] No recreation of existing services
- **Event Patterns**: [✓/✗] Events/messaging used where available
- **Utility Reuse**: [✓/✗] Shared utilities leveraged appropriately
- **Reuse Score**: [X%] of implementation uses existing components

### 🚫 Duplication Issues Found & Fixed
- **Duplicated Services**: X issues identified and fixed
- **Custom Implementations Replaced**: Y utilities replaced with shared versions
- **Direct Coupling Fixed**: Z instances converted to event patterns
- [List of specific duplication fixes with commit references]

### ⚠️ Code Quality Issues Found & Fixed
- **Architecture Issues**: X issues identified and fixed
- **Pattern Violations**: X issues identified and fixed
- **Performance Issues**: X issues identified and fixed
- [List of specific fixes made with commit references]

### 🔒 Security Concerns (Logged Only)
- **Security Issues Noticed**: Y concerns
- **Action Taken**: Logged for security review phase
- **Examples**: [Brief list of security concerns found]
- **Note**: These will be addressed in the dedicated security review

### 📊 Quality Metrics
- **Code Quality**: ✅ Passed after fixes
- **Pattern Compliance**: ✅ Meets architectural standards
- **Duplication Prevention**: ✅ No unnecessary duplication
- **Service Reuse Compliance**: ✅ Adaptation mandates followed
- **Performance**: ✅ No regressions detected
- **Maintainability**: ✅ Clean code principles followed

### 🔧 Review Actions Taken
- [List of commits made to address issues]
- PR moved from DRAFT to READY FOR REVIEW
- `code-reviewed` label added to PR
- PR description updated with review summary

### 🎯 Next Steps
- Security review phase can begin
- [Any specific recommendations]

**Code Review Completed**: [Date/Time]
**Reviewer**: Code Review Agent
```

## Success Criteria

Code review is successful when:
- **No duplication of existing services or infrastructure components**
- **All adaptation guide reuse mandates verified and followed**
- **Service inventory checked and no violations found**
- All code quality issues addressed through focused commits
- Architectural patterns properly followed
- Performance acceptable (no obvious regressions)
- Security concerns logged (NOT fixed) for security review phase
- PR updated with review results and appropriate status/labels
- Linear ticket updated with comprehensive review comment including duplication analysis and security notes (status remains "In Progress")
- PR ready for security review phase

The code review phase ensures code quality, patterns, maintainability, and **prevention of code duplication** through iterative improvement, while logging (not fixing) security concerns for the dedicated security review phase. This separation of concerns ensures proper expertise is applied to each type of issue.
