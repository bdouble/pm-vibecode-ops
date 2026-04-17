---
name: verify-implementation
description: Use when about to write "should work", "probably passes", "tests pass", "all done", "looks good", "Great!", or "Perfect!" — or any claim of completion. Also use when a subagent reports success and you are about to relay that, when about to commit/PR/deploy/merge, or when user asks "is it done", "can we ship", or "mark as complete".
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

## Agent Self-Assessment Triggers

This skill MUST also activate when an agent is about to set a completion status in its report:

| Status Being Set | Activation Required |
|-----------------|---------------------|
| `Status: COMPLETE` | Agent must produce evidence for each major claim before setting this status |
| `Review Status: APPROVED` | Reviewer must show verification command output for each AC before approving |
| `Status: PASS` (security) | Security checks must be run against actual code, not just read |

### Evidence Requirements by Phase

| Phase | Evidence Required |
|-------|-------------------|
| Implementation | `git diff` shows files listed in AC; `grep` confirms structural AC (imports, exports, patterns) |
| Code Review | Verification commands for each AC in requirements checklist (not just file:line citations) |
| Security | OWASP checks run against actual code paths, not just code reading |
| Testing | Test execution output with pass/fail counts (not just "tests pass" claim) |

**The orchestrator will independently verify agent claims** (see execute-ticket Step 3.4.2), but agents should self-verify before reporting completion to reduce rework cycles.

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

## Banned Language

NEVER claim completion using these words or phrases:
- "should work", "should be fixed", "should pass"
- "probably works", "probably fixed"
- "seems to", "appears to", "looks like it works"
- "I believe", "I think it's fixed"
- "likely resolved", "most likely working"
- "Great!", "Perfect!", "Done!", "All good!"

Every completion claim MUST be accompanied by fresh command output executed in THIS response. If the verification command is not visible in your current response, you have not verified.

## Subagent Verification Protocol

When a subagent or delegated task reports success, NEVER trust the self-report. Instead:

1. **Check the diff**: Run `git diff` or `git log` to see what actually changed
2. **Run tests independently**: Execute the test suite yourself, don't rely on reported results
3. **Verify the claim**: Compare what was claimed against what you observe
4. **Report observed state**: Tell the user what YOU verified, not what was reported to you

"The agent said tests pass" is NOT evidence. "I ran `npm test` and got 0 failures (output below)" IS evidence.

## Regression Test Verification

When claiming a bug is fixed with a regression test, verify the full red-green cycle:

1. **Write the test** that reproduces the bug
2. **Run it** -- confirm it PASSES (proves the fix works)
3. **Revert the fix** -- temporarily undo your code change
4. **Run it again** -- confirm it FAILS (proves the test actually catches the bug)
5. **Restore the fix** -- re-apply your code change
6. **Run it again** -- confirm it PASSES again

A regression test that never fails is not testing anything. The revert step proves the test has value.

## Rationalizations -- STOP

If you think any of these, you are about to make an unverified claim.

| Excuse | Reality |
|--------|---------|
| "It should work now" | "Should" is not evidence. Run the command and show output. |
| "I'm confident the fix is correct" | Confidence is not verification. Execute and prove it. |
| "The agent said it passed" | Never trust subagent self-reports. Check the diff and run tests independently. |
| "I just ran it a moment ago" | If it's not in THIS response with fresh output, it doesn't count. |
| "It's a trivial change, no need to verify" | Trivial changes break production. Verify everything. |
| "Partial verification is enough" | Run the full test suite. Partial checks miss regressions. |
| "The linter passed, so it works" | Linting checks syntax, not behavior. Run the actual tests. |

## Related Skills
- **testing-philosophy**: Gate sequence for test verification
- **production-code-standards**: Quality standards that must be verified
- **systematic-debugging**: Root cause process before claiming "bug fixed"

## Extended Resources

- `references/verification-checklist.md` - Task-specific checklists and command templates
- `examples/evidence-formats.md` - Evidence formatting examples
- `references/speculation-red-flags.md` - Language patterns signaling unverified claims

## Gotchas

Running list of edge cases encountered. Append new entries as they come up.

- _(none logged yet — add entries as they come up during use)_

## Attribution

The Rationalization Prevention table, "spirit over letter" principle, and Agent Delegation Verification pattern were adapted from [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent, specifically the `verification-before-completion` skill. Licensed under MIT.
