---
name: verify-implementation
description: |
  Requires evidence before any completion claim. Use when:
  - Checking status: "is it done", "is this done", "are we finished", "ready for review", "create PR", "commit"
  - Claiming completion: "ready to close", "mark as complete", "verify my work", "did I miss anything"
  - Shipping code: "ship it", "LGTM", "merge it", "push it", "deploy this", "good to go", "send it"
  - About to say: "tests pass", "build succeeds", "bug fixed", "feature complete", "done"
  - Speculating: "should work", "probably works", "I think it's fixed", "that should do it"
  - Marking tickets as complete or creating pull requests

  Blocks unverified completion claims. Every "done/fixed/passing" requires executed command output.
  Run tests and show output. Run build and show output. Demonstrate features working. No speculation.
---

# Verify Implementation

## The Evidence-First Principle

**Every status claim requires proof. No exceptions.**

"Done," "fixed," "passing," or "complete" are factual assertions requiring evidence. Without executing the verification command and observing output, the claim is speculation-not reporting.

Non-engineers depend on these claims. "Tests pass" might trigger deployment. "Bug is fixed" might close a customer support ticket. Unverified assertions cause real-world harm.

This discipline matters MORE as models get stronger, not less: fabricated completion claims are the one agentic failure mode that has worsened with capability — frontier models claim success on impossible tasks at double-digit rates, and agents systematically overestimate their own success. Before reporting any status, audit each claim against the actual tool results from this session — a claim without a tool result behind it is a fabrication.

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

## Avoiding Speculation

Phrases like "should work," "probably works," or "ready for review" without evidence signal speculation. When you catch yourself using hedging language, STOP and run the verification command instead.

**Red-flag phrases:**
- "Should work now"
- "I think it's fixed"
- "That should do it"
- "Probably works"
- "Ready for review" (without showing tests passed)

## When Verification Fails

Report problems accurately:

1. **State actual result**: "3 tests fail" not "mostly pass"
2. **Include failure output**: Show error messages
3. **Don't minimize**: A failing test is a failing test
4. **Propose next steps**: What needs fixing

A verified failure beats an unverified success claim.

## Independent Verification

When a delegated task or subagent reports success, that is a claim, not evidence — check the diff and run the verification yourself before relaying it. This is also why the workflow uses **separate, fresh-context reviewers** rather than asking the producing agent to critique itself: fresh-context verifiers outperform self-critique, and a reviewer who didn't write the code has no stake in its claimed status.

## Why This Matters

Product managers and stakeholders cannot independently verify technical claims. This skill ensures:

- **Deployment decisions** based on actual results
- **Timeline accuracy** reflects real state
- **Quality assurance** with forwardable evidence
- **Risk visibility** without masked problems

## The Accountability Standard

- **Traceable**: Claims link to evidence
- **Repeatable**: Others can verify same commands
- **Auditable**: Evidence persists in record
- **Trustworthy**: Claims match reality

Trust is earned through verifiable reporting-not confident assertions.

## Related Skills

- **testing-philosophy**: Gate sequence for test verification
- **production-code-standards**: Quality standards that must be verified

See `references/verification-checklist.md` for task-specific checklists and command templates.

---

## How to Use This Skill in Codex

Include this skill's content in your Codex prompt when:
- About to claim any work is complete
- Creating pull requests or marking tickets done
- Reporting status to stakeholders
- Reviewing completion claims from others

Copy the evidence requirement table to ensure every claim is backed by proof.
