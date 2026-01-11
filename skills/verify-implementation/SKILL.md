---
name: verify-implementation
description: |
  This skill should be used when requiring evidence before any completion claim. Activate when:
  - User says: "is it done", "is this done", "are we finished", "ready for review", "create PR", "commit"
  - User says: "ready to close", "mark as complete", "verify my work", "did I miss anything"
  - User says: "ship it", "LGTM", "merge it", "push it", "deploy this", "good to go", "send it"
  - About to say: "tests pass", "build succeeds", "bug fixed", "feature complete", "done"
  - About to say: "should work", "probably works", "I think it's fixed", "that should do it"
  - Marking Linear tickets as complete or creating pull requests

  Blocks unverified completion claims. Every "done/fixed/passing" requires executed command output.
  Run tests and show output. Run build and show output. Demonstrate features working. No speculation.
---

# Verify Implementation

## The Evidence-First Principle

**Every status claim requires proof. No exceptions.**

"Done," "fixed," "passing," or "complete" are factual assertions requiring evidence. Without executing the verification command and observing output, the claim is speculation—not reporting.

Non-engineers depend on these claims. "Tests pass" might trigger deployment. "Bug is fixed" might close a customer support ticket. Unverified assertions cause real-world harm.

## The Evidence Requirement

Before any completion claim:

1. **Execute** the verification command
2. **Observe** complete output
3. **Confirm** output supports the claim
4. **Include** evidence with the claim

Skipping any step means guessing, not verifying.

## Required Evidence by Claim Type

| Claim | Required Action | Evidence |
|-------|-----------------|----------|
| "Tests pass" | Run test suite | Pass/fail counts |
| "Build succeeds" | Run build | Success message |
| "Bug is fixed" | Reproduce, then verify | Before/after behavior |
| "Feature works" | Demonstrate it | Feature functioning |
| "Linting passes" | Run linter | Linter output |
| "No TypeScript errors" | Run `tsc --noEmit` | Compiler output |
| "API works" | Make actual call | Request/response |

For formatting examples, see `examples/evidence-formats.md`.

## Avoiding Speculation

Phrases like "should work," "probably works," or "ready for review" without evidence signal speculation. When you catch yourself using hedging language, STOP and run the verification command instead.

For red-flag phrases, see `references/speculation-red-flags.md`.

## When Verification Fails

Report problems accurately:

1. **State actual result**: "3 tests fail" not "mostly pass"
2. **Include failure output**: Show error messages
3. **Don't minimize**: A failing test is a failing test
4. **Propose next steps**: What needs fixing

A verified failure beats an unverified success claim.

## Why This Matters for PMs

Product managers cannot independently verify technical claims. This skill ensures:

- **Deployment decisions** based on actual results
- **Timeline accuracy** reflects real state
- **Quality assurance** with forwardable evidence
- **Risk visibility** without masked problems

## The Accountability Standard

- **Traceable**: Claims link to evidence
- **Repeatable**: Others can verify same commands
- **Auditable**: Evidence persists in record
- **Trustworthy**: Claims match reality

Trust is earned through verifiable reporting—not confident assertions.

## Related Skills
- **testing-philosophy**: Gate sequence for test verification
- **production-code-standards**: Quality standards that must be verified

## Extended Resources

- `references/verification-checklist.md` - Task-specific checklists and command templates
- `examples/evidence-formats.md` - Evidence formatting examples
- `references/speculation-red-flags.md` - Language patterns signaling unverified claims
