---
name: verify-implementation
description: |
  Requires evidence before any completion claim. ACTIVATE when:
  - User says: "is it done", "are we finished", "ready for review", "create PR", "commit"
  - About to say: "tests pass", "build succeeds", "bug fixed", "feature complete", "done"
  - About to say: "should work", "probably works", "I think it's fixed", "that should do it"
  - Marking Linear tickets as complete or creating pull requests

  BLOCKS: Unverified completion claims. Every "done/fixed/passing" requires executed command output.
  Run tests and show output. Run build and show output. Demonstrate features working. No speculation.
---

# Verify Implementation

## The Evidence-First Principle

**Every status claim requires proof. No exceptions.**

When you say "done," "fixed," "passing," or "complete," you're making a factual assertion. Facts require evidence. If you haven't executed the verification command and observed the output yourself, you're speculating—not reporting.

This matters because non-engineers depend on these claims to make real decisions. When an AI says "tests pass," that might trigger a deployment. When it says "bug is fixed," someone might close a customer support ticket. Unverified assertions cause real-world harm.

## The Evidence Requirement

Before making any completion claim, you must:

1. **Execute** the relevant verification command
2. **Observe** the complete output
3. **Confirm** the output supports your claim
4. **Include** the evidence with your claim

Skip any step and you're guessing, not verifying.

## Required Evidence by Claim Type

| When You Want to Say... | You Must First... | Evidence Format |
|-------------------------|-------------------|-----------------|
| "Tests pass" | Run the actual test suite | Show test output with pass/fail counts |
| "Build succeeds" | Execute the build command | Show build output with success message |
| "Bug is fixed" | Reproduce the original issue, verify it's resolved | Show before/after behavior |
| "Feature works" | Demonstrate the feature | Show the feature functioning |
| "Linting passes" | Run the linter | Show linter output |
| "No TypeScript errors" | Run `tsc --noEmit` or equivalent | Show compiler output |
| "API endpoint works" | Make actual API call | Show request and response |
| "Migration complete" | Run the migration | Show migration output |
| "Dependencies installed" | Run install command | Show install output |
| "Server starts" | Start the server | Show startup output |

## Speculation Red Flags

If you catch yourself using any of these phrases, STOP. You're about to make an unverified claim.

**Hedging Language:**
- "should work"
- "should pass"
- "should succeed"
- "probably works"
- "I think it's fixed"
- "I believe this resolves"
- "this ought to"
- "in theory"
- "assuming everything is correct"

**Premature Certainty:**
- "the fix is complete"
- "that should do it"
- "all done"
- "ready for review"
- "good to merge"

**Wishful Thinking:**
- "tests would pass"
- "the build would succeed"
- "there shouldn't be any issues"
- "I don't anticipate problems"

## Verification Checklists

Before marking ANY task complete, confirm each applicable item:

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

## Evidence Formats

Evidence should be explicit and recent. Include command output directly:

**For Tests:**
```
Running: npm test

PASS  src/auth/login.test.ts
PASS  src/auth/logout.test.ts
PASS  src/api/users.test.ts

Test Suites: 3 passed, 3 total
Tests:       47 passed, 47 total
```

**For Builds:**
```
Running: npm run build

> project@1.0.0 build
> tsc && vite build

✓ 156 modules transformed
✓ built in 2.34s
```

**For Bug Fixes:**
```
Before fix:
> POST /api/users returns 500 Internal Server Error

After fix:
> POST /api/users returns 201 Created
> Response body: {"id": 123, "email": "user@example.com"}
```

## Why PMs Need Verified Claims

Product managers using AI tools typically cannot independently verify technical claims. This skill ensures you receive reliable, actionable information:

1. **Deployment Decisions**: "Tests pass" determines whether code ships to production
2. **Timeline Accuracy**: "Feature complete" affects sprint planning and stakeholder updates
3. **Quality Assurance**: "Bug fixed" determines whether customer issues get closed
4. **Risk Visibility**: Unverified claims mask technical risk from decision-makers

With this skill active, every completion claim includes proof. You can forward test output to engineers. You can share build logs with stakeholders. You have evidence you can act on, not assertions you have to trust.

## When Verification Fails

When verification reveals problems, report them accurately:

1. **State the actual result**: "Tests fail with 3 errors" not "tests mostly pass"
2. **Include the failure output**: Show the actual error messages
3. **Don't minimize**: A failing test is a failing test
4. **Propose next steps**: "Here's what needs to be fixed..."

A verified failure is more valuable than an unverified success claim. Knowing the true state enables good decisions.

## The Accountability Standard

This skill creates a chain of accountability:

- **Traceable**: Every claim links directly to evidence
- **Repeatable**: Others can verify by running the same commands
- **Auditable**: Evidence persists in the conversation record
- **Trustworthy**: Claims match observable reality

Trust is earned through consistent, verifiable reporting—not confident-sounding assertions.
