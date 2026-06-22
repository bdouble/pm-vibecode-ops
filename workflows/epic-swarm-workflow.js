/**
 * epic-swarm-workflow (v2) — a resilient, right-sized dynamic-workflow port of /epic-swarm.
 * Runs as `/epic-swarm-workflow <EPIC-ID> [--dry-run] [--push] [--no-push] [--max-tickets N]`.
 *   --no-push explicitly forces local-only (the default); it's the inverse of --push.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IT DOES
 *   setup + plan(+classify) ─▶ for each ticket (sequential, by tier):
 *      right-sized pipeline by effort tier ─▶ merge to epic branch ─▶ close
 *   ─▶ epic PR (with --push) + reconciled summary
 *
 * Each ticket is classified by the PLAN agent into one of three tiers, and the
 * script runs a pipeline sized to it. Per your constraint, EVERY tier uses at
 * least two work agents (a build/plan-implement agent and a SEPARATE reviewer)
 * plus a merge agent — no single agent does everything.
 *
 *   NO-CODE  (docs/comment/observation, no AC, no code change):
 *            build(Sonnet) → review(Sonnet, incl. security sanity) → merge
 *   SMALL    (<=~30 lines, 1-3 files, no schema/auth/API/new-deps):
 *            build=adapt+implement+test(Opus) → review=review+security(Opus) → merge
 *   STANDARD (real feature):
 *            adapt → implement → [test] → [docs] → review(1) → codex → security → merge
 *
 * The review HARD FLOOR (reviews are critical) is preserved for every tier
 * that changes code: a code-changing ticket cannot merge without a passing
 * review (and, for STANDARD, a passing security scan). codex is the cross-model
 * second opinion and runs on STANDARD tickets only (it is the slow/expensive
 * phase; a single strong Opus reviewer + cross-model codex beats three
 * same-model review lenses). codex auto-fixes land AFTER the review floor, so
 * whenever codex COMPLETES the correctness review is RE-RUN (with a fix pass) on
 * the new diff and still fails closed — the re-review is unconditional, never gated
 * on a self-reported fix count, so codex output never reaches merge unreviewed.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RESILIENCY (this is the headline of v2 — environment-independent)
 *   • safeAgent(): EVERY agent call is wrapped. A single agent failure
 *     (API 5xx, MCP hang, schema miss, timeout) NEVER aborts the run — it
 *     returns a sentinel, the ticket is recorded blocked, and the loop
 *     continues. A v1 run died at hour 13 because one transient 529 on a bare
 *     `await agent()` threw uncaught and discarded all completed work.
 *   • Per-ticket try/catch: any non-agent throw is contained to one ticket.
 *   • Reviews FAIL CLOSED: a null/failed review blocks the merge — it can
 *     never silently pass as APPROVED (a v1 bug: all review lenses 529'd →
 *     empty result → false APPROVED → unreviewed merge).
 *   • Incremental durability: each phase agent POSTS ITS OWN report to Linear
 *     at the end of its turn. There is no end-of-ticket batch poster, so a
 *     crash leaves every completed phase's report already on Linear.
 *   • Small schemas: the big markdown report is posted to Linear by the agent,
 *     NOT crammed into a structured-output field — this is what makes a model
 *     "write prose instead of calling StructuredOutput", the v1 crash mode.
 *   • Merge gate uses a TEST-DIFF: it blocks only on tests that NEWLY fail vs.
 *     a baseline captured at setup — pre-existing/flaky red suites (common in
 *     real repos) never block a clean merge. A merge blocked by NEW failures gets
 *     ONE bounded fix-forward pass (re-merge → fix the new failures at the root →
 *     re-gate) before it blocks, so a cross-file mock/fixture gap can't cascade-kill
 *     a whole epic; the per-ticket testing phase also runs the FULL suite when a
 *     ticket changes exports, moving that check LEFT of the merge.
 *   • Empty-diff is tier-aware: where code was EXPECTED (SMALL build, STANDARD
 *     implement/test/docs) an empty diff blocks as BLOCKED_EMPTY_DIFF (claimed-
 *     complete-but-produced-nothing); where it was NOT (NO-CODE, or a STANDARD ticket
 *     that produced no implementation AND ran neither testing nor docs) an empty diff
 *     is a benign NO_OP — closed, not blocked, never poisons deps. SMALL/STANDARD
 *     builds also get ONE git-verified empty-artifact retry, and build/impl agents
 *     self-verify their committed=true claim against `git diff` before reporting.
 *   • All phase gates FAIL CLOSED via a single allowlist helper (gate()): build/adapt/
 *     test/docs advance only on an explicit COMPLETE, reviews only on APPROVED (+PASS),
 *     security only on APPROVED with zero CRITICAL/HIGH. An unexpected, BLOCKED, or
 *     missing status never passes, and status fields are schema enums so a case/typo
 *     variant can't slip the allowlist.
 *   • Idempotent worktrees + resumable: each tier's first agent clears any stale
 *     worktree/branch of the same name (left by a prior interrupted run) BEFORE
 *     `git worktree add`, so a resume never collides. The end-of-run sweep is DERIVED
 *     (worktrees created minus those the merge agent cleaned up), so no block outcome —
 *     including a merge agent that never reported — can leak a worktree (branches kept).
 *   • Concurrency-safe by default: the WHOLE epic integrates in a DEDICATED git
 *     worktree (.swarm/epics/<id>), never the user's main working tree — so two swarms
 *     for DIFFERENT epics in one clone can't collide, and the main checkout is never
 *     disturbed. A per-epic lock refuses an accidental second run of the SAME epic
 *     (released by the finalize step). `--in-place` opts back into legacy main-tree
 *     integration (single-run only). Each per-ticket worktree installs deps AND runs
 *     codegen (a fresh worktree's gitignored generated/ is absent — imports fail without it).
 *   • Operator guidance is threaded, not dropped: free text after the epic ID
 *     (plus --skills / --context-file) is injected into every code-touching agent, so
 *     per-epic conventions / skill-loading need no script edit.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * MODEL ROUTING (aggressive Sonnet; Opus where reasoning matters)
 *   Opus:   plan, adapt, implement, test, review, review-fix, merge-fix, codex(driver),
 *           SMALL-tier build + review
 *   Sonnet: setup, documentation, security, merge, PR, all NO-CODE work
 *   Effort: per-agent effort is NOT a workflow API knob — it is inherited from
 *           the session. Launch the run at `high` (xhigh/ultracode ~doubles
 *           cost across 70+ agents for marginal gain). See ROUTE below.
 *
 * SAFETY DEFAULTS: local-only by default (creates epic/<id> in a DEDICATED worktree,
 * merges per-ticket locally, no push/PR). --push pushes the epic branch and opens the
 * PR. --in-place integrates in the main working tree instead (legacy; not concurrency-safe).
 * NEVER merges to main/master. This file is version-controlled at
 * workflows/ in the plugin and ships with it; the command wrapper resolves it
 * via ${CLAUDE_PLUGIN_ROOT}/workflows/epic-swarm-workflow.js.
 *
 * Each phase prompt names its canonical role (architect-agent, *-engineer-agent,
 * qa-engineer-agent, technical-writer-agent, code-reviewer-agent,
 * security-engineer-agent) as TEXT. agentType is intentionally NOT wired into the
 * agent() calls so the workflow also runs standalone (copied to
 * ~/.claude/workflows/), where the plugin's specialized agents aren't registered.
 */

export const meta = {
  name: 'epic-swarm-workflow',
  description: 'Resilient, right-sized epic swarm: per-ticket pipeline scaled to ticket effort, reviews fail-closed, every agent failure isolated',
  whenToUse: 'Run the core /epic-swarm pipeline over a Linear epic as a dynamic workflow, sizing each ticket’s phases to its effort while keeping a hard review floor for code changes and surviving any single-agent failure.',
  phases: [
    { title: 'Setup', detail: 'create local epic branch, detect build/test, capture baseline test failures; read epic + sub-tickets and classify each into NO-CODE/SMALL/STANDARD with a dependency tier (Opus)' },
    { title: 'Build', detail: 'per ticket, sized to tier: NO-CODE build (Sonnet); SMALL adapt+implement+test (Opus); STANDARD adapt → implement → [test] → [docs]' },
    { title: 'Review', detail: 'per ticket HARD FLOOR for code: single combined code review (Opus) → [codex cross-model, STANDARD only] → security scan (Sonnet); reviews fail closed' },
    { title: 'Integrate', detail: 'per ticket: merge to epic branch with a test-diff gate (block only on NEW failures), then mark the ticket Done' },
    { title: 'Report', detail: 'open/refresh the epic PR (with --push) and return a reconciled summary (done / blocked / unprocessed)' },
  ],
}

// ── Model routing. Change here to re-tune. ──────────────────────────────────
// `fable` is also a valid value — operators wanting maximum-capability reasoning
// phases can set e.g. plan/review/adapt to 'fable' (no default change; see
// docs/MODEL_CALIBRATION.md for the calibration evidence).
const M = { opus: 'opus', sonnet: 'sonnet' }
const ROUTE = {
  setup: M.sonnet,
  plan: M.opus,
  adapt: M.opus,
  implement: M.opus,
  test: M.opus,
  docs: M.sonnet,
  review: M.opus,
  reviewFix: M.opus,
  codex: M.opus,
  security: M.sonnet,   // merge gate — bump to M.opus for maximum rigor
  merge: M.sonnet,
  mergeFix: M.opus,     // fix-forward pass when a merge introduces NEW test failures (reasoning work, not mechanical)
  buildNoCode: M.sonnet,
  reviewNoCode: M.sonnet,
  buildSmall: M.opus,
  reviewSmall: M.opus,
  pr: M.sonnet,
}

// ── Canonical Linear report headers (match /execute-ticket & /close-epic). ──
const H = {
  adaptation: '## Adaptation Report',
  implementation: '## Implementation Report',
  testing: '## Testing Report',
  documentation: '## Documentation Report',
  codereview: '## Code Review Report',
  codex: '## Cross-Model Review Report',
  security: '## Security Scan Report (Pre-Merge)',
}

// ── Shared prompt blocks. ───────────────────────────────────────────────────
const SHELL_RULES = `SHELL POLICY — one action per Bash call, NO compound shell:
- NEVER chain with && , || or ;. The single most common violation is
  \`cd /path && pnpm test\` — this is FORBIDDEN. It bypasses the Bash allowlist
  and triggers permission prompts that stall the run.
- Use tool-native working-dir flags instead:
    FORBIDDEN: cd /wt && npx tsc --noEmit       USE: npx --prefix /wt tsc --noEmit
    FORBIDDEN: cd /wt && pnpm test              USE: pnpm -C /wt test
    FORBIDDEN: cd /wt && git status            USE: git -C /wt status
  If a tool lacks a dir flag, issue two serial Bash calls. Check every Bash
  call before sending it.
- Use ABSOLUTE paths. zsh: single-quote any path with [brackets] (Next.js
  dynamic routes) or use Read/Grep/Glob (they never invoke the shell); an
  unquoted bracket path fails AND cancels sibling parallel calls.`

const PROD = `PRODUCTION-CODE STANDARDS: no fallbacks masking errors, no temporary/workaround
code, no mocked code outside tests. Fail fast with specific errors. Implement exactly what
the ticket asks — no unrequested abstractions, surrounding cleanup, or flexibility for
hypothetical future requirements. If a proper fix needs a pre-existing bug fixed first,
STOP and report it.`

const NO_DEFER = `DEFERRAL POLICY: default disposition for in-scope work is "do it now".
Only defer an acceptance criterion under a genuinely catastrophic condition, and if
so include a justification block (condition, concrete external evidence, the specific
blocker). "Complex"/"tricky"/"takes time" are NOT valid reasons. The bar is symmetric:
do NOT add defensive runtime machinery (retries, sweeps, reconciliation jobs) no AC
asked for unless you can name the concrete OBSERVED failure it answers — otherwise
note the idea in your report's closure-log instead of building it.`

const GUARD = `CONVENTION GUARD: if your change establishes a convention — a pattern other
code must follow, a new "always/never" rule, a first instance meant to be copied — ship its
structural guard in the same commits: a lint rule, a source-scanning guard test, a drift
test, or a shrink-only ratchet allowlist (recipes: production-code-standards skill,
references/enforcement-ladder.md). A convention without its guard is an incomplete change.
Genuinely judgment-only rules get a [prose-only] tag plus one line on why no guard can
express them.`

const LINEAR_NOTE = `(Linear is exposed as mcp__linear-server__* or mcp__claude_ai_Linear__*; load whichever is present via ToolSearch.)`

// Each worker posts its OWN report to Linear (incremental durability). Keep the
// structured return SMALL — the full prose goes in the Linear comment.
function selfPost(t, header, first) {
  return `POST YOUR REPORT YOURSELF — at the end of your phase, create exactly ONE Linear comment on ${t.id}. ${LINEAR_NOTE}
Its body MUST begin with this exact line:
${header}
then your full structured report (markdown), then a final line: *Automated by /epic-swarm-workflow*.
${first ? `BEFORE starting work, set ticket ${t.id} state to "In Progress" in Linear.` : `Do NOT change the ticket's status.`}
If Linear is unavailable, log it and CONTINUE — never fail your phase over a Linear error.
Return ONLY the small structured result the schema asks for (status + counts + a one-line summary). Your full prose lives in the Linear comment, NOT in the structured fields.`
}

function acBlock(t) {
  const acs = (t.acceptance_criteria && t.acceptance_criteria.length) ? t.acceptance_criteria : null
  return `Acceptance Criteria (from planning):
${acs ? acs.map((c, i) => `${i + 1}. ${c}`).join('\n') : '(none captured — fetch the full ticket from Linear)'}
Scope note: ${t.scope_note || '(none)'}`
}

// Comments carry critical details and prior phases' full reports — ALWAYS read both
// the description AND the comments wherever a ticket is read.
function readTicket(t) {
  return `READ FOR CONTEXT FIRST (read-only): fetch Linear ${t.id} and read BOTH its full description AND all of its comments — comments routinely hold requirements and the complete reports posted by earlier workflow phases; never work from the description (or a one-line summary) alone. ${LINEAR_NOTE}`
}

// ── JSON schemas — deliberately SMALL (big prose goes to Linear, not here). ──
const SETUP_SCHEMA = {
  type: 'object', required: ['status', 'repo_root', 'epic_branch', 'default_branch'],
  properties: {
    status: { type: 'string', enum: ['OK', 'FAILED', 'LOCKED'], description: 'OK | FAILED | LOCKED (another live run owns this epic — abort)' },
    repo_root: { type: 'string', description: 'the epic-INTEGRATION tree the run operates in: the dedicated worktree (.swarm/epics/<id>) by default, or the main tree under --in-place' },
    main_repo: { type: 'string', description: 'the main repository working tree (parent of the dedicated worktree); equals repo_root under --in-place' },
    default_branch: { type: 'string' }, epic_branch: { type: 'string' },
    test_cmd: { type: 'string', description: 'detected test command, or empty' },
    pkg_mgr: { type: 'string' },
    baseline_failures: { type: 'array', items: { type: 'string' }, description: 'FULL identifiers (file + test name) of tests already FAILING on the epic branch before any merge — the merge test-diff gate matches on the whole identifier, not the file' },
    baseline_note: { type: 'string' },
    lock_path: { type: 'string', description: 'absolute path of the epic lock directory acquired (released by the finalize step); empty if not acquired' },
    lock_holder: { type: 'string', description: 'on LOCKED: who/when holds the lock, so the operator can resume that run or clear a stale lock' },
    context_text: { type: 'string', description: 'contents of --context-file if one was provided (capped); folded into operator guidance for the workers' },
  },
}
const PLAN_SCHEMA = {
  type: 'object', required: ['epic', 'tickets'],
  properties: {
    epic: { type: 'object', required: ['id', 'title'], properties: { id: { type: 'string' }, title: { type: 'string' } } },
    tickets: {
      type: 'array',
      items: {
        type: 'object', required: ['id', 'title', 'tier', 'effort_tier'],
        properties: {
          id: { type: 'string' }, title: { type: 'string' }, slug: { type: 'string' },
          tier: { type: 'integer', description: '1 = no deps; higher depends on lower' },
          depends_on: { type: 'array', items: { type: 'string' } },
          impl_type: { type: 'string', enum: ['backend', 'frontend'] },
          effort_tier: { type: 'string', enum: ['NO_CODE', 'SMALL', 'STANDARD'], description: 'NO_CODE: docs/comment/observation, no AC, no code change. SMALL: <=~30 lines, 1-3 files, no schema/auth/API/new-deps. STANDARD: everything else / any logic-behavior-API-auth-schema change.' },
          run_testing: { type: 'boolean', description: 'STANDARD only: run a dedicated testing phase (default true unless trivial)' },
          run_docs: { type: 'boolean', description: 'STANDARD only: run a documentation phase (true if user-facing surface or non-obvious logic)' },
          acceptance_criteria: { type: 'array', items: { type: 'string' }, description: 'VERBATIM acceptance criteria copied from the ticket (do not summarize)' },
          scope_note: { type: 'string', description: 'one line: what the ticket changes and why this tier' },
        },
      },
    },
    excluded: { type: 'array', items: { type: 'object' } },
  },
}
const WORK_SCHEMA = {
  type: 'object', required: ['status', 'summary', 'committed'],
  properties: {
    status: { type: 'string', enum: ['COMPLETE', 'BLOCKED', 'NEEDS_CONTEXT', 'ISSUES_FOUND'], description: 'COMPLETE | BLOCKED | NEEDS_CONTEXT | ISSUES_FOUND' },
    summary: { type: 'string', description: 'ONE-LINE summary (full report is in the Linear comment you posted)' },
    files_changed: { type: 'array', items: { type: 'string' } },
    write_calls: { type: 'integer' }, edit_calls: { type: 'integer' },
    no_code: { type: 'boolean', description: 'true if this ticket legitimately needs no implementation-phase code (pure verification/test-only/doc-only)' },
    committed: { type: 'boolean', description: 'REQUIRED. true ONLY if you actually committed AND `git diff EPIC...HEAD` is non-empty; false otherwise. Gates the empty-artifact retry and the post-fix re-review, so a missing/false value fails closed rather than passing phantom work.' },
    gates: { type: 'string', description: 'testing only: Gate #0/#1/#2/#3 PASS/FAIL one-liner' },
  },
}
const REVIEW_SCHEMA = {
  type: 'object', required: ['status'],
  properties: {
    status: { type: 'string', enum: ['APPROVED', 'CHANGES_REQUESTED', 'BLOCKED'], description: 'APPROVED | CHANGES_REQUESTED | BLOCKED' },
    blocking_findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, file: { type: 'string' }, issue: { type: 'string' } } } },
    security_status: { type: 'string', enum: ['PASS', 'FAIL'], description: 'SMALL/NO-CODE combined review only: PASS | FAIL for the folded security sanity' },
    convention_guard: { type: 'string', enum: ['NOT_APPLICABLE', 'GUARD_SHIPPED', 'PROSE_ONLY_TAGGED', 'MISSING'], description: 'optional summary of the convention-guard check; MISSING must also appear as a blocking_finding with status CHANGES_REQUESTED (the gate keys on status, not this field)' },
  },
}
// Combined code+security review (NO-CODE / SMALL): security_status is REQUIRED so the
// folded security floor can never pass by omission — the gate demands an explicit PASS.
const COMBINED_REVIEW_SCHEMA = {
  type: 'object', required: ['status', 'security_status'],
  properties: REVIEW_SCHEMA.properties,
}
const SECURITY_SCHEMA = {
  type: 'object', required: ['status'],
  properties: {
    status: { type: 'string', enum: ['APPROVED', 'CHANGES_REQUIRED', 'BLOCKED'], description: 'APPROVED (PASS, zero CRITICAL/HIGH) | CHANGES_REQUIRED | BLOCKED (FAIL)' },
    critical_high_count: { type: 'integer' },
  },
}
const CODEX_SCHEMA = {
  type: 'object', required: ['status'],
  properties: { status: { type: 'string', enum: ['COMPLETE', 'RATE_LIMITED', 'UNAVAILABLE'], description: 'COMPLETE | RATE_LIMITED | UNAVAILABLE' }, auto_fixed_count: { type: 'integer' } },
}
const MERGE_SCHEMA = {
  type: 'object', required: ['status'],
  properties: {
    status: { type: 'string', enum: ['MERGED', 'CONFLICT', 'TEST_FAILED', 'SKIPPED'], description: 'MERGED | CONFLICT | TEST_FAILED | SKIPPED' },
    integration_tests: { type: 'string', description: 'PASS | NEW_FAILURES | NONE' },
    new_failures: { type: 'array', items: { type: 'string' }, description: 'tests failing now whose FULL identifier is NOT in the baseline' },
    current_failures: { type: 'array', items: { type: 'string' }, description: 'ALL tests failing on the merged tree (full identifiers) — used to refresh the baseline after a clean merge' },
    ticket_closed: { type: 'boolean' }, notes: { type: 'string' },
  },
}
const PR_SCHEMA = { type: 'object', required: ['status'], properties: { status: { type: 'string' }, pr_url: { type: 'string' } } }

// Single fail-closed gate: a phase advances ONLY if its result exists AND its status is in the
// explicit allowlist. Centralizes the "fail closed via allowlist" invariant so no phase gate can
// drift to a denylist (a denylist `=== 'ISSUES_FOUND'` was shipped once and had to be corrected).
const gate = (result, ...allowed) => !!result && allowed.includes(result.status)

// ── safeAgent: no single agent failure may abort the run. ───────────────────
async function safeAgent(prompt, opts, fallback = null) {
  try {
    const r = await agent(prompt, opts)
    return r == null ? fallback : r
  } catch (e) {
    const msg = e && e.message ? e.message : String(e)
    log(`WARN agent [${opts && opts.label}] failed: ${msg.slice(0, 160)} — continuing with sentinel`)
    return fallback
  }
}

// ── Args ────────────────────────────────────────────────────────────────────
// Free text after the epic ID is NOT dropped (it used to be — see RC-4): it becomes
// operator GUIDANCE threaded into every code-touching agent prompt. So
// `/epic-swarm-workflow PRO-1667 make every agent load the arize phoenix skills` reaches
// the agents instead of vanishing. --skills/--guidance/--context-file are the explicit forms.
function parseArgs(a) {
  const flags = { dryRun: false, push: false, inPlace: false, maxTickets: Infinity, skills: [], contextFile: null, guidance: '' }
  let epicId = null
  const guidanceToks = []   // post-epic-ID free text + any unrecognized token — threaded, never silently dropped
  if (typeof a === 'string') {
    const toks = a.trim().split(/\s+/).filter(Boolean)
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i]
      if (tk === '--dry-run') flags.dryRun = true
      else if (tk === '--push') flags.push = true
      else if (tk === '--no-push') flags.push = false
      else if (tk === '--in-place') flags.inPlace = true   // legacy: integrate in the MAIN working tree (cannot run concurrently)
      else if (tk === '--max-tickets') {
        const v = toks[i + 1]
        // Require an explicit non-negative integer. A missing or non-numeric value is a
        // usage error, NOT a silent no-op: silently ignoring it would either swallow the
        // cap (and run the whole, expensive epic) or let the next token become the epic ID.
        if (v == null || !/^\d+$/.test(v)) throw new Error(`epic-swarm-workflow: --max-tickets requires a non-negative integer value (got ${v == null ? 'no value' : `"${v}"`}). Example: --max-tickets 3.`)
        flags.maxTickets = parseInt(v, 10); i++ // 0 is parsed here but rejected below
      }
      else if (tk.startsWith('--max-tickets=')) {
        const v = tk.split('=')[1]
        if (!/^\d+$/.test(v)) throw new Error(`epic-swarm-workflow: --max-tickets requires a non-negative integer value (got "${v}"). Example: --max-tickets=3.`)
        flags.maxTickets = parseInt(v, 10)
      }
      else if (tk === '--skills') {
        const v = toks[i + 1]
        if (v == null || v.startsWith('--')) throw new Error('epic-swarm-workflow: --skills requires a comma-separated list (e.g. --skills phoenix-tracing,phoenix-evals).')
        flags.skills.push(...v.split(',').map((s) => s.trim()).filter(Boolean)); i++
      }
      else if (tk.startsWith('--skills=')) flags.skills.push(...tk.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean))
      else if (tk === '--context-file') {
        const v = toks[i + 1]
        if (v == null || v.startsWith('--')) throw new Error('epic-swarm-workflow: --context-file requires a path (e.g. --context-file docs/epic-context.md).')
        flags.contextFile = v; i++
      }
      else if (tk.startsWith('--context-file=')) flags.contextFile = tk.split('=')[1]
      else if (tk.startsWith('--guidance=')) guidanceToks.push(tk.slice('--guidance='.length))
      else if (!tk.startsWith('--') && !epicId) epicId = tk
      else guidanceToks.push(tk)   // free text after the epic ID, or an unrecognized --flag: keep it (threaded as guidance + warned below), never drop
    }
    flags.guidance = guidanceToks.join(' ').trim()
  } else if (a && typeof a === 'object') {
    epicId = a.epicId || a.epic || a.id || null
    if (a.dryRun) flags.dryRun = true
    if (a.push) flags.push = true
    if (a.inPlace) flags.inPlace = true
    if (a.guidance) flags.guidance = String(a.guidance)
    if (Array.isArray(a.skills)) flags.skills = a.skills.map(String)
    else if (typeof a.skills === 'string') flags.skills = a.skills.split(',').map((s) => s.trim()).filter(Boolean)
    if (a.contextFile) flags.contextFile = String(a.contextFile)
    if (a.maxTickets != null) {
      // Coerce + validate (object callers may pass a string like '0'/'2' or a negative).
      // Without this, '2' bypasses Number.isFinite below (cap silently dropped → whole epic),
      // and -1 reaches slice(0, -1) (silently drops the last ticket).
      const n = Number(a.maxTickets)
      if (!Number.isInteger(n) || n < 0) throw new Error(`epic-swarm-workflow: maxTickets must be a non-negative integer (got ${JSON.stringify(a.maxTickets)}).`)
      flags.maxTickets = n
    }
  }
  return { epicId, flags }
}
const { epicId, flags } = parseArgs(args)
if (!epicId) throw new Error('epic-swarm-workflow: missing epic ID. Usage: /epic-swarm-workflow <EPIC-ID> [--dry-run] [--push] [--no-push] [--in-place] [--max-tickets N] [--skills a,b,c] [--context-file PATH] [free-text guidance…]')
if (flags.maxTickets === 0) throw new Error('epic-swarm-workflow: --max-tickets 0 would process no tickets. Omit the flag to run all tickets, or pass a positive count (e.g. --max-tickets 1).')

// Single source of truth for a ticket's worktree path AND feature branch name —
// used by setup, merge, and cleanup so the three can never drift apart.
function ticketRefs(root, t) {
  // Sanitize the planner-supplied slug into a valid git ref component. The planner is asked for
  // a kebab slug but nothing enforces it; an unsanitized slug with spaces/metachars would make
  // `git worktree add -b feature/<id>-<slug>` fail AND split the surrounding shell args. Lowercase,
  // keep only [a-z0-9], collapse runs to a single '-', trim leading/trailing '-', fall back to 'work'.
  const slug = String(t.slug || 'work').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'work'
  return { wt: `${root}/.swarm/worktrees/${t.id}`, branch: `feature/${t.id}-${slug}` }
}

function wtSetup(root, epicBranch, t) {
  const { wt, branch } = ticketRefs(root, t)
  // Pull only under --push: in that mode the epic branch may exist on the remote, so
  // fast-forward it. In the default local-only mode the epic branch was NEVER pushed, so
  // `pull origin <epicBranch>` always fails ("couldn't find remote ref") — skip it entirely
  // rather than run a guaranteed-failing command on every ticket.
  const syncStep = flags.push
    ? `- git -C ${root} pull --ff-only origin ${epicBranch}   — BEST-EFFORT: treat any non-zero exit (branch not yet on the remote / no remote) as a no-op and CONTINUE; do not retry or report it as a failure.\n`
    : ''
  return `Create your worktree off the CURRENT epic branch (so it includes all prior merged tickets), from REPO_ROOT ${root}:
- git -C ${root} checkout ${epicBranch}
${syncStep}- IDEMPOTENT RESET — a prior interrupted run may have left a stale worktree and/or branch with these EXACT names, which would make the \`worktree add\` below fail ("already exists"). Clear them first; run each as its OWN Bash call and IGNORE "not a working tree"/"not found"/"no such branch" errors:
    git -C ${root} worktree remove ${wt} --force
    git -C ${root} worktree prune
    git -C ${root} branch -D ${branch}
- git -C ${root} worktree add ${wt} -b ${branch} ${epicBranch}
- install dependencies in the worktree with a dir flag (e.g. pnpm -C ${wt} install --frozen-lockfile, retrying once without --frozen-lockfile on a lockfile-drift failure).
- THEN run the repo's CODEGEN — a fresh worktree's gitignored generated output is ABSENT and imports will FAIL without it: any package.json script named generate/codegen, and \`prisma generate\` if a prisma/schema.prisma exists (e.g. pnpm -C ${wt} --filter @repo/database generate). Skip only if the repo has no codegen.
Operate EXCLUSIVELY inside ${wt} using absolute paths.`
}

// Order tickets so each one runs AFTER every in-batch ticket it depends_on — a
// real topological sort, not just (tier, id), so a worktree branched off the epic
// branch always includes its dependencies' merged code. Stable base order is
// (tier, id); duplicate ids collapse to one; cycles are broken best-effort
// (cycle members keep their base order). depends_on entries outside the batch are
// ignored (those tickets are already Done / out of scope).
function topoSortTickets(list) {
  const byId = new Map(list.map((t) => [String(t.id), t]))
  const base = [...list].sort((a, b) => ((a.tier || 0) - (b.tier || 0)) || String(a.id).localeCompare(String(b.id)))
  const placed = new Set()
  const stack = new Set()
  const out = []
  const visit = (t) => {
    const id = String(t.id)
    if (placed.has(id) || stack.has(id)) return // already placed, or a dependency cycle — stop recursing
    stack.add(id)
    for (const dep of (t.depends_on || [])) {
      const d = byId.get(String(dep))
      if (d) visit(d)
    }
    stack.delete(id)
    if (!placed.has(id)) { placed.add(id); out.push(t) }
  }
  for (const t of base) visit(t)
  return out
}

// ═══════════════════════════════════ Setup + Plan (parallel; independent) ════
phase('Setup')
// ISO = the default: the whole epic integrates in a DEDICATED git worktree (.swarm/epics/<id>) so it
// never moves the user's main working tree and concurrent swarms for OTHER epics can't collide (RC-1).
// --in-place opts back into the legacy main-tree integration (single-run only). dry-run touches no tree.
const ISO = !flags.inPlace && !flags.dryRun
log(`epic-swarm-workflow v2 starting for ${epicId} — mode: ${flags.dryRun ? 'DRY RUN (no changes)' : (flags.push ? 'real + push/PR' : 'real, local-only')}${ISO ? ' — isolated in a dedicated epic worktree' : (flags.inPlace ? ' — IN-PLACE (main working tree; NOT concurrency-safe)' : '')}`)

// Operator guidance (RC-4): never silently dropped. Build the block injected into every code-touching
// agent; warn on the two footguns the old silent-drop hid (a typo'd flag, and "push" intent in prose).
const strayFlags = flags.guidance.split(/\s+/).filter((w) => w.startsWith('--'))
if (strayFlags.length) log(`WARN unrecognized flag(s) ${strayFlags.join(' ')} were not parsed as options — threading them into agent guidance as text. Check for a typo if you meant a real flag.`)
if (flags.guidance) log(`Operator guidance threaded into agents: "${flags.guidance.slice(0, 200)}${flags.guidance.length > 200 ? '…' : ''}"`)
if (flags.skills.length) log(`Skills every code-touching agent will load first: ${flags.skills.join(', ')}`)
if (!flags.push && /\bpush\b/i.test(flags.guidance)) log('WARN your guidance mentions "push" but --push was NOT passed — running LOCAL-ONLY (no push/PR). Re-run with --push to push the epic branch and open the PR.')
const skillsDirective = flags.skills.length
  ? `LOAD THESE SKILLS FIRST (before any code work): ${flags.skills.join(', ')}. Invoke each via the Skill tool (e.g. Skill ${flags.skills[0]}); if the Skill tool is unavailable to you, locate and read that skill's SKILL.md before proceeding. Conform your work to them — do NOT work from memory or paraphrase their conventions.`
  : ''
// GUIDANCE_BASE is available pre-setup (flags only) so the planner gets it. The per-ticket workers use
// the fuller GUIDANCE (built after setup) which also folds in any --context-file contents setup read.
const GUIDANCE_BASE = (skillsDirective || flags.guidance)
  ? `OPERATOR GUIDANCE FOR THIS EPIC (mandatory — applies to your work; follow it, and prefer it over your defaults where they conflict):\n${[flags.guidance, skillsDirective].filter(Boolean).join('\n')}`
  : ''

const setupPrompt = `You are the swarm setup agent for epic ${epicId}.${ISO ? ' This run integrates the ENTIRE epic inside a DEDICATED git worktree, so it never disturbs the main working tree and can run concurrently with swarms for OTHER epics.' : ''}
${SHELL_RULES}

Do exactly this and report. (<MAIN_REPO>, <REPO_ROOT>, <EPIC_ROOT>, <LOCK> below are values YOU resolve — substitute the real absolute paths; never type the angle brackets into a command.)
1. MAIN_REPO = the FIRST path printed by \`git worktree list\` (the main working tree is always listed first — robust whether this run was launched from the main tree or a worktree). Confirm it is a git repo.
2. default_branch = strip "refs/remotes/origin/" from \`git -C <MAIN_REPO> symbolic-ref refs/remotes/origin/HEAD\`; if that fails, "main".
${flags.dryRun
  ? `3. DRY RUN — acquire NO lock, create NO branch/worktree, install NOTHING: set REPO_ROOT = MAIN_REPO, detect the test command (step 7 form, but do NOT run it), and report with baseline_failures = [], lock_path = "". Skip steps 4–8.`
  : `3. ACQUIRE THE EPIC LOCK (stops a SECOND concurrent run of THIS SAME epic from colliding on the branch/worktrees/tickets): LOCK = \`<MAIN_REPO>/.swarm/.locks/${epicId}.lock\`. \`mkdir -p <MAIN_REPO>/.swarm/.locks\`, then attempt an ATOMIC acquire with \`mkdir <LOCK>\` (mkdir fails if it already exists — that IS the lock):
   - mkdir SUCCEEDS → you hold it. Record \`date -u +%FT%TZ\` plus " ${epicId}" into \`<LOCK>/info\` (Write is fine). Continue.
   - mkdir FAILS (exists) → check staleness: \`find <LOCK> -maxdepth 0 -mmin +1440\` (older than 24h). If it PRINTS the path (stale): log it, overwrite \`<LOCK>/info\`, continue. If it prints NOTHING (fresh — another run likely owns this epic): STOP — return status=LOCKED, lock_holder = the contents of \`<LOCK>/info\`, and a baseline_note telling the operator to resume the in-flight run (preferred) or, if certain none is active, clear it with \`rm -rf <LOCK>\` and re-run. Create NO branch/worktree.
4. ${ISO
    ? `CREATE-OR-REUSE the dedicated epic-integration worktree EPIC_ROOT = \`<MAIN_REPO>/.swarm/epics/${epicId}\` holding branch epic/${epicId} (IDEMPOTENT — a prior/interrupted run may have created it; NEVER destroy prior epic-branch work):
   a. \`git -C <MAIN_REPO> fetch origin\` — BEST-EFFORT (ignore non-zero / no remote).
   b. If EPIC_ROOT already appears in \`git -C <MAIN_REPO> worktree list\`: REUSE it — \`git -C <EPIC_ROOT> checkout epic/${epicId}\`, then go to step 5.
   c. Else \`git -C <MAIN_REPO> worktree prune\`, then: if epic/${epicId} exists locally (\`git -C <MAIN_REPO> branch --list epic/${epicId}\`) or on origin (\`git -C <MAIN_REPO> ls-remote --heads origin epic/${epicId}\`), create the worktree FROM it: \`git -C <MAIN_REPO> worktree add <EPIC_ROOT> epic/${epicId}\`. Otherwise create a fresh epic branch off the default: \`git -C <MAIN_REPO> worktree add <EPIC_ROOT> -b epic/${epicId} origin/<default_branch>\` (fall back to local <default_branch> if origin/<default_branch> is unknown).
   d. Confirm \`git -C <EPIC_ROOT> rev-parse --abbrev-ref HEAD\` prints epic/${epicId} and is NOT main/master. REPO_ROOT = EPIC_ROOT for the rest of the run. If creation FAILED, release the lock (\`rm -rf <LOCK>\`) and return status=FAILED with the reason.`
    : `IN-PLACE: REPO_ROOT = MAIN_REPO. Create + checkout the epic branch in the main tree: \`git -C <MAIN_REPO> fetch origin\` (ignore if no remote); if epic/${epicId} exists check it out, else \`git -C <MAIN_REPO> checkout -b epic/${epicId} <origin/default-or-default>\`. NEVER touch main/master. Verify you are not on main/master.`}
5. Ensure \`.swarm/\` is gitignored: if \`git -C <REPO_ROOT> check-ignore .swarm/\` fails, append a line ".swarm/" to <REPO_ROOT>/.gitignore via Edit/Write.
6. PREPARE REPO_ROOT so its tests can run${ISO ? " — a FRESH worktree has NO installed deps and NO generated artifacts" : ''}: detect the package manager from lockfiles and install deps with a dir flag (e.g. \`pnpm -C <REPO_ROOT> install --frozen-lockfile\`, retrying once WITHOUT --frozen-lockfile on a lockfile-drift failure; \`npm --prefix <REPO_ROOT> ci\`; \`yarn --cwd <REPO_ROOT> install\`).${ISO ? " THEN run the repo's CODEGEN — a fresh worktree's gitignored generated output is ABSENT and imports will FAIL without it: run any package.json script named generate/codegen, and \`prisma generate\` if a prisma/schema.prisma exists (e.g. \`pnpm -C <REPO_ROOT> --filter @repo/database generate\` in a pnpm monorepo). If the operator guidance / context file names exact codegen commands, run THOSE." : ' (the main tree is normally already installed — skip the install unless imports fail).'}
${flags.contextFile ? `   CONTEXT FILE: read \`${flags.contextFile}\` (resolve relative to MAIN_REPO if not absolute) and return its contents (capped ~4000 chars) in context_text — it carries operator conventions / codegen steps for this epic; if it names setup/codegen commands, run them in step 6. If the file does not exist, say so in baseline_note and continue.\n` : ''}7. Detect the TEST command, expressed to run from ANY directory WITHOUT a \`cd\`, baked against the absolute REPO_ROOT: e.g. \`pnpm -C <REPO_ROOT> test\`, \`npm --prefix <REPO_ROOT> test\`, \`yarn --cwd <REPO_ROOT> test\`, \`cargo test --manifest-path <REPO_ROOT>/Cargo.toml\`, \`go -C <REPO_ROOT> test ./...\`, \`python -m pytest <REPO_ROOT>\`. Substitute the real absolute path. The command MUST NOT require cd (downstream agents run it verbatim under a no-cd shell policy). Empty string if no test setup exists.
8. BASELINE: if a test command exists, run it ONCE on REPO_ROOT (the epic branch) and record the set of ALREADY-FAILING tests as baseline_failures using FULL test identifiers (file + test name, e.g. "src/auth.test.ts :: rejects expired token"), NOT bare file paths — the merge gate matches on the whole identifier, so a file-only baseline would mask a NEW failure in a file that already had a different failure. If the suite is huge or hangs, capture what you can and note it. If no test command, baseline_failures = [].`}

${flags.dryRun ? '' : 'SAFETY: if at ANY point after acquiring the lock you must return status=FAILED, release the lock FIRST with `rm -rf <LOCK>` (so a re-run is not blocked by a lock from a setup that never started a run).\n'}Return status, repo_root (= ${ISO ? 'the dedicated EPIC_ROOT' : 'MAIN_REPO'}), main_repo (= MAIN_REPO), default_branch, epic_branch (epic/${epicId}), test_cmd, pkg_mgr, baseline_failures[], baseline_note, lock_path (= <LOCK>${flags.dryRun ? ', empty in dry run' : ''})${flags.contextFile ? ', context_text' : ''}.`

const planPrompt = `You are the swarm planning + classification agent for epic ${epicId}. READ-ONLY: do not modify Linear.
${LINEAR_NOTE}
${GUIDANCE_BASE ? GUIDANCE_BASE + '\n' : ''}
1. Fetch epic ${epicId} and read its full description AND all of its comments. List its sub-tickets (parent filter); for EACH sub-ticket read BOTH its full description AND all of its comments (comments routinely hold requirements and prior-work notes you must factor into classification), and capture: id, title, status, labels, description, acceptance criteria.
2. INCLUDE sub-tickets in Todo/Backlog/Unstarted AND In-Progress (an In-Progress sub-ticket is normally a prior interrupted run of THIS workflow that must be resumed — do not orphan it). EXCLUDE (report under excluded[] with reason) only Done/Cancelled.
3. For each included ticket derive:
   - depends_on[], a kebab slug, impl_type (backend: API/db/server/endpoint/migration; frontend: UI/component/page/CSS), tier (topological depth; tickets predicting the SAME file as another in the same tier go to a higher tier).
   - acceptance_criteria[]: copy the ticket's ACs VERBATIM (do not summarize) — downstream agents rely on these.
   - scope_note: one line on what it changes and why the tier below.
   - effort_tier — classify HONESTLY (this governs how much pipeline runs):
       NO_CODE  = docs-only / comment-only / observation / config-or-lockfile, NO acceptance criteria, and NO change to logic/behavior/API/auth/validation/data-flow. (A P3 "informational, not a regression, no code change" ticket is NO_CODE even if the surface sounds technical.)
       SMALL    = a real but tiny code change: <=~30 net lines, 1-3 files, no schema (DB/GraphQL/OpenAPI/Zod) change, no auth/authorization change, no new public API, no new dependency.
       STANDARD = anything else, or any ticket touching logic/behavior/API/auth/validation/schema/data-flow, or with multiple ACs.
   - run_testing (STANDARD only): true unless the change is trivial.
   - run_docs (STANDARD only): true if there is a user-facing surface or non-obvious logic worth a "why".
4. Sort tickets by tier then id.

Return epic{id,title}, tickets[], excluded[].`

const [setup, plan] = await parallel([
  () => safeAgent(setupPrompt, { schema: SETUP_SCHEMA, label: `setup ${epicId}`, phase: 'Setup', model: ROUTE.setup }),
  () => safeAgent(planPrompt, { schema: PLAN_SCHEMA, label: `plan ${epicId}`, phase: 'Setup', model: ROUTE.plan }),
])

// Same-epic concurrent run: setup refused the lock. Abort cleanly (it created nothing) and tell the
// operator to resume the in-flight run rather than start a colliding second one.
if (setup && setup.status === 'LOCKED') throw new Error(`epic-swarm-workflow: epic ${epicId} is already owned by another live run (lock holder: ${setup.lock_holder || 'unknown'}). Resume that run instead of starting a second one; or, if you are certain none is active, clear the stale lock (${setup.lock_path ? `rm -rf ${setup.lock_path}` : `remove <repo>/.swarm/.locks/${epicId}.lock`}) and re-run.`)
if (!setup || setup.status !== 'OK') throw new Error(`epic-swarm-workflow: setup failed — ${setup ? (setup.baseline_note || `status=${setup.status || 'unknown'} (setup agent returned no detail)`) : 'no result from setup agent'}`)
if (!plan || !plan.tickets || plan.tickets.length === 0) throw new Error(`epic-swarm-workflow: no eligible sub-tickets for ${epicId}.`)

const REPO_ROOT = setup.repo_root           // the epic-INTEGRATION tree: the dedicated worktree (default) or the main tree (--in-place)
const MAIN_REPO = setup.main_repo || REPO_ROOT // the user's main working tree; equals REPO_ROOT under --in-place. Used for the lock path + the end-of-run worktree note.
const LOCK_PATH = setup.lock_path || ''     // epic lock to release in the finalize step ('' in dry run / --in-place legacy where setup didn't report it)
const EPIC_BRANCH = setup.epic_branch || `epic/${epicId}`
const DEFAULT_BRANCH = setup.default_branch || 'main' // PR base; default_branch is now REQUIRED in SETUP_SCHEMA, the 'main' fallback only guards an empty string
const TEST_CMD = setup.test_cmd || ''
// Full operator-guidance block for the per-ticket workers (RC-4). The planner already received
// GUIDANCE_BASE; this also folds in any --context-file contents the setup agent read.
const GUIDANCE = (() => {
  const ctx = (setup.context_text && flags.contextFile) ? `PROJECT CONTEXT FILE (${flags.contextFile}):\n${setup.context_text}` : ''
  if (GUIDANCE_BASE && ctx) return `${GUIDANCE_BASE}\n${ctx}`
  if (GUIDANCE_BASE) return GUIDANCE_BASE
  if (ctx) return `OPERATOR GUIDANCE FOR THIS EPIC (mandatory — follow it):\n${ctx}`
  return ''
})()
// Mutable: refreshed to the post-merge failing set after each clean merge so a ticket that FIXES
// a pre-existing failure shrinks the baseline for subsequent tickets (the merges are sequential).
let BASELINE = setup.baseline_failures || []

// De-duplicate ticket ids the planner may emit more than once (keep first) so
// done/blocked can't double-count and reconciliation stays accurate.
const dedupTickets = []
const seenPlanIds = new Set()
for (const t of plan.tickets) {
  const id = String(t.id)
  if (seenPlanIds.has(id)) { log(`WARN planner emitted duplicate ticket id ${id} — keeping the first, ignoring the duplicate.`); continue }
  seenPlanIds.add(id); dedupTickets.push(t)
}
// Topological order honors depends_on; maxTickets then keeps the first N, which is
// dependency-closed because deps always sort before dependents.
let tickets = topoSortTickets(dedupTickets)
if (Number.isFinite(flags.maxTickets) && tickets.length > flags.maxTickets) {
  log(`Capping to first ${flags.maxTickets} of ${tickets.length} tickets (--max-tickets).`)
  tickets = tickets.slice(0, flags.maxTickets)
}
const tierCounts = tickets.reduce((m, t) => ((m[t.effort_tier] = (m[t.effort_tier] || 0) + 1), m), {})
log(`Plan: ${plan.epic.title} — ${tickets.length} ticket(s). Tiers: ${JSON.stringify(tierCounts)}. Baseline pre-existing failures: ${BASELINE.length}.`)
if (!TEST_CMD) log(`WARN no test command detected — per-ticket review still runs, but merges will NOT be integration-verified, so cross-ticket semantic breakage can go undetected${flags.push ? ' — and with --push each unverified merge is pushed to the epic branch immediately. Strongly consider configuring a test command before a --push run' : ''}.`)

if (flags.dryRun) {
  log('DRY RUN — returning classification only, no code changes.')
  return {
    epic: { id: epicId, title: plan.epic.title }, mode: 'dry-run',
    plan: tickets.map((t) => ({ id: t.id, title: t.title, tier: t.tier, effort_tier: t.effort_tier, impl_type: t.impl_type, run_testing: t.run_testing, run_docs: t.run_docs, scope_note: t.scope_note })),
    excluded: plan.excluded || [], baseline_failures: BASELINE,
    next_steps: 'Re-run without --dry-run to execute. Add --push to open the epic PR.',
  }
}

// ═══════════════════════════════════ Per-ticket sequential pipeline ══════════
const results = []
const blocked = new Set()
const mergedIds = new Set()
// Worktree lifecycle, tracked precisely so the end-of-run sweep is DERIVED, not a hand-listed
// outcome allowlist that silently drops new block outcomes: a ticket's worktree is created when
// its first agent runs wtSetup (createdWorktreeIds) and removed when the merge agent runs its
// always-cleanup step (mergeCleanedIds). The leak set is exactly created − merge-cleaned.
const createdWorktreeIds = new Set()
const mergeCleanedIds = new Set()

// Shared merge tail (empty-diff guard → test-diff gate → close → always-cleanup) for
// every tier that reaches merge. `expectsCode` is true when this tier was supposed to
// produce a code change (SMALL, or STANDARD with implementation): then an empty diff is
// an ANOMALY and blocks. When false (NO-CODE, or a no_code STANDARD ticket) an empty
// diff is a legitimate no-op — the ticket is closed, recorded NO_OP, and does NOT block
// its dependents.
async function mergeTicket(t, ticketResult, expectsCode) {
  phase('Integrate')
  const { wt, branch } = ticketRefs(REPO_ROOT, t)
  const emptyDiffStep = expectsCode
    ? `If the feature branch changed NOTHING, set STATUS = SKIPPED (notes: "empty diff — nothing to merge, but code WAS expected for this ticket"); do NOT merge or close; go to step 7.`
    : `This ticket may legitimately require NO code change. If the feature branch changed NOTHING, set STATUS = SKIPPED (notes: "empty diff — no change required"), then set ${t.id} to "Done" in Linear and set ticket_closed=true ONLY if that succeeds (on a Linear error leave it false and CONTINUE); do NOT merge; go to step 7.`
  let merge = await safeAgent(
    `You are the integration agent for ${t.id}. Merge its work to the epic branch using a TEST-DIFF gate that ignores pre-existing failures, then close it. Track a STATUS as you go and ALWAYS run the final CLEANUP step before returning — NEVER return early.
${SHELL_RULES}

1. Safety: confirm NOT on main/master. \`git -C ${REPO_ROOT} checkout ${EPIC_BRANCH}\`.
2. Empty-diff pre-check: \`git -C ${REPO_ROOT} diff --stat ${EPIC_BRANCH}...${branch}\`. ${emptyDiffStep}
3. Dry-merge (no commit yet): \`git -C ${REPO_ROOT} merge --no-ff --no-commit ${branch}\`. If CONFLICT: \`git -C ${REPO_ROOT} merge --abort\`, set STATUS = CONFLICT, go to step 7.
4. ${TEST_CMD ? `Run integration tests on the merged tree: \`${TEST_CMD}\` (this command already includes its directory flag — run it VERBATIM, do NOT prepend cd; tee its output to \`${REPO_ROOT}/.swarm/test-results/${t.id}-merge.txt\` after \`mkdir -p ${REPO_ROOT}/.swarm/test-results\`, so THIS ticket's failure evidence is NOT overwritten by the next ticket's merge — do not rely on any shared/default reporter path). Record current_failures = the FULL set of tests failing now (full identifiers: file + test name). Compare against this BASELINE of pre-existing failures captured before any merge:
${BASELINE.length ? BASELINE.map((b) => `   - ${b}`).join('\n') : '   (baseline was clean — any failure is new)'}
   new_failures = tests in current_failures whose FULL identifier is NOT in the baseline (match on the WHOLE identifier, NOT just the file — a new failure in a file that already had a different failure still counts as new).
   - If new_failures is EMPTY: commit the merge (\`git -C ${REPO_ROOT} commit --no-edit\`), STATUS = MERGED, integration_tests = PASS (note any pre-existing failures you ignored), and return current_failures.
   - If new_failures NON-EMPTY: \`git -C ${REPO_ROOT} merge --abort\`, integration_tests = NEW_FAILURES, STATUS = TEST_FAILED, list them in new_failures, go to step 7. Do NOT close the ticket.` : 'No test command was detected — commit the merge (\`git -C ' + REPO_ROOT + ' commit --no-edit\`), STATUS = MERGED, integration_tests = NONE. NOTE in notes that this merge was NOT integration-verified (no test command).'}
5. If STATUS = MERGED${flags.push ? `: push \`git -C ${REPO_ROOT} push origin ${EPIC_BRANCH}\`.` : ' do NOT push (local-only).'}
6. If STATUS = MERGED: set ${t.id} to "Done" in Linear and set ticket_closed=true ONLY if that succeeds. ${LINEAR_NOTE} If Linear is unavailable, log it, leave ticket_closed=false, and CONTINUE — do NOT change STATUS away from MERGED over a Linear error (the code is already merged).
7. CLEANUP — ALWAYS, for EVERY status (MERGED / CONFLICT / TEST_FAILED / SKIPPED): \`git -C ${REPO_ROOT} worktree remove ${wt} --force\` (ignore errors).

Return status (= STATUS: MERGED | CONFLICT | TEST_FAILED | SKIPPED), integration_tests, new_failures[], current_failures[], ticket_closed (true only if set to Done), notes.`,
    { schema: MERGE_SCHEMA, label: `merge ${t.id}`, phase: 'Integrate', model: ROUTE.merge },
  )
  // The merge agent runs its ALWAYS-cleanup step (7) whenever it executes, so a non-null report
  // means the worktree was removed. Only a null report (agent threw/hung) leaves a leak for the
  // end-of-run sweep — which is why the sweep is derived from created − cleaned, not an outcome list.
  if (merge) mergeCleanedIds.add(t.id)

  // FIX-FORWARD (RC-2): a merge blocked ONLY by NEW test failures — most often cross-file mock/fixture
  // breakage a ticket's own targeted tests can't see — gets ONE bounded Opus repair pass that re-merges,
  // fixes the new failures at the root, and re-runs the SAME test-diff gate. It merges only on a CLEAN
  // re-gate; otherwise the ticket stays blocked (fail closed). This is the analog of reviewWithFixPass /
  // buildWithEmptyRetry and is exactly what would have rescued the PRO-1666 cascade (a mock-coverage gap
  // that cascade-skipped a whole epic). The original merge agent already aborted+cleaned, so REPO_ROOT is
  // back on the epic branch and the feature BRANCH still exists — the fix agent just re-merges it.
  if (merge && merge.status === 'TEST_FAILED' && (merge.new_failures || []).length) {
    log(`${t.id} merge → ${merge.new_failures.length} NEW test failure(s) — one fix-forward pass, then re-gate (fail closed).`)
    const fix = await safeAgent(
      `You are the merge FIX-FORWARD agent for ${t.id}. A prior merge of its feature branch ${branch} into ${EPIC_BRANCH} was blocked because the MERGED tree had NEW test failures (absent from the baseline). Most often this is CROSS-FILE breakage the per-ticket tests can't see — this ticket added or renamed an exported symbol and other files' mock factories (vi.mock/jest.mock) or importers were not updated. Re-merge, FIX the new failures at the ROOT, and re-run the SAME gate. ALWAYS leave ${REPO_ROOT} clean (on ${EPIC_BRANCH}, no half-merged state) before returning.
${SHELL_RULES}${PROD}
NEW failures to resolve (full identifiers):
${(merge.new_failures || []).map((f) => `   - ${f}`).join('\n')}

1. Safety: confirm NOT on main/master. \`git -C ${REPO_ROOT} checkout ${EPIC_BRANCH}\`.
2. Re-merge WITHOUT committing: \`git -C ${REPO_ROOT} merge --no-ff --no-commit ${branch}\`. If CONFLICT: \`git -C ${REPO_ROOT} merge --abort\`, STATUS = CONFLICT, go to step 6.
3. FIX the NEW failures in ${REPO_ROOT} at the ROOT cause: update the un-updated mock factories / fixtures / importers so they match this ticket's exported surface. NEVER delete or skip a test, weaken an assertion, or hard-code a value to make it pass. If a failure can only be resolved by changing real SOURCE logic (not test infrastructure), be conservative: make the change ONLY if it is unambiguously correct and small; otherwise STOP — the integration found a real bug that needs human review (STATUS = TEST_FAILED, name it in new_failures).
4. ${TEST_CMD ? `Re-run integration tests on the merged tree: \`${TEST_CMD}\` (run VERBATIM, no cd; tee to \`${REPO_ROOT}/.swarm/test-results/${t.id}-mergefix.txt\` after \`mkdir -p ${REPO_ROOT}/.swarm/test-results\`). current_failures = ALL tests failing now (full identifiers). new_failures = those whose FULL identifier is NOT in this BASELINE:
${BASELINE.length ? BASELINE.map((b) => `   - ${b}`).join('\n') : '   (baseline clean — any failure is new)'}
   - new_failures EMPTY → \`git -C ${REPO_ROOT} add -A\` then \`git -C ${REPO_ROOT} commit --no-edit\` (the merge commit now carries your fixes), STATUS = MERGED, integration_tests = PASS, return current_failures.${flags.push ? ` Then \`git -C ${REPO_ROOT} push origin ${EPIC_BRANCH}\`.` : ''}
   - new_failures NON-EMPTY (not fixable in one pass) → \`git -C ${REPO_ROOT} merge --abort\`, STATUS = TEST_FAILED, list them in new_failures, go to step 6. Do NOT close the ticket.` : `No test command exists — cannot re-gate. \`git -C ${REPO_ROOT} merge --abort\`, STATUS = TEST_FAILED, go to step 6.`}
5. If STATUS = MERGED: set ${t.id} to "Done" in Linear, ticket_closed=true ONLY if that succeeds. ${LINEAR_NOTE} On a Linear error leave it false and CONTINUE (the code is merged). Then post ONE brief Linear comment on ${t.id} headed "${H.testing} (merge fix-forward)" listing the files you fixed and why; if Linear is unavailable, log and continue.
6. Confirm ${REPO_ROOT} is clean and on ${EPIC_BRANCH} (no leftover merge state).
Return status (MERGED | CONFLICT | TEST_FAILED), integration_tests, new_failures[], current_failures[], ticket_closed, notes.`,
      { schema: MERGE_SCHEMA, label: `merge-fix ${t.id}`, phase: 'Integrate', model: ROUTE.mergeFix },
    )
    if (fix) {
      mergeCleanedIds.add(t.id)
      ticketResult.phases.merge_fix = fix.status
      merge = fix // adopt the fix-pass outcome: MERGED on a clean re-gate, else TEST_FAILED with the remaining failures
      log(`${t.id} merge fix-forward → ${fix.status}${fix.status === 'MERGED' ? ' (re-gate clean — cascade averted)' : ''}.`)
    } else {
      log(`${t.id} merge fix-forward returned nothing — keeping the original TEST_FAILED (fail closed).`)
    }
  }

  ticketResult.merge = merge ? merge.status : 'NO_REPORT'
  ticketResult.integration_tests = merge ? merge.integration_tests : undefined
  if (merge && merge.status === 'MERGED') {
    // The code is integrated on the epic branch. Whether Linear was closed only
    // affects the outcome LABEL — a failed Linear close must NOT block the ticket
    // or its dependents (that would discard merged work over a transient Linear
    // error, the exact failure mode this workflow is built to survive).
    mergedIds.add(t.id)
    // Refresh the baseline to the post-merge failing set: this merge passed the gate (no NEW
    // failures), so current_failures ⊆ baseline — refreshing only ever shrinks it, correctly
    // dropping any pre-existing failure THIS ticket fixed so a later ticket can't re-mask it.
    if (Array.isArray(merge.current_failures)) BASELINE = merge.current_failures
    if (merge.ticket_closed) {
      ticketResult.outcome = 'DONE'
      log(`✓ ${t.id} merged to ${EPIC_BRANCH} and closed.`)
    } else {
      ticketResult.outcome = 'MERGED_NOT_CLOSED'
      log(`✓ ${t.id} merged to ${EPIC_BRANCH}, but Linear close did not confirm — code is integrated; mark it Done manually.`)
    }
  } else if (merge && merge.status === 'SKIPPED' && !expectsCode) {
    // Legitimate no-op: this tier was not required to change code and the reviewers
    // approved with nothing to merge. NOT a failure — must not block or poison dependents.
    // (Recorded only via ticketResult.outcome; reconciliation derives no_op from results.)
    if (merge.ticket_closed) {
      ticketResult.outcome = 'NO_OP'
      log(`○ ${t.id} no-op (empty diff, review-approved) — nothing to merge, marked Done.`)
    } else {
      ticketResult.outcome = 'NO_OP_NOT_CLOSED'
      log(`○ ${t.id} no-op (empty diff, review-approved) — nothing to merge; mark it Done manually.`)
    }
  } else {
    blocked.add(t.id)
    // An empty diff where code WAS expected is an anomaly (e.g. an implementation that
    // self-reported success but committed nothing), not a benign skip — flag it loudly.
    ticketResult.outcome = (merge && merge.status === 'SKIPPED') ? 'BLOCKED_EMPTY_DIFF'
      : (merge ? `MERGE_${merge.status}` : 'MERGE_NO_REPORT')
    log(`NO MERGE ${t.id} — ${merge && merge.status === 'SKIPPED' ? 'EMPTY DIFF but code was expected (claimed-complete-but-produced-nothing)' : 'merge ' + (merge ? merge.status : 'failed')}${merge && merge.new_failures && merge.new_failures.length ? ' (' + merge.new_failures.length + ' new failures)' : ''}.`)
  }
  results.push(ticketResult)
}

// Unified review tail for every tier: run a review; on CHANGES_REQUESTED with findings,
// apply ONE fix pass then RE-REVIEW (never rubber-stamp the fixer's self-report). A null
// re-review keeps the original CHANGES_REQUESTED so the caller's gate fails closed.
// `prompt` is a (rerun:boolean) => string builder. Returns { review, reReviewed }.
async function reviewWithFixPass(t, wt, prompt, schema, model, label) {
  let review = await safeAgent(prompt(false), { schema, label: `${label} ${t.id}`, phase: 'Review', model })
  let reReviewed = false
  if (review && review.status === 'CHANGES_REQUESTED' && (review.blocking_findings || []).length) {
    log(`${t.id} ${label} → CHANGES_REQUESTED (${review.blocking_findings.length}) — one fix pass, then re-review.`)
    const fix = await safeAgent(
      `Apply review fixes for ${t.id} in ${wt}; re-run lint/typecheck; commit (\`git -C ${wt} add -A\`; \`fix(${t.id}): apply review fixes\`).
${SHELL_RULES}${PROD}
FINDINGS:
${review.blocking_findings.map((f, i) => `${i + 1}. [${f.severity || '?'}] ${f.file || ''} — ${f.issue || ''}`).join('\n')}
${selfPost(t, H.codereview + ' (fixes)', false)}
Return status, summary, write/edit counts, and committed — set committed=true ONLY if you actually committed the fixes (it gates the re-review; reporting it falsely will block the ticket).`,
      { schema: WORK_SCHEMA, label: `review-fix ${t.id}`, phase: 'Review', model: ROUTE.reviewFix },
    )
    // Only re-review if the fixer actually COMMITTED its changes. A fix that reports
    // COMPLETE but committed nothing would have the re-review run against the UNCHANGED
    // diff, where same-model variance could flip CHANGES_REQUESTED → APPROVED and merge
    // unfixed code. No commit ⇒ keep the original CHANGES_REQUESTED so the gate fails closed.
    if (fix && fix.status === 'COMPLETE' && fix.committed) {
      const rereview = await safeAgent(prompt(true), { schema, label: `re-review ${t.id}`, phase: 'Review', model })
      if (rereview) { review = rereview; reReviewed = true }
    } else if (fix && fix.status === 'COMPLETE' && !fix.committed) {
      log(`${t.id} ${label} fix reported COMPLETE but committed=false — NOT re-reviewing; keeping CHANGES_REQUESTED (fail closed).`)
    }
  }
  return { review, reReviewed }
}

// An agent that self-reports COMPLETE but produced nothing — no commit, no files, no
// write/edit calls — and is NOT legitimately no-code. (no_code tickets are exempt: an
// empty result is valid for them and is handled as a no-op at merge.)
const looksEmpty = (r) => r && r.status === 'COMPLETE' && !r.no_code && !r.committed &&
  (r.files_changed || []).length === 0 && ((r.write_calls || 0) + (r.edit_calls || 0)) === 0

// ONE git-verified re-dispatch for tiers where code IS expected (SMALL build, STANDARD
// implement). NOT used for NO-CODE, where an empty result is a legitimate outcome. The
// caller re-tests looksEmpty() on the return to block a still-empty result.
async function buildWithEmptyRetry(prompt, wt, opts) {
  let r = await safeAgent(prompt, opts)
  if (looksEmpty(r)) {
    log(`${opts.label} reported COMPLETE with no committed artifacts — re-dispatching once (will verify against git).`)
    r = await safeAgent(`${prompt}\n\n---\nPRIOR DISPATCH REPORTED NO ARTIFACTS. FIRST verify against git: \`git -C ${wt} diff --stat ${EPIC_BRANCH}...HEAD\` and \`git -C ${wt} status\`. If the work is ALREADY present/committed, do NOT redo it — just report status=COMPLETE with the actual files_changed (from git diff) and committed=true. If it truly needs code, do it now (Write/Edit) and commit. If it genuinely has no code deliverable, set no_code=true and explain.`,
      { ...opts, label: `${opts.label} (retry)` })
  }
  return r
}

// Force the build/impl self-report to be git-anchored so a false "committed=true" can't sail
// through review on an empty diff (caught only at merge today, after a wasted review/security/codex
// pass). The agent must reconcile its claim against the actual diff during its OWN turn.
const gitVerify = (wt) => `SELF-VERIFY BEFORE REPORTING (required): run \`git -C ${wt} diff --stat ${EPIC_BRANCH}...HEAD\`. Report committed=true and the real files_changed (from that diff) ONLY if it is NON-EMPTY. If the diff is empty your work did NOT land — do not report COMPLETE+committed=true; either redo the commit or report committed=false with a status that reflects reality.`

// One review-prompt builder for every tier. Tiers differ only in the intro/role line, the review
// scope, whether ACs are inlined, and whether the folded security floor (security_status) applies.
// Keeping ONE builder means the diff command, read-both-context rule, SHELL_RULES, self-post
// contract, and re-review clause can never drift between the three tiers.
function reviewPrompt(t, wt, { intro, scope, includeAc, foldSecurity }) {
  return (rerun) => `${intro}${rerun ? ' This is a POST-FIX RE-REVIEW: re-check the diff after the fix pass; do NOT assume the prior findings were resolved.' : ''}
Review ONLY the diff: \`git -C ${wt} diff --name-only ${EPIC_BRANCH}...HEAD\`.
${readTicket(t)}
${SHELL_RULES}${includeAc ? `\n${acBlock(t)}` : ''}${GUIDANCE ? `\n${GUIDANCE}\n(Operator guidance above is part of the bar: a change that ignores it — e.g. didn't load a mandated skill, didn't follow a stated convention — is CHANGES_REQUESTED.)` : ''}
${scope}
${selfPost(t, rerun ? H.codereview + ' (re-review)' : H.codereview, false)}${foldSecurity ? '\nALWAYS return security_status explicitly as exactly PASS or FAIL (PASS = zero CRITICAL/HIGH and no behavior/security surface introduced by this change).' : ''}
Return status (${foldSecurity ? 'APPROVED | CHANGES_REQUESTED' : 'APPROVED | CHANGES_REQUESTED | BLOCKED'}), blocking_findings[]${foldSecurity ? ', security_status (PASS | FAIL)' : ''}.`
}

for (const t of tickets) {
  try {
    const dependsBlocked = (t.depends_on || []).filter((d) => blocked.has(d))
    if (dependsBlocked.length) {
      log(`SKIP ${t.id} — upstream dependency blocked: ${dependsBlocked.join(', ')}`)
      blocked.add(t.id)
      results.push({ id: t.id, title: t.title, tier: t.tier, effort_tier: t.effort_tier, outcome: 'SKIPPED_UPSTREAM', dependsBlocked })
      continue
    }

    const ticketResult = { id: t.id, title: t.title, tier: t.tier, effort_tier: t.effort_tier, phases: {}, outcome: 'IN_PROGRESS' }
    const { wt } = ticketRefs(REPO_ROOT, t)
    log(`▶ ${t.id} [${t.effort_tier}] — ${t.title}`)

    // ─────────────────────────────── NO-CODE tier ────────────────────────────
    if (t.effort_tier === 'NO_CODE') {
      phase('Build')
      createdWorktreeIds.add(t.id) // wtSetup below creates the worktree; track it for the leak sweep
      const build = await safeAgent(
        `You are handling a NO-CODE ticket (docs/comment/observation — no logic/behavior/API change).
${wtSetup(REPO_ROOT, EPIC_BRANCH, t)}
${SHELL_RULES}

${acBlock(t)}

${readTicket(t)}${GUIDANCE ? '\n' + GUIDANCE : ''}
Make ONLY the documentation/comment/config change the ticket asks for. If you discover it actually requires code/logic changes, STOP, set status NEEDS_CONTEXT, and explain (it was mis-classified). Commit in the worktree: \`git -C ${wt} add -A\` then \`docs(${t.id}): ...\`.
${gitVerify(wt)}

${selfPost(t, H.implementation, true)}
Return status, summary, files_changed, write/edit counts, committed, no_code.`,
        { schema: WORK_SCHEMA, label: `build ${t.id}`, phase: 'Build', model: ROUTE.buildNoCode },
      )
      ticketResult.phases.build = build ? build.status : 'NO_REPORT'
      // Fail closed: advance ONLY on explicit COMPLETE (gate() allowlist), matching the SMALL/
      // STANDARD build gates. A denylist would let ISSUES_FOUND or any unexpected/typo status pass.
      if (!gate(build, 'COMPLETE')) {
        log(`BLOCK ${t.id} at build — ${build ? build.status : 'no report'}${build && build.status === 'NEEDS_CONTEXT' ? ' (likely mis-classified; re-run will re-tier)' : ''}`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_BUILD'; results.push(ticketResult); continue
      }

      phase('Review')
      const ncReviewPrompt = reviewPrompt(t, wt, {
        intro: `You are reviewing a NO-CODE change for ${t.id} (read-only).`,
        scope: 'Verify: the change matches the ticket, is correct, and introduces NO behavior/security surface (a "doc" change that actually affects security is a FAIL).',
        includeAc: false, foldSecurity: true,
      })
      const { review, reReviewed } = await reviewWithFixPass(t, wt, ncReviewPrompt, COMBINED_REVIEW_SCHEMA, ROUTE.reviewNoCode, 'NO-CODE review')
      ticketResult.phases.review = review ? review.status + (reReviewed ? ' (re-reviewed)' : '') : 'NO_REPORT'
      // Reviews FAIL CLOSED: require explicit APPROVED + PASS.
      if (!gate(review, 'APPROVED') || review.security_status !== 'PASS') {
        log(`BLOCK ${t.id} — NO-CODE review ${review ? review.status + '/' + (review.security_status || '?') : 'failed (null)'}.`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_REVIEW'; results.push(ticketResult); continue
      }
      await mergeTicket(t, ticketResult, false) // NO-CODE: an empty diff is a legitimate no-op, not a block
      continue
    }

    // ─────────────────────────────── SMALL tier ──────────────────────────────
    if (t.effort_tier === 'SMALL') {
      phase('Build')
      createdWorktreeIds.add(t.id) // wtSetup below creates the worktree; track it for the leak sweep
      const implRole = t.impl_type === 'frontend' ? 'frontend (UI/components — match the existing component library)' : 'backend (APIs/services/data — match existing patterns)'
      const smallBuildPrompt = `You are handling a SMALL ${implRole} ticket end-to-end: brief planning, implementation, and a focused test — in one focused pass (the change is small: <=~30 lines, 1-3 files, no schema/auth/API/new-deps).
${wtSetup(REPO_ROOT, EPIC_BRANCH, t)}
${SHELL_RULES}
${PROD}
${NO_DEFER}
${GUARD}

${acBlock(t)}

${readTicket(t)}${GUIDANCE ? '\n' + GUIDANCE : ''}
Reuse existing code; implement every AC; add a focused test for the change; run lint + typecheck on changed files (npx --prefix ${wt} tsc --noEmit, project lint). Commit: \`git -C ${wt} add -A\` then \`feat(${t.id}): ...\`. If the work turns out to be larger than SMALL (schema/auth/API/many files), STOP with status NEEDS_CONTEXT (it was mis-classified for STANDARD).
${gitVerify(wt)}

${selfPost(t, H.implementation, true)}
Return status, summary, files_changed, ACTUAL write/edit counts, committed, no_code, gates.`
      // Code IS expected for SMALL — use the git-verified empty-artifact retry (parity with STANDARD).
      const build = await buildWithEmptyRetry(smallBuildPrompt, wt, { schema: WORK_SCHEMA, label: `build ${t.id}`, phase: 'Build', model: ROUTE.buildSmall })
      if (looksEmpty(build)) {
        log(`BLOCK ${t.id} — SMALL build produced no artifacts twice (git-verified empty).`)
        blocked.add(t.id); ticketResult.phases.build = 'BLOCKED_NO_ARTIFACTS'; ticketResult.outcome = 'BLOCKED_BUILD'; results.push(ticketResult); continue
      }
      ticketResult.phases.build = build ? build.status : 'NO_REPORT'
      if (!gate(build, 'COMPLETE')) {
        log(`BLOCK ${t.id} at build — ${build ? build.status : 'no report'}`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_BUILD'; results.push(ticketResult); continue
      }

      phase('Review')
      const smallReviewPrompt = reviewPrompt(t, wt, {
        intro: `You are the combined reviewer (code review + security) for SMALL ticket ${t.id}. Read-only.`,
        scope: 'Cover, in one pass: (a) every acceptance criterion met (Requirements check); (b) correctness/bugs/edge cases; (c) SOLID/DRY + framework best practices; (d) a focused OWASP security pass (injection, authz, secrets, input validation, data exposure) on the diff; (e) Convention guard: if the diff establishes a convention (a pattern other code must follow, an always/never rule), verify its guard (lint rule / source-scanning guard test / drift test / ratchet) ships in this diff or the rule carries an explicit [prose-only] tag — report a missing guard as a blocking_finding (severity/file/issue) with status CHANGES_REQUESTED so the fix pass can ship it. Finding bar: flag what would fail in production, not what is merely suboptimal.',
        includeAc: false, foldSecurity: true,
      })
      const { review, reReviewed } = await reviewWithFixPass(t, wt, smallReviewPrompt, COMBINED_REVIEW_SCHEMA, ROUTE.reviewSmall, 'SMALL review')
      ticketResult.phases.review = review ? review.status + (reReviewed ? ' (re-reviewed)' : '') : 'NO_REPORT'
      // Reviews FAIL CLOSED (review covers security for SMALL): require explicit APPROVED + PASS.
      if (!gate(review, 'APPROVED') || review.security_status !== 'PASS') {
        log(`BLOCK ${t.id} — SMALL review ${review ? review.status + '/' + (review.security_status || '?') : 'failed (null)'}.`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_REVIEW'; results.push(ticketResult); continue
      }
      await mergeTicket(t, ticketResult, true) // SMALL: code was expected — an empty diff is an anomaly that blocks
      continue
    }

    // ─────────────────────────────── STANDARD tier ───────────────────────────
    phase('Build')
    createdWorktreeIds.add(t.id) // wtSetup below creates the worktree; track it for the leak sweep
    const adapt = await safeAgent(
      `ROLE: architect-agent (ADAPTATION — plan only, do not implement features) for ${t.id}.
${wtSetup(REPO_ROOT, EPIC_BRANCH, t)}
${SHELL_RULES}
${PROD}
${NO_DEFER}

${acBlock(t)}

${readTicket(t)}${GUIDANCE ? '\n' + GUIDANCE : ''}
Then produce the adaptation plan (NO feature code yet): inventory EXISTING services/utilities to reuse (prevent duplication — highest-value output); map each AC to an approach; list files to create (only if no reuse) and modify; define the test strategy and integration points.
${selfPost(t, H.adaptation, true)}
Return status (COMPLETE | BLOCKED | NEEDS_CONTEXT), summary (one line on the plan + key reuse), files_changed (likely empty), write/edit counts, committed (false — adaptation only plans, it does not commit).`,
      { schema: WORK_SCHEMA, label: `adapt ${t.id}`, phase: 'Build', model: ROUTE.adapt },
    )
    ticketResult.phases.adaptation = adapt ? adapt.status : 'NO_REPORT'
    // Fail closed: advance ONLY on explicit COMPLETE (gate() allowlist). A denylist would let
    // an adapt agent that returned ISSUES_FOUND (or any unexpected status) feed a flagged plan
    // forward into implementation as if it were sound.
    if (!gate(adapt, 'COMPLETE')) {
      log(`BLOCK ${t.id} at adaptation — ${adapt ? adapt.status : 'no report'}`)
      blocked.add(t.id); ticketResult.outcome = 'BLOCKED_ADAPTATION'; results.push(ticketResult); continue
    }

    const implRole = t.impl_type === 'frontend' ? 'frontend-engineer-agent (UI/components/pages — match the existing component library)' : 'backend-engineer-agent (APIs/services/data — match existing repository/service patterns)'
    const implPrompt = `ROLE: ${implRole} for ${t.id}. Implement ONLY this ticket in the worktree ${wt}, following the adaptation plan.
${SHELL_RULES}
${PROD}
${NO_DEFER}
${GUARD}
${acBlock(t)}
${readTicket(t)} In particular read the Adaptation Report and any prior phase comments on ${t.id}.${GUIDANCE ? '\n' + GUIDANCE : ''}
ADAPTATION SUMMARY: ${adapt.summary || '(read the Adaptation Report you posted)'}
Reuse what adaptation mandated; implement every AC; NO test code here (separate phase); run lint + typecheck on changed files; commit (\`git -C ${wt} add -A\`; \`feat(${t.id}): ...\`). If this ticket genuinely has no implementation-phase code deliverable (pure verification/test-only), set no_code=true and explain — do NOT invent code.
${gitVerify(wt)}
${selfPost(t, H.implementation, false)}
Return status, summary, files_changed, ACTUAL write_calls/edit_calls, no_code, committed.`

    // Code IS expected here (unless the agent legitimately reports no_code) — use the
    // git-verified empty-artifact retry shared with the SMALL tier. Using ALL signals
    // (committed + files_changed + call counts) avoids falsely re-running a real
    // implementation that merely under-reports its self-reported call counts.
    let impl = await buildWithEmptyRetry(implPrompt, wt, { schema: WORK_SCHEMA, label: `implement ${t.id}`, phase: 'Build', model: ROUTE.implement })
    if (looksEmpty(impl)) {
      log(`BLOCK ${t.id} — implementation produced no artifacts twice (git-verified empty).`)
      blocked.add(t.id); ticketResult.phases.implementation = 'BLOCKED_NO_ARTIFACTS'; ticketResult.outcome = 'BLOCKED_IMPLEMENTATION'; results.push(ticketResult); continue
    }
    ticketResult.phases.implementation = impl ? impl.status : 'NO_REPORT'
    if (!gate(impl, 'COMPLETE')) {
      log(`BLOCK ${t.id} at implementation — ${impl ? impl.status : 'no report'}`)
      blocked.add(t.id); ticketResult.outcome = 'BLOCKED_IMPLEMENTATION'; results.push(ticketResult); continue
    }

    // Run testing even when impl.no_code is true: a no-implementation STANDARD ticket
    // is typically TEST-ONLY (its tests ARE the deliverable). If a no_code ticket also
    // produces no tests/docs, its merge is called with expectsCode=false, so an empty
    // diff is reconciled as a benign NO_OP — not blocked, not poisoning dependents.
    if (t.run_testing !== false) {
      const test = await safeAgent(
        `ROLE: qa-engineer-agent for ${t.id}. ACCURACY-FIRST testing in ${wt}, gates in order:
${readTicket(t)}${GUIDANCE ? '\n' + GUIDANCE : ''}
${SHELL_RULES}${PROD}
- Gate #0: run existing tests in affected modules; FIX broken existing tests (root-cause) FIRST. Never delete/skip a failing test to pass; never hard-code values to make specific test inputs pass — if a test seems wrong, report it.
- Gate #1 API Accuracy (100%): Read the implementation for ACTUAL method names/enums/params — no invented APIs.
- Gate #2 Compilation (100%): tests compile, zero type errors. Gate #3 Execution (100%): tests run, mocks work, assertions valid.
- ANTI-BALLAST: assert behavior and contracts (returns, persisted state, emitted events), not call shapes — no toHaveBeenCalled* on internal collaborators unless the call IS the contract; prefer a few real-infrastructure integration tests over many mocked units for data-layer logic.
- Gate #4 CROSS-FILE BREAKAGE (the targeted-green / full-red gap that sinks epics at merge): ${TEST_CMD ? `if the diff ADDS, RENAMES, or changes the signature of any EXPORTED symbol (a function/const/type other modules import), other files' mock factories (vi.mock/jest.mock) and importers can break in ways your TARGETED tests never exercise. After your targeted tests pass, run the FULL suite ONCE against YOUR worktree. The project test command is \`${TEST_CMD}\` — do NOT run it verbatim (it targets the integration tree, not your worktree); run the SAME runner with its directory flag pointed at ${wt} (e.g. \`pnpm -C ${wt} test\`, \`npm --prefix ${wt} test\`). Tee output to \`${REPO_ROOT}/.swarm/test-results/${t.id}-test.txt\` (\`mkdir -p\` its dir first). FIX every NEW failure your change introduced at the ROOT — most often an un-updated mock factory or fixture in another file (update it; NEVER delete/skip a test) — and re-run until the full suite shows no failure your change caused. If the suite is too large to finish, capture what you can, say so, and rely on the merge gate. This moves the integration check LEFT (into the cheap-to-fix worktree) instead of discovering it at merge, where it cascade-skips every dependent ticket.` : 'no project test command was detected, so there is no full suite to run — note that the merge has no integration gate either and cross-file breakage cannot be caught automatically.'}
- Cap Gate #0 fix loops at ~3 cycles; if still red, report ISSUES_FOUND with the specifics rather than looping. Coverage secondary (~70-80%, 90%+ critical), skip trivial code.
- Commit: \`git -C ${wt} add -A\`; \`test(${t.id}): ...\`. Files changed by implementation: ${(impl.files_changed || []).join(', ') || '(discover via git diff)'}
${selfPost(t, H.testing, false)}
Return status (COMPLETE | ISSUES_FOUND), a gates one-liner, files_changed, write/edit counts, committed.`,
        { schema: WORK_SCHEMA, label: `test ${t.id}`, phase: 'Build', model: ROUTE.test },
      )
      ticketResult.phases.testing = test ? test.status : 'NO_REPORT'
      // Fail closed: advance ONLY on explicit COMPLETE (gate() allowlist). The previous denylist
      // (`=== 'ISSUES_FOUND'`) let a test agent that returned BLOCKED / NEEDS_CONTEXT — the likely
      // outcome when the suite can't even run — pass as if tests were green.
      if (!gate(test, 'COMPLETE')) {
        log(`BLOCK ${t.id} at testing — ${test ? test.status : 'no report'} (gate not COMPLETE).`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_TESTING'; results.push(ticketResult); continue
      }
    } else { ticketResult.phases.testing = 'skipped' }

    // Docs run when planning requested them. An explicit run_docs===true wins even for a
    // no_code ticket (e.g. a config/test deliverable that still has a user-facing surface);
    // only the DEFAULT (run_docs unset) skips docs for no_code tickets.
    if (t.run_docs !== false && (t.run_docs === true || !impl.no_code)) {
      const doc = await safeAgent(
        `ROLE: technical-writer-agent for ${t.id}. MVD — "document WHY, not WHAT" in ${wt}. Document complex/non-obvious logic, decisions, security constraints, public API (auto-generate where possible); SKIP self-documenting types/trivial CRUD. Commit: \`git -C ${wt} add -A\`; \`docs(${t.id}): ...\`.
${readTicket(t)}${GUIDANCE ? '\n' + GUIDANCE : ''}
${SHELL_RULES}
${selfPost(t, H.documentation, false)}
Return status, summary, files_changed, write/edit counts, committed.`,
        { schema: WORK_SCHEMA, label: `docs ${t.id}`, phase: 'Build', model: ROUTE.docs },
      )
      ticketResult.phases.documentation = doc ? doc.status : 'NO_REPORT'
      // Docs FAIL CLOSED like every other phase: a null/ISSUES_FOUND/BLOCKED docs result must
      // not be silently ignored and let the ticket merge with a documentation AC unmet. The
      // branch (and its Linear comment) is kept for inspection; a re-run re-attempts docs.
      if (!gate(doc, 'COMPLETE')) {
        log(`BLOCK ${t.id} at documentation — ${doc ? doc.status : 'no report'} (gate not COMPLETE).`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_DOCUMENTATION'; results.push(ticketResult); continue
      }
    } else { ticketResult.phases.documentation = 'skipped' }

    // ── Review HARD FLOOR (single combined reviewer) ────────────────────────
    phase('Review')
    const stdReviewPrompt = reviewPrompt(t, wt, {
      intro: `ROLE: code-reviewer-agent for ${t.id} (read-only, single combined review).`,
      scope: 'Cover in one pass: (1) Requirements — verify EACH acceptance criterion against the implementation with concrete evidence (any unmet → CHANGES_REQUESTED); (2) Correctness — bugs, edge cases, data-flow (params accepted but not forwarded), error handling; (3) Best practices + SOLID/DRY (duplicated logic, leaky abstractions); (4) Convention guard — if the diff establishes a convention (a pattern other code must follow, an always/never rule, a first instance meant to be copied) or the adaptation plan mandated a guard, verify the guard (lint rule / source-scanning guard test / drift test / ratchet) ships in this diff or the rule carries an explicit [prose-only] tag; report a missing guard as a blocking_finding (severity/file/issue) with status CHANGES_REQUESTED so the fix pass can ship it. Finding bar: flag what would fail in production, not what is merely suboptimal — findings demanding unrequested abstractions create over-engineering, not quality.',
      includeAc: true, foldSecurity: false,
    })
    const { review, reReviewed } = await reviewWithFixPass(t, wt, stdReviewPrompt, REVIEW_SCHEMA, ROUTE.review, 'review')
    ticketResult.phases.codereview = review ? review.status + (reReviewed ? ' (re-reviewed)' : '') : 'NO_REPORT'
    // Reviews FAIL CLOSED.
    if (!gate(review, 'APPROVED')) {
      log(`BLOCK ${t.id} — code review ${review ? review.status : 'failed (null)'}; hard floor not met.`)
      blocked.add(t.id); ticketResult.outcome = 'BLOCKED_REVIEW'; results.push(ticketResult); continue
    }

    // ── Codex cross-model (STANDARD only; non-fatal; the real 2nd opinion) ───
    const codex = await safeAgent(
      `You are the Codex cross-model review driver for ${t.id}.
${readTicket(t)}
${SHELL_RULES}
Call \`mcp__codex-review-server__codex_review_and_fix\` (load via ToolSearch if needed) with project_dir=${wt}, base_branch=${EPIC_BRANCH}, and a context string (ticket description + comments + ACs + implementation summary). If the codex MCP is unavailable, return status UNAVAILABLE (do NOT fail the ticket). Be efficient — do not loop; let Codex do the review pass.
Parse the JSON: only \`"error":"rate_limit"\` at the TOP LEVEL is a real rate-limit → status RATE_LIMITED (skip, not fatal). The phrase "rate limit" inside a \`"status":"complete"\` output is a code FINDING, not an error. On "complete": Codex auto-fixes unambiguous P1-P3; fix remaining P1/P2 in-branch; commit (\`git -C ${wt} add -A\`; \`refactor(${t.id}): apply codex fixes\`).
${selfPost(t, H.codex, false)}
Return status (COMPLETE | RATE_LIMITED | UNAVAILABLE), auto_fixed_count.`,
      { schema: CODEX_SCHEMA, label: `codex ${t.id}`, phase: 'Review', model: ROUTE.codex },
    )
    ticketResult.phases.codex = codex ? codex.status : 'UNAVAILABLE'

    // Codex commits its fixes AFTER the code-review hard floor already ran, so those changes
    // would otherwise reach merge unreviewed for correctness/ACs. We do NOT trust the
    // self-reported auto_fixed_count to decide whether to re-review (it is optional, and a
    // COMPLETE codex run typically commits auto-fixes regardless of what it reports) — so
    // whenever codex COMPLETED we ALWAYS re-run the correctness review on the (possibly changed)
    // diff, WITH a fix pass like every other review, and FAIL CLOSED. The security scan below is
    // likewise unconditional. Re-reviewing an unchanged diff is cheap insurance vs. the headline
    // invariant "codex output never reaches merge unreviewed".
    if (codex && codex.status === 'COMPLETE') {
      log(`${t.id} codex completed${codex.auto_fixed_count ? ` (${codex.auto_fixed_count} fix(es))` : ''} after the review floor — re-reviewing the codex changes (fail closed).`)
      const { review: postCodex, reReviewed: postFixed } = await reviewWithFixPass(t, wt, stdReviewPrompt, REVIEW_SCHEMA, ROUTE.review, 'post-codex review')
      ticketResult.phases.codereview = `${ticketResult.phases.codereview} + post-codex ${postCodex ? postCodex.status + (postFixed ? ' (re-reviewed)' : '') : 'NO_REPORT'}`
      if (!gate(postCodex, 'APPROVED')) {
        log(`BLOCK ${t.id} — post-codex re-review ${postCodex ? postCodex.status : 'failed (null)'}; codex changes not approved.`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_REVIEW'; results.push(ticketResult); continue
      }
    }

    // ── Security scan (the merge gate) ──────────────────────────────────────
    const sec = await safeAgent(
      `ROLE: security-engineer-agent for ${t.id} (read-only scan of THIS diff only): \`git -C ${wt} diff --name-only ${EPIC_BRANCH}...HEAD\`.
${readTicket(t)}
${SHELL_RULES}
Scan against OWASP Top 10 (injection, broken authz, sensitive-data exposure, secrets, input validation, insecure config). Focus on exploitable issues (>80% confidence). PASS RULE: status APPROVED only if ZERO CRITICAL and ZERO HIGH findings; any CRITICAL/HIGH → CHANGES_REQUIRED (blocks merge). Fix MEDIUM/LOW introduced by this diff; pre-existing MEDIUM/LOW may be noted OUT-OF-SCOPE.
${selfPost(t, H.security, false)}
Return status (APPROVED | CHANGES_REQUIRED | BLOCKED), critical_high_count.`,
      { schema: SECURITY_SCHEMA, label: `security ${t.id}`, phase: 'Review', model: ROUTE.security },
    )
    ticketResult.phases.security = sec ? sec.status : 'NO_REPORT'
    // Security FAILS CLOSED.
    const securityPass = gate(sec, 'APPROVED') && (sec.critical_high_count || 0) === 0
    if (!securityPass) {
      log(`BLOCK ${t.id} — security ${sec ? sec.status + ' (' + (sec.critical_high_count || 0) + ' CRITICAL/HIGH)' : 'failed (null)'}.`)
      blocked.add(t.id); ticketResult.outcome = 'SECURITY_BLOCKED'; results.push(ticketResult); continue
    }

    // expectsCode: a STANDARD ticket expects SOME committed artifact unless it is a genuine
    // no-op. Keying only on impl.no_code would let a test-only ticket (no implementation code,
    // its TESTS are the deliverable) whose testing phase committed nothing close as a benign
    // NO_OP. So an empty diff is an anomaly if implementation produced code, OR a dedicated
    // testing phase ran, OR a docs phase ran. Only when impl reported no_code AND neither testing
    // nor docs ran is an empty diff legitimately a no-op.
    const testingRan = t.run_testing !== false
    const docsRan = ticketResult.phases.documentation !== 'skipped'
    await mergeTicket(t, ticketResult, !impl.no_code || testingRan || docsRan)
  } catch (err) {
    // Belt-and-suspenders: no single ticket may abort the run.
    const msg = err && err.message ? err.message : String(err)
    log(`ERROR ${t.id} threw — recording blocked and continuing: ${msg.slice(0, 160)}`)
    blocked.add(t.id)
    results.push({ id: t.id, title: t.title, tier: t.tier, effort_tier: t.effort_tier, outcome: 'ERROR', error: msg.slice(0, 300) })
  }
}

// ═══════════════════════════════════ Report ═════════════════════════════════
phase('Report')

// Best-effort worktree sweep. A worktree leaks ONLY if its ticket created one (createdWorktreeIds,
// set when wtSetup runs) but no cleanup removed it: mergeTicket's agent runs its always-cleanup
// step whenever it executes (mergeCleanedIds), so the leak set is exactly created − merge-cleaned.
// Deriving it this way (instead of a hand-listed outcome allowlist) means a NEW block outcome can
// never silently fall out of the sweep, and a MERGE_NO_REPORT (merge agent threw, so cleanup never
// ran) is correctly swept — both gaps the old allowlist had. It also never targets a ticket that
// blocked before creating a worktree. Feature BRANCHES are kept so failed work stays inspectable;
// a later rerun's idempotent wtSetup clears any stale branch. `.swarm/` is gitignored scratch.
const leakedWts = [...createdWorktreeIds].filter((id) => !mergeCleanedIds.has(id)).map((id) => ticketRefs(REPO_ROOT, { id }).wt)
// Finalize ALWAYS releases the epic lock (so a later run of this epic isn't refused) and sweeps any
// leaked worktrees in the same pass. It runs whenever there is a lock to release or a worktree to sweep
// — i.e. every real run; dry-run has neither. The dedicated epic worktree itself is KEPT (for PR /
// close-epic / inspection); only per-ticket worktrees and the lock are cleaned here.
if (leakedWts.length || LOCK_PATH) {
  await safeAgent(
    `Finalize epic ${epicId}: release its lock and sweep any leftover per-ticket worktrees. Run each command as its OWN Bash call and ignore "not a working tree"/"not found" errors. NEVER touch main/master, the epic branch, the dedicated epic worktree, or any feature branch (failed work must stay inspectable — do NOT run \`git branch -D\`).
${SHELL_RULES}
${LOCK_PATH ? `- RELEASE THE LOCK (so a later run of this epic isn't blocked): \`rm -rf ${LOCK_PATH}\`.\n` : ''}${leakedWts.length ? `- Sweep these leftover per-ticket worktrees — for EACH path run \`git -C ${REPO_ROOT} worktree remove <path> --force\`, then run \`git -C ${REPO_ROOT} worktree prune\` once:
${leakedWts.map((p) => `   - ${p}`).join('\n')}\n` : ''}Return status only ("DONE").`,
    { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string' } } }, label: `finalize ${epicId}`, phase: 'Report', model: ROUTE.merge },
  )
  if (leakedWts.length) log(`Swept ${leakedWts.length} leftover worktree(s) (branches kept for inspection).`)
  if (LOCK_PATH) log(`Released epic lock.`)
}

let pr = null
if (flags.push && mergedIds.size > 0) {
  pr = await safeAgent(
    `Open or refresh the PR for the epic branch.
${SHELL_RULES}
- existing = \`gh pr list --head ${EPIC_BRANCH} --json number --jq '.[0].number'\`. If present \`gh pr edit\` it, else \`gh pr create --base ${DEFAULT_BRANCH} --head ${EPIC_BRANCH}\`.
- Title: "Epic: ${epicId} — ${plan.epic.title}". Body: epic summary + table of merged tickets (${[...mergedIds].join(', ')}) + QA note (each merged ticket passed its review floor + security; merges gated on a test-diff). End "*Created by /epic-swarm-workflow*". NEVER merge the PR.
Return status, pr_url.`,
    { schema: PR_SCHEMA, label: `epic PR ${epicId}`, phase: 'Report', model: ROUTE.pr },
  )
}

// Reconcile plan vs results so no ticket vanishes silently (e.g. on early exit).
const seen = new Set(results.map((r) => r.id))
const unprocessed = tickets.filter((t) => !seen.has(t.id)).map((t) => ({ id: t.id, title: t.title, tier: t.tier, effort_tier: t.effort_tier }))
if (unprocessed.length) log(`WARN ${unprocessed.length} ticket(s) never processed: ${unprocessed.map((u) => u.id).join(', ')}`)

// Outcome buckets are mutually exclusive: DONE / MERGED_NOT_CLOSED / NO_OP(_NOT_CLOSED)
// / SKIPPED_UPSTREAM are all non-blocking; everything else is a genuine block.
const NON_BLOCKING = new Set(['DONE', 'MERGED_NOT_CLOSED', 'NO_OP', 'NO_OP_NOT_CLOSED', 'SKIPPED_UPSTREAM'])
const doneIds = results.filter((r) => r.outcome === 'DONE').map((r) => r.id)
const mergedPending = results.filter((r) => r.outcome === 'MERGED_NOT_CLOSED').map((r) => r.id)
const noOpIds = results.filter((r) => r.outcome === 'NO_OP' || r.outcome === 'NO_OP_NOT_CLOSED').map((r) => r.id)
const noOpPending = results.filter((r) => r.outcome === 'NO_OP_NOT_CLOSED').map((r) => r.id)
const blockedList = results.filter((r) => !NON_BLOCKING.has(r.outcome)).map((r) => ({ id: r.id, outcome: r.outcome }))
const manualClose = [...mergedPending, ...noOpPending]
// next_steps reflects the ACTUAL reconciled state (RC-6) — never a canned "run /close-epic" when
// tickets are still blocked, nothing merged, or a manual push/close is owed.
const nothingDone = doneIds.length === 0 && mergedPending.length === 0 && noOpIds.length === 0
const nextStepsParts = []
if (nothingDone) {
  nextStepsParts.push(`The swarm merged NOTHING — ${EPIC_BRANCH} is unchanged from ${DEFAULT_BRANCH}. Investigate the blocked tickets below before retrying; do NOT run /close-epic.`)
} else {
  nextStepsParts.push(`Review ${EPIC_BRANCH}${ISO ? ` in the dedicated worktree ${REPO_ROOT}` : ''}.`)
}
if (manualClose.length) nextStepsParts.push(`Manually set ${manualClose.join(', ')} to Done in Linear (merged/no-op but auto-close did not confirm).`)
if (blockedList.length) nextStepsParts.push(`${blockedList.length} ticket(s) BLOCKED (${blockedList.map((b) => `${b.id}:${b.outcome}`).join(', ')}) — resolve or re-run them; do NOT close the epic until they pass.`)
if (unprocessed.length) nextStepsParts.push(`${unprocessed.length} ticket(s) never processed (${unprocessed.map((u) => u.id).join(', ')}) — re-run to pick them up.`)
if (!flags.push && (doneIds.length || mergedPending.length)) nextStepsParts.push(`Local-only run — nothing was pushed; re-run with --push to push ${EPIC_BRANCH} and open the PR, or push it yourself.`)
if (ISO) nextStepsParts.push(`The dedicated epic worktree ${REPO_ROOT} is kept for inspection/PR/close-epic; when fully done, remove it with \`git -C ${MAIN_REPO} worktree remove ${REPO_ROOT}\` (keeps the ${EPIC_BRANCH} branch).`)
if (!nothingDone && blockedList.length === 0 && unprocessed.length === 0) nextStepsParts.push(`All tracked tickets are resolved — run /close-epic ${epicId} once they're confirmed Done.`)
const summary = {
  epic: { id: epicId, title: plan.epic.title },
  mode: flags.push ? 'real+push' : 'real(local)',
  isolation: ISO ? 'dedicated-worktree' : (flags.inPlace ? 'in-place (main tree)' : 'dry-run'),
  epic_branch: EPIC_BRANCH,
  main_repo: MAIN_REPO,
  integration_tree: REPO_ROOT,
  tier_counts: tierCounts,
  tickets_total: tickets.length,
  done: doneIds,
  merged_pending_close: mergedPending, // merged to the epic branch but the Linear "Done" close did not confirm
  no_op: noOpIds, // legitimately required no code change (e.g. NO-CODE observation tickets)
  blocked: blockedList,
  skipped_upstream: results.filter((r) => r.outcome === 'SKIPPED_UPSTREAM').map((r) => r.id),
  unprocessed,
  baseline_pre_existing_failures: BASELINE.length,
  integration_verification: TEST_CMD ? `test-diff gate (cmd: ${TEST_CMD})` : 'NONE — no test command detected; merges not integration-verified',
  pr_url: pr ? pr.pr_url : (flags.push ? '(nothing merged)' : '(local-only; pass --push to open a PR)'),
  results,
  next_steps: nextStepsParts.join(' '),
}
log(`epic-swarm-workflow v2 complete — ${doneIds.length}/${tickets.length} done${mergedPending.length ? `, ${mergedPending.length} merged-pending-close` : ''}${noOpIds.length ? `, ${noOpIds.length} no-op` : ''}, ${blockedList.length} blocked, ${unprocessed.length} unprocessed.`)
return summary
