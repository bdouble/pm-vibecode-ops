# Root Cause Tracing

Technique for finding the true source of bugs that manifest deep in the call stack.

## Core Principle

Bugs often appear far from their origin. Your instinct is to fix where the error surfaces, but that's treating a symptom. **Trace backward through the call chain until you find the original trigger, then fix at the source.**

## When to Use

- Error happens deep in execution (not at the entry point)
- Stack trace shows a long call chain
- Unclear where invalid data originated
- Need to find which test or code path triggers the problem

## The Tracing Process

### 1. Observe the Symptom

Read the full error message and stack trace. Note exactly what failed and where.

### 2. Find the Immediate Cause

What line of code directly triggered the error? What were the inputs?

### 3. Trace One Level Up

What called that function? What values did it pass? Are those values correct?

### 4. Keep Tracing

Repeat step 3. At each level, ask: "Where did this value come from?"

### 5. Find the Original Trigger

You've found the root cause when you reach the point where the wrong value was first introduced — not where it eventually caused an error.

## Concrete Tracing Example

Consider this TypeScript application where an API endpoint crashes with `Cannot read property 'email' of undefined`:

### The Symptom

```typescript
// notification.service.ts — line 42
async function sendWelcomeEmail(user: User) {
  const recipient = user.email;  // TypeError: Cannot read property 'email' of undefined
  await emailClient.send(recipient, welcomeTemplate);
}
```

### Trace Level 1: What Called This?

```typescript
// onboarding.service.ts — line 28
async function completeOnboarding(userId: string) {
  const user = await userRepository.findById(userId);
  await sendWelcomeEmail(user);  // user is undefined here
}
```

The `user` variable is `undefined` because `findById` returned nothing. But why?

### Trace Level 2: Why Did findById Return Undefined?

```typescript
// user.repository.ts — line 15
async function findById(id: string): Promise<User | undefined> {
  return db.users.findOne({ id });  // returns undefined for non-existent IDs
}
```

The repository correctly returns `undefined` for missing records. The bug is not here.

### Trace Level 3: Where Did the userId Come From?

```typescript
// onboarding.controller.ts — line 10
app.post('/onboarding/complete', async (req, res) => {
  const userId = req.body.user_id;  // ROOT CAUSE: field is 'user_id', not 'userId'
  await completeOnboarding(userId);  // passes undefined
});
```

**Root cause found:** The controller reads `req.body.user_id` but the client sends `userId`. The field name mismatch produces `undefined`, which flows through `findById` (returns `undefined` for no match) to `sendWelcomeEmail` (crashes on `.email` access).

### The Fix (at the Source)

```typescript
// Fix at the controller — validate input at the entry point
app.post('/onboarding/complete', async (req, res) => {
  const userId = req.body.userId;  // correct field name
  if (!userId) {
    throw new BadRequestError('userId is required');  // fail-fast validation
  }
  await completeOnboarding(userId);
});
```

Fixing at the symptom point (null-checking in `sendWelcomeEmail`) would hide the real bug. The wrong field name would continue to cause `findById` to miss every lookup.

## 5 Whys Technique

The 5 Whys is a structured approach to root cause analysis. Ask "why" repeatedly until the systemic cause surfaces — typically within five iterations.

### Example: API Response Time Degradation

1. **Why is the API slow?** — The database query for user search takes 8 seconds.
2. **Why does the query take 8 seconds?** — It performs a full table scan on the `users` table (2M rows).
3. **Why is it doing a full table scan?** — The `WHERE` clause filters on `display_name`, which has no index.
4. **Why is there no index on `display_name`?** — The column was added in a migration three months ago, and the migration only added the column without an index.
5. **Why did the migration not include an index?** — The migration template used by the team does not include an index checklist, and the code review did not flag it.

**Root cause:** Missing index review step in migration process.
**Fix:** Add the index now. Update the migration template to include an index checklist for any new column used in `WHERE`, `ORDER BY`, or `JOIN` clauses.

Note: Five iterations is a guideline, not a rule. Stop when the answer reveals a systemic cause that, if fixed, prevents recurrence.

## git bisect for Regression Finding

When a feature worked previously and now fails, use `git bisect` to identify the exact commit that introduced the regression:

### The Workflow

```bash
# Start bisect session
git bisect start

# Mark current commit as bad (the bug exists here)
git bisect bad

# Mark a known good commit (the bug did not exist here)
git bisect good v2.3.0   # or a specific commit hash

# Git checks out a midpoint commit. Test it:
npm test   # or run the specific failing test

# Tell git the result
git bisect good   # if the test passes at this commit
git bisect bad    # if the test fails at this commit

# Repeat until git identifies the first bad commit:
# "abc1234 is the first bad commit"

# End bisect session
git bisect reset
```

### Automated bisect

For reproducible test failures, automate the entire process:

```bash
# Git runs the test command at each step automatically
git bisect start HEAD v2.3.0
git bisect run npm test -- --testPathPattern="user.service.test"
```

Git tests each midpoint automatically, reporting the first bad commit when done.

### When to Use git bisect

- Feature previously worked, now broken — and the cause is not obvious from recent commits
- Multiple developers committed to the branch — unclear whose change introduced the issue
- Error is subtle (wrong calculation, missing field) rather than a crash with a clear stack trace

## Adding Diagnostic Instrumentation

When the call chain is too complex to trace by reading code, add temporary instrumentation to narrow the search.

### Strategic Placement

Add logging at trust boundaries — where data crosses from one module, service, or layer to another:

```typescript
// At the entry point — log what arrives
app.post('/api/orders', async (req, res) => {
  console.error('[DEBUG entry] req.body:', JSON.stringify(req.body));
  // ...
});

// At the service boundary — log what the service receives
async function createOrder(input: CreateOrderInput) {
  console.error('[DEBUG service] input:', JSON.stringify(input));
  // ...
}

// At the repository boundary — log what hits the database
async function insertOrder(order: Order) {
  console.error('[DEBUG repo] order:', JSON.stringify(order));
  // ...
}
```

### Conditional Logging

For production-adjacent debugging, use environment-gated instrumentation:

```typescript
const DEBUG = process.env.DEBUG_TRACE === 'true';

function processPayment(payment: Payment) {
  if (DEBUG) {
    console.error('[TRACE] processPayment input:', {
      amount: payment.amount,
      currency: payment.currency,
      // Omit sensitive fields like card numbers
    });
  }
  // ...
}
```

### Rules for Diagnostic Instrumentation

1. Use `console.error` or `stderr` — never `console.log` or `stdout` — to avoid polluting application output
2. Prefix every debug line with `[DEBUG]` or `[TRACE]` for easy grep-and-remove
3. Never log sensitive data (passwords, tokens, PII) even temporarily
4. Remove ALL instrumentation after diagnosis — do not commit debug logging
5. If the same boundary needs permanent observability, replace debug logs with structured logger calls at appropriate log levels

## The Key Rule

**Never fix just where the error appears.** Trace back to find the original trigger.

A fix at the symptom point may silence the error but leaves the root cause active — it will surface again, possibly in a harder-to-diagnose form.

## Defense in Depth

After finding and fixing the root cause, consider adding validation at intermediate layers:

1. **Source layer**: Fix the original trigger
2. **Middle layers**: Add input validation where values cross boundaries
3. **Symptom layer**: Add a clear error message if invalid data still reaches this point

This ensures the same class of bug cannot recur through any path.

## Attribution

Adapted from [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent (`systematic-debugging/root-cause-tracing.md`). Licensed under MIT.
