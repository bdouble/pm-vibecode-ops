---
name: model-aware-behavior
description: |
  Enforces read-before-write discipline and prevents scope creep. ACTIVATE when:
  - User says: "modify", "change", "update", "edit", "refactor", "fix", "implement"
  - User says: "explore codebase", "understand this code", "how does this work"
  - About to use: Edit, Write, MultiEdit tools on any code file
  - Proposing changes to files not yet read in this session

  ENFORCES: Read ALL files before proposing changes. Never speculate about unread code.
  Do ONLY what is requested - no "while I'm here" improvements, no gold-plating, no scope creep.
  Parallelize independent tool calls; serialize dependent ones.
---

# Model-Aware Behavior

This skill enforces disciplined development practices that ensure code quality and efficiency across all Claude models.

## Code Exploration (Before Any Changes)

**MANDATORY before proposing any code changes:**

1. Read all relevant files before proposing changes
2. Never speculate about code not yet inspected
3. If user references a file path, read it before responding
4. Search for existing implementations before creating new ones
5. Understand existing patterns before implementing features

**Verification checklist:**
- Have I read the files I'm about to modify?
- Do I understand the existing patterns in this codebase?
- Have I checked for similar existing implementations?

**Example - Correct approach:**
```
User: "Add email validation to the signup form"

WRONG: Immediately write validation code
RIGHT:
1. Read signup form: src/components/SignupForm.tsx
2. Search for existing validation: grep -r "validation\|validate" src/
3. Find existing pattern: src/utils/validators.ts
4. Use existing validateEmail() from validators.ts
```

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

**Example - Scope discipline:**
```
User: "Fix the typo in the button label"

WRONG:
- Fix typo ✓
- Refactor button component (not requested)
- Add aria-label (not requested)
- Update tests (not requested)

RIGHT:
- Fix typo ✓
- Done
```

## Word Substitutions

When extended thinking is not enabled, replace "think":

| Replace | With |
|---------|------|
| think about | consider |
| think through | evaluate |
| I think | I believe |
| thinking | reasoning |

## Tool Efficiency

**Parallelize when possible:**

Call independent tools in parallel (single message). Serialize only when one call depends on another's result.

**Examples:**
- Reading multiple unrelated files → parallel
- Searching with Grep AND Glob → parallel
- Reading file THEN editing it → sequential (Edit depends on Read)
- Creating directory THEN writing file inside → sequential
