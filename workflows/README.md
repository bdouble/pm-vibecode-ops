# Workflows

This directory holds **dynamic workflows** — JavaScript scripts that orchestrate many subagents from a single deterministic program, run by Claude Code's [`Workflow` runtime](https://code.claude.com/docs/en/workflows). Unlike a slash command (a prompt Claude follows turn-by-turn) or an agent (a single worker), a workflow moves the plan *into code*: loops, branching, fan-out, and per-agent failure isolation live in the script, and only the final result lands back in the session.

## Contents

| File | Purpose |
|------|---------|
| `epic-swarm-workflow.js` | Resilient, right-sized port of `/epic-swarm`. Each ticket runs a pipeline scaled to its effort tier — STANDARD runs the full adaptation → implementation → testing → documentation → code review → Codex cross-model review → security → merge chain; NO_CODE/SMALL collapse to build → review → merge — with a hard review floor for code changes and full per-agent failure isolation. After every ticket merges, one epic-level **cross-ticket Codex pass** reviews the whole epic diff for integration breakage. The whole epic integrates in a **dedicated git worktree** so runs for different epics are concurrency-safe and your main checkout is never touched (`--in-place` for the legacy main-tree mode). |

## How this ships in the plugin

**Claude Code plugins have no native `workflows/` component.** The plugin loader recognizes `skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, `.lsp.json`, `monitors/`, `bin/`, and `settings.json` — but *not* workflows. A bundled `.js` therefore does **not** auto-register as a slash command on install the way a command or skill does.

So this plugin delivers the workflow through a thin **command wrapper**:

- `workflows/epic-swarm-workflow.js` — the canonical, version-controlled source (this directory).
- `commands/epic-swarm-workflow.md` — a slash command that resolves the bundled script path (probing `${CLAUDE_PLUGIN_ROOT}`, then `${CLAUDE_SKILL_DIR}`, then a Glob fallback across the cwd and the `~/.claude/plugins`/`~/.claude/marketplaces` install roots) and launches it with the `Workflow` tool, passing your arguments through.

After installing the plugin, run it as:

```
/pm-vibecode-ops:epic-swarm-workflow <EPIC-ID> [--dry-run] [--push] [--no-push] [--in-place] [--max-tickets N] [--skills a,b,c] [--context-file PATH] [free-text guidance…]
```

Flags: `--dry-run` prints the tier plan and makes no changes; `--push` pushes the epic branch and opens the PR (default is local-only; `--no-push` forces local-only explicitly — the last of `--push`/`--no-push` wins); `--in-place` integrates in the main working tree instead of a dedicated worktree (legacy, single-run only); `--max-tickets N` caps scope to the first N tickets (N must be ≥ 1); `--skills a,b,c` makes every code-touching agent load those skills first; `--context-file PATH` threads a conventions/codegen file into every agent. **Any plain text after the epic ID** is threaded into every code-touching agent as operator guidance (never silently dropped).

### Optional: a bare, un-namespaced command

If you'd rather invoke it as `/epic-swarm-workflow` (no plugin namespace), copy the script into a workflows directory Claude Code auto-registers from:

```bash
# Personal — available in every project, just for you:
mkdir -p ~/.claude/workflows && cp workflows/epic-swarm-workflow.js ~/.claude/workflows/

# Or project-scoped — shared with everyone who clones the repo:
mkdir -p .claude/workflows && cp workflows/epic-swarm-workflow.js .claude/workflows/
```

It then appears as `/epic-swarm-workflow` in `/` autocomplete. (Re-copy after updating the plugin to pick up changes.)

## Requirements

- **Dynamic workflows must be enabled** — a plan-gated research-preview feature (Pro/Max/Team/Enterprise, plus API/Bedrock/Vertex/Foundry). On Pro, turn on the "Dynamic workflows" row in `/config`. With workflows disabled, the `Workflow` tool — and this command — won't run.
- A connected **Linear MCP** (`mcp__linear-server__*` or `mcp__claude_ai_Linear__*`), since the plan/triage and reporting agents read and write Linear.
- For the Codex phase, the `codex-review-server` MCP (optional — the workflow degrades gracefully if it's absent).

## Design notes

- **Right-sized by effort.** A `plan` agent classifies each ticket into `NO_CODE` / `SMALL` / `STANDARD` and the script runs a pipeline sized to it. Every tier uses at least two work agents (a build/plan-implement agent and a *separate* reviewer) plus a merge agent — no single agent does everything.
- **Reviews are a hard floor for code changes** and **fail closed**: a failed or empty review blocks the merge; it can never silently pass as approved. A review fix is only trusted after the fixer confirms it *committed* — an uncommitted "fix" keeps the original CHANGES_REQUESTED. Codex auto-fixes land *after* the review floor, so when codex changes code the correctness review is re-run on the new diff (also fail-closed) before merge. After every ticket has merged, a final **cross-ticket Codex pass** reviews the whole epic diff (epic branch vs the default branch) for integration breakage no per-ticket review can see; it skips non-fatally on a Codex rate-limit/outage (reported in the summary's `cross_ticket_codex` field + `next_steps`), and because nothing gates after it, any fix it commits that regresses the integration suite is reverted so the epic branch is never left worse than the per-ticket merges produced it.
- **Resilient by construction.** Every agent call is wrapped so a single failure (API 5xx, MCP hang, schema miss) is contained — the ticket is recorded blocked and the run continues, always returning a reconciled summary. A **transient** miss (a thrown error, or a `null` after the runtime's own retries on a mid-response `"Connection closed"`) is **re-dispatched once by default** before the sentinel — a single connection drop on one phase can no longer block a ticket and cascade-skip its dependents (the failure that halted a real `PRO-1653` run).
- **Reliable per-phase Linear reporting** (the orchestrator-agent pattern, ported). Each phase agent *returns* its full report as the structured field `report_md` and never touches Linear; a dedicated JS-dispatched **poster** then writes the comment under its canonical header (`## Adaptation Report`, `## Implementation Report`, …) and transitions status (In Progress at the first phase). The poster runs unconditionally — *before* each gate, so even a blocked phase leaves the report that explains why — and inherits the v5.3 retry, so a transient Linear blip doesn't drop a comment. This replaces the prior self-post (a buried "post it yourself, continue if Linear is down" instruction with the report *excluded* from structured output and no verification), which silently dropped reports — the failure the `swarm-phase-reporting` skill documents. The summary's `linear_reporting` field tallies posted/failed so a degraded audit trail is visible. Cost: one small Sonnet poster per phase — the price of a reliable, durable record future agents read.
- **Path-safety is structural.** Before any per-ticket worktree/install, a deterministic assert refuses to run if the integration tree or the main repo path contains a tooling-hostile character — most acutely `:`, which the package manager rejects in `PATH` (`ERR_PNPM_BAD_PATH_DIR`). The epic-ID parser additionally tolerates a leading label and edge punctuation (`"Epic: PRO-1653." → PRO-1653`) so a natural phrasing can't capture `Epic:` as the epic name and poison every path with a colon, and planner-supplied ticket ids are ID-validated before they reach a worktree path. When the test **runner cannot execute at all** (a tooling/PATH/codegen error, distinct from tests that ran and failed), the testing phase reports `ENV_BLOCKED` → `BLOCKED_TEST_ENV`, so an un-run suite is never folded into a green-looking pass.
- **Empty-diff handling is tier-aware.** Where code was expected (SMALL build, STANDARD implement) an empty diff blocks loudly as `BLOCKED_EMPTY_DIFF` (a "claimed complete but produced nothing" anomaly), and those builds get one git-verified empty-artifact retry first. Where code was *not* expected (a NO-CODE observation ticket, or a `no_code` STANDARD ticket) an empty diff is a benign `NO_OP` — the ticket is closed, reported separately, and never blocks or poisons its dependents.
- **Merge gate uses a test-diff** — it blocks only on tests that *newly* fail versus a baseline captured at setup, so a pre-existing red or flaky suite (common in real repos) never blocks a clean merge. A merge blocked by *new* failures gets one bounded **fix-forward** pass (re-merge → fix the new failures at the root → re-gate) before it blocks, so a cross-file mock/fixture gap can't cascade-kill an epic; the testing phase also runs the full suite in-worktree when a ticket changes exports, moving that check left of the merge.
- **Concurrency-safe by default.** The whole epic integrates in a dedicated git worktree (`.swarm/epics/<id>`) with `REPO_ROOT` forced to it — so swarms for *different* epics in one clone never collide on the working tree, and your main checkout is never disturbed. A per-epic lock refuses an accidental second run of the *same* epic; the lock is a single state-cell file acquired/released with the **Write tool** (not `mkdir`/`rm`) so it never raises a permission prompt that would stall an unattended run. `--in-place` restores the legacy main-tree integration (single-run only). Note this isolates *git*, not a shared database/test backend — two epics writing the same local data store still need separate data isolation.
- **Operator guidance is threaded, not dropped.** Free text after the epic ID (plus `--skills` / `--context-file`) is injected into every code-touching agent and the planner, so per-epic conventions or skill-loading need no script edit.
- **Every phase reads the parent epic's comments, not just the sub-ticket's** (v5.5). Besides reading its own ticket's full description *and* comments, each per-ticket phase (adapt, implement, test, docs, review, codex, security) now also re-reads the **parent epic's** description and comments — via the single `readTicket()` chokepoint they all route through. Cross-cutting context an operator or earlier agent leaves as an *epic-level* comment (a convention that applies to every ticket, or a note added *after* planning ran / on a resume) lives in no single acceptance criterion; previously only the planning agent read the epic's comments, once, so that context never reached the workers. Now it does, on every phase.
- **Model routing** is aggressive on Sonnet: Opus for the reasoning phases (plan, adapt, implement, test, review, review-fix, codex) **and both SMALL-tier agents (build + review)**; Sonnet for the mechanical ones (setup, documentation, security, merge, the PR) **and both NO-CODE-tier agents (build + review)**. So a SMALL-heavy epic costs more Opus than the reasoning-phase list alone implies. Tune the `ROUTE` map at the top of the script. Per-agent *effort* is not a workflow API knob — launch the session at `high`.

## Tests

`epic-swarm-workflow.test.mjs` unit-tests the regression-prone pure logic — arg parsing, epic-ID normalization, and path-safety — against the real source (the helpers are extracted via `/* test-export:begin … end */` markers, so there is no duplicated copy to drift), plus source-invariant checks for the orchestration changes that can't run outside the `Workflow` runtime. Run it with the Node built-in test runner (no dependencies, no `package.json`):

```bash
node --test workflows/*.test.mjs
```

CI runs the same command. If you change a `test-export`-marked helper or remove a marker, the test fails loudly — that's intended.

To edit the workflow, change `epic-swarm-workflow.js` here (the source of truth), then re-deliver it (the command wrapper always runs this file; re-copy it if you used the bare-command install above). Run `node --test workflows/*.test.mjs` before shipping.
