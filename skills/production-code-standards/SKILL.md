---
name: production-code-standards
description: Use when writing, editing, or reviewing production code — especially when tempted to add a TODO/FIXME/HACK comment, a fallback like `value || default`, an empty catch block, a `setTimeout` to mask a race condition, a `console.log`, or an `any` type. Also use when saying "quick fix", "workaround", "just a prototype", "temporary", or "I'll clean it up later".
---

# Production Code Standards

All production code must be permanent, complete, and production-grade.

**Violating the letter of this skill is violating the spirit of this skill.** A `WORKAROUND:` comment is the same violation as `TODO`. `value ?? default` used to silently mask absence is the same violation as `value || default`. A new prohibited pattern with a friendlier name is the same prohibited pattern. Spirit over letter, always.

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

For TypeScript projects, additional anti-patterns and ESLint rules apply. See `references/typescript-anti-patterns.md` for the full catalog including `any` type usage, floating promises, non-null assertions, `console.log` in production, and the recommended ESLint configuration to enforce these at lint time.

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

## Red Flags — STOP

When you notice ANY of these in your own thinking or writing, you are about to ship a workaround. Stop and write the permanent solution instead.

- `// TODO:` / `// FIXME:` / `// HACK:` / `// XXX:` / `// WORKAROUND:`
- `value || default` or `value ?? default` to silently mask missing data
- `try { ... } catch (e) { /* swallow */ }`
- `setTimeout(() => ..., 0)` to mask a race condition
- `: any` / `as any` / `JSON.parse(raw)` without schema validation
- `console.log` / `console.error` in production paths
- "Just for now" / "Temporary fix" / "I'll clean it up"
- "It's just a prototype" / "Quick prototype"
- Mock or stub service inside `src/` (outside `__tests__/`)
- "Skip this check, the upstream code already validates"

**All of these mean: write the permanent solution now.** If genuinely blocked, follow the "When Blocked" procedure — STOP, DOCUMENT, CREATE TICKET, WAIT. Never ship a workaround.

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
- **no-silent-deferrals**: TODO/FIXME/HACK comments are silent deferrals — banned for the same reason

## Additional Resources

- **`references/typescript-anti-patterns.md`** — Full TypeScript anti-pattern catalog and ESLint configuration
- **`references/anti-patterns.md`** — Detailed code examples of prohibited and required patterns
- **`examples/error-handling-patterns.md`** — Practical before/after transformations
