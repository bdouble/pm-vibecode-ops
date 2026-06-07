# Workflows

This directory holds **dynamic workflows** — JavaScript scripts that orchestrate many subagents from a single deterministic program, run by Claude Code's [`Workflow` runtime](https://code.claude.com/docs/en/workflows). Unlike a slash command (a prompt Claude follows turn-by-turn) or an agent (a single worker), a workflow moves the plan *into code*: loops, branching, fan-out, and per-agent failure isolation live in the script, and only the final result lands back in the session.

## Contents

| File | Purpose |
|------|---------|
| `epic-swarm-workflow.js` | Resilient, right-sized port of `/epic-swarm`. Per ticket: adaptation → implementation → testing → documentation → code review → Codex cross-model review → security → merge, scaled to each ticket's effort tier, with a hard review floor for code changes and full per-agent failure isolation. |

## How this ships in the plugin

**Claude Code plugins have no native `workflows/` component.** The plugin loader recognizes `skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, `.lsp.json`, `monitors/`, `bin/`, and `settings.json` — but *not* workflows. A bundled `.js` therefore does **not** auto-register as a slash command on install the way a command or skill does.

So this plugin delivers the workflow through a thin **command wrapper**:

- `workflows/epic-swarm-workflow.js` — the canonical, version-controlled source (this directory).
- `commands/epic-swarm-workflow.md` — a slash command that resolves the bundled script path (via `${CLAUDE_PLUGIN_ROOT}`) and launches it with the `Workflow` tool, passing your arguments through.

After installing the plugin, run it as:

```
/pm-vibecode-ops:epic-swarm-workflow <EPIC-ID> [--dry-run] [--push] [--no-push] [--max-tickets N]
```

Flags: `--dry-run` prints the tier plan and makes no changes; `--push` pushes the epic branch and opens the PR (default is local-only; `--no-push` forces local-only explicitly — the last of `--push`/`--no-push` wins); `--max-tickets N` caps scope to the first N tickets (N must be ≥ 1).

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
- **Reviews are a hard floor for code changes** and **fail closed**: a failed or empty review blocks the merge; it can never silently pass as approved. A review fix is only trusted after the fixer confirms it *committed* — an uncommitted "fix" keeps the original CHANGES_REQUESTED. Codex auto-fixes land *after* the review floor, so when codex changes code the correctness review is re-run on the new diff (also fail-closed) before merge.
- **Resilient by construction.** Every agent call is wrapped so a single failure (API 5xx, MCP hang, schema miss) is contained — the ticket is recorded blocked and the run continues, always returning a reconciled summary. Each phase agent posts its own report to Linear as it finishes, so a crash never loses the audit trail.
- **Empty-diff handling is tier-aware.** Where code was expected (SMALL build, STANDARD implement) an empty diff blocks loudly as `BLOCKED_EMPTY_DIFF` (a "claimed complete but produced nothing" anomaly), and those builds get one git-verified empty-artifact retry first. Where code was *not* expected (a NO-CODE observation ticket, or a `no_code` STANDARD ticket) an empty diff is a benign `NO_OP` — the ticket is closed, reported separately, and never blocks or poisons its dependents.
- **Merge gate uses a test-diff** — it blocks only on tests that *newly* fail versus a baseline captured at setup, so a pre-existing red or flaky suite (common in real repos) never blocks a clean merge.
- **Model routing** is aggressive on Sonnet: Opus for the reasoning phases (plan, adapt, implement, test, review, review-fix, codex), Sonnet for the mechanical ones (setup, documentation, security, merge). Tune the `ROUTE` map at the top of the script. Per-agent *effort* is not a workflow API knob — launch the session at `high`.

To edit the workflow, change `epic-swarm-workflow.js` here (the source of truth), then re-deliver it (the command wrapper always runs this file; re-copy it if you used the bare-command install above).
