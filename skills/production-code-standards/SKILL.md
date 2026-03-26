---
name: production-code-standards
description: Enforces production-grade code quality standards. Use when writing, editing, or reviewing production code in src/, lib/, app/, services/, or similar directories, or when user mentions "implement", "write code", "add feature", "fix bug", "quick fix", "workaround", or "review PR".
---

# Production Code Standards

All production code must be permanent, complete, and production-grade.

## Enforcement Workflow

1. **Before writing**: Plan the complete, permanent solution
2. **While writing**: Check against prohibited patterns
3. **When blocked**: STOP, document, create ticket - never workaround
4. **Before committing**: Verify no prohibited patterns exist

## Prohibited Patterns

| Pattern | Why Blocked |
|---------|-------------|
| `value \|\| default` | Hides errors silently |
| `TODO/FIXME/HACK` | Temporary code in production |
| `catch (e) { }` | Swallows errors |
| Mock services in src/ | Test artifacts in production |
| `setTimeout` for race conditions | Workaround, not fix |

## Required Patterns

| Pattern | Purpose |
|---------|---------|
| Fail-fast validation | Errors caught at entry |
| Typed custom errors | Debuggable, catchable |
| Error propagation | Let errors bubble to handlers |
| Repository pattern | Data access abstraction |

## TypeScript-Specific Anti-Patterns

These patterns are prohibited in production TypeScript code. Each introduces a category of bugs that the type system is designed to prevent:

### Type Safety Violations

| Pattern | Why Blocked | Required Alternative |
|---------|-------------|---------------------|
| `any` type | Disables type checking entirely, defeats purpose of TypeScript | Use `unknown` and narrow with type guards |
| Excessive `as` assertions | Overrides compiler safety; hides type mismatches | Fix the underlying type or use a type guard |
| Unvalidated `JSON.parse()` | Returns `any`; downstream code assumes shape without verification | Parse with Zod schema: `schema.parse(JSON.parse(raw))` |
| Non-null assertion `!` on uncertain values | Asserts non-null without evidence; crashes at runtime | Use explicit null check or optional chaining |

### Async Anti-Patterns

| Pattern | Why Blocked | Required Alternative |
|---------|-------------|---------------------|
| Floating promises (async call without `await`) | Errors silently swallowed; execution order unpredictable | Always `await` or explicitly handle with `.catch()` |
| `async` function without `try/catch` at boundary | Unhandled rejection crashes process in Node.js | Wrap in try/catch at service boundaries; let errors propagate through middleware |
| `Promise.all` without error handling | One rejection loses all results | Use `Promise.allSettled` when partial results are acceptable |

### Production Hygiene

| Pattern | Why Blocked | Required Alternative |
|---------|-------------|---------------------|
| `console.log` in production code | Pollutes output, may leak sensitive data, not structured | Use structured logger (e.g., pino, winston) with log levels |
| `console.error` for error handling | Not a substitute for proper error propagation | Throw typed error or pass to error handler |
| `debugger` statement | Halts execution in production | Remove entirely |

## Automated Enforcement

Reference these ESLint rules to catch TypeScript anti-patterns automatically. When setting up a project or reviewing ESLint configuration, verify these rules are enabled:

| Rule | What It Catches |
|------|-----------------|
| `@typescript-eslint/no-explicit-any` | Blocks `any` type usage |
| `@typescript-eslint/no-floating-promises` | Catches unawaited async calls |
| `@typescript-eslint/no-non-null-assertion` | Blocks `!` operator on uncertain values |
| `@typescript-eslint/no-unsafe-assignment` | Blocks assigning `any` to typed variables |
| `@typescript-eslint/no-unsafe-member-access` | Blocks accessing properties on `any` |
| `no-console` | Blocks console.log/error/warn in production |
| `no-debugger` | Blocks debugger statements |

When these rules are not present in a project's ESLint config, flag it during code review. The rules catch the most common TypeScript anti-patterns at lint time rather than at runtime.

### Recommended ESLint Configuration

For projects using `@typescript-eslint`, verify the following base configuration exists:

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "no-console": ["error", { "allow": ["warn"] }],
    "no-debugger": "error"
  }
}
```

If the project lacks this configuration, note it as a code review finding. Do not add it unilaterally — configuration changes affect the entire team and require discussion.

## Schema Quality Standards

### Banned Schema Patterns

| Pattern | Why Blocked |
|---------|-------------|
| `z.record(z.string(), z.unknown())` for known fields | Use a typed schema with actual field definitions |
| `z.string()` where valid values are known | Use `z.enum([...])` with known values |
| `.optional()` on every field in a known structure | Required fields should not be optional |
| Duplicated schema field definitions | Import and extend from canonical source schema |

### Required Schema Patterns

| Pattern | Purpose |
|---------|---------|
| Derive inter-module schemas from canonical source | Single source of truth for contracts |
| `z.enum()` or `z.literal()` for known value sets | Type-safe value constraints |
| Comment on `.passthrough()` | Explain why unknown fields are expected |
| Schema tests for valid, edge, and malformed payloads | Verify schema rejects bad data |

**When to apply:** Schemas for stage inputs/outputs, API request/response bodies, and inter-module contracts. Simple internal utility schemas are exempt.

## Pre-Commit Verification

Before committing any production code, run this verification against the changed files:

1. **Search for prohibited patterns** — grep changed files for `TODO`, `FIXME`, `HACK`, `console.log`, `debugger`, empty `catch` blocks
2. **Search for type safety violations** — grep for `: any`, `as any`, `JSON.parse(` without schema validation
3. **Verify error handling** — confirm no empty catch blocks, no swallowed errors, fail-fast validation at entry points
4. **Check schema quality** — if schemas were added or modified, verify they use `z.enum()` for known values, do not use `.optional()` excessively, and derive from canonical sources

If any prohibited pattern is found, fix it before committing. Do not commit with a plan to "fix it later."

## When Blocked

If proper implementation is blocked:

1. **STOP** - Do not create a workaround
2. **DOCUMENT** - State what's blocking
3. **CREATE TICKET** - File ticket for the blocker
4. **WAIT** - Blocker must be fixed first

**If implementation requires a workaround, do not implement. Communicate the blocker clearly.**

## Rationalizations -- STOP

If you think any of these, you are about to violate this skill.

| Excuse | Reality |
|--------|---------|
| "This is just a quick prototype" | There is no prototype code in this workflow. All code is production code. |
| "I'll clean it up later" | Later never comes. Write it correctly now. |
| "The TODO is just a reminder" | TODOs are banned. Create a Linear ticket instead. |
| "This fallback makes it more resilient" | Fallbacks hide bugs. Fail fast so problems surface immediately. |
| "Tests don't need production standards" | Test code with workarounds creates false confidence. Tests must be accurate. |
| "This is a minor change, standards don't apply" | Minor changes are where standards slip. Apply them especially here. |

## Related Skills
- **testing-philosophy**: Test code may use mocks and fixtures; production code must not
- **verify-implementation**: Verify all claims before marking work complete

See `references/anti-patterns.md` for detailed code examples of prohibited and required patterns.

See `examples/error-handling-patterns.md` for practical before/after transformations.
