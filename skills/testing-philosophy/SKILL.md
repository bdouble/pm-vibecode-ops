---
name: testing-philosophy
description: Enforces test accuracy over coverage quantity with a fix-first methodology. Use when writing, editing, or debugging test files (*.spec.ts, *.test.ts, etc.), or when user mentions "write tests", "tests failing", "fix tests", "CI failing", "improve coverage", or "run tests".
---

# Testing Philosophy

Fix broken tests BEFORE writing new tests. Accurate running tests > high coverage with broken tests.

## Mandatory Gate Sequence

### Gate 0: Fix Existing Tests (FIRST)

**BLOCKER: Do not write new tests until existing tests pass.**

```bash
# 1. Find existing tests for affected modules
ls src/modules/[module]/**/*.spec.ts 2>/dev/null

# 2. Run existing tests
npm test -- --testPathPattern="[module]" --run

# 3. Fix ALL failures (see below), then verify 100% pass
```

Fix strategies:
- API changed → Update test to match new API
- Bug found → Fix production code, not the test
- Wrong assumption → Update test to correct behavior

### Gate 1: API Discovery (Before New Tests)

**NEVER assume. ALWAYS verify:**

```bash
# Read actual implementation
cat src/modules/[module]/[module].service.ts

# Find actual enums and methods
grep -r "enum\|async.*(" src/modules/[module]/
```

Document findings before writing tests:
```markdown
## API Discovery: EmailService
- Method: sendEmail(params: SendEmailParams): Promise<EmailResult>
- Enum: EmailType.USER_WELCOME (NOT "WELCOME")
```

### Gate 2: Compilation (100%)
```bash
npx tsc --noEmit src/**/*.spec.ts  # Zero TS errors
```

### Gate 3: Execution (100%)
```bash
npm test -- --testPathPattern="[module]" --run  # Zero runtime errors
```

### Gate 4: Coverage (Secondary)
- Target: 70-80% (not 90%+)
- Focus on complex logic
- Skip trivial code

## Test Structure

Study passing tests first, then follow pattern:

```javascript
describe('PaymentService', () => {
  let service: PaymentService;
  let mockRepository: jest.Mocked<PaymentRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new PaymentService(mockRepository);
  });

  describe('processPayment', () => {
    it('should return transaction ID for valid payment', async () => {
      // Arrange
      mockRepository.save.mockResolvedValue({ id: 'txn_123' });
      // Act
      const result = await service.processPayment(validPayment);
      // Assert
      expect(result.transactionId).toBe('txn_123');
    });
  });
});
```

## When TO Test

- New functionality with no coverage
- Complex business logic
- Security-sensitive operations
- Critical user paths

## When NOT TO Test

- Already well-covered
- Trivial code (getters, pass-throughs)
- Just for coverage percentage
- Framework/library code

**Questions before each test:** Is this new? Is there a gap? Can this fail? Will it catch real bugs?

## Common Mistakes

```javascript
// WRONG - Assumed API
await emailService.sendWelcomeEmail(user); // Doesn't exist!

// RIGHT - Verified via Read
await emailService.sendEmail({ type: EmailType.USER_WELCOME });

// WRONG - Testing workaround behavior
expect(await service.failingOp()).toBeNull(); // Tests workaround!

// RIGHT - Testing correct behavior
await expect(service.failingOp()).rejects.toThrow(ValidationError);
```

## Production vs Test Code

| Location | Mocks | Fixtures | Workarounds |
|----------|-------|----------|-------------|
| src/, lib/, app/ | NO | NO | NO |
| *.test.*, __tests__/ | YES | YES | N/A |

**Remember: 50% coverage with correct tests > 90% with broken tests.**

## Rationalizations -- STOP

If you think any of these, you are about to write unreliable tests.

| Excuse | Reality |
|--------|---------|
| "The existing broken tests are someone else's problem" | You must fix ALL broken tests before writing new ones. No exceptions. |
| "I'll mock the API to save time" | Read the actual implementation first. Mocks based on assumptions create false passes. |
| "Coverage is what matters" | Accuracy is what matters. 50% accurate coverage beats 90% mocked coverage. |
| "This test is too complex to write properly" | If the test is complex, the code may need refactoring. The difficulty is a signal. |
| "I'll fix the test later" | A failing test you ignore trains everyone to ignore failing tests. Fix it now. |
| "Skipping this test unblocks the build" | Skipping tests hides bugs. Fix the test or fix the code. |

## Additional Resources

- **`references/test-priority-guidelines.md`** — Detailed test priority matrix for deciding what to test and what to skip
- **`examples/test-templates.md`** — Well-structured test file templates and examples for common patterns

## Related Skills
- **production-code-standards**: Production code quality standards (test code has different rules)
- **verify-implementation**: Run and show test output before claiming "tests pass"
