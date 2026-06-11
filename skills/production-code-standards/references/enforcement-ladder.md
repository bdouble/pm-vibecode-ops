# The Enforcement Ladder

**A pattern that ships without its guard is a wish — at one human directing N amnesiac agents, wishes don't propagate; lint rules do.**

This is the canonical reference for how conventions get enforced in any codebase this workflow builds. Every rule a ticket or epic establishes climbs as high on this ladder as its nature allows, and **the enforcement artifact ships in the same PR that establishes the rule**.

## Why this exists

Field evidence from the largest pm-vibecode-ops deployment (ProductLobster, ~56 epics, audited 2026-06-09):

| Enforcement shape | Outcome over ~10 epics |
|---|---|
| Structural guard (lint rule, static-guard test, drift test, ratchet, runtime assert) | **Zero post-merge regressions. Zero propagation tickets.** Violations surface as red tests at commit time, caught by agents that never read the rule. |
| Prose rule (CLAUDE.md MANDATORY paragraph, convention doc, review-checked) | The single most-documented rule regressed post-merge **four separate times**. Per-surface propagation tickets: **14 opened, 0 closed**. |

The root cause is structural, not agent indiscipline: agents are amnesiac per session, prose is rephrase-able while guards are not, and a non-engineer operator can verify "guard test: green" but cannot verify "the agents were told."

## The ladder

| Rung | Mechanism | When it fits | Stack-agnostic recipe |
|---|---|---|---|
| 1 | **Make the wrong thing unrepresentable** — types, branded types, required params, a single chokepoint function | "Always call X with Y" / "never pass A where B" | Route all call sites through one function whose signature can't express the violation |
| 2 | **Static-guard test** — a test that reads the *source tree* and fails on the pattern | "Never import X raw," "every mutation handler validates input," "all transactions must be wrapped" | See the Rung 2 recipe below — it's the workhorse |
| 3 | **Drift test** — pin derived/duplicated data to its source of truth | Enum ↔ display map, config table ↔ docs, two matrices that must agree | Snapshot the derived form against a literal table in the test; the diff IS the review artifact |
| 4 | **Ratchet** — shrink-only allowlist | Migrating N existing surfaces to a new pattern | See the Rung 4 recipe below — it replaces propagation tickets entirely |
| 5 | **Runtime assert** — checked at the chokepoint at execution time | The invariant is only visible in the assembled state (e.g., a prompt composed across files) | Throw in test env; in production, emit a structured event and continue or halt per the project's fail-open/fail-closed posture |
| 6 | **Prose** — last resort | Genuinely operational judgment ("never reset the DB without consent," cost-posture direction, taste rules) | Allowed — but the prose must carry a status tag (see below) |

## Rung 2 recipe: the static-guard test (the workhorse)

A normal test in the project's existing test runner that walks the source tree and fails on the prohibited pattern. No new infrastructure — it's just a test. ProductLobster ended up with ten of these (LLM boundary, input validation, 404 shape, icon migration, design tokens, telemetry PII, dependency layering), all the same ~200-line shape, all stack-portable:

```
1. Collect target files (glob: src/**/*.{ts,py,go,...}, minus generated/vendored paths)
2. For each file, scan for the violation — regex for simple patterns,
   the language's parser/AST for structural ones
3. Maintain an EXEMPTIONS list at the top of the test file.
   Every entry requires a ticket ID + one-line reason.
   An exemption without both fails the test.
4. On violation: fail with the file:line, the rule, and the fix
   ("wrap this handler with validateInput() — see <convention doc>")
```

Properties that make this the workhorse: it runs in CI with zero new tooling; a violating commit is a red build, found at commit time, by an agent that never read the rule; the error message teaches the convention at exactly the moment it's needed.

## Rung 4 recipe: the ratchet (replaces propagation epics)

When a new pattern should eventually cover N existing surfaces, do **not** file per-surface migration tickets — field data shows they rot (14 opened / 0 closed). Install a ratchet (~1-2 hours):

```
1. Write the rung-2 guard for the pattern
2. Seed its EXEMPTIONS/allowlist with the CURRENT offenders, enumerated
   (this is the migration backlog, encoded where it can't be ignored)
3. The test enforces two directions:
   - any NEW surface violating the pattern → red (adoption is mandatory going forward)
   - the allowlist may only SHRINK — a migrated file must be removed
     from the list in the same PR (some runners can assert list length
     against a committed high-water mark)
4. Migration happens opportunistically: whoever touches an allowlisted
   file migrates it and deletes its entry
```

A ratchet never rots: it blocks backsliding from day one, and the allowlist length is a progress metric the operator can read.

## Status tags: making the prose residue countable

Every convention written into project memory (CLAUDE.md, convention docs) carries an inline status tag:

- `[enforced: <artifact path>]` — a guard exists; the prose should be a **one-line pointer** ("X is enforced by `tests/guards/llm-boundary.test.ts` — see that file for details"), not a paragraph.
- `[prose-only]` — no guard exists. Requires one line on why rung 6 is the ceiling for this rule.

**The pruning rule:** when a guard ships for a previously-documented rule, retire the prose to the one-line pointer in the same PR. The win is double — the bug class closes AND the rule's context-window cost drops to near zero forever.

**The discipline-debt metric:** the count of `[prose-only]` rules is the project's enforcement debt. It is countable, trendable, and readable by a non-engineer (ProductLobster's baseline: 37 rules, 67% prose-only). `/close-epic` reports it at every closure; `/entropy-audit` trends it.

## Definition of done for a convention

A change that establishes a convention (a new pattern others must follow, a new always/never rule, a first instance meant to be copied) is **incomplete** — same severity as missing tests — unless ONE of:

1. Its guard (rung 1–5) ships in the same PR, or
2. The rule is genuinely judgment-only and is documented with `[prose-only]` + one line on why no guard can express it.

"We'll add the guard later" and "other surfaces can adopt it via follow-up tickets" are the failure modes this ladder exists to prevent.

## Where this is enforced in the workflow

- `/planning` writes the guard into the establishing ticket's acceptance criteria
- `/adaptation` names the guard (rung + artifact) in the implementation guide
- `/codereview` verifies it (Convention Enforcement dimension)
- `/close-epic` gates epic closure on it (Convention Guard Audit) and prunes guarded prose
- `/entropy-audit` counts and trends the residue
