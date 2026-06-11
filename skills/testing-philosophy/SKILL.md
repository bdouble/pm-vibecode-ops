---
name: testing-philosophy
description: Use when writing new tests, when existing tests are failing, when CI is red, or when about to add coverage. Also use when tempted to skip or delete a failing test to unblock a build, chase a coverage percentage, hard-code values to make tests pass, or assert how a function was called rather than what it produced.
---

# Testing Philosophy

Fix broken tests BEFORE writing new tests. Accurate running tests > high coverage with broken tests.

<!-- @protected reason="foundational principle from v4.5; SkillOpt §3.6 protects slow-state content from automated rewrites — removing the analog cost SpreadsheetBench 22pts" -->
**Violating the letter of this skill is violating the spirit of this skill.** Marking a test `.skip()` instead of fixing it, writing a test that always passes (`expect(result).toBeDefined()` as the only assertion), or asserting on the workaround behavior instead of the correct behavior — all bypass the gates. Spirit over letter, always.

### Slow/Meta Update Log
<!-- Append one bullet per audit pass capturing what stayed true across iterations. Initially empty. -->
<!-- @end-protected -->

## Mandatory Gate Sequence

**Gate 0 — Fix existing tests first.** Find and run the existing tests for affected modules. Fix every failure before writing new tests: API changed → update the test; bug found → fix the production code, not the test; wrong assumption → correct the test. It is unacceptable to remove, skip, or edit a failing test just to make it pass — a skipped test trains everyone to ignore failing tests.

**Gate 1 — Ground in the real API.** Read the implementation you're testing before mocking or asserting against it; never speculate about code you haven't opened. Test against actual method names, enums, and signatures.

**Gate 2 — Compilation.** Tests compile with zero type errors.

**Gate 3 — Execution.** Tests run green, mocks work, assertions are valid.

**Gate 4 — Coverage (secondary).** Target 70–80% focused on complex logic. Coverage is the last gate, never the first: 50% coverage with correct tests beats 90% with broken ones.

**No gaming the gates:** do not hard-code values or special-case solutions that only pass specific test inputs. If a test looks incorrect or the task infeasible, report that rather than working around it.

## Anti-Ballast Doctrine

Test mass is not confidence. At agent speed, test count grows at near-zero cost — and a suite can come to resist refactoring more than it catches bugs (field data: a 17K-test suite with a 5.4:1 mock-to-integration ratio whose healthiest stratum was its handful of static guards). Four rules keep the suite load-bearing:

1. **Assert behavior and contracts, not call shapes.** `toHaveBeenCalledTimes` / `toHaveBeenCalledWith` on internal collaborators pins implementation shape, not correctness — a smell unless the call IS the contract (e.g., "exactly one billing dispatch"). Default to asserting returns, persisted state, and emitted events.
2. **A handful of real-infrastructure integration tests outrank thousands of mocked unit tests for the data layer.** A mocked DB client cannot catch a constraint violation, a transaction-isolation bug, or migration drift.
3. **Static guards count as tests** — of the architecture. When the choice is "30 mocked tests re-asserting a convention per-surface" vs "one source-scanning guard test," choose the guard (see `production-code-standards` → `references/enforcement-ladder.md`).
4. **Watch the ratio.** Rising mock:integration ratio or call-count-assertion density means the suite is accreting ballast. `/entropy-audit` trends both.

## When TO Test

New functionality, complex business logic, security-sensitive operations, critical user paths.

## When NOT TO Test

Already well-covered code, trivial getters/pass-throughs, framework code, or purely to move a coverage number.

**Before each test:** Is this new? Can this fail? Will it catch a real bug?

## Asserting the Right Behavior

Never assert the workaround behavior instead of the correct behavior:

```javascript
// WRONG — pins the bug in place
expect(await service.failingOp()).toBeNull();

// RIGHT — asserts the contract
await expect(service.failingOp()).rejects.toThrow(ValidationError);
```

## Production vs Test Code

| Location | Mocks | Fixtures | Workarounds |
|----------|-------|----------|-------------|
| src/, lib/, app/ | NO | NO | NO |
| *.test.*, __tests__/ | YES | YES | N/A |

## Red Flags — STOP

- Skipping or deleting a failing test to unblock a build
- Mocking a function whose signature you haven't read
- `expect(result).toBeDefined()` as the only assertion
- Asserting call counts on internal collaborators instead of outcomes
- Hard-coding expected values so specific test inputs pass
- "Coverage is at X%, that's the goal"

## Rationalizations — STOP

| Excuse | Reality |
|--------|---------|
| "The existing broken tests are someone else's problem" | Gate 0: fix all broken tests before writing new ones. |
| "Coverage is what matters" | Accuracy is what matters. Correct tests at 50% beat broken tests at 90%. |
| "Skipping this test unblocks the build" | Skipping tests hides bugs. Fix the test or fix the code. |
| "More tests = more confidence" | Ballast resists refactoring more than it catches bugs. Assert contracts, prefer real infrastructure, count static guards. |
| "This test is too complex to write properly" | The difficulty is a signal — the code may need refactoring. |

## Additional Resources

- **`references/test-priority-guidelines.md`** — Decision matrix for what to test and what to skip
- **`examples/test-templates.md`** — Well-structured test file templates for common patterns

## Related Skills
- **production-code-standards**: Production code quality standards; the enforcement ladder (static guards)
- **verify-implementation**: Run and show test output before claiming "tests pass"
- **no-silent-deferrals**: `.skip()` on a failing test is a silent deferral
