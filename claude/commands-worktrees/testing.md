---
description: Generate comprehensive test suites with edge case coverage, security testing, and performance validation for implemented features.
allowed-tools: Task, Read, Write, Edit, MultiEdit, Grep, Glob, LS, TodoWrite, Bash, Bash(gh pr comment:*), NotebookEdit, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__create_issue, mcp__linear-server__list_issues, mcp__linear-server__create_project, mcp__linear-server__list_projects, mcp__linear-server__list_teams
argument-hint: [ticket-id] [test-types] [coverage] (e.g., /testing LIN-456 unit,integration 90)
workflow-phase: testing
closes-ticket: false
workflow-sequence: "implementation → **testing** → documentation → code-review → security-review"
---

You are acting as a **QA Engineer** responsible for building accurate, high-value test suites for this ticket. Focus on correctness, edge cases, and regression prevention using existing patterns in the codebase.

# ⚠️ WORKFLOW POSITION: Testing Phase Does NOT Close Tickets

**Testing runs AFTER implementation and BEFORE documentation.**

- After testing passes, ticket proceeds to: Documentation → Code Review → Security Review
- Status remains 'In Progress' throughout testing phase
- Only security review (final gate) has authority to close tickets

**Workflow Position:** `Implementation → Testing (YOU ARE HERE) → Documentation → Code Review → Security Review (closes ticket)`

---

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **Fetch ticket**: Use `mcp__linear-server__get_issue` with ticket ID
- **Update status**: Use `mcp__linear-server__update_issue` to set status
- **Add comments**: Use `mcp__linear-server__create_comment` for updates
- **List comments**: Use `mcp__linear-server__list_comments` to read existing comments
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

Generate **accurate, compilable** test suites for ticket **$1** that use the actual API implementation.

**MANDATORY Implementation Process:**
- Phase 1: API Discovery (REQUIRED - verify actual implementation)
- Phase 2: Pattern Reuse (REQUIRED - copy from passing tests)
- Phase 3: Verification (REQUIRED - compile, run, coverage)

**Arguments:**
- $1: ticket-id (REQUIRED)
- $2: minimum-coverage (OPTIONAL - default: 70%, adjust based on code complexity and risk)

## CRITICAL: Accuracy-First Testing Philosophy

**This command implements ACCURACY-FIRST TESTING:**

### Priority Order (Must Follow Sequentially)
1. **API Accuracy (100% Required - Gate #1)**:
   - Read implementation files to discover actual API
   - Use actual enum values from codebase
   - Call actual methods that exist
   - Match actual parameter structures
   - Verify against actual return types

2. **Compilation (100% Required - Gate #2)**:
   - All test files must compile
   - Zero TypeScript errors allowed
   - All imports must resolve
   - All types must match

3. **Execution (100% Required - Gate #3)**:
   - Tests must run without errors
   - Mocks must work correctly
   - Assertions must be valid

4. **Coverage (Secondary - After Gates 1-3)**:
   - Target 70-80% for overall codebase
   - Target 90%+ for critical business logic
   - Focus on complex algorithms, skip trivial code
   - Better 50% coverage with correct tests than 90% with broken tests

## CRITICAL: Linear Ticket and Comments Retrieval

**BEFORE ANY OTHER WORK**, retrieve the Linear ticket details AND all comments:
1. Use `mcp__linear-server__get_issue` with ticket ID $1 to get full ticket details
2. Use `mcp__linear-server__list_comments` with ticket ID $1 to get ALL comments
3. Analyze both the ticket body AND comments for:
   - Test requirements or coverage expectations
   - Specific edge cases or scenarios mentioned
   - Performance requirements that need testing
   - User flows that require validation
   - Known issues or areas requiring extra test coverage
   - Previous test failures or concerns

**Wait for the Linear MCP responses before proceeding with test implementation.**

Use the **qa-engineer-agent** to create **focused, high-value** test coverage ensuring quality and preventing regressions while **avoiding over-testing trivial code**.

### QA Agent Testing Priorities

**HIGH PRIORITY (Must Test):**
1. Complex business logic with multiple conditions
2. Financial calculations and payment processing
3. Authentication and authorization flows
4. Data transformation and validation logic
5. Error handling and edge cases
6. API endpoints with business logic
7. Critical user journeys (E2E)

**LOW PRIORITY (Skip or Minimal Testing):**
1. Simple CRUD operations without logic
2. Configuration and setup files
3. UI components without behavior
4. Third-party library integrations
5. Database migrations and schemas
6. Type definitions and interfaces
7. Styling and layout code

## Code Quality Standards - NO WORKAROUNDS IN PRODUCTION CODE

**CRITICAL: Test Code vs Production Code Standards**
During test generation and implementation, the agent MUST enforce different standards:

**In Production Code (src/, lib/, app/, etc.):**
- **NO FALLBACK LOGIC**: Never accept or create fallback behavior
- **NO TEMPORARY CODE**: All code must be production-ready
- **NO WORKAROUNDS**: Fix issues properly, don't work around them
- **FAIL FAST**: Errors must propagate, not be suppressed

**In Test Code (*.test.*, *.spec.*, __tests__/):**
- **Mocking IS ALLOWED**: Use mocks, stubs, and test doubles appropriately
- **Temporary test data IS ALLOWED**: Create fixtures and test scenarios as needed
- **Test-specific workarounds OK**: Can work around external dependencies for testing
- **Isolation IS GOOD**: Mock external services to test in isolation

**When Finding Production Workarounds During Testing:**
- Stop and fix the workaround in production code first
- Never write tests that depend on workaround behavior
- Tests should validate the correct behavior, not the workaround
- If blocked by a workaround, create a Linear ticket for its removal

**Test Quality Standards:**
- Tests should test the intended behavior, not current bugs
- Don't write tests that pass because of workarounds
- Ensure tests will still pass after workarounds are fixed
- Test error cases should expect proper errors, not fallback behavior

## 🚨 CRITICAL: Test Remediation Priority

**BEFORE WRITING ANY NEW TESTS, YOU MUST:**

### Phase 0: Find and Fix Broken Existing Tests (MANDATORY - Gate #0)

**This is the ABSOLUTE FIRST PRIORITY in the testing phase.**

1. **Identify Relevant Existing Tests**:
   ```bash
   # Find all test files related to the modules touched by this ticket
   # Use the ticket description and implementation files to identify relevant test suites
   grep -r "describe\|it\|test" src/modules/[affected-module]/**/*.spec.ts
   grep -r "describe\|it\|test" src/modules/[affected-module]/**/*.test.ts
   ```

2. **Run Existing Tests FIRST**:
   ```bash
   # Run tests for the affected modules to identify failures
   npm test -- --testPathPattern="[affected-module]" --run

   # Document ALL failures - these MUST be fixed before writing new tests
   ```

3. **Fix ALL Broken Tests**:
   - **CRITICAL**: If production code changes broke existing tests, those tests MUST be fixed
   - Analyze each failure to determine if it's due to:
     - Breaking API changes in production code (fix the test to match new API)
     - Legitimate bugs introduced by production code (fix the production code)
     - Outdated test assumptions (update test to reflect correct behavior)
   - Fix tests one by one, verifying each fix before moving to the next
   - Re-run tests after each fix to ensure no regressions

4. **Verify Complete Pass**:
   ```bash
   # All existing tests MUST pass before proceeding
   npm test -- --testPathPattern="[affected-module]" --run

   # Success criteria: 100% of existing tests passing
   ```

**🛑 GATE #0 REQUIREMENT: You may NOT proceed to writing new tests until:**
- ✅ All existing tests in affected modules have been run
- ✅ All failures have been identified and documented
- ✅ All broken tests have been fixed
- ✅ All existing tests pass without errors

**Only after Gate #0 passes should you consider writing new tests.**

### New Test Creation Philosophy (AFTER Gate #0)

**Be Judicious About New Tests:**
- ✅ Add tests ONLY for new functionality not covered by existing tests
- ✅ Add tests ONLY for complex business logic, not trivial code
- ✅ Add tests ONLY where they provide real value and prevent regressions
- ❌ Do NOT add tests just to increase coverage percentages
- ❌ Do NOT add tests for code already well-covered by existing tests
- ❌ Do NOT duplicate test coverage unnecessarily

**Ask yourself before writing each new test:**
1. Does this test validate NEW functionality added in this ticket?
2. Is this functionality complex enough to warrant testing?
3. Is this test filling a genuine gap in test coverage?
4. Will this test catch real bugs or prevent regressions?

**If the answer to any of these is "no", don't write the test.**

## Worktree Context Setup

Before running any tests, load the worktree context where implementation was done:

```bash
TICKET_ID="$1"  # From command argument

# STEP 1: Get worktree path from Linear ticket comments
# Use mcp__linear-server__list_comments to fetch all comments
# Search for pattern: "**Worktree Path**: `[path]`"
# This was added by the adaptation phase

# Construct expected path (adaptation uses consistent pattern):
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${TICKET_ID}"

echo "Loading worktree context for $TICKET_ID..."
echo "Expected worktree: $WORKTREE_PATH"

# STEP 2: Validate worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "❌ ERROR: Worktree not found at $WORKTREE_PATH"
    echo ""
    echo "Testing requires the worktree created by /adaptation"
    echo "Run /adaptation $TICKET_ID first"
    exit 1
fi

# Validate it's a git worktree
if [ ! -f "$WORKTREE_PATH/.git" ]; then
    echo "❌ ERROR: Directory exists but is not a valid git worktree"
    exit 1
fi

# STEP 3: Navigate to worktree
ORIGINAL_DIR=$(pwd)
cd "$WORKTREE_PATH"

# Verify we're in the worktree
CURRENT_DIR=$(pwd)
CURRENT_BRANCH=$(git branch --show-current)

echo "✅ Worktree context loaded"
echo "   Directory: $CURRENT_DIR"
echo "   Branch: $CURRENT_BRANCH"
echo ""

# CRITICAL: All test operations happen in this worktree
# At end of command, return to original directory: cd "$ORIGINAL_DIR"
```

---

## Testing Workflow

1. **Linear Context Loading**: Load ticket details and all comments (using MCP tools above)

2. **Worktree Context Loading**: Navigate to ticket's isolated worktree (see above section)

3. **Worktree Verification**: Confirm in worktree directory (NOT main repo) with correct feature branch

4. **PR Discovery**: Find existing PR for the ticket using GitHub CLI

5. **🚨 EXISTING TEST VALIDATION (MANDATORY - Gate #0 - DO THIS FIRST)**:
   - **Step 1**: Identify all existing tests in affected modules
   - **Step 2**: Run existing tests to find failures
   - **Step 3**: Fix ALL broken tests before proceeding
   - **Step 4**: Verify 100% of existing tests pass
5. **🆕 API DISCOVERY (MANDATORY - Gate #1)**: (within worktree)
   - **Phase 1**: Read implementation files to understand actual API
   - **Phase 2**: Study existing PASSING tests for patterns
   - **Phase 3**: Verify file structure and import paths
   - **Phase 4**: Document discovered API before writing tests

6. **Test Planning**: Identify ONLY new test scenarios needed based on DISCOVERED API (be judicious)

7. **Unit Testing**: Create ONLY essential new tests using ACTUAL methods/enums from discovery

8. **Integration Testing**: Test ONLY new module interactions with VERIFIED API contracts

9. **Security Testing**: Validate ONLY new security-sensitive code using ACTUAL validation logic discovered

10. **Performance Testing**: Benchmark ONLY new performance-critical code using ACTUAL service methods

11. **🆕 COMPILATION CHECK (MANDATORY - Gate #2)**: Verify all tests compile

12. **🆕 EXECUTION CHECK (MANDATORY - Gate #3)**: Verify all tests run

13. **Bug Fix Implementation**: Fix any issues revealed during verification (within worktree)

14. **Commit & Push**: Commit all test fixes and additions to worktree branch

15. **PR Comment**: Add testing summary with verification results

16. **PR Status Update**: Add test commits, labels (only if all gates pass)

17. **Linear Integration**: Use `mcp__linear-server__create_comment` with verification report

18. **Return to Original Directory**: `cd "$ORIGINAL_DIR"` to exit worktree context

## 🆕 MANDATORY: API Discovery Phase (Before Writing Tests)

**CRITICAL: Complete this phase BEFORE writing ANY test code**

### Phase 1: Read Implementation Files (Required)

```bash
# Step 1: Identify files to test from Linear ticket
# Look for implementation in ticket description or PR
grep -r "class.*Service\|export class\|export.*function" src/modules/[module-name]

# Step 2: Read EACH implementation file
# Use Read tool to examine actual API
```

**Document for each file:**
- ✅ All public method names (exact spelling, case-sensitive)
- ✅ Method signatures (parameters, types, return types)
- ✅ Enum values used (e.g., EmailType.USER_WELCOME, not .WELCOME)
- ✅ Interface/Type definitions referenced
- ✅ Import patterns and file extensions

**Example:**
```typescript
// ✅ Read: src/modules/email/email.service.ts
// Discovered:
// - sendEmail(params: SendEmailParams): Promise<EmailResult>
// - scheduleEmail(params: SendEmailParams): Promise<EmailResult>
// - retryFailedEmail(emailId: string): Promise<EmailResult>

// ✅ Read: src/modules/email/constants/email-types.ts
// Discovered:
// - EmailType enum: USER_WELCOME, ADMIN_WELCOME, PASSWORD_RESET, MAGIC_LINK
// - NOT: WELCOME, PAYMENT_RECEIPT (these don't exist)

// ✅ Read: src/modules/email/repositories/email-event.repository.ts
// Discovered:
// - findAll(filters: EmailEventFilters): Promise<EmailEvent[]>
// - NOT: findMany() (this doesn't exist)
```

### Phase 2: Study Passing Tests (Required)

```bash
# Step 1: Find passing tests in same module
npm test -- --testPathPattern="module-name.*\.spec\.ts" 2>&1 | grep "PASS"

# Step 2: Read passing test files
# Use Read tool to extract patterns
```

**Copy these elements from passing tests:**
- ✅ Mock setup structure (beforeEach configuration)
- ✅ Helper function imports and usage
- ✅ Dependency injection patterns
- ✅ Test data creation patterns
- ✅ Assertion styles

**Example:**
```typescript
// ✅ FOUND in passing email.repository.spec.ts:

// Copy this mock setup pattern:
const mockDatabaseService = {
  emailEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  getClient: jest.fn().mockReturnValue(mockClient),
};

// Copy this DI pattern:
const module = await Test.createTestingModule({
  providers: [
    EmailEventRepository,
    { provide: DatabaseService, useValue: mockDatabaseService },
    { provide: TRANSACTION_MANAGER, useValue: createMockTransactionManager() },
  ],
}).compile();

// ✅ REUSE verbatim - don't create variations
```

### Phase 3: Verify File Structure (Required)

```bash
# Check actual file extensions
ls -la src/modules/[module]/templates/
ls -la src/modules/[module]/constants/
ls -la src/modules/[module]/types/

# Verify test framework module mapper config
cat jest.config.js | grep -A 5 "moduleNameMapper"
cat vitest.config.js | grep -A 5 "resolve"
```

**Verify:**
- ✅ Template files: .tsx vs .ts extensions
- ✅ Import resolution: How templates are imported
- ✅ Module mapper: Any path mappings configured
- ✅ File locations: Where types/constants/helpers live

### Phase 4: Create API Reference Document (Required)

**Before writing tests, create:**

```markdown
# API Reference for [Module] Testing

## Verified API Surface (from actual code)

### Enums (from src/modules/[module]/constants/)
- EmailType: USER_WELCOME, ADMIN_WELCOME, PASSWORD_RESET, MAGIC_LINK
- EmailStatus: PENDING, QUEUED, SENT, FAILED, SCHEDULED

### Service Methods (from src/modules/[module]/[service].service.ts)
- sendEmail(params: SendEmailParams): Promise<EmailResult>
- scheduleEmail(params: SendEmailParams): Promise<EmailResult>

### Repository Methods (from src/modules/[module]/repositories/)
- findAll(filters: EmailEventFilters): Promise<EmailEvent[]>
- findById(id: string): Promise<EmailEvent | null>

### Test Helpers (from passing tests)
- createMockEmailQueue() - from __tests__/helpers/email-test-helpers.ts
- createMockDatabaseService() - from common/tests/repository-test-utils.ts

### Import Patterns (verified)
- Templates: import { X } from './templates/x.template' (resolves to .tsx via mapper)
- Services: import { X } from './x.service'
- Types: import { X } from './types/x.types'
```

**✅ ONLY proceed to writing tests after completing ALL 4 phases**

## 🆕 MANDATORY: Compilation & Execution Verification

**After writing tests, MUST verify before claiming completion:**

### Gate #2: TypeScript Compilation (Required)
```bash
# Compile test files only
npx tsc --noEmit src/modules/[module]/**/*.spec.ts

# Must return 0 errors
# Fix ALL errors before proceeding:
# - Wrong enum values (WELCOME vs USER_WELCOME)
# - Wrong method names (findMany vs findAll)
# - Missing imports or wrong paths
# - Type mismatches
```

### Gate #3: Test Execution (Required)
```bash
# Run tests to verify execution
npm test -- --testPathPattern="[module].*\.spec\.ts" --run

# Must execute without:
# - Runtime errors
# - Module not found errors
# - Mock setup failures
# - Undefined method errors
```

### Gate #4: Coverage Check (If Targets Exist)
```bash
# Check coverage only after compilation and execution pass
npm test -- --testPathPattern="[module].*\.spec\.ts" --coverage

# Verify meets target from $2 parameter (default: 70%)
# Target coverage: $2% or higher
```

**Completion Requirements:**
- ✅ All 3 gates must pass
- ✅ Zero compilation errors
- ✅ Zero runtime errors
- ✅ Coverage targets met (if specified)

**ONLY add "tests-complete" label after all gates pass**

## Test Implementation Strategy

### Test Pyramid Distribution (Flexible Guidelines)
- **Unit Tests (70-80%)**: Fast, isolated function testing for **non-trivial logic** with important edge cases
- **Integration Tests (15-20%)**: Module interaction validation and API contract testing
- **End-to-End Tests (5-10%)**: Only the most critical user journeys

### Security Test Requirements
- **Input Validation**: SQL injection, XSS prevention
- **Authentication**: JWT validation, session management
- **Authorization**: Role-based access control
- **Rate Limiting**: API throttling and abuse prevention

## Quality Standards

### Coverage Requirements (Risk-Based Targets)
- **Overall Coverage**: Target $2% (parameter default: 70%)
- **Line Coverage**: Target $2% (adjust ±10% based on code complexity)
- **Branch Coverage**: Target $2% (adjust ±5% based on conditional logic)
- **Function Coverage**: Target $2% (focus on non-trivial functions)
- **Critical Business Logic**: 90-100% (always high regardless of $2)
- **Security-Sensitive Code**: 90-100% (always high regardless of $2)

### Test Quality Criteria
- **Valuable**: Each test should catch real bugs, not just increase coverage
- **Readable**: Descriptive test names like "displays error when email is invalid"
- **Isolated**: Each test runs independently with fresh state
- **Fast**: Unit tests under 2 minutes, integration under 5 minutes
- **Focused**: Test behavior contracts, not implementation details
- **Maintainable**: Tests simpler than the code they test

### Preventing Flaky Tests
- **Use framework auto-waiting**: Never use arbitrary sleeps
- **Mock external services**: Use appropriate mocking libraries
- **Isolate test data**: Use unique identifiers (timestamps, UUIDs)
- **Clean state between tests**: Reset database/cache before each test
- **Stable selectors**: Use data-testid or accessibility roles, not CSS
- **Proper timeouts**: Configure based on CI/CD environment performance
- **Retry strategy**: Configure retries only for known intermittent issues

## Expected Outputs

- **Focused Unit Tests**: Testing non-trivial business logic and complex algorithms
- **Strategic Integration Tests**: Key module interactions and API contracts
- **Critical Security Tests**: High-risk vulnerability prevention only
- **Selective Performance Tests**: Only for performance-critical paths
- **Test Documentation**: Coverage reports focusing on risk areas
- **Linear Test Report**: Testing summary with risk-based coverage metrics

## Linear Testing Report Format

After completing the test implementation, add the following structured comment to the Linear ticket:

```markdown
## 🧪 Testing Results Summary

### Test Status: [COMPLETE/IN_PROGRESS/ISSUES_FOUND]

### ✅ Verification Gates (MUST PASS)

**Gate #0: Existing Test Validation (COMPLETED FIRST)**
- ✅ Existing tests identified: [X test files in Y affected modules]
- ✅ Initial test run: [X total tests, Y passing, Z failing]
- ✅ Broken tests fixed: [Z tests fixed]
- ✅ Final validation: [100% of existing tests passing]
- ✅ Root causes addressed:
  - [List any production code bugs found and fixed]
  - [List any API changes requiring test updates]
  - [List any outdated test assumptions corrected]

**Gate #1: API Accuracy**
- ✅ API Discovery completed via Read tool
- ✅ All tests use actual methods from implementation
- ✅ All enum values verified against codebase
- ✅ All parameter types match actual signatures
- ✅ Pattern reuse from passing tests: [X files studied]

**Gate #2: Compilation**
- ✅ TypeScript compilation: [PASS/FAIL]
- ✅ Compilation errors: [0 or list specific errors]
- ✅ Import resolution: [ALL RESOLVED]
- ✅ Type mismatches: [NONE]

**Gate #3: Execution**
- ✅ Test execution: [PASS/FAIL]
- ✅ Runtime errors: [0 or list specific errors]
- ✅ Mock setup: [ALL WORKING]
- ✅ Assertion failures: [X tests, Y passing, Z failing]

### 📊 Coverage Metrics (After Gates Pass)
- **Overall Line Coverage**: X% (Target: $2%, default 70%)
- **Critical Business Logic**: X% (Target: 90%+)
- **Security-Sensitive Code**: X% (Target: 90%+)
- **Trivial Code Skipped**: X functions/methods (as intended)

### ✅ Test Suite Overview
- **Unit Tests**: X tests created (70-80% of total, complex logic focus)
- **Integration Tests**: X tests created (15-20% of total)
- **E2E Tests**: X tests created (5-10% of total, critical paths only)
- **API Accuracy**: 100% (all tests use verified methods/enums)

### 🎯 Testing Focus Areas
- ✅ Critical business logic tested
- ✅ Security-sensitive operations covered
- ✅ Complex algorithms validated
- ✅ Error handling scenarios tested
- ✅ Key user journeys (E2E) validated
- ✅ API contracts verified (integration)

### 🚨 Issues Identified
[List any test failures, coverage gaps, or quality concerns]

### ✨ Quality Achievements
[Highlight testing successes and quality improvements]

### 🎯 Next Steps
[Any additional testing needed or recommendations]

**Testing Completed**: [Date/Time]
**Test Engineer**: QA Engineer (Automated Analysis)
```

## Worktree Safety and Commit Process

### Worktree Verification:
Before making ANY test commits, verify you're in the correct worktree:
```bash
# CRITICAL: Verify we're in a worktree (not main repo)
CURRENT_DIR=$(pwd)

if [[ "$CURRENT_DIR" != *"/.worktrees/"* ]]; then
    echo "❌ ERROR: Not in a worktree!"
    echo "Current directory: $CURRENT_DIR"
    echo ""
    echo "Testing MUST happen in worktree, not main repository."
    echo "Run the worktree context setup steps above."
    exit 1
fi

# Check current branch
current_branch=$(git branch --show-current)
echo "Worktree: $CURRENT_DIR"
echo "Branch: $current_branch"

# CRITICAL: Verify NOT on main/master
if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
    echo "❌ ERROR: Worktree is on main branch!"
    echo "This should not happen - worktrees should be on feature branches"
    echo "Check adaptation process - something went wrong"
    exit 1
fi

# Verify on a feature branch
if [[ "$current_branch" =~ ^(feature|feat|fix|hotfix|bugfix)/ ]] || \
   [[ "$current_branch" =~ ^[A-Z]+-[0-9]+ ]]; then
    echo "✅ Safe to commit tests"
    echo "   Worktree: ✓"
    echo "   Feature branch: $current_branch ✓"
else
    echo "⚠️  WARNING: Unusual branch name: $current_branch"
    echo "Proceeding with testing on current branch"
fi
```

### Committing Tests and Fixes (Within Worktree):
After implementing tests and any bug fixes:
```bash
# ENSURE WE'RE IN WORKTREE
if [[ "$(pwd)" != *"/.worktrees/"* ]]; then
    echo "❌ ERROR: Not in worktree - cannot commit"
    exit 1
fi

# Stage all test files and fixes
git add .

# Commit with descriptive message (use actual ticket ID)
git commit -m "test: add comprehensive test coverage for [TICKET-ID]

- Add unit tests for [components]
- Add integration tests for [APIs]
- Add security validation tests
- Fix bugs discovered during testing
- Coverage: X%

Tests developed in isolated worktree: $(pwd)"

# Push worktree branch to remote
BRANCH_NAME=$(git branch --show-current)
git push origin "$BRANCH_NAME"

echo "✅ Tests committed and pushed from worktree"
echo "   Branch: $BRANCH_NAME"
echo "   Worktree: $(pwd)"
```

### Returning to Original Directory:
After all testing work is complete:
```bash
# Return to original directory (saved at start of command)
cd "$ORIGINAL_DIR"

echo "✅ Returned to original directory"
echo "   Testing complete in worktree: $WORKTREE_PATH"
echo "   Worktree remains active for documentation and review phases"
```

## PR Testing Management

### Adding Test Results to PR:
After testing is complete, add comment to PR:
```bash
# No approval needed - gh pr comment
gh pr comment --body "## 🧪 Testing Complete

### Test Status: [COMPLETE/ISSUES_FOUND]

**Tests Added**: X unit, Y integration, Z security
**Coverage**: Line X% | Branch Y% | Function Z%
**Bugs Fixed**: X issues discovered and resolved

All tests passing. See Linear ticket for detailed report.
Ready for documentation phase."
```

### Commit Message Standards for Testing:
- `test: add comprehensive unit tests for [component]`
- `test: add integration tests for [feature] API`
- `test: add security tests for input validation`
- `test: add performance benchmarks for [operation]`
- `fix: resolve edge case discovered in [component] testing`
- `fix: address test failure in [specific functionality]`

### PR Status Updates Based on Testing Results:

**If Coverage Targets Met & All Tests Pass:**
- Add `tests-complete` label to PR
- Update PR description with testing summary
- PR can proceed to next phase (documentation)

**If Issues Found During Testing:**
- Make bug fix commits for any issues revealed by tests
- Update test suite to cover edge cases discovered
- Re-run tests to ensure fixes work
- Only add `tests-complete` label when everything passes

**If Coverage Insufficient:**
- Add additional tests to meet coverage targets
- Keep PR in current status until targets met
- Update PR with coverage metrics

### PR Description Testing Section:
```markdown
## 🧪 Testing Results
**Status**: COMPLETE/IN_PROGRESS/ISSUES_FOUND
**QA Engineer**: Automated Testing Analysis
**Test Date**: [Date]

**Coverage**: Line X% | Branch X% | Function X%
**Tests Added**: X unit, X integration, X security
**Issues Found**: X bugs fixed during testing
**Performance**: [Benchmark results if applicable]
```

## Success Criteria

Testing is successful when:

**Primary Criteria (Must Pass - Gates 0-3):**
- ✅ **Existing Test Validation (Gate #0 - FIRST PRIORITY)**: 100% of existing tests in affected modules pass
- ✅ **API Accuracy (Gate #1)**: 100% of NEW tests use actual API verified via Read tool
- ✅ **Compilation (Gate #2)**: All test files compile without TypeScript errors
- ✅ **Execution (Gate #3)**: All tests run without runtime errors or setup failures
- ✅ **Pattern Reuse**: Existing test patterns copied from passing tests
- ✅ **Judicious New Tests**: Only essential new tests added (no coverage padding)

**Secondary Criteria (After Gates Pass):**
- ✅ Coverage targets met ($2% overall from parameter, 90%+ for critical code)
- ✅ High-value tests written (complex logic, security-sensitive operations)
- ✅ Critical user journeys validated (via selective E2E tests)
- ✅ Test suite runs fast (under 2 minutes for unit tests)
- ✅ Maintainable tests created (simpler than code being tested)

**Delivery Criteria:**
- ✅ PR updated with test commits, labels, and verification results
- ✅ Linear ticket updated with comprehensive testing report including Gate #0 results (status remains "In Progress")

**Quality Indicators:**
- Zero broken existing tests (all fixed before new tests added)
- Zero flaky or intermittent test failures
- Tests serve as living documentation
- All assertions validate actual behavior (not assumptions)
- No unnecessary test duplication

## Testing Philosophy

The testing phase focuses on **test remediation before test creation** and **accuracy before coverage** - ensuring existing tests pass and writing only necessary new tests that correctly validate the actual API implementation.

**Priority Order:**
1. **Fix broken existing tests** (ensure production code changes didn't break tests)
2. **Verify API** (read implementation, use actual methods/enums for NEW tests)
3. **Ensure compilation** (zero TypeScript errors)
4. **Validate execution** (tests run without errors)
5. **Achieve coverage** (meet targets with judicious, high-value tests)

**Core Principles:**
- **Remediation First**: Always fix broken existing tests before writing new ones
- **Judicious Creation**: Only write new tests that add real value - don't pad coverage
- **Quality Over Quantity**: Better to have 50% coverage with tests that compile and run correctly than 90% coverage with broken tests
- **No Duplication**: Don't create new tests for functionality already well-covered

We prioritize ensuring production code changes don't break existing tests, then testing complex business logic, security-sensitive operations, and critical user paths while explicitly avoiding over-testing trivial code. But FIRST, we ensure all existing tests pass, and then ensure every NEW test we write uses the actual API from the codebase.
