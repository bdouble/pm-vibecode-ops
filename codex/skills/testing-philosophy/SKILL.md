---
name: testing-philosophy
description: |
  Enforces test accuracy over coverage quantity. Use when:
  - Writing tests: "write tests", "add tests", "test this", "improve coverage", "testing phase"
  - Fixing tests: "tests failing", "fix tests", "debug test", "test suite broken", "run tests"
  - CI issues: "CI failing", "pipeline broken", "build red", "tests red", "skip tests"
  - Asking about tests: "why is this test failing", "how do I test this", "what should I test"
  - Creating/editing: *.spec.ts, *.test.ts, *.spec.js, *.test.js, __tests__/*, *.test.py, *_test.go

  Enforces fixing ALL existing broken tests BEFORE writing new tests. Read actual API before mocking.
  Gate sequence: Fix existing -> Discover API -> Compile -> Execute -> Coverage (secondary).
  Anti-ballast: assert behavior not call shapes; never hard-code values or delete failing tests to go green.
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
- API changed -> Update test to match new API
- Bug found -> Fix production code, not the test
- Wrong assumption -> Update test to correct behavior

It is unacceptable to remove, skip, or edit a failing test just to make it pass — a skipped test trains everyone to ignore failing tests.

### Gate 1: Ground in the Real API (Before New Tests)

**NEVER assume. ALWAYS read the implementation you're testing before mocking or asserting against it. Test against actual method names, enums, and signatures:**

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

**No gaming the gates:** do not hard-code values or special-case solutions that only pass specific test inputs. If a test looks incorrect or the task infeasible, report that rather than working around it.

## Anti-Ballast Doctrine

Test mass is not confidence. At agent speed, test count grows at near-zero cost — and a suite can come to resist refactoring more than it catches bugs (field data: a 17K-test suite with a 5.4:1 mock-to-integration ratio whose healthiest stratum was its handful of static guards). Four rules keep the suite load-bearing:

1. **Assert behavior and contracts, not call shapes.** `toHaveBeenCalledTimes` / `toHaveBeenCalledWith` on internal collaborators pins implementation shape, not correctness — a smell unless the call IS the contract (e.g., "exactly one billing dispatch"). Default to asserting returns, persisted state, and emitted events.
2. **A handful of real-infrastructure integration tests outrank thousands of mocked unit tests for the data layer.** A mocked DB client cannot catch a constraint violation, a transaction-isolation bug, or migration drift.
3. **Static guards count as tests** — of the architecture. When the choice is "30 mocked tests re-asserting a convention per-surface" vs "one source-scanning guard test," choose the guard (see the production-code-standards skill, enforcement ladder).
4. **Watch the ratio.** Rising mock:integration ratio or call-count-assertion density means the suite is accreting ballast.

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

// RIGHT - Verified via reading implementation
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

## Rationalizations — STOP

| Excuse | Reality |
|--------|---------|
| "Skipping this test unblocks the build" | Skipping or deleting tests hides bugs. Fix the test or fix the code. |
| "Hard-coding this value makes the test pass" | A test passed by special-casing its inputs verifies nothing. Report the mismatch instead. |
| "More tests = more confidence" | Ballast resists refactoring more than it catches bugs. Assert contracts, prefer real infrastructure, count static guards. |
| "Coverage is what matters" | Accuracy is what matters. Correct tests at 50% beat broken tests at 90%. |

## Related Skills

- **production-code-standards**: Production code quality standards (test code has different rules)
- **verify-implementation**: Run and show test output before claiming "tests pass"

See `examples/test-templates.md` for well-structured test file templates and examples.

---

## How to Use This Skill in Codex

Include this skill's content in your Codex prompt when:
- Writing new tests for any code
- Fixing failing tests
- Reviewing test coverage strategy
- Discussing testing approach

Copy the gate sequence into your prompt to enforce the fix-first, accuracy-first approach.
