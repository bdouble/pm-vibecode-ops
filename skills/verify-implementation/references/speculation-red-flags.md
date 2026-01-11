# Speculation Red Flags

Language patterns that signal unverified claims. When these phrases appear in your response, STOP and verify before proceeding.

## Why These Matter

These phrases feel natural and confident, but they indicate speculation rather than verification. Using them without evidence creates false certainty that non-technical stakeholders may act on. A PM hearing "tests should pass" might communicate "tests pass" to stakeholders, triggering deployments or closure of support tickets based on unverified assertions.

## Hedging Language

These phrases acknowledge uncertainty but often precede action anyway:

- "should work"
- "should pass"
- "should succeed"
- "probably works"
- "I think it's fixed"
- "I believe this resolves"
- "this ought to"
- "in theory"
- "assuming everything is correct"
- "if I'm not mistaken"
- "as far as I can tell"

**What to do instead**: Run the verification command and report actual results.

## Premature Certainty

These phrases claim completion without verification:

- "the fix is complete"
- "that should do it"
- "all done"
- "ready for review"
- "good to merge"
- "this resolves the issue"
- "the feature is working"
- "we're good to go"
- "everything looks fine"
- "no issues remaining"

**What to do instead**: Execute tests, builds, or demonstrations before claiming completion.

## Wishful Thinking

These phrases describe expected outcomes rather than observed results:

- "tests would pass"
- "the build would succeed"
- "there shouldn't be any issues"
- "I don't anticipate problems"
- "this will work"
- "that will fix it"
- "users will be able to"
- "the system will handle"

**What to do instead**: Change "would" and "will" to "did" by actually running the command.

## Deflection Phrases

These phrases avoid verification:

- "you can verify by..."
- "to test this, you would..."
- "the next step is to verify..."
- "someone should test..."
- "this needs to be verified..."

**What to do instead**: Perform the verification yourself and include the results.

## Conditional Completion

These phrases hide incomplete work behind conditions:

- "assuming the environment is set up correctly"
- "if the database is running"
- "once the dependencies are installed"
- "provided the config is correct"

**What to do instead**: Verify the conditions are met and show evidence of completion.

## The Test

Before any completion claim, ask:

1. Did I run a command? (not "could I run")
2. Did I see the output? (not "would it show")
3. Does the output support my claim? (not "should it show")
4. Am I including that evidence? (not "they can verify")

If any answer is "no," replace speculation with verification.

## Examples

**Speculative (bad)**:
> "I've updated the validation logic. The tests should pass now, and the build should succeed. Ready for review."

**Verified (good)**:
> "I've updated the validation logic. Running tests:
> ```
> npm test -- src/validation.test.ts
> PASS src/validation.test.ts (12 tests)
> ```
> Running build:
> ```
> npm run build
> Build completed successfully.
> ```
> All 12 tests pass and build succeeds. Ready for review."
