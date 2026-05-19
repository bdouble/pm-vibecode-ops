# TypeScript-Specific Anti-Patterns

These patterns are prohibited in production TypeScript code. Each introduces a category of bugs that the type system is designed to prevent.

## Type Safety Violations

| Pattern | Why Blocked | Required Alternative |
|---------|-------------|---------------------|
| `any` type | Disables type checking entirely, defeats purpose of TypeScript | Use `unknown` and narrow with type guards |
| Excessive `as` assertions | Overrides compiler safety; hides type mismatches | Fix the underlying type or use a type guard |
| Unvalidated `JSON.parse()` | Returns `any`; downstream code assumes shape without verification | Parse with Zod schema: `schema.parse(JSON.parse(raw))` |
| Non-null assertion `!` on uncertain values | Asserts non-null without evidence; crashes at runtime | Use explicit null check or optional chaining |

## Async Anti-Patterns

| Pattern | Why Blocked | Required Alternative |
|---------|-------------|---------------------|
| Floating promises (async call without `await`) | Errors silently swallowed; execution order unpredictable | Always `await` or explicitly handle with `.catch()` |
| `async` function without `try/catch` at boundary | Unhandled rejection crashes process in Node.js | Wrap in try/catch at service boundaries; let errors propagate through middleware |
| `Promise.all` without error handling | One rejection loses all results | Use `Promise.allSettled` when partial results are acceptable |

## Production Hygiene

| Pattern | Why Blocked | Required Alternative |
|---------|-------------|---------------------|
| `console.log` in production code | Pollutes output, may leak sensitive data, not structured | Use structured logger (e.g., pino, winston) with log levels |
| `console.error` for error handling | Not a substitute for proper error propagation | Throw typed error or pass to error handler |
| `debugger` statement | Halts execution in production | Remove entirely |

## Automated Enforcement via ESLint

Reference these ESLint rules to catch these patterns automatically. When setting up a project or reviewing ESLint configuration, verify these rules are enabled:

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
