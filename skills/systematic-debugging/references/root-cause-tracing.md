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

## Adding Diagnostic Instrumentation

When you can't trace manually, add temporary logging at each boundary:

```
Before the problematic operation:
- Log the input values
- Log the current working directory / environment
- Log the call stack (new Error().stack or equivalent)
```

Use stderr or debug-level logging so it doesn't pollute output. Remove instrumentation after diagnosis.

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
