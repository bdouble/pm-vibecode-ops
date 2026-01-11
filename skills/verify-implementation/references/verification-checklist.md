# Verification Checklist Reference

Comprehensive checklists for verifying implementation before claiming completion. Use these to ensure every completion claim has supporting evidence.

---

## Quick Verification Checklists

Before marking ANY task complete, confirm each applicable item with actual command output:

### For Code Changes
- [ ] Code compiles without errors (show compiler output)
- [ ] Linting passes (show linter output)
- [ ] Existing tests still pass (show test output)
- [ ] New tests pass (show test output)
- [ ] Feature works as intended (demonstrate it)

### For Bug Fixes
- [ ] Original bug reproduced before fix (show reproduction)
- [ ] Bug no longer occurs after fix (show verification)
- [ ] No regression in related functionality (show tests)

### For New Features
- [ ] Feature works end-to-end (demonstrate full flow)
- [ ] Edge cases handled (show edge case handling)
- [ ] Error states handled gracefully (show error handling)

### Before Creating PRs
- [ ] All tests pass locally (show output)
- [ ] Build succeeds (show output)
- [ ] Code compiles (show output)
- [ ] Branch is up to date with base

### Before Marking Tickets Done
- [ ] Acceptance criteria verified (demonstrate each)
- [ ] Tests exist and pass (show output)
- [ ] Documentation updated if needed
- [ ] No known issues remaining

---

## Requirements Verification

Before marking any feature complete, verify against requirements:

- [ ] **Read the ticket**: Re-read acceptance criteria immediately before verification
- [ ] **Each criterion demonstrated**: Show evidence for EVERY acceptance criterion
- [ ] **Edge cases from ticket**: Test any edge cases mentioned in requirements
- [ ] **Stakeholder expectations**: Verify behavior matches what was discussed, not just written

### Example Verification
```
Ticket: "User can reset password via email"

Acceptance Criteria:
1. User receives email within 2 minutes [VERIFIED - email arrived in 45s]
2. Reset link expires after 24 hours [VERIFIED - tested with expired token]
3. Password must meet complexity requirements [VERIFIED - weak password rejected]
4. User is logged in after reset [VERIFIED - redirected to dashboard]
```

---

## Code Quality Verification

Execute these commands and include output:

```bash
# TypeScript compilation
npx tsc --noEmit
# Expected: No output (clean) or specific errors to address

# Linting
npm run lint
# Expected: No errors, warnings acceptable if intentional

# Type coverage (if configured)
npx type-coverage
# Expected: > 90% coverage
```

### Common Missed Items
- Unused imports left behind
- Console.log statements in production code
- Commented-out code not removed
- TODO comments added but not tracked
- Type assertions (`as any`) hiding real issues

---

## Test Verification

### Before Claiming "Tests Pass"
```bash
# Run full test suite
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file for the feature
npm test -- src/features/password-reset.test.ts
```

### Evidence Format
```
Running: npm test

PASS  src/auth/password-reset.test.ts (12 tests)
PASS  src/auth/login.test.ts (8 tests)
FAIL  src/auth/session.test.ts (1 failed)
  - Session timeout test timing out

Test Suites: 1 failed, 2 passed, 3 total
Tests:       1 failed, 19 passed, 20 total
```

If ANY tests fail, you cannot claim "tests pass" - report actual state.

---

## Documentation Verification

- [ ] API documentation updated for new endpoints
- [ ] README updated if setup steps changed
- [ ] Inline comments for complex business logic
- [ ] No TODO placeholders left incomplete

---

## Pre-Closure Final Checks

### For Pull Requests
```bash
# Verify branch is current
git fetch origin main
git log origin/main..HEAD --oneline
# Shows commits that will be in PR

# Verify no merge conflicts
git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main
# No output = no conflicts

# Run CI checks locally
npm run build && npm test && npm run lint
```

### For Ticket Closure
- [ ] PR merged (not just approved)
- [ ] Deployed to staging (not just merged)
- [ ] Smoke test in staging environment passed
- [ ] No blocking issues in comments

---

## Things Commonly Missed

### 1. Environment-Specific Behavior
- Works on Mac, fails on Linux
- Works with Node 18, fails on Node 20
- Works with empty database, fails with existing data

### 2. Concurrent Access
- Feature works for one user, breaks with simultaneous users
- Race conditions not tested

### 3. Error States
- Happy path works, error handling untested
- API returns 500 instead of proper error code
- Error messages expose internal details

### 4. Data Edge Cases
- Empty string vs null vs undefined
- Very long strings (> 10,000 chars)
- Unicode and emoji handling
- Timezone differences

### 5. Permission Boundaries
- Works for admin, fails for regular user
- API allows unauthorized access
- CORS not configured correctly

---

## Verification Command Templates

### API Endpoint Verification
```bash
# Test endpoint directly
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  -w "\n%{http_code}"

# Expected: 201 with user object, not 500
```

### Database Change Verification
```bash
# Verify migration ran
npx prisma migrate status

# Verify data integrity
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM users WHERE email IS NULL"
# Expected: 0 rows
```

### Build Verification
```bash
# Full production build
npm run build

# Verify output exists
ls -la dist/
# Expected: Non-empty directory with expected files
```

---

## The Verification Standard

Every claim requires this chain:
1. **Command executed** - Not "would work" but "did work"
2. **Output observed** - Actually read the result
3. **Output included** - Share the evidence
4. **Claim matches output** - Honest interpretation

A verified failure is more valuable than an unverified success claim.
