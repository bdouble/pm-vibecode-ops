---
name: testing-philosophy
description: Enforces remediation-first, accuracy-first testing. Activates when: (1) writing new tests or test suites, (2) debugging test failures, (3) improving test coverage, (4) modifying code that has existing tests, (5) any "write tests for X" request. Core principle: Fix broken tests BEFORE writing new tests. Accurate tests that run > high coverage with broken tests.
---

# Testing Philosophy

Fix broken tests BEFORE writing new tests. Accurate running tests > high coverage with broken tests.

## Mandatory Gate Sequence

### Gate 0: Fix Existing Tests (FIRST)

**BLOCKER: Cannot write new tests until existing tests pass.**

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
