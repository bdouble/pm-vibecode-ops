---
name: model-aware-behavior
description: Use when about to call Edit, MultiEdit, or Write on a file not yet Read in this session. Also use when proposing a change based on memory of a prior session, when about to modify a file discovered via Grep without reading it first, when tempted to guess a function signature or import path, or when user says "modify", "change", "update", "refactor", or "implement".
---

# Model-Aware Behavior

This skill enforces disciplined development practices that ensure code quality and efficiency across all Claude models.

## Pre-Change Verification

Complete this numbered procedure before proposing or making any code changes. No step is optional.

### 1. Read All Target Files

Use the **Read** tool to load every file that will be modified. Never edit a file that has not been read in the current session.

```
For each file to modify:
  Read(file_path) → confirm contents loaded
  Note: existing patterns, naming conventions, import style
```

### 2. Search for Existing Implementations

Use **Grep** to find whether the functionality already exists elsewhere in the codebase:

```
Grep(pattern: "functionName|className|featureName", path: "src/")
```

If a match is found, use the existing implementation rather than creating a duplicate.

### 3. Discover Related Files

Use **Glob** to identify files that follow the same pattern or might be affected by the change:

```
Glob(pattern: "src/**/*.service.ts")  → find all services
Glob(pattern: "src/**/*.test.ts")     → find related tests
Glob(pattern: "**/*user*")            → find related modules
```

### 4. Understand Existing Patterns

Before implementing, identify:
- How similar features are structured in the codebase
- What naming conventions are in use (camelCase, kebab-case, etc.)
- What import patterns are followed (relative vs absolute, barrel exports)
- What error handling patterns exist (custom errors, Result types, try/catch)

### 5. Confirm Readiness

Verify all files to be modified have been read. Confirm understanding of existing patterns. Only then propose changes.

**Verification statement** (mental check, not output): "I have read every file I plan to modify. I have searched for existing implementations. I understand the patterns in use."

## Scope Control

**Do ONLY what is requested:**

- Make only requested changes
- No unrequested improvements, refactoring, or features
- No helpers/utilities for one-time operations
- No error handling for impossible scenarios
- No design for hypothetical future requirements
- Reuse existing abstractions

**Red flags to avoid:**
- "While I'm here, I'll also..."
- "It would be better to also..."
- "For future extensibility..."
- Adding abstractions for single-use code

## Scope Decision Framework

When tempted to expand scope, use this quick decision framework. If thinking X, check Y:

| If Thinking... | Check This | Decision |
|----------------|------------|----------|
| "This function should also handle edge case Z" | Was edge case Z mentioned in the request? | If no, do not add it. |
| "I should refactor this while I'm here" | Did the user ask for a refactor? | If no, make the requested change only. Note the refactor opportunity in your response if significant. |
| "This needs better error handling" | Does the existing code handle errors this way? Is the error handling broken? | If the current pattern works and is consistent with the codebase, leave it. Only fix if the request specifically involves error handling. |
| "I'll add a utility function for reuse" | Will this utility be used more than once right now? | If it serves only the current change, inline the logic. Do not create abstractions for single-use code. |
| "The tests should be updated too" | Did the user ask for test changes? Did the change break existing tests? | If tests still pass and the user did not ask, do not modify them. If tests break, fix only the broken assertions. |
| "This file needs formatting cleanup" | Is formatting the requested task? | If no, leave formatting as-is. Style changes pollute diffs and obscure real changes. |

### The Three-Question Gate

Before making ANY change beyond the explicit request, answer these three questions:

1. **Was this specific change requested?** — If no, stop.
2. **Is this required to complete the request?** — If no, stop.
3. **Is this the smallest change that works?** — If no, reduce scope.

If any answer is "no," do not make the change. Mention it in the response only if it represents a significant issue (security vulnerability, data loss risk).

See `references/scope-creep-patterns.md` for the full catalog of scope creep anti-patterns with before/after examples.

**Example - Scope discipline:**
```
User: "Fix the typo in the button label"

WRONG:
- Fix typo
- Refactor button component (not requested)
- Add aria-label (not requested)
- Update tests (not requested)

RIGHT:
- Fix typo
- Done
```

## Tool Parallelization Patterns

**Parallelize when possible:**

Call independent tools in parallel (single message). Serialize only when one call depends on another's result.

### Parallel Operations (No Dependencies)

These operations have no data dependency between them — issue all calls in a single message:

```
Reading multiple unrelated files:
  Read("src/auth/login.ts") + Read("src/auth/register.ts") + Read("src/auth/types.ts")

Searching with different strategies simultaneously:
  Grep("validateEmail", path: "src/") + Glob("src/**/*.validator.ts")

Checking git state and file state:
  Bash("git status") + Bash("git log --oneline -5") + Read("package.json")

Reading source and its test file:
  Read("src/services/user.service.ts") + Read("src/services/__tests__/user.service.test.ts")
```

### Sequential Operations (Data Dependencies)

These require results from one operation before the next can proceed:

```
Reading then editing (Edit depends on Read output):
  Read("src/config.ts") → then → Edit("src/config.ts", old_string, new_string)

Creating directory then writing file:
  Bash("mkdir -p src/utils") → then → Write("src/utils/helpers.ts", content)

Searching then reading results:
  Grep("TODO", path: "src/") → then → Read(each matching file)

Checking branch then committing:
  Bash("git branch --show-current") → then → Bash("git commit ...")
```

### Mixed Operations (Partial Dependencies)

When some calls are independent and others depend on results, issue the independent calls first:

```
Step 1 (parallel): Read("src/a.ts") + Read("src/b.ts") + Grep("pattern", path: "src/")
Step 2 (sequential): Edit("src/a.ts", ...) based on what was read
Step 3 (sequential): Edit("src/b.ts", ...) based on what was read
```

Note: Steps 2 and 3 can also run in parallel if the edits are in different files and neither depends on the other's result.

### Decision Rule

When uncertain whether to parallelize or serialize, ask: "Does call B need the output of call A to determine its parameters?" If yes, serialize. If no, parallelize. When in doubt, parallelize — the worst case is a wasted call that can be re-issued with corrected parameters.

## Common Mistakes

These patterns indicate the skill is not being applied correctly:

| Mistake | Correction |
|---------|------------|
| Proposing changes to a file never read in this session | Read the file first, then propose |
| Creating a new utility when an existing one was not searched for | Grep for existing implementations before creating |
| Making three separate Bash calls that could run in parallel | Combine independent calls into a single message |
| Editing a file, then reading it to check the result | Read first, edit second — Edit tool shows the result |
| Adding "improvements" the user did not request | Apply the three-question gate above |

## Rationalizations -- STOP

If you think any of these, you are about to speculate or overcorrect.

| Excuse | Reality |
|--------|---------|
| "I can infer what this file does from context" | Read it. Inference is speculation. |
| "This is a small change, I don't need to read the whole file" | Small changes in unread files cause large regressions. Read first. |
| "While I'm here, I should also fix this other thing" | Do ONLY what was requested. Create a ticket for the other thing. |
| "This code could be improved" | Unrequested improvements are scope creep. Stay focused. |
| "I've seen similar patterns before" | This codebase may differ. Read the actual implementation. |
| "Reading all these files will take too long" | Reading takes seconds. Fixing speculative mistakes takes hours. |

## Additional Resources

- **`references/scope-creep-patterns.md`** — Detailed catalog of scope creep anti-patterns with examples and detection strategies
