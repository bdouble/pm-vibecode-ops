---
description: Launch the epic-swarm-workflow dynamic workflow — a resilient, right-sized multi-agent swarm over a Linear epic (per-ticket pipeline sized to effort; STANDARD tickets run adapt→implement→test→docs→review→codex→security→merge, NO_CODE/SMALL collapse to build→review→merge; reviews fail-closed)
allowed-tools: Bash(echo:*), Bash(test:*), Glob, Workflow
argument-hint: <epic-id> [--epic ID] [--dry-run] [--push] [--no-push] [--in-place] [--max-tickets N] [--skills a,b,c] [--context-file PATH] [free-text guidance…]
workflow-phase: epic-swarm-workflow
closes-ticket: false
---

# Epic Swarm Workflow

Launch the **epic-swarm-workflow** dynamic workflow bundled with this plugin. It runs the core `/epic-swarm` pipeline over a Linear epic as a Claude Code **dynamic workflow** (the JavaScript `Workflow` runtime, which orchestrates many subagents from a script). Each ticket runs a pipeline **sized to its effort tier**: a STANDARD ticket flows through adaptation → implementation → testing → documentation → code review → Codex cross-model review → security → merge, while NO_CODE and SMALL tickets collapse to a shorter build → review → merge (no Codex/docs/separate-security phase). Every tier keeps a hard review floor for any code change, with full per-agent failure isolation (no single agent failure can abort the run).

This command is a thin launcher: it does not re-implement the workflow — it runs the bundled `workflows/epic-swarm-workflow.js` via the `Workflow` tool.

## Resolve the bundled workflow script

The plugin install directory is exposed to this command's shell as `${CLAUDE_PLUGIN_ROOT}` (and, in some Claude Code versions, `${CLAUDE_SKILL_DIR}`). Whether either is actually exported into a command `!`-bash block is not guaranteed across versions/install modes, so these two probes are best-effort: each prints the resolved absolute path if its variable is set **and** the file exists, otherwise `NOT_FOUND`. Step 1 below has a Glob fallback for when neither resolves. (Each probe is a single `test … && echo … || echo` — both commands are covered by the `Bash(test:*)`/`Bash(echo:*)` allowlist.)

- via `${CLAUDE_PLUGIN_ROOT}`:
!`test -f "${CLAUDE_PLUGIN_ROOT}/workflows/epic-swarm-workflow.js" && echo "${CLAUDE_PLUGIN_ROOT}/workflows/epic-swarm-workflow.js" || echo NOT_FOUND`
- via `${CLAUDE_SKILL_DIR}`:
!`test -f "${CLAUDE_SKILL_DIR}/workflows/epic-swarm-workflow.js" && echo "${CLAUDE_SKILL_DIR}/workflows/epic-swarm-workflow.js" || echo NOT_FOUND`

## Launch

1. Determine the workflow `scriptPath` from the probes above:
   - If **either** probe printed an absolute path ending in `epic-swarm-workflow.js`, use the first such path as `scriptPath`.
   - If both printed `NOT_FOUND`/empty or still contain a literal `${…}` (neither variable was expanded — e.g. running from the source repo rather than an installed plugin), locate the script with Glob: first try `**/workflows/epic-swarm-workflow.js` (searches the current working directory); if that returns nothing, run `echo $HOME` and try Glob again with its `path` scoped to the plugin install roots `$HOME/.claude/plugins` and `$HOME/.claude/marketplaces`. Use the first match.
   - If no probe and no Glob find it, tell the user the bundled workflow script could not be found (the plugin may be installed outside the current working directory) and **stop** — do not pass a guessed path to `Workflow`.
2. Call the **`Workflow`** tool with:
   - `scriptPath`: the absolute path to `epic-swarm-workflow.js` from step 1
   - `args`: `$ARGUMENTS` — passed verbatim as a single string (e.g. `PRO-42 --dry-run`). The script parses the epic ID and flags itself.
3. Do **not** author or inline the script or pass a `script` body — run the bundled file via `scriptPath` so users get the version-controlled, reviewed workflow.
4. When the workflow finishes, relay its final summary (done / blocked / unprocessed tickets, epic branch, PR URL) to the user.

## Usage and behavior

- **Argument (required):** a Linear epic ID — e.g. `/pm-vibecode-ops:epic-swarm-workflow PRO-42`. It **must** be a Linear issue ID (e.g. `PRO-42`), supplied as the first argument or via `--epic`. A descriptive phrase is **not** accepted as the epic: a first argument that isn't an ID fails fast with a usage error, and an ID buried later in free-text guidance never becomes the target. The epic is also **resolved against Linear before any branch/worktree is created** — an epic that doesn't resolve fails fast with nothing created, and the workflow will never "recover" to a different epic (e.g. the currently checked-out branch's).
- **Flags:**
  - `--epic <ID>` — the epic to run, as an explicit flag (equivalent to passing the ID as the first argument). Useful when the first token would otherwise be ambiguous.
  - `--dry-run` — classify each ticket into NO_CODE / SMALL / STANDARD and print the tier plan; make **no** code changes.
  - `--push` — push the epic branch and open the epic PR. Default is **local-only** (a local `epic/<id>` branch is created and tickets merge into it locally; nothing is pushed).
  - `--no-push` — explicitly force local-only (the inverse of `--push`). This is already the default, so it only matters to override a `--push` elsewhere in the same invocation; the last of `--push` / `--no-push` wins.
  - `--in-place` — integrate in the **main working tree** instead of a dedicated worktree (legacy behavior). Not concurrency-safe and disturbs your current checkout — use only when you specifically want the old single-run mode. As a guard, it now **refuses to start** if the main tree is dirty or on a branch that isn't main/master, the default branch, or the epic branch (it likely belongs to another agent — checking out would hijack it).
  - `--max-tickets N` — cap scope to the first N tickets (use for a cheap first run to gauge cost). `N` must be ≥ 1 (`--max-tickets 0` is rejected, since it would process nothing).
  - `--skills a,b,c` — comma-separated skills every code-touching agent must load (via the `Skill` tool / SKILL.md) before working — for epics that conform code to a skill bundle (e.g. `--skills phoenix-tracing,phoenix-evals`).
  - `--context-file PATH` — a file (conventions, codegen commands, decision context) the setup agent reads and threads into every code-touching agent's guidance.
  - **Free-text guidance** — any plain text after the epic ID is threaded into every code-touching agent as operator guidance (e.g. `… PRO-42 reuse the existing Stripe client, don't add a new dep`). It is **never** silently dropped; a stray `--typo'd-flag` is surfaced as a warning, and the word "push" in guidance without an actual `--push` flag is warned about.
- **Requires dynamic workflows enabled** — a plan-gated research-preview feature. On Pro, turn on the "Dynamic workflows" row in `/config`. If it's disabled, the `Workflow` tool will not run.
- **Recommended session effort:** `high`. Per-agent effort is not configurable from a workflow; the script already routes models per phase — **Opus** for reasoning work (plan, adapt, implement, test, review, review-fix, codex, and both SMALL-tier agents — build & review), **Sonnet** for mechanical work (setup, docs, security, merge, the PR, and both NO-CODE-tier agents — build & review). Note that review-fix and the SMALL build/review run on Opus, so Opus spend is higher for SMALL-heavy epics than the short list above implies. Tune the `ROUTE` map at the top of the script.
- **Safety:** never merges to `main`/`master` — all work lands on the epic branch. Reviews and the security scan **fail closed** (a failed/empty review blocks the merge), and the merge gate uses a test-diff so pre-existing/flaky test failures never block a clean merge. A merge blocked by *new* test failures gets one bounded fix-forward pass (re-merge → fix at the root → re-gate) before it blocks, so a cross-file mock/fixture gap can't cascade-kill an epic.
- **Concurrency:** by default the whole epic integrates in a **dedicated git worktree** (`.swarm/epics/<id>`), never your main checkout — so you can run swarms for **different epics** in the same repo at once, and your working tree is left untouched. A per-epic lock refuses an accidental second run of the **same** epic. As a deterministic backstop the run captures your main tree's HEAD at setup and **asserts it is unchanged at finish** — if a stray checkout ever disturbed the shared tree (the concurrent-agent hijack class), it is flagged loudly in the summary's `main_tree_safety` field and `next_steps` rather than silently corrupting a colleague's checkout. (Note: this isolates *git* only — two epics writing the same local database/test backend still need separate data isolation.)

## Cost note

A full run spawns many subagents (roughly 4–8 per ticket, scaled to effort). For a first run, start with `--dry-run` to see the tier classification, then `--max-tickets 1` end-to-end to gauge spend before running a whole epic. The `/workflows` view shows live per-agent token usage and lets you stop the run at any time without losing completed work.

---
*Bundled dynamic workflow — source at `workflows/epic-swarm-workflow.js`. See [workflows/README.md](../workflows/README.md).*
