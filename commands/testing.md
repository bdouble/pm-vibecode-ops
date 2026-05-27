---
description: Generate comprehensive test suites with edge case coverage, security testing, and performance validation for implemented features.
allowed-tools: Task, Read, Write, Edit, MultiEdit, Grep, Glob, LS, TodoWrite, Bash, Bash(gh pr comment:*), NotebookEdit, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__save_comment, mcp__linear-server__list_comments, mcp__linear-server__create_issue, mcp__linear-server__list_issues, mcp__linear-server__create_project, mcp__linear-server__list_projects, mcp__linear-server__list_teams
argument-hint: [ticket-id] [test-types] [coverage] (e.g., /testing LIN-456 unit,integration 90)
workflow-phase: testing
closes-ticket: false
workflow-sequence: "implementation → **testing** → documentation → code-review → security-review"
---

## Deferral Policy (read before invoking the agent)

The default disposition for in-scope work is **complete it now**. Deferral is only valid under the four catastrophic conditions in the `no-silent-deferrals` skill (see `/Users/brian/pm-vibecode-ops/skills/no-silent-deferrals/SKILL.md`). When parsing the agent's report:

1. Scan the Deferred Items table for any `AC-DEFERRED` entries (and reclassify any `DISCOVERED`/`OUT-OF-SCOPE` entries that fuzzy-match an acceptance criterion).
2. For each `AC-DEFERRED`, validate the presence of a `### Deferral Justification (CATASTROPHIC — required)` block with all four fields populated and a catastrophic condition in 1-4.
3. If validation fails, re-dispatch the agent ONCE with explicit "do it now" instructions before posting to Linear.
4. If the re-dispatch still fails validation, PAUSE and surface to the user.

If invoked standalone (outside `/execute-ticket` or `/epic-swarm`), this command is responsible for the same deferral validation as those orchestrators.

## MANDATORY: Agent Invocation Required

**You MUST use the Task tool to invoke the `qa-engineer-agent` for this phase.**

### Step 1: Pre-Agent Context Gathering (YOU do this BEFORE invoking agent)

**As the orchestrator, YOU must gather ALL context before spawning the agent:**

1. **Fetch ticket details**: Use `mcp__linear-server__get_issue` with ticket ID
2. **Fetch all comments**: Use `mcp__linear-server__list_comments` to get complete history
3. **Extract and prepare the following for the agent prompt:**
   - Ticket ID, title, and full description
   - The adaptation report (contains test requirements)
   - The implementation report (contains files changed)
   - Any test-specific requirements mentioned
4. **Get git context**: Run `git status`, `git diff --name-only` for changed files

**IMPORTANT**: The agent does NOT have access to Linear. You must include ALL relevant context in the prompt.

### Step 2: Agent Invocation (Provide Full Context)

Use the Task tool to invoke the `qa-engineer-agent` with ALL context embedded:

**Your prompt to the agent MUST include:**
- The ticket ID for reference
- The full ticket title and description (copy the text)
- The implementation report (which files were changed)
- Test requirements from adaptation report
- Coverage target (from arguments or default 70%)
- Git diff summary showing what was implemented

**Example prompt structure:**
```
## Ticket Context
**ID**: [ticket-id]
**Title**: [title from get_issue]
**Description**:
[full description text from get_issue]

## Implementation Summary
[paste the implementation report from list_comments]

## Files Changed
[list from git diff --name-only]

## Test Requirements (from Adaptation)
[paste test requirements section from adaptation report]

## Coverage Target
[from $2 argument or default 70%]

## Your Task
Create comprehensive tests for this ticket following the accuracy-first testing philosophy. Return a structured testing report when complete, including:
- Test files created
- Coverage achieved
- Any issues found during testing
```

**CRITICAL**: Do NOT tell the agent to "fetch the ticket" - the agent cannot access Linear.

### Step 3: Post-Agent Completion (YOU Write to Linear)

After the agent returns its report:

1. **Parse the agent's report** - Extract test files created, coverage metrics, issues found
2. **Write the completion comment** - Use `mcp__linear-server__save_comment` with the structured testing report
3. **Update ticket status if needed** - Use `mcp__linear-server__update_issue` (keep as "In Progress")
4. **Verify success** - Confirm the comment was added
5. **Report to user** - Summarize test coverage, any issues, next steps

**YOU are responsible for the Linear comment, not the agent.**

DO NOT attempt to write tests directly. The specialized qa-engineer-agent handles the test creation.

---

## Required Skills
- **testing-philosophy** - Fix broken tests BEFORE writing new tests
- **production-code-standards** - Test code must be production-ready

## Usage Examples

```bash
# Basic usage with just ticket ID (defaults to 70% coverage)
/testing LIN-456

# Specify test types
/testing LIN-456 unit,integration

# Full parameters with coverage target
/testing LIN-456 unit,integration,e2e 90
```

You are acting as a **QA Engineer** responsible for building accurate, high-value test suites for this ticket. Focus on correctness, edge cases, and regression prevention using existing patterns in the codebase.

# ⚠️ WORKFLOW POSITION: Testing Phase Does NOT Close Tickets

**Testing runs AFTER implementation and BEFORE documentation.**

- After testing passes, ticket proceeds to: Documentation → Code Review → Security Review
- Status remains 'In Progress' throughout testing phase
- Only security review (final gate) has authority to close tickets

**Workflow Position:** `Implementation → Testing (YOU ARE HERE) → Documentation → Code Review → Security Review (closes ticket)`

---

## IMPORTANT: Linear MCP Integration (Orchestrator Responsibility)

**The orchestrator (YOU) handles ALL Linear MCP operations. The agent does NOT have access to Linear.**

**Tools you will use:**
- **Fetch ticket**: `mcp__linear-server__get_issue` - YOU fetch before agent invocation
- **Fetch comments**: `mcp__linear-server__list_comments` - YOU fetch before agent invocation (implementation report is here!)
- **Add comments**: `mcp__linear-server__save_comment` - YOU write after agent returns
- **Update status**: `mcp__linear-server__update_issue` - YOU update after agent returns

Generate **accurate, compilable** test suites for ticket **$1** that use the actual API implementation.

**MANDATORY Implementation Process:**
- Phase 1: API Discovery (REQUIRED - verify actual implementation)
- Phase 2: Pattern Reuse (REQUIRED - copy from passing tests)
- Phase 3: Verification (REQUIRED - compile, run, coverage)

**Arguments:**
- $1: ticket-id (REQUIRED)
- $2: minimum-coverage (OPTIONAL - default: 70%, adjust based on code complexity and risk)

## 🚨 CRITICAL: Orchestrator-Agent Responsibility Split

**ORCHESTRATOR (YOU) is responsible for:**
- Fetching ticket details and ALL comments BEFORE invoking agent
- Finding and extracting both adaptation and implementation reports
- Embedding ALL context into the agent prompt
- Writing the testing report to Linear AFTER agent completes
- Managing PR updates and Linear status

**AGENT (qa-engineer-agent) is responsible for:**
- Discovering actual API from implementation (from context you provide)
- Creating accurate, compilable tests
- Verifying tests pass all gates (compilation, execution, coverage)
- Returning a structured testing report

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

**You MUST invoke the `qa-engineer-agent` via the Task tool** to create **focused, high-value** test coverage ensuring quality and preventing regressions while **avoiding over-testing trivial code**.

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

## Testing Workflow

1. **Linear Context Loading**: Load ticket details and all comments (completed above)
2. **Branch Verification**: Confirm on feature branch (NOT main) using `git branch --show-current`
3. **PR Discovery**: Find existing PR for the ticket using GitHub CLI
4. **🚨 EXISTING TEST VALIDATION (MANDATORY - Gate #0 - DO THIS FIRST)**:
   - **Step 1**: Identify all existing tests in affected modules
   - **Step 2**: Run existing tests to find failures
   - **Step 3**: Fix ALL broken tests before proceeding
   - **Step 4**: Verify 100% of existing tests pass
5. **🆕 API DISCOVERY (MANDATORY - Gate #1)**:
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
13. **Bug Fix Implementation**: Fix any issues revealed during verification
14. **Commit & Push**: Commit all test fixes and additions to feature branch
15. **PR Comment**: Add testing summary with verification results
16. **PR Status Update**: Add test commits, labels (only if all gates pass)
17. **Linear Integration**: Use `mcp__linear-server__save_comment` with verification report

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

## Branch Safety and Commit Process

### Branch Verification:
Before making ANY test commits, verify you're on the feature branch:
```bash
# Check current branch
current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

# CRITICAL: Verify NOT on main/master
if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
    echo "ERROR: On main branch! Cannot commit tests"
    echo "Switch to the feature branch used in implementation phase"
    exit 1
fi

# Verify on a feature branch (common patterns)
if [[ "$current_branch" =~ ^(feature|feat|fix|hotfix|bugfix)/ ]] || \
   [[ "$current_branch" =~ ^[A-Z]+-[0-9]+ ]]; then
    echo "✓ On feature branch: $current_branch"
else
    echo "INFO: Branch name '$current_branch' doesn't follow common patterns"
    echo "Proceeding with testing on current branch"
fi
```

### Committing Tests and Fixes:
After implementing tests and any bug fixes:
```bash
# Stage all test files and fixes
git add .

# Commit with descriptive message (use actual ticket ID)
git commit -m "test: add comprehensive test coverage for [TICKET-ID]

- Add unit tests for [components]
- Add integration tests for [APIs]
- Add security validation tests
- Fix bugs discovered during testing
- Coverage: X%"

# Push to feature branch
git push origin HEAD
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
