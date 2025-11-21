---
description: Execute code implementation based on adaptation guide, focusing on delivering functionality strictly within ticket scope following established patterns.
allowed-tools: Task, Read, Write, Edit, MultiEdit, Grep, Glob, LS, TodoWrite, Bash, Bash(gh pr comment:*), NotebookEdit, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__create_issue, mcp__linear-server__list_issues, mcp__linear-server__create_project, mcp__linear-server__list_projects, mcp__linear-server__list_teams
argument-hint: [ticket-id] (e.g., /implementation LIN-456)
workflow-phase: implementation
closes-ticket: false
workflow-sequence: "adaptation → **implementation** → testing → documentation → code-review → security-review"
---

You are acting as a **Backend and Frontend Implementation Engineer** for this ticket. Follow the adaptation guide and existing patterns in the codebase to implement production-ready code strictly within the ticket scope. Do not change behavior outside the documented requirements.

# ⚠️ NEXT STEP: After Implementation Completes, Ticket Proceeds to Testing

**Implementation runs AFTER adaptation and BEFORE testing.**

- When implementation completes, ticket proceeds to `/testing` command
- Then: Testing → Documentation → Code Review → Security Review (final gate that closes ticket)
- Status remains 'In Progress' throughout implementation phase

**Workflow Position:** `Adaptation → Implementation (YOU ARE HERE) → Testing → Documentation → Code Review → Security Review (closes ticket)`

---

## Pre-flight Checks
Before running:
- [ ] Linear MCP connected
- [ ] Ticket exists and is assigned
- [ ] Adaptation phase completed for this ticket
- [ ] Worktree created by adaptation phase exists
- [ ] Working directory is clean (`git status` shows no uncommitted changes)

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **Fetch ticket**: Use `mcp__linear-server__get_issue` with ticket ID
- **Update status**: Use `mcp__linear-server__update_issue` to set status
- **Add comments**: Use `mcp__linear-server__create_comment` for updates
- **List comments**: Use `mcp__linear-server__list_comments` to read existing comments
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

Execute the actual code implementation for ticket **$1** based on the adaptation guide from the previous phase.

Adaptation guide: **$2** (implementation instructions)

## CRITICAL: Linear Ticket and Comments Retrieval

**BEFORE ANY OTHER WORK**, retrieve the Linear ticket details AND all comments:
1. Use `mcp__linear-server__get_issue` with ticket ID $1 to get full ticket details
2. Use `mcp__linear-server__list_comments` with ticket ID $1 to get ALL comments
3. Analyze both the ticket body AND comments for:
   - Updated requirements or clarifications
   - Implementation hints or constraints
   - Priority changes or scope adjustments
   - Technical decisions made during planning
   - Any blocking issues or dependencies mentioned

**Wait for the Linear MCP responses before proceeding with implementation.**

**CRITICAL SCOPE BOUNDARIES**:
- Implement ONLY what is required to fulfill the ticket requirements (including any updates from comments)
- Do NOT implement test code (testing phase handles this)
- Do NOT fix unrelated linting or type errors outside of ticket scope
- Stay strictly within the boundaries defined by the Linear ticket and its comments

Use the assigned specialist agent (**backend-engineer-agent**, **frontend-engineer-agent**, etc.) to implement code following the established patterns and guidelines.

## Worktree Context Loading

### Worktree-Based Development
The adaptation phase created an isolated worktree for this ticket. All implementation work happens within that worktree, providing complete isolation from other concurrent development.

### Loading Worktree Context from Linear:
```bash
TICKET_ID="$1"  # From command argument

# STEP 1: Get worktree path from Linear ticket comments
# Use mcp__linear-server__list_comments to fetch all comments
# Search for pattern: "**Worktree Path**: `[path]`"
# This was added by the adaptation phase

# Example: Parse Linear comments to extract worktree path
# WORKTREE_PATH=$(parse_linear_comments_for_worktree_path "$TICKET_ID")

# For now, construct expected path (adaptation always uses this pattern):
REPO_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${TICKET_ID}"

echo "Ticket: $TICKET_ID"
echo "Expected worktree: $WORKTREE_PATH"
```

### Validating Worktree Exists:
```bash
# STEP 2: Validate worktree exists and is in good state
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "❌ ERROR: Worktree not found at $WORKTREE_PATH"
    echo ""
    echo "This usually means:"
    echo "1. The /adaptation command hasn't been run yet for $TICKET_ID"
    echo "2. The worktree was manually deleted"
    echo "3. There's a mismatch between ticket ID and worktree path"
    echo ""
    echo "Solutions:"
    echo "- Run: /adaptation $TICKET_ID"
    echo "- Check Linear ticket for documented worktree path"
    echo "- List active worktrees: git worktree list"
    exit 1
fi

# Validate it's a git worktree
if [ ! -f "$WORKTREE_PATH/.git" ]; then
    echo "❌ ERROR: Directory exists but is not a valid git worktree"
    echo "Path: $WORKTREE_PATH"
    echo ""
    echo "The directory exists but doesn't appear to be a git worktree."
    echo "This may indicate corruption or manual modification."
    echo ""
    echo "Solution:"
    echo "- Remove directory: rm -rf \"$WORKTREE_PATH\""
    echo "- Re-run: /adaptation $TICKET_ID"
    exit 1
fi

# Check if registered with git
if ! git worktree list | grep -q "$WORKTREE_PATH"; then
    echo "⚠️  WARNING: Worktree exists but not registered"
    echo "Attempting to repair..."
    git worktree repair "$WORKTREE_PATH"

    if [ $? -eq 0 ]; then
        echo "✅ Worktree repaired"
    else
        echo "❌ Failed to repair worktree - manual intervention required"
        exit 1
    fi
fi

echo "✅ Worktree validated: $WORKTREE_PATH"
```

### Navigating to Worktree:
```bash
# STEP 3: Save current directory and navigate to worktree
ORIGINAL_DIR=$(pwd)
echo "Switching to worktree context..."
echo "  From: $ORIGINAL_DIR"
echo "  To: $WORKTREE_PATH"

cd "$WORKTREE_PATH"

# Verify we're in the worktree
CURRENT_DIR=$(pwd)
CURRENT_BRANCH=$(git branch --show-current)

echo "✅ Now working in worktree"
echo "  Directory: $CURRENT_DIR"
echo "  Branch: $CURRENT_BRANCH"
```

**Important**: All implementation commands execute within the worktree. At the end of the command, return to original directory: `cd "$ORIGINAL_DIR"`

## Worktree Safety Check

Before making ANY commits, verify you're in the correct worktree and on the correct branch:
```bash
# CRITICAL: Verify we're in a worktree (not main repo)
CURRENT_DIR=$(pwd)
REPO_ROOT=$(git rev-parse --show-toplevel)

# Check if we're in .worktrees/ subdirectory
if [[ "$CURRENT_DIR" != *"/.worktrees/"* ]]; then
    echo "❌ ERROR: Not in a worktree!"
    echo "Current directory: $CURRENT_DIR"
    echo "Repository root: $REPO_ROOT"
    echo ""
    echo "Implementation MUST happen in worktree, not main repository."
    echo "Expected path: $REPO_ROOT/.worktrees/$TICKET_ID"
    echo ""
    echo "Solution: Run the worktree navigation steps above"
    exit 1
fi

# Check current branch
current_branch=$(git branch --show-current)
echo "Worktree: $CURRENT_DIR"
echo "Branch: $current_branch"

# CRITICAL: Verify NOT on main/master (should be impossible in worktree, but check anyway)
if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
    echo "❌ ERROR: Worktree is on main branch!"
    echo "This should not happen - worktrees should be on feature branches"
    echo "Check adaptation process - something went wrong"
    exit 1
fi

# Verify on a feature branch (common patterns)
if [[ "$current_branch" =~ ^(feature|feat|fix|hotfix|bugfix)/ ]] || \
   [[ "$current_branch" =~ ^[A-Z]+-[0-9]+ ]]; then
    echo "✅ Safe to commit"
    echo "   Worktree: ✓"
    echo "   Feature branch: $current_branch ✓"
else
    echo "⚠️  WARNING: Unusual branch name: $current_branch"
    echo "Confirm this is correct before committing"
fi
```

## Code Quality Standards - NO WORKAROUNDS OR FALLBACKS

**CRITICAL: Production-Ready Code Only**
During implementation, the agent MUST deliver production-quality code:
- **NO FALLBACK LOGIC**: Never implement fallback behavior or workarounds
- **NO TEMPORARY CODE**: All code must be permanent, production-ready solutions
- **FAIL FAST PRINCIPLE**: Implement proper error handling that fails immediately with clear errors
- **NO MOCKED IMPLEMENTATIONS**: Never use mocked or stubbed code except in test files
- **NO TODO COMMENTS**: Complete all functionality - no "TODO: implement later" comments
- **PROPER ERROR HANDLING**: Throw meaningful errors, never suppress with empty catch blocks

**Error Handling Requirements:**
- Validate inputs and fail immediately if invalid
- Throw specific, meaningful error types
- Let errors propagate to proper handlers
- Never use try-catch to suppress errors silently
- If an external dependency fails, let it fail properly

**If blocked by an existing bug:**
- Stop implementation and report the blocking issue
- Do NOT work around the bug with temporary code
- Document the exact fix needed as a prerequisite
- Create a separate ticket for the blocking bug if needed

## Pre-Implementation Validation (MANDATORY)

### CRITICAL: Service Reuse Verification
Before writing ANY new code, validate the adaptation guide against the service inventory:

```bash
# Check for service inventory from discovery phase
if [ -f "context/service-inventory.yaml" ]; then
    echo "✓ Service inventory found - validating reuse directives"
else
    echo "⚠️ WARNING: No service inventory found - risk of duplication!"
    echo "Run discovery phase first or manually verify no duplication will occur"
fi
```

### Duplication Prevention Checklist
The implementation MUST verify:
1. **Service Reuse Compliance**: All services marked for reuse in adaptation are being used
2. **No Recreation**: Confirm NOT creating functionality that exists in service inventory
3. **Event Pattern Usage**: Using events/messaging where specified in adaptation
4. **Infrastructure Reuse**: Using existing middleware/guards/decorators as directed
5. **Repository Pattern Compliance**: Using repositories NOT direct ORM calls
6. **Base Class Consistency**: Using the designated base abstractions only

### Implementation Validation Process

Before implementing, perform these validation checks using available tools:

#### Step 1: Verify Service Inventory Exists
```bash
# Check for service inventory from discovery phase
if [ -f "context/service-inventory.yaml" ]; then
    echo "✓ Service inventory found"
    # Use Read tool to examine the inventory
else
    echo "⚠️ WARNING: No service inventory found - risk of duplication!"
    echo "Run discovery phase first or manually verify no duplication"
fi
```

#### Step 2: Validate Against Adaptation Guide
Use the Read tool to examine the adaptation guide and verify:

1. **Service Reuse Compliance**
   - Read adaptation guide to identify mandated services
   - Use Grep tool to search for existing service usage
   - Document any services that MUST be reused

2. **Duplication Prevention Check**
   - Use Grep to search for similar functionality in codebase
   - Check service inventory for existing implementations
   - Flag any potential duplications found

3. **Event Pattern Verification**
   - Search for existing event emitters/listeners with Grep
   - Verify event patterns specified in adaptation guide
   - Ensure events will be used instead of direct coupling

4. **Infrastructure Compliance**
   - Use Glob to find existing guards/middleware/decorators
   - Verify adaptation guide specifies which to reuse
   - Document infrastructure components that must be applied

#### Step 3: Create Validation Report
Document findings in a validation checklist:
```bash
# Create validation report
echo "## Pre-Implementation Validation Report" > validation-report.md
echo "Date: $(date)" >> validation-report.md
echo "" >> validation-report.md
echo "### Service Reuse Checklist" >> validation-report.md
echo "- [ ] Service inventory consulted" >> validation-report.md
echo "- [ ] Mandated services identified" >> validation-report.md
echo "- [ ] No duplication detected" >> validation-report.md
echo "- [ ] Event patterns will be used" >> validation-report.md
echo "- [ ] Infrastructure components identified" >> validation-report.md
```

#### Step 4: Block Implementation if Issues Found
If any violations are detected:
- STOP implementation immediately
- Document the specific issues found
- Request clarification or adaptation guide updates
- Do NOT proceed until violations are resolved

## Implementation Workflow

1. **Worktree Context Loading**:
   - Extract worktree path from Linear ticket comments
   - Validate worktree exists and is in good state
   - Navigate to worktree directory
   - Save original directory for cleanup

2. **Setup**: Load implementation guide AND service inventory, verify dependencies (all within worktree)

3. **PRE-IMPLEMENTATION VALIDATION**:
   - Verify service inventory exists
   - Check adaptation guide mandates service reuse
   - Validate no duplication will occur
   - Confirm event patterns will be used where specified
   - BLOCK implementation if violations found

4. **Worktree Safety Check**:
   - Confirm we're in `.worktrees/[ticket-id]` directory
   - Verify NOT on main branch
   - Validate worktree branch matches ticket

5. **Scope Review**: Review Linear ticket requirements to establish clear boundaries

6. **Reuse-First Implementation** (within worktree):
   - Use existing services as mandated by adaptation
   - Apply existing infrastructure components
   - Integrate via events where specified
   - ONLY create new code when no alternative exists

7. **Core Implementation**: Follow guide step-by-step, implement ONLY ticket functionality

8. **Scoped Quality Assurance**: Run linting and type checking ONLY on files modified for this ticket

9. **Documentation**: Add inline comments ONLY to code created for this ticket

10. **Commit Changes**: Stage and commit ONLY ticket-related changes (within worktree)

11. **Push to Remote**: Push worktree branch to origin

12. **Pull Request**: Create DRAFT PR with Linear ticket number in title using GitHub CLI

13. **PR Comment**: Add implementation summary as comment on the PR

14. **Linear Update**: Use `mcp__linear-server__create_comment` to add implementation completion report

15. **Return to Original Directory**: `cd "$ORIGINAL_DIR"` to exit worktree context

## Scope Control Guidelines

### MUST Implement:
- All functionality explicitly mentioned in the Linear ticket
- **MANDATORY: Reuse all services specified in adaptation guide**
- **MANDATORY: Use event patterns where specified**
- **MANDATORY: Apply existing infrastructure components**
- Error handling for the new code being added
- Basic validation for new inputs/endpoints
- **Meaningful JSDoc comments following MVD principles** (see Documentation Standards section)
- Inline comments ONLY for complex algorithms or non-obvious business logic

### MUST NOT Implement:
- **ANY functionality that exists in service inventory**
- **Custom solutions for problems already solved**
- **Direct service coupling where events are available**
- **Direct database/ORM calls outside repositories**
- **Duplicate base abstractions when one exists**
- **Config values in event payloads (only metadata)**
- Test code (handled by testing phase)
- Features not mentioned in the ticket
- Refactoring of existing code unless required for the ticket
- Fixes for pre-existing linting/type errors
- Additional "nice to have" features
- Performance optimizations beyond ticket requirements

### Quality Checks - Scoped Approach:
When running linting or type checking:
```bash
# Only check files you've modified for this ticket
git diff --name-only | xargs npm run lint
git diff --name-only | xargs npm run typecheck

# If errors appear in YOUR changes, fix them
# If errors appear in unrelated code, IGNORE them
```

## Implementation Standards

- **REUSE FIRST**: Always use existing services/infrastructure as mandated
- **Pattern Consistency**: Follow existing architectural patterns and code organization
- **Event-Driven**: Use events/messaging for cross-module communication when available
- **Error Handling**: Implement error handling ONLY for new code
- **Security**: Apply existing security infrastructure (guards, middleware, validators)
- **Performance**: Implement straightforward solutions, avoid premature optimization
- **Scope Discipline**: Stay within ticket boundaries at all times

## Documentation Standards (MVD Approach - TypeScript Aware)

### Core Principle: Document the "Why", Not the "What"
TypeScript already provides the "what" through its type system. Focus documentation on explaining complex business logic, security implications, and non-obvious design decisions.

### TypeScript Files - Minimal JSDoc (No Type Duplication)
```typescript
// ❌ BAD: Redundant type information in TypeScript
/**
 * @param {string} email - User email
 * @param {string} password - User password  
 * @returns {Promise<Session>} Session object
 */
async function authenticate(email: string, password: string): Promise<Session> {}

// ✅ GOOD: Only document the "why" and complex logic
/**
 * Implements rate limiting to prevent brute force attacks.
 * Locks account after 5 failed attempts within 15 minutes.
 */
async function authenticate(email: string, password: string): Promise<Session> {}
```

### When to Add JSDoc Comments
**DOCUMENT:**
- Complex business logic that isn't self-evident
- Security implications (authentication, authorization, data sanitization)
- Non-obvious algorithmic approaches or mathematical formulas
- Workarounds for third-party bugs or browser quirks
- Side effects that aren't apparent from the function name
- Critical performance considerations

**SKIP DOCUMENTATION:**
- Simple CRUD operations
- Getters/setters without logic
- UI components without complex behavior
- Self-documenting TypeScript interfaces
- Functions where the name and parameters clearly explain the purpose

### Security-Sensitive Functions (ALWAYS Document)
```typescript
/**
 * SECURITY: Sanitizes user input to prevent XSS attacks.
 * Uses DOMPurify with strict configuration.
 */
function sanitizeHtml(input: string): string {}

/**
 * WARNING: This function handles PII data.
 * Ensure compliance with GDPR requirements.
 */
async function storeUserData(userData: UserData): Promise<void> {}
```

### Complex Algorithm Documentation
```typescript
/**
 * Uses exponential backoff with jitter to prevent thundering herd.
 * Algorithm: delay = random(0, min(cap, base * 2^attempt))
 * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
function calculateRetryDelay(attempt: number): number {}
```

### Configuration & Initialization Documentation
```typescript
/**
 * SECURITY: Do not emit raw config values in events.
 * Only emit sanitized metadata or feature flags.
 */
async onModuleInit() {
  // Emit only non-sensitive data
  this.eventEmitter.emit('config.validated', { 
    featuresEnabled: this.getEnabledFeatures() 
  });
}
```

### NestJS Decorators (Let Decorators Self-Document)
```typescript
// ✅ GOOD: Decorators provide the documentation
@ApiOperation({ summary: 'Create user account' })
@ApiResponse({ status: 201, type: UserDto })
@Post('users')
createUser(@Body() dto: CreateUserDto) {
  // No JSDoc needed - decorators handle API documentation
}
```

## Code Quality Requirements (Scoped to Ticket)

- **Readability**: Clear variable names in NEW code only
- **Maintainability**: Apply DRY principles to NEW code only
- **Documentation**: 
  - Meaningful JSDoc following MVD principles (see above)
  - Focus on "why" not "what" in comments
  - Security warnings for sensitive data handling
  - NO type duplication in TypeScript files
- **Security**: Validate inputs for NEW endpoints/features only
- **Scope Compliance**: Every change must directly relate to ticket requirements

## Commit and PR Process

### Committing Changes (Within Worktree):
After implementation is complete, commit all changes to the feature branch:
```bash
# ENSURE WE'RE IN WORKTREE (should already be there)
if [[ "$(pwd)" != *"/.worktrees/"* ]]; then
    echo "❌ ERROR: Not in worktree - cannot commit"
    exit 1
fi

# Stage all changes in worktree
git add .

# Commit with descriptive message (use actual ticket ID from Linear)
git commit -m "feat: implement [feature description] for [TICKET-ID]

- Add [component/feature details]
- Implement [specific functionality]
- Update relevant documentation

Implemented in isolated worktree: $(pwd)"

# Push worktree branch to remote
BRANCH_NAME=$(git branch --show-current)
git push origin "$BRANCH_NAME"

echo "✅ Changes committed and pushed from worktree"
echo "   Branch: $BRANCH_NAME"
echo "   Worktree: $(pwd)"
```

### Creating the Pull Request:
Create a DRAFT PR using GitHub CLI:
```bash
# Create PR with Linear ticket reference (use actual ticket ID)
gh pr create \
  --draft \
  --title "[TICKET-ID] Feature Description" \
  --body "## Summary
Implementation of [feature] as specified in Linear ticket [TICKET-ID]

## Changes
- [List key changes]
- [Component additions]
- [Integration points]

## Linear Ticket
[Link to Linear ticket]

## Testing
- [ ] Unit tests will be added in testing phase
- [ ] Integration tests will be added in testing phase
- [ ] Manual testing complete" \
  --base main
```

### Adding PR Comment:
After PR creation, add implementation summary:
```bash
# No approval needed - gh pr comment
gh pr comment --body "## 💻 Implementation Complete

### Delivered Features
- [List implemented functionality]
- Test coverage: X%
- All quality checks passing

Ready for code review phase."
```

## Expected Outputs

- **Working Code**: Functional implementation meeting ONLY the ticket's acceptance criteria
- **NO Test Code**: Tests will be created in the testing phase by qa-engineer-agent
- **MVD Documentation**: 
  - Meaningful JSDoc for complex logic and security-sensitive functions
  - NO redundant type annotations in TypeScript files
  - Security warnings where appropriate
  - Algorithm explanations for non-obvious approaches
- **Inline Comments**: ONLY for truly complex or non-obvious business logic
- **Scoped Quality**: Passing lint/type checks ONLY for modified files
- **Pull Request**: Created as DRAFT with Linear ticket number in title (format: `[TICKET-ID] Feature Description`)
- **PR Comment**: Implementation summary added to PR
- **Feature Branch Commit**: ONLY ticket-related changes committed to designated branch

## Linear Implementation Report Format

After completing the implementation, add the following structured comment to the Linear ticket:

```markdown
## 💻 Implementation Complete

### Implementation Status: COMPLETE

### 🔄 Service Reuse Compliance
- **Services Reused**: [List all existing services used as mandated]
- **Infrastructure Applied**: [Guards, middleware, decorators reused]
- **Event Patterns Used**: [Events emitted/listened instead of direct calls]
- **Duplication Avoided**: ✅ No recreation of existing functionality
- **Reuse Score**: [X% of implementation used existing services]

### ✅ Delivered Features
- [List of implemented functionality]
- [Key components and modules created]
- [Integration points established]

### 📊 Code Quality Metrics
- **Lines of Code**: X added, Y modified (ONLY for ticket scope)
- **New vs Reused**: X% new code, Y% reused components
- **Documentation**: MVD approach - X complex functions documented, Y trivial functions left self-documenting
- **Test Coverage**: N/A (tests in separate phase)
- **Linting**: ✅ Passed for modified files only
- **Type Checking**: ✅ Passed for modified files only
- **Scope Compliance**: ✅ All changes directly relate to ticket

### 🔧 Technical Implementation Details
- **Existing Services Leveraged**: [Which services and how]
- **Architecture Decisions**: [Key technical choices made]
- **Patterns Applied**: [Design patterns and conventions followed]
- **Event Integration**: [How event patterns were used]
- **Error Handling**: [Error handling strategies employed]

### 📝 Pull Request Information
- **PR Number**: #XXX
- **PR Title**: [TICKET-ID] Feature Description
- **Branch**: `[branch-name-from-adaptation]`
- **Files Changed**: X files (+X lines, -Y lines)

### ✅ Duplication Prevention Verification
- Service inventory consulted: ✅
- Adaptation mandates followed: ✅
- No custom solutions for solved problems: ✅
- Event patterns used where available: ✅

### 🎯 Next Steps
- Code review phase can begin
- Security review to follow
- Testing phase will add comprehensive test coverage

**Implementation Completed**: [Date/Time]
**Developer**: Backend/Frontend Engineer Agent
**Reuse Compliance**: VERIFIED
```

## Worktree Cleanup and Exit

After all implementation work is complete:
```bash
# Return to original directory (saved at start of command)
cd "$ORIGINAL_DIR"

echo "✅ Returned to original directory"
echo "   Implementation complete in worktree: $WORKTREE_PATH"
echo "   Branch: $BRANCH_NAME"
echo ""
echo "Note: Worktree remains active for testing, documentation, and review phases"
echo "      It will be automatically merged and removed after security review passes"
```

**Important Notes:**
- Worktree remains active after implementation - do NOT remove it
- Testing, documentation, code review, and security review will use same worktree
- Worktree is automatically merged and cleaned up by `/security_review` command
- If user needs to inspect worktree: `cd "$WORKTREE_PATH"`
- If user needs to list all worktrees: `git worktree list`

---

## Success Criteria

Implementation is successful when:
- **ALL services mandated for reuse have been used**
- **NO duplication of existing functionality occurred**
- **Event patterns used where specified**
- **Infrastructure components properly reused**
- ALL ticket requirements implemented (no more, no less)
- Code follows established patterns in NEW code only
- NO test code written (deferred to testing phase)
- NO unrelated fixes or improvements made
- Linting/type checking passes for MODIFIED files only
- Minimal documentation added where necessary
- Pull request created with proper Linear ticket reference
- Linear ticket updated with implementation report INCLUDING REUSE METRICS
- Strict scope discipline maintained throughout

## Enforcement Mechanisms

### Automatic Checks
1. **Pre-commit hooks** verify no duplication patterns
2. **CI/CD pipeline** checks for service reuse compliance
3. **Code review checklist** includes duplication prevention
4. **Linear report** must include reuse metrics

### Manual Verification
1. Developer must confirm service inventory was consulted
2. Adaptation mandates must be explicitly followed
3. Any new service creation requires justification
4. Event pattern usage must be documented

The implementation phase transforms adaptation guidance into working code that fulfills EXACTLY the ticket requirements while MAXIMIZING reuse of existing services and infrastructure. Any deviation from reuse mandates is considered a critical failure requiring immediate correction.
