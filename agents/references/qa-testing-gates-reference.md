# QA Testing Gates Reference

Detailed patterns, examples, and procedures for the QA Engineer Agent's testing gates and API discovery phases. This file is the authoritative reference for Gate #0 through Gate #3 implementation details, API discovery methodology, and mock setup patterns.

---

## Gate #0: Existing Test Validation (MANDATORY - DO THIS FIRST)

**This gate MUST pass before you proceed to any API discovery or new test creation.**

### Step 1: Identify Affected Modules and Existing Tests

```bash
# Based on the Linear ticket and implementation changes, identify affected modules
# Find all existing test files in these modules
ls -la src/modules/[affected-module]/**/*.spec.ts
ls -la src/modules/[affected-module]/**/*.test.ts

# Document all existing test files that may be affected by production code changes
```

### Step 2: Run All Existing Tests in Affected Modules

```bash
# Run tests FIRST to identify any failures caused by production code changes
npm test -- --testPathPattern="[affected-module]" --run

# Document ALL test failures:
# - Test file name
# - Test description
# - Failure reason
# - Expected vs actual behavior
```

**CRITICAL**: If ANY existing tests fail, you MUST fix them before proceeding to write new tests.

### Step 3: Analyze and Fix Each Broken Test

For each failing test, determine the root cause:

1. **Breaking API Change**: Production code changed the API (method signature, return type, etc.)
   - **Action**: Update the test to match the new API contract
   - **Verify**: Ensure the new API behavior is correct and intentional

2. **Production Bug**: Implementation introduced a legitimate bug
   - **Action**: Fix the production code, not the test
   - **Verify**: Test should pass after production code fix

3. **Outdated Test Assumption**: Test was based on incorrect assumptions
   - **Action**: Update test to reflect correct behavior
   - **Verify**: Test validates actual specification, not old assumptions

**Fix tests one by one, re-running after each fix to verify no regressions.**

### Step 4: Verify 100% Pass Rate

```bash
# All existing tests MUST pass before you proceed
npm test -- --testPathPattern="[affected-module]" --run

# Success Criteria: 0 test failures in affected modules
```

**GATE #0 BLOCKER: You may NOT proceed to writing new tests until:**
- All existing tests in affected modules identified
- All existing tests have been run
- All broken tests have been fixed
- 100% of existing tests pass

---

## New Test Creation Philosophy (ONLY After Gate #0 Passes)

**Be Judicious and Strategic About New Tests:**

### When TO Write New Tests:
- New functionality added that has NO existing test coverage
- Complex business logic introduced that needs validation
- Security-sensitive operations that require explicit testing
- Critical user paths that aren't covered by existing E2E tests
- Edge cases discovered during implementation that aren't covered

### When NOT TO Write New Tests:
- Functionality already well-covered by existing tests
- Trivial code (getters, setters, simple pass-throughs)
- Just to increase coverage percentages
- Duplicating test scenarios already covered
- Testing framework or library code

### Pre-Test Creation Checklist:

Before writing each new test, ask yourself:

1. **Is this NEW functionality?** Does the ticket introduce new behavior not previously covered?
2. **Is there a coverage gap?** Is this functionality NOT already tested by existing tests?
3. **Is this complex enough?** Does this code have meaningful logic that can fail?
4. **Does this prevent regressions?** Will this test catch real bugs in the future?
5. **Is this high-value?** Is this critical business logic, security-sensitive, or a key user path?

**If you answered "no" to ANY of these questions, reconsider whether the test is necessary.**

### Focus on Quality, Not Quantity:

- 50% coverage with high-value, maintainable tests > 90% coverage with low-value, duplicative tests
- Each test should serve a clear purpose and catch real bugs
- Avoid "test theater" - tests that exist only to increase coverage metrics
- Prioritize tests that will actually be maintained and provide value over time

---

## API Discovery Phases (For New Tests After Gate #0)

### Phase 1: Read Implementation Files (100% Required)

```bash
# Step 1: Identify the files to be tested from Linear ticket
# Use Grep to find implementation files
grep -r "class.*Service\|export.*function\|export class" src/modules/[module-name]

# Step 2: Read EACH implementation file
# Use Read tool to examine actual code
```

**Document the following:**
- All public method names (exact spelling)
- Method parameters (types, required vs optional)
- Return types (Promise<T>, T, void, etc.)
- Enum values (e.g., EmailType.USER_WELCOME not .WELCOME)
- Interface/Type definitions used
- File extensions (.ts, .tsx, .js)

**Example API Discovery:**
```typescript
// CORRECT: Read actual implementation first
const emailService = await read('src/modules/email/email.service.ts')
const emailTypes = await read('src/modules/email/constants/email-types.ts')
const emailRepo = await read('src/modules/email/repositories/email-event.repository.ts')

// Document findings:
// EmailService.sendEmail(params: SendEmailParams): Promise<EmailResult>
// EmailType enum: USER_WELCOME, ADMIN_WELCOME, PASSWORD_RESET, MAGIC_LINK
// EmailEventRepository.findAll(filters: EmailEventFilters): Promise<EmailEvent[]>
// Template files: *.template.tsx (not *.template)

// NEVER: Assume method names like findMany(), trackEvent(), WELCOME enum
```

### Phase 2: Study Existing Passing Tests (100% Required)

```bash
# Step 1: Find passing tests in the same module
npm test -- --testPathPattern="module-name.*\.spec\.ts" 2>&1 | grep "PASS"

# Step 2: Read passing test files
# Use Read tool to study successful patterns
```

**Extract and copy these patterns:**
- Mock setup structure (beforeEach configuration)
- Helper function usage (createMock*, TestFixture*)
- Dependency injection pattern
- Assertion styles and matchers used

**Example Pattern Extraction:**
```typescript
// FOUND in passing email.repository.spec.ts:
const mockDatabaseService = {
  emailEvent: {
    create: jest.fn(),
    findMany: jest.fn(), // Note: ORM uses findMany
  },
  getClient: jest.fn().mockReturnValue(mockClient),
};

const module = await Test.createTestingModule({
  providers: [
    EmailEventRepository,
    { provide: DatabaseService, useValue: mockDatabaseService },
    { provide: TRANSACTION_MANAGER, useValue: createMockTransactionManager() },
  ],
}).compile();

// REUSE this exact pattern in new tests
// DON'T create different mock patterns
```

### Phase 3: Verify File Structure (100% Required)

```bash
# Check actual file extensions and imports
ls -la src/modules/[module]/templates/
ls -la src/modules/[module]/constants/
ls -la src/modules/[module]/types/

# Verify test framework module mapper configuration
cat jest.config.js | grep -A 5 "moduleNameMapper"
cat vitest.config.js | grep -A 5 "resolve"
```

**Check:**
- Template file extensions (.tsx vs .ts)
- Import path resolution patterns
- Module mapper configurations
- Type definition locations

### Phase 4: Create API Reference Document

Before writing tests, create a reference document:

```markdown
# API Reference for [Module] Testing

## Discovered API Surface

### Enums (from constants/[module]-types.ts)
- EmailType: USER_WELCOME, ADMIN_WELCOME, PASSWORD_RESET, MAGIC_LINK, EMAIL_VERIFICATION
- EmailStatus: PENDING, QUEUED, SENT, FAILED, SCHEDULED

### Service Methods (from [module].service.ts)
- sendEmail(params: SendEmailParams): Promise<EmailResult>
- scheduleEmail(params: SendEmailParams): Promise<EmailResult>
- retryFailedEmail(emailId: string): Promise<EmailResult>
- cancelScheduledEmail(emailId: string): Promise<void>

### Repository Methods (from repositories/[module].repository.ts)
- findAll(filters: EmailEventFilters): Promise<EmailEvent[]>
- findById(id: string): Promise<EmailEvent | null>
- create(data: Partial<EmailEvent>): Promise<EmailEvent>

### Test Helpers (from passing tests)
- createMockEmailQueue() - from __tests__/helpers/email-test-helpers.ts
- createMockDatabaseService() - from common/tests/repository-test-utils.ts
- TestFixtureFactory.createEmailLog() - from common/tests/fixtures

### File Import Patterns
- Templates: import { X } from './templates/x.template' (auto-resolves to .tsx)
- Services: import { X } from './x.service'
- Types: import { X } from './types/x.types'
```

**ONLY proceed to writing tests after completing all 4 phases of API discovery.**

---

## Compilation & Execution Verification

After writing tests, you MUST verify before claiming completion:

### Step 1: TypeScript Compilation (Required)
```bash
# Compile test files to check for errors
npx tsc --noEmit src/modules/[module]/**/*.spec.ts

# Fix ALL compilation errors:
# - Wrong enum values (e.g., WELCOME vs USER_WELCOME)
# - Wrong method names (e.g., findMany vs findAll)
# - Missing/wrong imports
# - Type mismatches
```

### Step 2: Test Execution (Required)
```bash
# Run tests to verify they execute
npm test -- --testPathPattern="[module].*\.spec\.ts" --run

# Tests must run without:
# - Runtime errors
# - Module resolution failures
# - Mock setup errors
# - Missing dependency errors
```

### Step 3: Coverage Validation (If Applicable)
```bash
# Check coverage only after tests compile and run
npm test -- --testPathPattern="[module].*\.spec\.ts" --coverage

# Verify coverage meets targets for critical code
```

**Completion Criteria:**
- Step 1: Zero TypeScript compilation errors
- Step 2: Tests execute without runtime errors
- Step 3: Coverage targets met (if specified)

**ONLY report "tests complete" after ALL three steps pass successfully.**

---

## Gate Summary: Detailed Criteria

### Gate #0 Criteria (MUST PASS FIRST):
- Zero existing test failures in affected modules
- All production code bugs discovered via failing tests are fixed
- All test updates for API changes are complete
- Complete pass of existing test suite before proceeding

**BLOCKER**: You may NOT proceed to Gates 1-3 until Gate #0 passes.

### Gate #1: API Accuracy (100% Required - For NEW Tests Only)
- Use actual enum values from codebase (not assumptions)
- Call actual methods that exist (verified via Read tool)
- Match actual parameter structures (from implementation)
- Verify against actual return types (from type definitions)

**Gate #1 Criteria:**
- Zero NEW tests using non-existent methods
- Zero NEW tests using wrong enum values
- Zero NEW tests using incorrect parameter types
- All NEW test API usage verified against actual code

### Gate #2: Compilation Success (100% Required)
- All test files (existing + new) must compile without errors
- Zero TypeScript errors allowed
- All imports must resolve correctly
- All types must match implementation

**Gate #2 Criteria:**
- `npx tsc --noEmit **/*.spec.ts` returns 0 errors
- No module resolution failures
- No type mismatch errors
- Clean compilation on first attempt

### Gate #3: Execution Success (100% Required)
- Tests must run without runtime errors
- Mocks must be configured correctly
- Assertions must be valid and meaningful
- No test setup/teardown failures

**Gate #3 Criteria:**
- `npm test -- --testPathPattern` runs successfully
- Zero runtime errors or crashes
- All mocks work as intended
- Tests produce valid results

---

## Coverage Targets (Secondary - After Gates 0-3 Pass)

| Metric | Target | Notes |
|--------|--------|-------|
| Line coverage | 70-80% | Not 90%+ |
| Branch coverage | 70-75% | |
| Function coverage | 75-80% | |
| Critical business logic | 90%+ | |
| Security-sensitive code | 90%+ | |

**Coverage Philosophy:**
- Coverage is a RESULT of good tests, not a GOAL
- Better to have 50% coverage with correct tests than 90% coverage with broken tests that don't compile
- Focus coverage on complex logic, skip trivial code
- Don't write new tests just to hit coverage numbers

---

## Test Code Examples

### Concurrency and Performance Testing
```javascript
it('should handle concurrent requests without race conditions', async () => {
  const requests = Array(100).fill(null).map(() =>
    userService.createUser(generateUniqueUser())
  );

  const start = Date.now();
  const results = await Promise.all(requests);
  const duration = Date.now() - start;

  expect(results).toHaveLength(100);
  expect(duration).toBeLessThan(5000);
  expect(new Set(results.map(r => r.id)).size).toBe(100); // All unique
});
```

### Security Testing Implementation
```javascript
describe('Security Validation', () => {
  it('should prevent SQL injection attacks', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await api.post('/users/search', {
      query: maliciousInput
    });

    expect(response.status).toBe(400);
    // Verify database integrity maintained
    const userCount = await db.users.count();
    expect(userCount).toBeGreaterThan(0);
  });

  it('should sanitize XSS payloads in user input', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await api.post('/comments', {
      text: xssPayload
    });

    const savedComment = await db.comments.findLatest();
    expect(savedComment.text).not.toContain('<script>');
    expect(savedComment.text).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
  });

  it('should enforce rate limits on authentication endpoints', async () => {
    const loginAttempts = Array(6).fill(null).map(() =>
      api.post('/auth/login', { email: 'test@example.com', password: 'wrong' })
    );

    const results = await Promise.all(loginAttempts);
    const rateLimited = results.filter(r => r.status === 429);
    expect(rateLimited).toHaveLength(1); // 6th request should be rate limited
  });
});
```

### Test Data Factory Pattern
```javascript
// Use factories for consistent, maintainable test data
const createUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'user',
  createdAt: new Date().toISOString(),
  ...overrides
});

const createValidPayment = (overrides = {}) => ({
  amount: 1000, // $10.00
  currency: 'USD',
  description: 'Test payment',
  customerId: faker.string.uuid(),
  ...overrides
});
```

### Database State Management
```javascript
// Clean, predictable database state for each test
beforeEach(async () => {
  await db.query('BEGIN'); // Start transaction
  await seedTestData(); // Insert consistent test data
});

afterEach(async () => {
  await db.query('ROLLBACK'); // Rollback all changes
  await redis.flushall(); // Clear cache
});
```

### API Contract Testing
```javascript
describe('User API Contract', () => {
  it('should return proper response structure for GET /users/:id', async () => {
    const user = await createTestUser();
    const response = await api.get(`/users/${user.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: expect.any(String),
      name: expect.any(String),
      createdAt: expect.any(String),
      // Should not expose sensitive fields
      password: undefined,
      resetToken: undefined
    });
  });
});
```

### Database Integration Testing
```javascript
describe('User Repository Integration', () => {
  it('should maintain referential integrity on user deletion', async () => {
    const user = await db.users.create(createUser());
    const order = await db.orders.create({ userId: user.id, amount: 100 });

    // Should fail due to foreign key constraint
    await expect(db.users.delete(user.id)).rejects.toThrow('foreign key violation');

    // Should succeed after removing dependent records
    await db.orders.delete(order.id);
    await expect(db.users.delete(user.id)).resolves.not.toThrow();
  });
});
```

### Performance Testing
```javascript
describe('Performance Requirements', () => {
  it('should handle 1000 concurrent user registrations', async () => {
    const registrations = Array(1000).fill(null).map(() =>
      api.post('/auth/register', createValidUserData())
    );

    const start = Date.now();
    const results = await Promise.all(registrations);
    const duration = Date.now() - start;

    const successfulRegistrations = results.filter(r => r.status === 201);
    expect(successfulRegistrations.length).toBeGreaterThan(950); // 95% success rate
    expect(duration).toBeLessThan(10000); // Under 10 seconds
  });
});
```
