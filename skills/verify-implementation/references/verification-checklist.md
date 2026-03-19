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

---

## For UI/Frontend Changes

### Accessibility Checklist

Before claiming any UI change is complete, verify:

- [ ] **Keyboard navigation**: All interactive elements reachable via Tab, activatable via Enter/Space
- [ ] **Screen reader tested**: Content announced correctly (use VoiceOver on Mac, NVDA on Windows)
- [ ] **Color contrast**: Text meets WCAG 2.2 AA minimum (4.5:1 for normal text, 3:1 for large text)
- [ ] **Focus indicators**: Visible focus ring on all interactive elements (no `outline: none` without replacement)
- [ ] **Alt text**: All meaningful images have descriptive `alt` attributes; decorative images use `alt=""`
- [ ] **Form labels**: Every form input has an associated `<label>` element or `aria-label`
- [ ] **Heading hierarchy**: Headings follow logical order (h1 > h2 > h3), no skipped levels
- [ ] **ARIA landmarks**: Page has appropriate `main`, `nav`, `banner`, `contentinfo` regions

### Visual Regression

- [ ] Compare before/after screenshots of affected components
- [ ] Verify no unintended layout shifts in surrounding elements
- [ ] Check both light and dark mode if applicable

### Responsive Verification

Test at these minimum breakpoints:
- [ ] **Desktop**: 1440px width
- [ ] **Tablet**: 768px width
- [ ] **Mobile**: 375px width

```bash
# Quick accessibility audit with axe-core (if configured)
npx axe-cli http://localhost:3000/affected-page

# Lighthouse accessibility score
npx lighthouse http://localhost:3000/affected-page --only-categories=accessibility --output=json
```

---

## Performance Verification

For any change that affects load times, rendering, or data processing:

### Before/After Benchmarking

- [ ] Capture baseline metrics before the change
- [ ] Measure the same metrics after the change
- [ ] Document the comparison with actual numbers

### Core Web Vitals

| Metric | Target | How to Measure |
|--------|--------|----------------|
| LCP (Largest Contentful Paint) | < 2.0s | Lighthouse, Web Vitals library |
| INP (Interaction to Next Paint) | < 200ms | Chrome DevTools, Web Vitals library |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse, Web Vitals library |

### Bundle Size

- [ ] Check for unexpected bundle size increases
- [ ] Verify no large dependencies added unnecessarily

```bash
# Check bundle size impact (if size-limit configured)
npx size-limit

# Analyze bundle composition
npx webpack-bundle-analyzer dist/stats.json
# or for Vite projects
npx vite-bundle-visualizer
```

### Database Query Performance

- [ ] Check for N+1 query patterns (use query logging in development)
- [ ] Verify indexes exist for new query patterns
- [ ] Confirm query execution time is acceptable under expected load

```bash
# Check for missing indexes (PostgreSQL)
# Run in development database
psql -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE tablename = 'affected_table';"

# Enable query logging to detect N+1 patterns
# Add to development config: logging: true (TypeORM) or log: ['query'] (Prisma)
```

---

## Pre-PR Security Scan

Before opening a pull request, run these checks:

### Dependency Vulnerabilities

```bash
# Check for known vulnerabilities in dependencies
npm audit

# Address critical and high findings before merging
npm audit --audit-level=high
```

- [ ] No critical or high severity vulnerabilities in production dependencies
- [ ] Any accepted risks documented with justification

### Hardcoded Secrets

```bash
# Search for potential hardcoded secrets in staged changes
git diff --cached | grep -iE "(api[_-]?key|secret|token|password|credential).*=.*['\"]"

# Check for common secret patterns
git diff --cached | grep -iE "(sk_live|pk_live|ghp_|gho_|AKIA[A-Z0-9])"
```

- [ ] No API keys, tokens, or passwords in source code
- [ ] Secrets stored in environment variables or secret manager
- [ ] No `.env` files in staged changes

### Staged File Review

```bash
# Verify no sensitive files are staged
git diff --cached --name-only | grep -iE "(\.env|credentials|secret|\.pem|\.key)"

# Should return empty - if not, unstage those files
```

### Static Analysis

- [ ] Run SAST scanner if configured (Semgrep, ESLint security plugin, or CodeQL)
- [ ] Address any high-severity findings before PR

```bash
# Semgrep (if configured)
semgrep --config=auto src/

# ESLint security plugin (if configured)
npx eslint --rule '{"no-eval": "error", "no-implied-eval": "error"}' src/
```
