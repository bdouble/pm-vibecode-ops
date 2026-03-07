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

**Violating the letter of this rule is violating the spirit of this rule.** Rephrasing, paraphrasing, or using different words to imply completion without evidence is the same violation. Spirit over letter, always.

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

## Agent Delegation Verification

When a subagent reports success, **that is not verification.** Agent success reports are claims, not evidence—subject to the same proof requirements as any other completion claim.

The required pattern:

```
Agent reports success → Check VCS diff → Verify changes independently → Report actual state
```

This applies to `/execute-ticket` orchestration and any Task tool delegation. The orchestrator must independently verify agent output before reporting completion.

## Rationalization Prevention

These are the excuses the model generates to skip verification. Recognizing them is the first defense:

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence is not evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter is not the compiler |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |
| "I already checked something similar" | Similar is not the same |
| "The change is trivial" | Trivial changes still break things |

### Red-Flag Phrases

When these phrases appear in your response, **STOP and verify**:

- **Hedging**: "should work", "probably works", "I think it's fixed", "I believe this resolves"
- **Premature certainty**: "that should do it", "all done", "good to merge", "we're good to go"
- **Wishful thinking**: "tests would pass", "there shouldn't be any issues", "this will work"
- **Deflection**: "you can verify by...", "someone should test...", "the next step is to verify..."
- **Satisfaction before evidence**: "Great!", "Perfect!", "Done!" before running verification

For the complete catalog, see `references/speculation-red-flags.md`.

## Avoiding Speculation

Phrases like "should work," "probably works," or "ready for review" without evidence signal speculation. When you catch yourself using hedging language, STOP and run the verification command instead.

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
- **systematic-debugging**: Root cause process before claiming "bug fixed"

## Extended Resources

- `references/verification-checklist.md` - Task-specific checklists and command templates
- `examples/evidence-formats.md` - Evidence formatting examples
- `references/speculation-red-flags.md` - Language patterns signaling unverified claims

## Attribution

The Rationalization Prevention table, "spirit over letter" principle, and Agent Delegation Verification pattern were adapted from [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent, specifically the `verification-before-completion` skill. Licensed under MIT.
