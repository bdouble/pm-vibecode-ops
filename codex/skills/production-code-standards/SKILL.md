---
name: production-code-standards
description: |
  Enforces production-grade code quality. Use when:
  - Writing code: "implement", "write code", "add feature", "fix bug", "create service", "build"
  - Detecting workarounds: "make it work", "quick fix", "temporary solution", "workaround", "hack"
  - Reviewing code: "review PR", "check this code", "is this production ready"
  - Editing production files: src/, lib/, app/, services/, modules/, controllers/, domain/

  Blocks TODO/FIXME/HACK comments, empty catch blocks, fallback logic, || default patterns,
  setTimeout for race conditions, mocked services outside tests, speculative abstractions nobody
  requested. Enforces fail-fast error handling. Also use when establishing a convention or
  "always/never" rule: conventions ship with their structural guards (the enforcement ladder).
---

# Production Code Standards

All production code must be permanent, complete, and production-grade.

## Enforcement Workflow

1. **Before writing**: Plan the complete, permanent solution - exactly the scope that was asked
2. **While writing**: Check against prohibited patterns
3. **When blocked**: STOP, document, create ticket - never workaround
4. **Before committing**: Verify no prohibited patterns exist; if the change establishes a convention, its guard is in this diff or the rule carries `[prose-only]` + why

## Prohibited Patterns

| Pattern | Why Blocked |
|---------|-------------|
| `value \|\| default` | Hides errors silently |
| `TODO/FIXME/HACK` | Temporary code in production |
| `catch (e) { }` | Swallows errors |
| Mock services in src/ | Test artifacts in production |
| `setTimeout` for race conditions | Workaround, not fix |
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

Rules already guarded get documented as one-line pointers tagged `[enforced: <artifact>]`. Bans like no-TODO are best enforced as a rung-2 lint/guard in the target repo, not as paragraphs aimed at the model.

### Rung 2 recipe: the static-guard test (the workhorse)

A normal test in the project's existing test runner that walks the source tree and fails on the prohibited pattern. No new infrastructure — it's just a test:

```
1. Collect target files (glob: src/**/*.{ts,py,go,...}, minus generated/vendored paths)
2. For each file, scan for the violation — regex for simple patterns,
   the language's parser/AST for structural ones
3. Maintain an EXEMPTIONS list at the top of the test file.
   Every entry requires a ticket ID + one-line reason.
   An exemption without both fails the test.
4. On violation: fail with the file:line, the rule, and the fix
```

A violating commit is a red build, caught at commit time, by an agent that never read the rule; the error message teaches the convention exactly when it's needed.

### Rung 4 recipe: the ratchet (replaces propagation tickets)

When a new pattern should eventually cover N existing surfaces, do **not** file per-surface migration tickets — field data shows they rot (14 opened / 0 closed). Install a ratchet (~1-2 hours):

```
1. Write the rung-2 guard for the pattern
2. Seed its EXEMPTIONS/allowlist with the CURRENT offenders, enumerated
3. The test enforces two directions:
   - any NEW surface violating the pattern -> red
   - the allowlist may only SHRINK — a migrated file is removed
     from the list in the same PR
4. Migration happens opportunistically: whoever touches an allowlisted
   file migrates it and deletes its entry
```

A ratchet never rots: it blocks backsliding from day one, and the allowlist length is a progress metric anyone can read.

### Definition of done for a convention

A change that establishes a convention is **incomplete** — same severity as missing tests — unless ONE of: (1) its guard (rung 1-5) ships in the same PR, or (2) the rule is genuinely judgment-only and is documented with `[prose-only]` + one line on why no guard can express it. "We'll add the guard later" and "other surfaces can adopt it via follow-up tickets" are the failure modes the ladder exists to prevent.

## Rationalizations — STOP

| Excuse | Reality |
|--------|---------|
| "This fallback makes it more resilient" | Fallbacks hide bugs. Fail fast so problems surface immediately. |
| "I documented the convention in CLAUDE.md / AGENTS.md" | Prose doesn't propagate across sessions. Ship the guard (rung 1-5) or tag `[prose-only]` with why. |
| "Other surfaces can adopt the pattern via follow-up tickets" | Propagation tickets rot (field data: 14 opened, 0 closed). Install a ratchet instead. |
| "More flexibility makes this future-proof" | Unrequested flexibility is over-engineering. Build what was asked. |

## When Blocked

If proper implementation is blocked:

1. **STOP** - Do not create a workaround
2. **DOCUMENT** - State what's blocking
3. **CREATE TICKET** - File ticket for the blocker
4. **WAIT** - Blocker must be fixed first

**If implementation requires a workaround, do not implement. Communicate the blocker clearly.**

## Related Skills

- **testing-philosophy**: Test code may use mocks and fixtures; production code must not
- **verify-implementation**: Verify all claims before marking work complete

See `references/anti-patterns.md` for detailed code examples of prohibited and required patterns.

---

## How to Use This Skill in Codex

Include this skill's content in your Codex prompt when:
- Writing any production code (not test code)
- Reviewing code for production readiness
- Implementing features or fixing bugs
- Establishing a convention or "always/never" rule other code must follow
- Discussing code quality standards

Copy the prohibited and required patterns sections into your prompt to enforce these standards during code generation. When a change establishes a convention, include the enforcement ladder section so the guard ships in the same PR.
