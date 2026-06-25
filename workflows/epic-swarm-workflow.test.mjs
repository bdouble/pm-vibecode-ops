// Guard test for epic-swarm-workflow.js — the regression-prone PURE logic (arg parsing, id
// normalization, path-safety) plus a few source-invariant checks for the orchestration changes that
// cannot be unit-tested without the Workflow runtime. Run with:  node --test workflows/
//
// The workflow file is NOT importable (it is a Workflow-runtime script: `export const meta`, top-level
// `await`, injected globals, and it EXECUTES the whole swarm on load). So instead of importing it, we
// extract the helpers it marks with `/* test-export:begin */ … /* test-export:end */` and eval just
// those — testing the REAL source (no duplication → no drift). If the markers are removed or the helper
// surface changes, this test fails loudly, which is the point.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SRC_PATH = join(dirname(fileURLToPath(import.meta.url)), 'epic-swarm-workflow.js')
const src = readFileSync(SRC_PATH, 'utf8')

// Extract every marked pure-helper region and eval the concatenation in one scope.
const blocks = [...src.matchAll(/\/\*\s*test-export:begin[\s\S]*?\*\/([\s\S]*?)\/\*\s*test-export:end\s*\*\//g)].map((m) => m[1])
assert.ok(blocks.length >= 3, `expected >= 3 test-export blocks, found ${blocks.length} — were the markers removed?`)
// eslint-disable-next-line no-new-func
const factory = new Function(`${blocks.join('\n')}\n;return { parseArgs, normalizeEpicId, ID_RE, stripEdgePunct, EPIC_LABEL, isShellSafePath, ticketRefs };`)
const { parseArgs, stripEdgePunct, isShellSafePath, ticketRefs } = factory()

// The exact args string from the 2026-06-23 incident (assistant prepended "Epic: PRO-1653.").
const INCIDENT_ARGS = 'Epic: PRO-1653. Process ONLY these three sub-tickets this session, in strict dependency order: PRO-1785 first.'

test('parseArgs — bare Linear id as first token', () => {
  assert.equal(parseArgs('PRO-1653').epicId, 'PRO-1653')
})

test('parseArgs — lowercase id is upper-cased', () => {
  assert.equal(parseArgs('pro-1653').epicId, 'PRO-1653')
})

test('parseArgs — leading "Epic:" label is unwrapped, not captured as the epic', () => {
  const { epicId, flags } = parseArgs('Epic: PRO-1653 reuse the stripe client')
  assert.equal(epicId, 'PRO-1653')
  assert.equal(flags.guidance, 'reuse the stripe client') // label is noise, NOT guidance
})

test('parseArgs — THE INCIDENT: "Epic: PRO-1653. …" resolves to PRO-1653 (was captured as "Epic:")', () => {
  assert.equal(parseArgs(INCIDENT_ARGS).epicId, 'PRO-1653')
})

test('parseArgs — trailing punctuation on the id is tolerated', () => {
  assert.equal(parseArgs('PRO-1653.').epicId, 'PRO-1653')
  assert.equal(parseArgs('(PRO-1653)').epicId, 'PRO-1653')
  assert.equal(parseArgs('#PRO-1653').epicId, 'PRO-1653')
})

test('parseArgs — only "epic" is a target label; ticket/story/issue are NOT unwrapped (v5.3.1 wrong-target guard)', () => {
  // Narrowed in v5.3.1: "epic" unambiguously labels the target, but "ticket"/"story"/"issue" routinely
  // introduce a REFERENCE id, not the target, so unwrapping them captured the wrong id. They now fail
  // closed (epicId null → usage error) rather than silently hijack the run.
  assert.equal(parseArgs('epic PRO-42').epicId, 'PRO-42')   // the one true target label still works
  assert.equal(parseArgs('ticket PRO-42').epicId, null)
  assert.equal(parseArgs('story: PRO-42').epicId, null)
  assert.equal(parseArgs('issue PRO-42').epicId, null)
})

test('parseArgs — "ticket PRO-42 … run epic PRO-99" does NOT hijack PRO-42 as the epic', () => {
  // The exact wrong-target footgun the narrowing closes: "ticket" is not a target label, so the mention
  // PRO-42 is not captured, and the buried PRO-99 is never scanned — so it fails closed (epicId null).
  // A clear usage error beats a silent swarm against the wrong epic.
  assert.equal(parseArgs('ticket PRO-42 is blocked, run epic PRO-99').epicId, null)
})

test('parseArgs — an id BURIED in guidance is NOT captured (2026-06-22 footgun stays closed)', () => {
  const { epicId, firstPositional } = parseArgs('Do the 3 recommended tickets PRO-1785 this session')
  assert.equal(epicId, null)
  assert.equal(firstPositional, 'Do')
})

test('parseArgs — "HAND-PICKED …" is not an id and does not become the epic', () => {
  assert.equal(parseArgs('HAND-PICKED CROSS-EPIC SET').epicId, null)
})

test('parseArgs — a label NOT directly followed by an id does not capture anything', () => {
  // "Epic: not-an-id" → label, but next token is not an id → fails closed (epicId null).
  assert.equal(parseArgs('Epic: not-an-id text').epicId, null)
})

test('parseArgs — flags parse alongside the id', () => {
  const { epicId, flags } = parseArgs('PRO-42 --dry-run --max-tickets 3')
  assert.equal(epicId, 'PRO-42')
  assert.equal(flags.dryRun, true)
  assert.equal(flags.maxTickets, 3)
})

test('parseArgs — --epic flag, with edge punctuation tolerated', () => {
  assert.equal(parseArgs('--epic PRO-42').epicId, 'PRO-42')
  assert.equal(parseArgs('--epic=pro-42.').epicId, 'PRO-42')
})

test('parseArgs — conflicting ids (positional vs --epic) throw', () => {
  assert.throws(() => parseArgs('PRO-1 --epic PRO-2'), /conflicting epic IDs/)
})

test('parseArgs — --max-tickets requires a non-negative integer', () => {
  assert.throws(() => parseArgs('PRO-1 --max-tickets x'), /--max-tickets requires/)
})

test('parseArgs — object form tolerates edge punctuation', () => {
  assert.equal(parseArgs({ epicId: 'pro-7.' }).epicId, 'PRO-7')
  assert.throws(() => parseArgs({ epicId: 'not-an-id' }), /not a Linear issue ID/)
})

test('parseArgs — free-text guidance after the id is preserved', () => {
  const { epicId, flags } = parseArgs('PRO-42 reuse the existing Stripe client, no new dep')
  assert.equal(epicId, 'PRO-42')
  assert.equal(flags.guidance, 'reuse the existing Stripe client, no new dep')
})

test('stripEdgePunct — trims edges, preserves internal hyphen', () => {
  assert.equal(stripEdgePunct('PRO-1653.'), 'PRO-1653')
  assert.equal(stripEdgePunct('#PRO-1653,'), 'PRO-1653')
  assert.equal(stripEdgePunct('Epic'), 'Epic')
  assert.equal(stripEdgePunct(null), '')
})

test('isShellSafePath — rejects a colon (the ERR_PNPM_BAD_PATH_DIR trigger)', () => {
  assert.equal(isShellSafePath('/Users/brian/ProductLobster/.swarm/epics/Epic:'), false)
  assert.equal(isShellSafePath('/a/b:c'), false)
})

test('isShellSafePath — accepts a normal path', () => {
  assert.equal(isShellSafePath('/Users/brian/ProductLobster/.swarm/epics/PRO-1653'), true)
})

test('isShellSafePath — accepts spaces AND hyphens (must NOT over-reject)', () => {
  // Regression guard: an earlier draft used the char class /[: -]/ which wrongly rejected spaces and
  // hyphens. Real repo paths routinely contain both; only ':' and control chars are hostile.
  assert.equal(isShellSafePath('/Users/My Name/code-base/.swarm/epics/PRO-1'), true)
  assert.equal(isShellSafePath('/deep-nested/multi-word-dir/PRO-9'), true)
})

test('isShellSafePath — rejects empty / non-string / control chars', () => {
  assert.equal(isShellSafePath(''), false)
  assert.equal(isShellSafePath(null), false)
  assert.equal(isShellSafePath('/a/\tb'), false)
})

test('ticketRefs — sanitizes the slug, keeps the id verbatim in the path', () => {
  const { wt, branch } = ticketRefs('/root', { id: 'PRO-1785', slug: 'In Network! Runner' })
  assert.equal(wt, '/root/.swarm/worktrees/PRO-1785')
  assert.equal(branch, 'feature/PRO-1785-in-network-runner')
})

// ── Source-invariant checks for the orchestration changes (cannot unit-test without the runtime) ──

test('source — WORK_SCHEMA status enum includes ENV_BLOCKED', () => {
  assert.ok(src.includes("'ENV_BLOCKED'"), 'ENV_BLOCKED must be a WORK_SCHEMA status enum value')
  assert.ok(src.includes('ENV_BLOCKED (the test/build runner could NOT execute'), 'ENV_BLOCKED must be documented in the schema')
  assert.ok(src.includes("ticketResult.outcome = envBlocked ? 'BLOCKED_TEST_ENV'"), 'testing block must map ENV_BLOCKED → BLOCKED_TEST_ENV')
})

test('source — safeAgent has a bounded default re-dispatch', () => {
  assert.ok(/const DEFAULT_AGENT_RETRIES = 1/.test(src), 'DEFAULT_AGENT_RETRIES must exist')
  assert.ok(/re-dispatching \(attempt/.test(src), 'safeAgent must log re-dispatch attempts')
  assert.ok(/retries: 0/.test(src), 'the resolve pre-flight must opt out of the default retry (retries: 0)')
})

test('source — path-safety assert runs before the per-ticket loop and releases the lock', () => {
  assert.ok(/if \(!isShellSafePath\(p\)\)/.test(src), 'path-safety assert must call isShellSafePath')
  assert.ok(/contains a character hostile to build tooling/.test(src), 'path-safety assert must fail fast with a clear message')
})

test('source — planner-supplied ticket ids are ID-validated before becoming a worktree path', () => {
  assert.ok(src.includes('if (!ID_RE.test(id)) {'), 'dedup loop must guard ticket ids with ID_RE')
  assert.ok(src.includes('planner emitted ticket id "${id}" that is not a Linear issue ID'), 'dedup loop must warn and drop non-ID ticket ids')
})

test('source — test_cmd integrity is checked and surfaced', () => {
  assert.ok(/TEST_CMD_TARGETS_ROOT/.test(src), 'TEST_CMD_TARGETS_ROOT integrity flag must exist')
})

// ── Reliable per-phase Linear reporting (v5.3) ──

test('source — workers return report_md as a schema field, not a self-posted comment', () => {
  assert.ok(src.includes('const REPORT_MD ='), 'REPORT_MD schema field must exist')
  assert.ok(src.includes("required: ['status', 'summary', 'committed', 'report_md']"), 'WORK_SCHEMA must require report_md')
  assert.ok(!src.includes('selfPost'), 'the unreliable selfPost helper must be gone')
  assert.ok(!src.includes('POST YOUR REPORT YOURSELF'), 'workers must NOT be told to self-post')
  assert.ok(src.includes('function reportBlock('), 'reportBlock helper must exist')
  assert.ok(src.includes('DELIVER YOUR REPORT AS DATA'), 'reportBlock must instruct returning report_md, not posting')
})

test('source — a dedicated JS-dispatched poster delivers comments + status', () => {
  assert.ok(src.includes('async function postPhase('), 'postPhase poster must exist')
  assert.ok(src.includes('const POST_SCHEMA ='), 'POST_SCHEMA must exist')
  assert.ok(src.includes('const linearPosts ='), 'linearPosts tally must exist')
  // The poster guarantees the canonical header anchors the comment even if a worker omitted it.
  assert.ok(src.includes('text.startsWith(header) ? text :'), 'postPhase must ensure the canonical header')
  // Posted under each canonical phase header.
  for (const h of ['H.adaptation', 'H.implementation', 'H.testing', 'H.documentation', 'H.security', 'H.codex']) {
    assert.ok(src.includes(`postPhase(t, ${h},`), `a postPhase call must use ${h}`)
  }
  assert.ok(src.includes('postPhase(t, postHeader,'), 'reviewWithFixPass must post the review report')
})

test('source — first phase transitions the ticket to In Progress via the poster', () => {
  assert.ok(src.includes("{ state: 'In Progress'"), 'the first phase must set In Progress through postPhase')
  assert.ok(src.includes('linear_reporting:'), 'the summary must surface the Linear-reporting tally')
})

// ── No permission-halt: the epic lock is a Write-tool state cell, never `rm`/`mkdir` (2026-06-25) ──
// Motivation: in the ProductLobster run wf_7f92f89c-cd6 the ONLY destructive shell command the whole
// run issued was `rm -rf <…>/.swarm/.locks/<id>.lock` to release the lock; `rm` is not auto-approvable,
// so in acceptEdits ("auto") mode it raised a permission prompt and the run HALTED at finalize.
test('source — epic lock acquire/release uses the Write tool, never rm/mkdir (no permission-halt)', () => {
  assert.ok(!src.includes('rm -rf <LOCK>'), 'no `rm -rf <LOCK>` may remain — it raises a permission prompt that stalls the run')
  assert.ok(!src.includes('mkdir <LOCK>'), 'no `mkdir <LOCK>` may remain — acquire must use the Write tool')
  assert.ok(!/rm -rf \$\{LOCK_PATH\}/.test(src), 'finalize must not `rm` the lock')
  assert.ok(!/rm -rf \$\{lockPath\}/.test(src), 'releaseEpicLock must not `rm` the lock')
  assert.ok(src.includes('const RELEASE_LOCK_INSTR ='), 'a shared Write-based release instruction must exist')
  assert.ok(src.includes('OVERWRITING the lock file'), 'release must overwrite the lock via the Write tool, not delete it')
  assert.ok(src.includes('used as a STATE CELL'), 'the lock must be documented as a single-file state cell')
  // Freshness is still an allowlisted, read-only `find -mmin` check (24h staleness), not a dir mtime.
  assert.ok(src.includes('find <LOCK> -maxdepth 0 -mmin +1440'), 'acquire must keep the read-only 24h staleness check')
  assert.ok(src.includes('first line is'), 'acquire must key on the RELEASED/ACTIVE first line of the state cell')
  // The ACTIVE cell carries an acquisition timestamp so the LOCKED-refusal lock_holder reports WHEN.
  assert.ok(src.includes('acquired: <UTC_NOW>'), 'the ACTIVE lock cell must record an acquisition timestamp (lock_holder reports who/WHEN)')
  // DRY: the release contract has ONE source per form — a brief inline helper for the setup abort
  // clauses, used at all 4 sites, so no site can restate "overwrite to RELEASED, never rm" freehand.
  assert.ok(src.includes('const RELEASE_LOCK_BRIEF ='), 'a brief inline release helper must exist for the setup abort clauses')
  assert.equal((src.match(/RELEASE_LOCK_BRIEF\('<LOCK>'\)/g) || []).length, 4, 'all 4 setup-prompt abort paths must release via RELEASE_LOCK_BRIEF, not freehand prose')
  assert.ok(!/release the lock by overwriting <LOCK>/.test(src) && !/overwrite <LOCK> to a `RELEASED` first line with the Write tool/.test(src), 'no freehand "overwrite <LOCK> to RELEASED" restatement may remain outside the helper')
})

// ── Cross-ticket (epic-level) codex review + fix (point-2, 2026-06-25) ──
test('source — a cross-ticket codex pass reviews the whole epic diff after merge', () => {
  assert.ok(src.includes('const EPIC_CODEX_SCHEMA ='), 'EPIC_CODEX_SCHEMA must exist')
  assert.ok(src.includes('CROSS-TICKET Codex review driver'), 'the cross-ticket codex driver prompt must exist')
  assert.ok(src.includes("phase('Cross-ticket review')"), 'a Cross-ticket review phase must exist')
  // Gated on >1 merged ticket: a single-ticket epic has no cross-ticket seam (the whole-epic diff IS
  // that one ticket's diff, already reviewed by its per-ticket codex), so the slow/rate-limited pass
  // must NOT run for it. (v5.4.0 PR-9 review fix — was `> 0`, which burned the codex budget for nothing.)
  assert.ok(src.includes('if (mergedIds.size > 1) {'), 'cross-ticket codex must be gated on MORE THAN ONE ticket having merged (a single ticket has no cross-ticket seam)')
  assert.ok(!src.includes('if (mergedIds.size > 0) {'), 'the cross-ticket gate must NOT fire on a single-ticket epic')
  assert.ok(src.includes('base_branch=${DEFAULT_BRANCH} (the FULL epic diff'), 'it must review the full epic diff vs the default branch, not one ticket')
  // Same non-fatal skip contract as the per-ticket codex (rate-limit / unavailable → skip, report out).
  assert.ok(src.includes('"error":"rate_limit"'), 'rate-limit detection must mirror the per-ticket codex')
  assert.ok(/RATE_LIMITED.*UNAVAILABLE/.test(src), 'the cross-ticket codex must be able to skip non-fatally')
  // No later merge gate, so a regressing fix is re-verified and reverted — to the CAPTURED pre-codex sha,
  // NOT `HEAD~1` (codex may make >1 commit; HEAD~1 would leave earlier regressing commits in place).
  assert.ok(src.includes('precodex_sha'), 'the cross-ticket codex must capture/return the pre-codex sha so the revert is commit-count-agnostic')
  assert.ok(src.includes('reset --hard <PRECODEX_SHA>'), 'the integration-regression revert must reset to the captured pre-codex sha, not HEAD~1')
  assert.ok(!src.includes('reset --hard HEAD~1'), 'the brittle single-commit `reset --hard HEAD~1` revert must be gone entirely')
  // Staging must mirror the per-ticket fix-forward: `add -u` (+ explicit new files), never `add -A`
  // (which would absorb the gitignored .swarm/ tree or other untracked scratch into the commit).
  assert.ok(/then stage WITHOUT sweeping untracked scratch.*add -u/s.test(src), 'the cross-ticket commit must stage with add -u, not add -A')
  assert.ok(src.includes('cross_ticket_codex:'), 'the summary must report the cross-ticket codex outcome')
})

// The cross-ticket codex commits straight onto the epic branch with NO later merge gate, so its kept
// fix must (a) get an INDEPENDENT correctness re-gate (the per-ticket "never reaches merge unreviewed"
// invariant) that reverts on a non-APPROVED review, and (b) be PUSHED under --push so it reaches the PR.
test('source — kept cross-ticket fix is correctness re-gated and pushed under --push', () => {
  // (a) independent re-gate that fails closed by reverting to the captured sha.
  assert.ok(src.includes('re-gating the CROSS-TICKET codex fixes'), 'a cross-ticket correctness re-gate prompt must exist')
  assert.ok(src.includes('const keptCrossFix ='), 'the re-gate must only run on a KEPT cross-ticket fix')
  assert.ok(src.includes("gate(regate, 'APPROVED')"), 'the re-gate must fail closed on a non-APPROVED review')
  assert.ok(src.includes('crossRegateReverted = true'), 'a re-gate failure must revert the kept fix and flag it')
  assert.ok(src.includes('reset --hard ${sha}'), 'the re-gate revert must reset to the captured pre-codex sha')
  // (b) the kept fix is pushed (per-ticket merges push, the PR step does not — without this the kept
  // fix would be local-only and silently dropped on a --push run).
  assert.ok(/flags\.push && crossTicketCodex[\s\S]*?push origin \$\{EPIC_BRANCH\}/.test(src), 'a kept cross-ticket fix must be pushed to origin under --push')
})

// A KEPT cross-ticket fix that could not be integration-verified (ENV_BLOCKED / no test command / no
// re-gate) must surface a next_steps warning — it must never ship silently as if it were verified.
test('source — a kept-but-unverified cross-ticket fix warns the operator', () => {
  assert.ok(src.includes('const crossKeptUnverified ='), 'an unverified-kept-fix condition must exist')
  assert.ok(/crossKeptUnverified\)\s*nextStepsParts\.push/.test(src), 'a kept-but-unverified cross-ticket fix must push a next_steps warning')
})

// ── Each phase reads the PARENT EPIC's comments, not just the sub-ticket's (v5.5, 2026-06-25) ──
// Epic-level comments carry cross-cutting context (operator/agent notes, conventions, or a comment
// added AFTER planning ran / on resume) that lives in no single AC. The planning agent reads the epic
// comments once at the start; without this, the per-phase workers never see them. readTicket() is the
// single chokepoint every per-ticket phase routes through, so the epic-comment read lives THERE (one
// place, can't drift per-phase) rather than being restated in each phase prompt.
test('source — every per-ticket phase reads the parent epic description AND comments', () => {
  const m = src.match(/function readTicket\(t\)\s*\{[\s\S]*?\n\}/)
  assert.ok(m, 'readTicket(t) helper must exist')
  const body = m[0]
  // SUB-TICKET read: both description AND comments (lower-case "its" — distinct from the epic clause).
  assert.ok(/its full description AND all of its comments/.test(body), 'readTicket must still read the SUB-TICKET description + comments')
  // EPIC read: the helper must direct the agent to the parent epic AND read BOTH its description and
  // its comments. Pin the WHOLE clause (description + comments together) — asserting only "comments"
  // would let the "read ITS full description AND" half silently drop while the test stayed green
  // (the v5.5 feature is description AND comments, not comments alone).
  assert.ok(/PARENT EPIC \$\{epicId\} and read ITS full description AND all of ITS comments/.test(body),
    'readTicket must read the parent epic\'s full DESCRIPTION and all of its comments — not the comments alone')
  // Chokepoint integrity: every per-ticket work phase routes context-reading through readTicket(t),
  // so the epic read can't be bypassed by one phase. Count the INTERPOLATION call sites
  // (`${readTicket(t)}`) — NOT a bare /readTicket\(t\)/ which also matches the `function readTicket(t)`
  // DEFINITION line and would inflate the count, letting a dropped call site hide under the slack.
  // Exact count is a deliberate tripwire (cf. RELEASE_LOCK_BRIEF above): dropping a phase's read fails
  // it, and ADDING a per-ticket phase fails it too until you bump this number — which forces you to
  // confirm the new phase actually threads readTicket(t). Currently 9: NO-CODE build, SMALL build,
  // adapt, implement, test, docs, codex, security, plus the shared reviewPrompt builder.
  const callSites = (src.match(/\$\{readTicket\(t\)\}/g) || []).length
  assert.equal(callSites, 9, `every per-ticket phase must thread \${readTicket(t)} (expected 9 call sites, found ${callSites}) — if you added/removed a phase, update this count and confirm the new phase reads the epic`)
  // reviewPrompt backs all three tiers' code reviews. Scope the check to reviewPrompt's OWN body — the
  // next top-level construct after it is `for (const t of tickets)` — so the match can't borrow a
  // readTicket(t) from a sibling prompt (a non-greedy /function reviewPrompt[\s\S]*?readTicket\(t\)/
  // walks past reviewPrompt's closing brace and would stay green even if reviewPrompt dropped its own).
  const rpStart = src.indexOf('function reviewPrompt')
  const rpEnd = src.indexOf('for (const t of tickets)', rpStart)
  assert.ok(rpStart !== -1 && rpEnd > rpStart, 'reviewPrompt and the per-ticket loop must both exist (this test anchors on them)')
  assert.ok(src.slice(rpStart, rpEnd).includes('${readTicket(t)}'),
    'the shared reviewPrompt builder must thread ${readTicket(t)} in its OWN body (all three review tiers depend on it for epic context)')
})
