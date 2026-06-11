---
name: production-code-standards
description: Use when writing, editing, or reviewing production code — especially when tempted to add a fallback like `value || default`, an empty catch block, a workaround for a blocker, or speculative abstractions and flexibility nobody asked for. Also use when establishing a convention or pattern other code must follow, writing an "always/never" rule, adding a lint rule or guard test, or tempted to document a convention instead of enforcing it. Also use when saying "quick fix", "workaround", "temporary", or "I'll add the guard later".
---

# Production Code Standards

All production code must be permanent, complete, and production-grade.

<!-- @protected reason="foundational principle from v4.5; SkillOpt §3.6 protects slow-state content from automated rewrites — removing the analog cost SpreadsheetBench 22pts" -->
**Violating the letter of this skill is violating the spirit of this skill.** A `WORKAROUND:` comment is the same violation as `TODO`. `value ?? default` used to silently mask absence is the same violation as `value || default`. A new prohibited pattern with a friendlier name is the same prohibited pattern. Spirit over letter, always.

### Slow/Meta Update Log
<!-- Append one bullet per audit pass capturing what stayed true across iterations. Initially empty. -->
<!-- @end-protected -->

## Enforcement Workflow

1. **Before writing**: Plan the complete, permanent solution — exactly the scope that was asked
2. **While writing**: Check against prohibited patterns
3. **When blocked**: Stop, document, create a ticket — never workaround
4. **Before committing**: Run the pre-commit verification below

## Prohibited Patterns

| Pattern | Why blocked |
|---------|-------------|
| `value \|\| default` / `value ?? default` masking absence | Hides errors silently — fail fast so problems surface |
| `TODO/FIXME/HACK` comments | Deferral receipts in production; file a ticket instead |
| `catch (e) { }` | Swallows errors |
| Mock services in src/ | Test artifacts in production |
| `setTimeout` to mask a race condition | Workaround, not a fix |
| Speculative abstractions, configurability, or "flexibility" nobody requested | Over-engineering — build what the ticket asks; a bug fix doesn't need surrounding cleanup |

## Required Patterns

| Pattern | Purpose |
|---------|---------|
| Fail-fast validation | Errors caught at entry |
| Typed custom errors | Debuggable, catchable |
| Error propagation | Let errors bubble to handlers |
| Repository pattern | Data access abstraction |

## The Enforcement Ladder — Conventions Ship With Their Guards

If your change **establishes a convention** — a new pattern other code must follow, a new "always/never" rule, a first instance meant to be copied — the convention is incomplete without its structural guard, same severity as missing tests. Prose rules don't propagate across amnesiac agent sessions; guards do (field data: guarded conventions had zero post-merge regressions; the most-documented prose rule regressed four times).

Climb as high as the rule allows, and ship the artifact **in the same PR**:

| Rung | Mechanism |
|---|---|
| 1 | Make the wrong thing unrepresentable (types, single chokepoint function) |
| 2 | Static-guard test — scans the source tree, fails on the pattern, `EXEMPTIONS` list requires ticket + reason |
| 3 | Drift test — pins derived/duplicated data to its source of truth |
| 4 | Ratchet — shrink-only allowlist of current offenders; replaces propagation tickets entirely |
| 5 | Runtime assert at the chokepoint |
| 6 | Prose — last resort, tagged `[prose-only]` with one line on why no guard can express it |

Rules already guarded get documented as one-line pointers tagged `[enforced: <artifact>]`. Full recipes (the ~200-line rung-2 test shape, the ratchet pattern): `references/enforcement-ladder.md`.

This is also where the old style rules live now: bans like no-TODO are best enforced as a rung-2 lint/guard in the target repo, not as paragraphs aimed at the model.

## Schema Quality Standards

| Banned | Use instead |
|--------|-------------|
| `z.record(z.string(), z.unknown())` for known fields | Typed schema with actual field definitions |
| `z.string()` where valid values are known | `z.enum([...])` |
| `.optional()` on every field of a known structure | Required fields stay required |
| Duplicated schema field definitions | Import and extend the canonical source schema |

Applies to stage inputs/outputs, API bodies, and inter-module contracts; simple internal utility schemas are exempt. Comment any `.passthrough()` with why unknown fields are expected, and test schemas against valid, edge, and malformed payloads.

## Pre-Commit Verification

Run against changed files before committing:

1. Grep for `TODO`, `FIXME`, `HACK`, `console.log`, `debugger`, empty `catch` blocks
2. Grep for `: any`, `as any`, `JSON.parse(` without schema validation
3. Confirm fail-fast validation at entry points, no swallowed errors
4. If schemas changed: enums for known values, no blanket `.optional()`, derived from canonical sources
5. If the change establishes a convention: its guard is in this diff, or the rule carries `[prose-only]` + why

Fix findings before committing — there is no "fix it later."

## When Blocked

If proper implementation is blocked: stop, state what's blocking, file a ticket for the blocker, and report it. Do not ship a workaround in its place — a workaround converts a visible blocker into an invisible bug.

## Red Flags — STOP

- "Just for now" / "temporary fix" / "I'll clean it up later"
- A fallback or default that masks missing data instead of failing fast
- "Skip this check, the upstream code already validates"
- A mock or stub inside `src/` (outside tests)
- "I'll add the guard later" / "I'll document the convention for future agents" — the guard ships in this PR or the rule is tagged `[prose-only]`
- Adding abstractions or options the ticket didn't ask for

## Rationalizations — STOP

| Excuse | Reality |
|--------|---------|
| "This fallback makes it more resilient" | Fallbacks hide bugs. Fail fast so problems surface immediately. |
| "It's a quick fix / prototype" | There is no prototype code in this workflow. All code is production code. |
| "I documented the convention in CLAUDE.md" | Prose doesn't propagate across sessions. Ship the guard (rung 1–5) or tag `[prose-only]` with why. |
| "Other surfaces can adopt the pattern via follow-up tickets" | Propagation tickets rot (field data: 14 opened, 0 closed). Install a ratchet instead. |
| "More flexibility makes this future-proof" | Unrequested flexibility is over-engineering. Build what was asked. |

## Related Skills
- **testing-philosophy**: Test code may use mocks and fixtures; production code must not
- **verify-implementation**: Verify all claims before marking work complete
- **no-silent-deferrals**: Deferral discipline, the impact bar, and the symmetric bar for defensive machinery
- **model-aware-behavior**: Scope restraint — do only what was requested

## Additional Resources

- **`references/enforcement-ladder.md`** — The full enforcement ladder: rung recipes, ratchets, status tags, pruning rule
- **`references/typescript-anti-patterns.md`** — TypeScript anti-pattern catalog and the ESLint configuration that enforces them at lint time (rung 2)
- **`references/anti-patterns.md`** — Detailed code examples of prohibited and required patterns
- **`examples/error-handling-patterns.md`** — Practical before/after transformations
