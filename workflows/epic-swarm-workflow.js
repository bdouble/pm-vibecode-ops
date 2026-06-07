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
 * when codex changes code the correctness review is RE-RUN on the new diff and
 * still fails closed — codex output never reaches merge unreviewed.
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
 *     real repos) never block a clean merge.
 *   • Empty-diff is tier-aware: where code was EXPECTED (SMALL build, STANDARD
 *     implement) an empty diff blocks as BLOCKED_EMPTY_DIFF (claimed-complete-
 *     but-produced-nothing); where it was NOT (NO-CODE / no_code STANDARD) an
 *     empty diff is a benign NO_OP — closed, not blocked, never poisons deps.
 *     SMALL/STANDARD builds also get ONE git-verified empty-artifact retry.
 *   • All phase gates FAIL CLOSED via allowlist: build/adapt/test advance only on an
 *     explicit COMPLETE, reviews only on APPROVED (+PASS), security only on APPROVED
 *     with zero CRITICAL/HIGH. An unexpected, BLOCKED, or missing status never passes.
 *   • Idempotent worktrees + resumable: each tier's first agent clears any stale
 *     worktree/branch of the same name (left by a prior interrupted run) BEFORE
 *     `git worktree add`, so a resume never collides; worktrees of tickets that block
 *     before merge are swept at the end of the run (their branches are kept).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * MODEL ROUTING (aggressive Sonnet; Opus where reasoning matters)
 *   Opus:   plan, adapt, implement, test, review, review-fix, codex(driver),
 *           SMALL-tier build + review
 *   Sonnet: setup, documentation, security, merge, PR, all NO-CODE work
 *   Effort: per-agent effort is NOT a workflow API knob — it is inherited from
 *           the session. Launch the run at `high` (xhigh/ultracode ~doubles
 *           cost across 70+ agents for marginal gain). See ROUTE below.
 *
 * SAFETY DEFAULTS (test command): local-only by default (creates epic/<id>,
 * merges per-ticket locally, no push/PR). --push pushes the epic branch and
 * opens the PR. NEVER merges to main/master. This file is version-controlled at
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

const PROD = `PRODUCTION-CODE STANDARDS: no fallbacks, no temporary/workaround code,
no TODO-later stubs, no mocked code outside tests. Fail fast with specific errors.
If a proper fix needs a pre-existing bug fixed first, STOP and report it.`

const NO_DEFER = `DEFERRAL POLICY: default disposition for in-scope work is "do it now".
Only defer an acceptance criterion under a genuinely catastrophic condition, and if
so include a justification block (condition, concrete external evidence, the specific
blocker). "Complex"/"tricky"/"takes time" are NOT valid reasons.`

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
  type: 'object', required: ['status', 'repo_root', 'epic_branch'],
  properties: {
    status: { type: 'string', description: 'OK | FAILED' },
    repo_root: { type: 'string' }, default_branch: { type: 'string' }, epic_branch: { type: 'string' },
    test_cmd: { type: 'string', description: 'detected test command, or empty' },
    pkg_mgr: { type: 'string' },
    baseline_failures: { type: 'array', items: { type: 'string' }, description: 'test files/names already FAILING on the epic branch before any merge (for the merge test-diff gate)' },
    baseline_note: { type: 'string' },
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
  type: 'object', required: ['status', 'summary'],
  properties: {
    status: { type: 'string', description: 'COMPLETE | BLOCKED | NEEDS_CONTEXT | ISSUES_FOUND' },
    summary: { type: 'string', description: 'ONE-LINE summary (full report is in the Linear comment you posted)' },
    files_changed: { type: 'array', items: { type: 'string' } },
    write_calls: { type: 'integer' }, edit_calls: { type: 'integer' },
    no_code: { type: 'boolean', description: 'true if this ticket legitimately needs no implementation-phase code (pure verification/test-only/doc-only)' },
    committed: { type: 'boolean' }, posted: { type: 'boolean' },
    worktree_path: { type: 'string' }, branch_name: { type: 'string' },
    gates: { type: 'string', description: 'testing only: Gate #0/#1/#2/#3 PASS/FAIL one-liner' },
  },
}
const REVIEW_SCHEMA = {
  type: 'object', required: ['status'],
  properties: {
    status: { type: 'string', description: 'APPROVED | CHANGES_REQUESTED | BLOCKED' },
    blocking_findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, file: { type: 'string' }, issue: { type: 'string' } } } },
    security_status: { type: 'string', enum: ['PASS', 'FAIL'], description: 'SMALL/NO-CODE combined review only: PASS | FAIL for the folded security sanity' },
    posted: { type: 'boolean' },
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
    status: { type: 'string', description: 'APPROVED (PASS, zero CRITICAL/HIGH) | CHANGES_REQUIRED | BLOCKED (FAIL)' },
    critical_high_count: { type: 'integer' }, posted: { type: 'boolean' },
  },
}
const CODEX_SCHEMA = {
  type: 'object', required: ['status'],
  properties: { status: { type: 'string', description: 'COMPLETE | RATE_LIMITED | UNAVAILABLE' }, auto_fixed_count: { type: 'integer' }, posted: { type: 'boolean' } },
}
const MERGE_SCHEMA = {
  type: 'object', required: ['status'],
  properties: {
    status: { type: 'string', description: 'MERGED | CONFLICT | TEST_FAILED | SKIPPED' },
    integration_tests: { type: 'string', description: 'PASS | NEW_FAILURES | NONE' },
    new_failures: { type: 'array', items: { type: 'string' } },
    ticket_closed: { type: 'boolean' }, merge_sha: { type: 'string' }, notes: { type: 'string' },
  },
}
const PR_SCHEMA = { type: 'object', required: ['status'], properties: { status: { type: 'string' }, pr_url: { type: 'string' } } }

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
function parseArgs(a) {
  const flags = { dryRun: false, push: false, maxTickets: Infinity }
  let epicId = null
  if (typeof a === 'string') {
    const toks = a.trim().split(/\s+/).filter(Boolean)
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i]
      if (tk === '--dry-run') flags.dryRun = true
      else if (tk === '--push') flags.push = true
      else if (tk === '--no-push') flags.push = false
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
      else if (!tk.startsWith('--') && !epicId) epicId = tk
    }
  } else if (a && typeof a === 'object') {
    epicId = a.epicId || a.epic || a.id || null
    if (a.dryRun) flags.dryRun = true
    if (a.push) flags.push = true
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
if (!epicId) throw new Error('epic-swarm-workflow: missing epic ID. Usage: /epic-swarm-workflow <EPIC-ID> [--dry-run] [--push] [--no-push] [--max-tickets N]')
if (flags.maxTickets === 0) throw new Error('epic-swarm-workflow: --max-tickets 0 would process no tickets. Omit the flag to run all tickets, or pass a positive count (e.g. --max-tickets 1).')

// Single source of truth for a ticket's worktree path AND feature branch name —
// used by setup, merge, and cleanup so the three can never drift apart.
function ticketRefs(root, t) {
  return { wt: `${root}/.swarm/worktrees/${t.id}`, branch: `feature/${t.id}-${t.slug || 'work'}` }
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
- install dependencies in the worktree with a dir flag (e.g. pnpm -C ${wt} install --frozen-lockfile); run codegen scripts if present.
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
log(`epic-swarm-workflow v2 starting for ${epicId} — mode: ${flags.dryRun ? 'DRY RUN (no changes)' : (flags.push ? 'real + push/PR' : 'real, local-only')}`)

const setupPrompt = `You are the swarm setup agent for epic ${epicId}.
${SHELL_RULES}

Do exactly this and report:
1. REPO_ROOT = \`git rev-parse --show-toplevel\`.
2. default_branch = \`git symbolic-ref refs/remotes/origin/HEAD\` (strip refs/remotes/origin/), else "main".
3. ${flags.dryRun ? 'DRY RUN: do NOT create branches; report epic_branch = epic/' + epicId + '.' : `Create + checkout the epic branch from the default branch: \`git fetch origin\` (ignore if no remote); if epic/${epicId} exists check it out, else \`git checkout -b epic/${epicId} <origin/default-or-default>\`. NEVER touch main/master. Verify you are not on main/master.`}
4. Ensure \`.swarm/\` is gitignored (append ".swarm/" to REPO_ROOT/.gitignore via Edit/Write if \`git check-ignore .swarm/\` fails).
5. Detect the package manager (lockfiles) and the test command (package.json -> "<pkgmgr> test", Cargo.toml -> "cargo test", go.mod -> "go test ./...", pytest, etc.); empty string if none.
6. BASELINE: ${flags.dryRun ? 'skip (dry run).' : 'if a test command exists, run it once on the epic branch and record the set of ALREADY-FAILING test files/names as baseline_failures (best-effort — file paths or test names). This lets the merge gate ignore pre-existing failures. If the suite is huge or hangs, capture what you can and note it. If no test command, baseline_failures = [].'}

Return status, repo_root, default_branch, epic_branch (epic/${epicId}), test_cmd, pkg_mgr, baseline_failures[], baseline_note.`

const planPrompt = `You are the swarm planning + classification agent for epic ${epicId}. READ-ONLY: do not modify Linear.
${LINEAR_NOTE}

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

if (!setup || setup.status !== 'OK') throw new Error(`epic-swarm-workflow: setup failed — ${setup ? (setup.baseline_note || `status=${setup.status || 'unknown'} (setup agent returned no detail)`) : 'no result from setup agent'}`)
if (!plan || !plan.tickets || plan.tickets.length === 0) throw new Error(`epic-swarm-workflow: no eligible sub-tickets for ${epicId}.`)

const REPO_ROOT = setup.repo_root
const EPIC_BRANCH = setup.epic_branch || `epic/${epicId}`
const DEFAULT_BRANCH = setup.default_branch || 'main' // PR base; default_branch is optional in SETUP_SCHEMA, so never let it interpolate as undefined
const TEST_CMD = setup.test_cmd || ''
const BASELINE = setup.baseline_failures || []

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
  const merge = await safeAgent(
    `You are the integration agent for ${t.id}. Merge its work to the epic branch using a TEST-DIFF gate that ignores pre-existing failures, then close it. Track a STATUS as you go and ALWAYS run the final CLEANUP step before returning — NEVER return early.
${SHELL_RULES}

1. Safety: confirm NOT on main/master. \`git -C ${REPO_ROOT} checkout ${EPIC_BRANCH}\`.
2. Empty-diff pre-check: \`git -C ${REPO_ROOT} diff --stat ${EPIC_BRANCH}...${branch}\`. ${emptyDiffStep}
3. Dry-merge (no commit yet): \`git -C ${REPO_ROOT} merge --no-ff --no-commit ${branch}\`. If CONFLICT: \`git -C ${REPO_ROOT} merge --abort\`, set STATUS = CONFLICT, go to step 7.
4. ${TEST_CMD ? `Run integration tests on the merged tree: \`${TEST_CMD}\` (tool-native dir flag from ${REPO_ROOT}). Compare FAILING tests to this BASELINE of pre-existing failures captured before any merge:
${BASELINE.length ? BASELINE.map((b) => `   - ${b}`).join('\n') : '   (baseline was clean — any failure is new)'}
   new_failures = tests failing now that are NOT in the baseline.
   - If new_failures is EMPTY: commit the merge (\`git -C ${REPO_ROOT} commit --no-edit\`), STATUS = MERGED, integration_tests = PASS (note any pre-existing failures you ignored).
   - If new_failures NON-EMPTY: \`git -C ${REPO_ROOT} merge --abort\`, integration_tests = NEW_FAILURES, STATUS = TEST_FAILED, list them, go to step 7. Do NOT close the ticket.` : 'No test command was detected — commit the merge (\`git -C ' + REPO_ROOT + ' commit --no-edit\`), STATUS = MERGED, integration_tests = NONE. NOTE in notes that this merge was NOT integration-verified (no test command).'}
5. If STATUS = MERGED${flags.push ? `: push \`git -C ${REPO_ROOT} push origin ${EPIC_BRANCH}\`.` : ' do NOT push (local-only).'}
6. If STATUS = MERGED: set ${t.id} to "Done" in Linear and set ticket_closed=true ONLY if that succeeds. ${LINEAR_NOTE} If Linear is unavailable, log it, leave ticket_closed=false, and CONTINUE — do NOT change STATUS away from MERGED over a Linear error (the code is already merged).
7. CLEANUP — ALWAYS, for EVERY status (MERGED / CONFLICT / TEST_FAILED / SKIPPED): \`git -C ${REPO_ROOT} worktree remove ${wt} --force\` (ignore errors).

Return status (= STATUS: MERGED | CONFLICT | TEST_FAILED | SKIPPED), integration_tests, new_failures[], ticket_closed (true only if set to Done), merge_sha, notes.`,
    { schema: MERGE_SCHEMA, label: `merge ${t.id}`, phase: 'Integrate', model: ROUTE.merge },
  )
  ticketResult.merge = merge ? merge.status : 'NO_REPORT'
  ticketResult.integration_tests = merge ? merge.integration_tests : undefined
  if (merge && merge.status === 'MERGED') {
    // The code is integrated on the epic branch. Whether Linear was closed only
    // affects the outcome LABEL — a failed Linear close must NOT block the ticket
    // or its dependents (that would discard merged work over a transient Linear
    // error, the exact failure mode this workflow is built to survive).
    mergedIds.add(t.id)
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
      const build = await safeAgent(
        `You are handling a NO-CODE ticket (docs/comment/observation — no logic/behavior/API change).
${wtSetup(REPO_ROOT, EPIC_BRANCH, t)}
${SHELL_RULES}

${acBlock(t)}

${readTicket(t)}
Make ONLY the documentation/comment/config change the ticket asks for. If you discover it actually requires code/logic changes, STOP, set status NEEDS_CONTEXT, and explain (it was mis-classified). Commit in the worktree: \`git -C ${wt} add -A\` then \`docs(${t.id}): ...\`.

${selfPost(t, H.implementation, true)}
Return status, summary, files_changed, write/edit counts, committed, no_code.`,
        { schema: WORK_SCHEMA, label: `build ${t.id}`, phase: 'Build', model: ROUTE.buildNoCode },
      )
      ticketResult.phases.build = build ? build.status : 'NO_REPORT'
      // Fail closed: advance ONLY on explicit COMPLETE (allowlist), matching the SMALL/
      // STANDARD build gates. A denylist would let ISSUES_FOUND or any unexpected/typo
      // status fall through as a pass.
      if (!build || build.status !== 'COMPLETE') {
        log(`BLOCK ${t.id} at build — ${build ? build.status : 'no report'}${build && build.status === 'NEEDS_CONTEXT' ? ' (likely mis-classified; re-run will re-tier)' : ''}`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_BUILD'; results.push(ticketResult); continue
      }

      phase('Review')
      const ncReviewPrompt = (rerun) => `You are reviewing a NO-CODE change for ${t.id} (read-only). Verify: the change matches the ticket, is correct, and introduces NO behavior/security surface. Review ONLY the diff: \`git -C ${wt} diff --name-only ${EPIC_BRANCH}...HEAD\`.${rerun ? ' This is a POST-FIX RE-REVIEW: re-check the diff after the fix pass.' : ''}
${readTicket(t)}
${SHELL_RULES}
${selfPost(t, rerun ? H.codereview + ' (re-review)' : H.codereview, false)}
ALWAYS return security_status explicitly as exactly PASS (the change has no security impact) or FAIL (the "doc" change actually affects security).
Return status (APPROVED | CHANGES_REQUESTED), blocking_findings[], security_status (PASS | FAIL).`
      const { review, reReviewed } = await reviewWithFixPass(t, wt, ncReviewPrompt, COMBINED_REVIEW_SCHEMA, ROUTE.reviewNoCode, 'NO-CODE review')
      ticketResult.phases.review = review ? review.status + (reReviewed ? ' (re-reviewed)' : '') : 'NO_REPORT'
      // Reviews FAIL CLOSED: require explicit APPROVED + PASS.
      if (!review || review.status !== 'APPROVED' || review.security_status !== 'PASS') {
        log(`BLOCK ${t.id} — NO-CODE review ${review ? review.status + '/' + (review.security_status || '?') : 'failed (null)'}.`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_REVIEW'; results.push(ticketResult); continue
      }
      await mergeTicket(t, ticketResult, false) // NO-CODE: an empty diff is a legitimate no-op, not a block
      continue
    }

    // ─────────────────────────────── SMALL tier ──────────────────────────────
    if (t.effort_tier === 'SMALL') {
      phase('Build')
      const implRole = t.impl_type === 'frontend' ? 'frontend (UI/components — match the existing component library)' : 'backend (APIs/services/data — match existing patterns)'
      const smallBuildPrompt = `You are handling a SMALL ${implRole} ticket end-to-end: brief planning, implementation, and a focused test — in one focused pass (the change is small: <=~30 lines, 1-3 files, no schema/auth/API/new-deps).
${wtSetup(REPO_ROOT, EPIC_BRANCH, t)}
${SHELL_RULES}
${PROD}
${NO_DEFER}

${acBlock(t)}

${readTicket(t)}
Reuse existing code; implement every AC; add a focused test for the change; run lint + typecheck on changed files (npx --prefix ${wt} tsc --noEmit, project lint). Commit: \`git -C ${wt} add -A\` then \`feat(${t.id}): ...\`. If the work turns out to be larger than SMALL (schema/auth/API/many files), STOP with status NEEDS_CONTEXT (it was mis-classified for STANDARD).

${selfPost(t, H.implementation, true)}
Return status, summary, files_changed, ACTUAL write/edit counts, committed, no_code, gates.`
      // Code IS expected for SMALL — use the git-verified empty-artifact retry (parity with STANDARD).
      const build = await buildWithEmptyRetry(smallBuildPrompt, wt, { schema: WORK_SCHEMA, label: `build ${t.id}`, phase: 'Build', model: ROUTE.buildSmall })
      if (looksEmpty(build)) {
        log(`BLOCK ${t.id} — SMALL build produced no artifacts twice (git-verified empty).`)
        blocked.add(t.id); ticketResult.phases.build = 'BLOCKED_NO_ARTIFACTS'; ticketResult.outcome = 'BLOCKED_BUILD'; results.push(ticketResult); continue
      }
      ticketResult.phases.build = build ? build.status : 'NO_REPORT'
      if (!build || build.status !== 'COMPLETE') {
        log(`BLOCK ${t.id} at build — ${build ? build.status : 'no report'}`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_BUILD'; results.push(ticketResult); continue
      }

      phase('Review')
      const smallReviewPrompt = (rerun) => `You are the combined reviewer (code review + security) for SMALL ticket ${t.id}. Read-only. Review ONLY the diff: \`git -C ${wt} diff --name-only ${EPIC_BRANCH}...HEAD\`.${rerun ? ' This is a POST-FIX RE-REVIEW: re-check the diff after the fix pass; do NOT assume the prior findings were resolved.' : ''}
${readTicket(t)}
${SHELL_RULES}
Cover, in one pass: (a) every acceptance criterion met (Requirements check); (b) correctness/bugs/edge cases; (c) SOLID/DRY + framework best practices; (d) a focused OWASP security pass (injection, authz, secrets, input validation, data exposure) on the diff.
${selfPost(t, rerun ? H.codereview + ' (re-review)' : H.codereview, false)}
ALWAYS return security_status explicitly as exactly PASS (zero CRITICAL/HIGH) or FAIL.
Return status (APPROVED | CHANGES_REQUESTED), blocking_findings[], security_status (PASS | FAIL).`
      const { review, reReviewed } = await reviewWithFixPass(t, wt, smallReviewPrompt, COMBINED_REVIEW_SCHEMA, ROUTE.reviewSmall, 'SMALL review')
      ticketResult.phases.review = review ? review.status + (reReviewed ? ' (re-reviewed)' : '') : 'NO_REPORT'
      // Reviews FAIL CLOSED (review covers security for SMALL): require explicit APPROVED + PASS.
      if (!review || review.status !== 'APPROVED' || review.security_status !== 'PASS') {
        log(`BLOCK ${t.id} — SMALL review ${review ? review.status + '/' + (review.security_status || '?') : 'failed (null)'}.`)
        blocked.add(t.id); ticketResult.outcome = 'BLOCKED_REVIEW'; results.push(ticketResult); continue
      }
      await mergeTicket(t, ticketResult, true) // SMALL: code was expected — an empty diff is an anomaly that blocks
      continue
    }

    // ─────────────────────────────── STANDARD tier ───────────────────────────
    phase('Build')
    const adapt = await safeAgent(
      `ROLE: architect-agent (ADAPTATION — plan only, do not implement features) for ${t.id}.
${wtSetup(REPO_ROOT, EPIC_BRANCH, t)}
${SHELL_RULES}
${PROD}
${NO_DEFER}

${acBlock(t)}

${readTicket(t)}
Then produce the adaptation plan (NO feature code yet): inventory EXISTING services/utilities to reuse (prevent duplication — highest-value output); map each AC to an approach; list files to create (only if no reuse) and modify; define the test strategy and integration points.
${selfPost(t, H.adaptation, true)}
Return status (COMPLETE | BLOCKED | NEEDS_CONTEXT), summary (one line on the plan + key reuse), files_changed (likely empty), write/edit counts, worktree_path, branch_name.`,
      { schema: WORK_SCHEMA, label: `adapt ${t.id}`, phase: 'Build', model: ROUTE.adapt },
    )
    ticketResult.phases.adaptation = adapt ? adapt.status : 'NO_REPORT'
    // Fail closed: advance ONLY on explicit COMPLETE (allowlist). A denylist would let
    // an adapt agent that returned ISSUES_FOUND (or any unexpected status) feed a
    // flagged plan forward into implementation as if it were sound.
    if (!adapt || adapt.status !== 'COMPLETE') {
      log(`BLOCK ${t.id} at adaptation — ${adapt ? adapt.status : 'no report'}`)
      blocked.add(t.id); ticketResult.outcome = 'BLOCKED_ADAPTATION'; results.push(ticketResult); continue
    }

    const implRole = t.impl_type === 'frontend' ? 'frontend-engineer-agent (UI/components/pages — match the existing component library)' : 'backend-engineer-agent (APIs/services/data — match existing repository/service patterns)'
    const implPrompt = `ROLE: ${implRole} for ${t.id}. Implement ONLY this ticket in the worktree ${wt}, following the adaptation plan.
${SHELL_RULES}
${PROD}
${NO_DEFER}
${acBlock(t)}
${readTicket(t)} In particular read the Adaptation Report and any prior phase comments on ${t.id}.
ADAPTATION SUMMARY: ${adapt.summary || '(read the Adaptation Report you posted)'}
Reuse what adaptation mandated; implement every AC; NO test code here (separate phase); run lint + typecheck on changed files; commit (\`git -C ${wt} add -A\`; \`feat(${t.id}): ...\`). If this ticket genuinely has no implementation-phase code deliverable (pure verification/test-only), set no_code=true and explain — do NOT invent code.
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
    if (!impl || impl.status !== 'COMPLETE') {
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
${readTicket(t)}
${SHELL_RULES}${PROD}
- Gate #0: run existing tests in affected modules; FIX broken existing tests (root-cause) FIRST.
- Gate #1 API Accuracy (100%): Read the implementation for ACTUAL method names/enums/params — no invented APIs.
- Gate #2 Compilation (100%): tests compile, zero type errors. Gate #3 Execution (100%): tests run, mocks work, assertions valid.
- Cap Gate #0 fix loops at ~3 cycles; if still red, report ISSUES_FOUND with the specifics rather than looping. Coverage secondary (~70-80%, 90%+ critical), skip trivial code.
- Commit: \`git -C ${wt} add -A\`; \`test(${t.id}): ...\`. Files changed by implementation: ${(impl.files_changed || []).join(', ') || '(discover via git diff)'}
${selfPost(t, H.testing, false)}
Return status (COMPLETE | ISSUES_FOUND), a gates one-liner, files_changed, write/edit counts, committed.`,
        { schema: WORK_SCHEMA, label: `test ${t.id}`, phase: 'Build', model: ROUTE.test },
      )
      ticketResult.phases.testing = test ? test.status : 'NO_REPORT'
      // Fail closed: advance ONLY on explicit COMPLETE (allowlist). The previous denylist
      // (`=== 'ISSUES_FOUND'`) let a test agent that returned BLOCKED / NEEDS_CONTEXT — the
      // likely outcome when the suite can't even run — pass as if tests were green.
      if (!test || test.status !== 'COMPLETE') {
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
${readTicket(t)}
${SHELL_RULES}
${selfPost(t, H.documentation, false)}
Return status, summary, files_changed, write/edit counts, committed.`,
        { schema: WORK_SCHEMA, label: `docs ${t.id}`, phase: 'Build', model: ROUTE.docs },
      )
      ticketResult.phases.documentation = doc ? doc.status : 'NO_REPORT'
    } else { ticketResult.phases.documentation = 'skipped' }

    // ── Review HARD FLOOR (single combined reviewer) ────────────────────────
    phase('Review')
    const stdReviewPrompt = (rerun) => `ROLE: code-reviewer-agent for ${t.id} (read-only, single combined review). Review ONLY the diff: \`git -C ${wt} diff --name-only ${EPIC_BRANCH}...HEAD\`.${rerun ? ' This is a POST-FIX RE-REVIEW: re-verify the diff after the fix pass; do NOT assume the prior findings were resolved.' : ''}
${readTicket(t)}
${SHELL_RULES}
${acBlock(t)}
Cover in one pass: (1) Requirements — verify EACH acceptance criterion against the implementation with concrete evidence (any unmet → CHANGES_REQUESTED); (2) Correctness — bugs, edge cases, data-flow (params accepted but not forwarded), error handling; (3) Best practices + SOLID/DRY (duplicated logic, leaky abstractions).
${selfPost(t, rerun ? H.codereview + ' (re-review)' : H.codereview, false)}
Return status (APPROVED | CHANGES_REQUESTED | BLOCKED), blocking_findings[].`
    const { review, reReviewed } = await reviewWithFixPass(t, wt, stdReviewPrompt, REVIEW_SCHEMA, ROUTE.review, 'review')
    ticketResult.phases.codereview = review ? review.status + (reReviewed ? ' (re-reviewed)' : '') : 'NO_REPORT'
    // Reviews FAIL CLOSED.
    if (!review || review.status !== 'APPROVED') {
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

    // Codex commits its fixes AFTER the code-review hard floor already ran, so those
    // changes would otherwise reach merge unreviewed for correctness/ACs. If codex
    // changed code, re-run the correctness review on the new diff and FAIL CLOSED.
    if (codex && codex.status === 'COMPLETE' && (codex.auto_fixed_count || 0) > 0) {
      log(`${t.id} codex applied ${codex.auto_fixed_count} fix(es) after the review floor — re-reviewing the codex changes (fail closed).`)
      const postCodex = await safeAgent(stdReviewPrompt(true), { schema: REVIEW_SCHEMA, label: `post-codex review ${t.id}`, phase: 'Review', model: ROUTE.review })
      ticketResult.phases.codereview = `${ticketResult.phases.codereview} + post-codex ${postCodex ? postCodex.status : 'NO_REPORT'}`
      if (!postCodex || postCodex.status !== 'APPROVED') {
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
    const securityPass = sec && sec.status === 'APPROVED' && (sec.critical_high_count || 0) === 0
    if (!securityPass) {
      log(`BLOCK ${t.id} — security ${sec ? sec.status + ' (' + (sec.critical_high_count || 0) + ' CRITICAL/HIGH)' : 'failed (null)'}.`)
      blocked.add(t.id); ticketResult.outcome = 'SECURITY_BLOCKED'; results.push(ticketResult); continue
    }

    await mergeTicket(t, ticketResult, !impl.no_code) // STANDARD: code expected unless impl legitimately reported no_code
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

// Best-effort worktree sweep. mergeTicket cleans up the worktree of every ticket that
// REACHES merge (any status), but a ticket BLOCKED earlier in its pipeline never gets
// there and leaks its `.swarm/worktrees/<id>` dir — so a long run with several blocked
// tickets accumulates worktrees. Sweep exactly those here. Feature BRANCHES are kept so
// failed work stays inspectable; a later rerun's idempotent wtSetup clears any stale
// branch before re-creating the worktree. `.swarm/` is gitignored scratch space.
const LEAKED_OUTCOMES = new Set(['BLOCKED_BUILD', 'BLOCKED_ADAPTATION', 'BLOCKED_IMPLEMENTATION', 'BLOCKED_TESTING', 'BLOCKED_REVIEW', 'SECURITY_BLOCKED', 'ERROR'])
const leakedWts = results.filter((r) => LEAKED_OUTCOMES.has(r.outcome)).map((r) => ticketRefs(REPO_ROOT, { id: r.id }).wt)
if (leakedWts.length) {
  await safeAgent(
    `Best-effort worktree cleanup for epic ${epicId}. Each path below is a per-ticket git worktree left behind by a ticket that blocked before it could merge. Remove each one; KEEP all branches (failed work must stay inspectable); NEVER touch main/master or the epic branch.
${SHELL_RULES}
For EACH path, run \`git -C ${REPO_ROOT} worktree remove <path> --force\` as its OWN Bash call (ignore "not a working tree"/"not found" errors). Then run \`git -C ${REPO_ROOT} worktree prune\`. Do NOT run \`git branch -D\` on anything.
Paths:
${leakedWts.map((p) => `- ${p}`).join('\n')}
Return status only ("DONE").`,
    { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string' } } }, label: `cleanup ${epicId}`, phase: 'Report', model: ROUTE.merge },
  )
  log(`Swept ${leakedWts.length} leftover worktree(s) from blocked tickets (branches kept for inspection).`)
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
const summary = {
  epic: { id: epicId, title: plan.epic.title },
  mode: flags.push ? 'real+push' : 'real(local)',
  epic_branch: EPIC_BRANCH,
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
  next_steps: `Review epic branch ${EPIC_BRANCH}.${manualClose.length ? ` Manually set ${manualClose.join(', ')} to Done in Linear (merged/no-op but auto-close failed).` : ''} Run /close-epic ${epicId} once all tickets are Done.`,
}
log(`epic-swarm-workflow v2 complete — ${doneIds.length}/${tickets.length} done${mergedPending.length ? `, ${mergedPending.length} merged-pending-close` : ''}${noOpIds.length ? `, ${noOpIds.length} no-op` : ''}, ${blockedList.length} blocked, ${unprocessed.length} unprocessed.`)
return summary
