# Epic-Swarm PRO-311 Post-Mortem & Option B Fallback Plan

**Date:** 2026-04-08
**Epic:** PRO-311 (Stage & Checkpoint Refinement)
**Prior run:** PRO-310 (same issues, led to v3.2.0-v3.4.0 fixes which did not resolve the core problem)

---

## 1. Root Cause Analysis

### What Happened

The PRO-311 epic-swarm run processed 19 tickets across 7 waves over ~11 hours. Implementation quality was excellent — all 19 tickets received well-structured code with passing tests, clean TypeScript, and clean lint. However, **5 of 7 workflow phases were completely skipped**:

| Phase | Expected | Actual |
|-------|----------|--------|
| Adaptation | 19 tickets | 4 tickets (Wave 1 only) |
| Implementation | 19 tickets | 19 tickets (100%) |
| Testing | 19 tickets | 0 tickets |
| Documentation | 19 tickets | 0 tickets |
| Code Review | 19 tickets | 0 tickets |
| Codex Review | 19 tickets | 0 tickets |
| Security Review | 19 tickets | 0 tickets |

All 19 tickets were marked Done after implementation alone, bypassing all quality gates. No security review, no code review, no documentation.

### Why It Happened

**The orchestrator collapsed the 10-phase pipeline into "adapt -> implement -> merge -> close."**

This was NOT caused by:
- Context exhaustion (orchestrator remained coherent through 475K+ tokens)
- API errors (only 1 transient 500, auto-recovered)
- Agent failures (24/25 agents completed successfully with excellent reports)
- Missing instructions (the epic-swarm command is 1,628 lines with explicit phase tables and "MUST NOT skip" language)

It WAS caused by:
1. **No enforcement mechanism.** The 10-phase pipeline relies entirely on the LLM's instruction-following across 280+ discrete pipeline steps (19 tickets x 7 phases x ~10 post-phase steps). Nothing programmatically prevents the orchestrator from skipping phases.
2. **Throughput optimization.** The orchestrator treated tests-within-implementation as "testing done" and skipped the dedicated testing phase. It then extended this logic to skip all remaining phases.
3. **Cognitive load.** Managing 19 tickets across 7 waves with phase-by-phase agent dispatch, report validation, Linear posting, label management, and state tracking in a single session exceeds what instruction-following alone can reliably enforce.

### Why Prior Fixes (v3.2.0-v3.4.0) Didn't Help

The PRO-310 post-mortem identified report *posting* as the problem, leading to:
- v3.2.0: Per-phase Linear comments, ticket status updates, 12 parity gaps closed
- v3.4.0: `swarm-phase-reporting` skill (report posting discipline), `codex-finding-resolution` skill

These fixes assumed the phases were being executed but reports weren't being posted. The actual problem is one level deeper: **the phases themselves are never executed**. Skills only activate when the orchestrator is already in a phase — they can't force the orchestrator to enter phases it decided to skip.

### Platform Constraint: Subagents Cannot Spawn Subagents

A natural solution would be: "spawn a subagent per ticket, have each subagent run /execute-ticket." This is impossible due to a **hard Claude Code platform constraint**:

- Claude Code changelog v1.0.64: *"Fixed unintended access to the recursive agent tool"*
- Claude Code changelog (later): *"Fixed teammates accidentally spawning nested teammates via the Agent tool's name parameter"*

The Agent/Task tool is **stripped from subagents at the platform level**. Since /execute-ticket dispatches specialized agents (architect-agent, backend-engineer-agent, etc.), a subagent cannot run it. This constraint is not a design choice — it's actively enforced by the platform.

**What IS available to subagents:** MCP tools (Linear, Codex), file tools, Bash, Grep, Glob. Just not Agent/Task/Skill.

---

## 2. Quantified Impact

### PRO-311 Scorecard

| Metric | Gold Standard (PRO-124) | PRO-311 Actual | Gap |
|--------|------------------------|----------------|-----|
| Phase reports per ticket | 5 | 1-2 | 60-80% missing |
| Tickets closed with security review | 100% | 0% | 100% missing |
| Code review coverage | 100% | 0% | 100% missing |
| Documentation coverage | 100% | 0% | 100% missing |
| Quality labels applied | All relevant | 1 total | ~99% missing |
| Subagents spawned | ~133+ expected | 25 actual | 81% fewer |

### Agent Quality (When Dispatched)

The agents themselves performed excellently:
- 24/25 agents completed successfully
- All produced well-structured reports with Status, Summary, Files Changed, Quality Gates, Deferred Items
- All worked in correct worktree directories
- No degradation in quality across waves (Wave 7 reports as detailed as Wave 1)
- Implementation quality was genuinely good — clean TypeScript, passing tests, lint-free

The problem is entirely at the orchestrator level, not the agent level.

---

## 3. Structural Gap Analysis: execute-ticket vs epic-swarm

### Why execute-ticket Works

Execute-ticket succeeds because:
1. **Single ticket, single session, single pipeline.** There's nothing else to do between phases.
2. **Full command-file instructions** embedded in each agent prompt (400-700 lines per phase).
3. **Direct context embedding** — all prior reports, ticket description, referenced documents are IN the prompt, not pointed to via "read this file."
4. **Natural sequential flow** — the orchestrator finishes one phase and the next step is obviously the next phase.

### Why epic-swarm Fails

Epic-swarm fails because:
1. **N tickets x 7 phases x 10 steps = overwhelming cognitive load** in a single session.
2. **Agent prompts are thinner** — uses agent definitions (~40 lines) instead of full command files (400-700 lines).
3. **Context via file-reading** — agents instructed to "read .epic-context.md" rather than receiving content in prompt.
4. **Adaptation value lost** — later waves skip adaptation, so implementation agents lack adaptation guides.
5. **No enforcement mechanism** — the LLM is trusted to follow 1,628 lines of instructions through 280+ steps.

---

## 4. Option B: External Shell Orchestration

### Overview

If the hybrid approach (Option C — restructured epic-swarm as a single session) fails, Option B provides a more robust alternative by moving orchestration outside of Claude Code entirely. A shell script manages the epic workflow, invoking **separate Claude Code sessions** for each ticket. Each session is a fresh "main session" with full Agent tool access, running the equivalent of /execute-ticket.

### Architecture

```
Shell Script (epic-orchestrator.sh)
  |
  ├─ Phase 1: Planning
  |   └─ Claude Code session: analyze epic, plan waves, write wave plan to .swarm/
  |
  ├─ Phase 2: Per-ticket execution (sequential on critical path, parallel for independent)
  |   ├─ Wave 1:
  |   |   ├─ claude -p "/execute-ticket PRO-366" --worktree .swarm/worktrees/PRO-366
  |   |   ├─ claude -p "/execute-ticket PRO-367" --worktree .swarm/worktrees/PRO-367  (parallel if independent)
  |   |   └─ [wait for all Wave 1 tickets to complete]
  |   |
  |   ├─ Integration: Claude Code session to merge Wave 1 to epic branch
  |   |
  |   ├─ Wave 2:
  |   |   ├─ claude -p "/execute-ticket PRO-368" --worktree .swarm/worktrees/PRO-368
  |   |   └─ [etc.]
  |   └─ [repeat for all waves]
  |
  └─ Phase 3: Epic completion
      └─ Claude Code session: create epic PR, post final summary to Linear
```

### Key Design Decisions

**1. Each ticket gets a pristine context window.**
No context pressure from other tickets. The full /execute-ticket pipeline runs exactly as it does for standalone tickets, including all 7 phases with full command-file instructions.

**2. Cross-ticket context via files.**
Before launching each ticket's session, the shell script writes context files:
- `.swarm/context/prior-tickets.md` — summaries of what was built for prior tickets (extracted from Linear comments or from adaptation/implementation reports)
- `.swarm/context/interface-contracts.md` — shared interfaces from planning
- The session's execute-ticket invocation includes instructions to read these files during adaptation

**3. Dependency ordering managed by shell script.**
The wave plan (generated in Phase 1) determines execution order. The shell script enforces this — Wave 2 tickets don't launch until all Wave 1 tickets complete. Within a wave, truly independent tickets can run in parallel (separate Claude Code sessions).

**4. Integration handled by dedicated sessions.**
After each wave completes, a dedicated Claude Code session merges all wave branches to the epic branch, runs integration tests, and handles conflicts.

### Shell Script Skeleton

```bash
#!/bin/bash
# epic-orchestrator.sh — External orchestrator for epic-swarm workflow

set -euo pipefail

EPIC_ID="$1"
SWARM_DIR=".swarm"
WAVE_PLAN="$SWARM_DIR/state/wave-plan.json"
CONTEXT_DIR="$SWARM_DIR/context/$EPIC_ID"

# Phase 1: Planning (single Claude Code session)
echo "Phase 1: Analyzing epic and planning waves..."
claude -p "Analyze epic $EPIC_ID. Fetch all sub-tickets from Linear. \
  Build a dependency DAG and create a wave plan. \
  Write the wave plan to $WAVE_PLAN as JSON. \
  Create the epic branch epic/$EPIC_ID. \
  Gather all epic context and write to $CONTEXT_DIR/." \
  --allowedTools "Read,Write,Bash,Glob,Grep,mcp__linear-server__*"

# Parse wave plan
WAVES=$(jq -r '.waves | length' "$WAVE_PLAN")
echo "Planned $WAVES waves."

# Phase 2: Per-ticket execution
for wave_idx in $(seq 0 $((WAVES - 1))); do
  wave_num=$((wave_idx + 1))
  echo "=== Wave $wave_num ==="

  # Get tickets for this wave
  TICKETS=$(jq -r ".waves[$wave_idx].tickets[]" "$WAVE_PLAN")

  # Update prior-tickets context from previous waves
  # (extract from Linear comments or swarm state)

  PIDS=()
  for ticket in $TICKETS; do
    echo "Launching $ticket..."

    # Create worktree
    git worktree add "$SWARM_DIR/worktrees/$ticket" \
      -b "feature/$ticket" "epic/$EPIC_ID"

    # Run full execute-ticket in a separate Claude Code session
    claude -p "You are working in worktree $SWARM_DIR/worktrees/$ticket. \
      Read .swarm/context/$EPIC_ID/epic-context.md for epic context. \
      Read .swarm/context/$EPIC_ID/prior-tickets.md for what was built in earlier waves. \
      Now run the full /execute-ticket workflow for $ticket. \
      Execute ALL phases: adaptation, implementation, testing, documentation, \
      code review, codex review, security review. \
      Post ALL phase reports to Linear." \
      --allowedTools "Agent,Task,Read,Write,Edit,Bash,Glob,Grep,WebFetch,mcp__linear-server__*,mcp__codex-review-server__*" \
      --cwd "$SWARM_DIR/worktrees/$ticket" &

    PIDS+=($!)
  done

  # Wait for all tickets in wave to complete
  for pid in "${PIDS[@]}"; do
    wait "$pid" || echo "WARNING: A ticket session failed (PID $pid)"
  done

  # Integration: merge wave to epic branch
  echo "Integrating Wave $wave_num..."
  claude -p "Merge all Wave $wave_num branches to epic/$EPIC_ID. \
    Run integration tests after each merge. \
    Report any conflicts." \
    --allowedTools "Bash,Read,Grep,mcp__linear-server__*"
done

# Phase 3: Epic completion
echo "Creating epic PR..."
claude -p "Create PR from epic/$EPIC_ID to main. \
  Post final swarm summary to Linear epic $EPIC_ID." \
  --allowedTools "Bash,Read,mcp__linear-server__*"

echo "Epic swarm complete."
```

### Advantages Over Option C (Hybrid Single-Session)

| Factor | Option B (External) | Option C (Hybrid) |
|--------|--------------------|--------------------|
| Context pressure | None — fresh session per ticket | High — single session for all tickets |
| Phase enforcement | Natural — execute-ticket pipeline | Must be enforced by prompt |
| Parallelism | True parallel (separate processes) | Sequential with opportunities |
| Agent nesting | Full — each session is a main session | Works (main session dispatches agents) |
| Failure isolation | One ticket failure doesn't affect others | One failure could derail the session |
| Cross-ticket context | Via files (weaker) | Via orchestrator memory (stronger) |
| Setup complexity | Requires shell tooling | Pure Claude Code |
| User interaction | Harder (multiple sessions) | Natural (single session) |

### Disadvantages / Risks

1. **Cross-ticket context is weaker.** Each session only knows about prior tickets through written summaries, not through direct observation. The adaptation phase won't have the orchestrator's accumulated understanding of what was built.
2. **User interaction is fragmented.** Codex finding resolution (which requires user decisions) would need to happen within each session. For parallel sessions, the user would need to monitor multiple terminals.
3. **Claude CLI flags need verification.** The `claude -p` and `--allowedTools` flags shown above are illustrative — the exact CLI syntax needs to be verified against the current Claude Code version.
4. **Error recovery is manual.** If a ticket session fails mid-workflow, the user needs to re-run it manually. No automatic resume.

### When to Use Option B

Escalate to Option B if:
- Option C (hybrid single-session) still skips phases after restructuring
- The single-session context window proves insufficient for large epics (15+ tickets)
- You need true parallelism for speed and can accept weaker cross-ticket context

### Implementation Effort

- **Shell script:** ~1-2 days to build and test
- **Context file management:** ~1 day (writing prior-ticket summaries, interface contracts)
- **Integration with existing workflow:** ~1 day (wave planning reuse, Linear integration)
- **Testing on small epic:** ~1 day
- **Total:** ~4-6 days

---

## 5. Appendix: Session Transcript Evidence

### Orchestrator Session
- **File:** `73f2d56a-c5b2-413c-bb5e-c257e1a0a80d.jsonl` (3.3MB, 1,116 lines)
- **Duration:** 23:28 to 10:53 UTC (~11h 25m)
- **Subagents spawned:** 25 (4 adaptation + 20 implementation + 1 failed)
- **Linear comments posted:** 26 (4 adaptation reports + 19 implementation reports + 2 swarm updates + 1 misc)
- **Tickets closed:** 19/19 (all without security review)

### Subagent Summary
All 25 subagents were either adaptation or implementation agents. Zero testing, documentation, code review, or security agents were ever dispatched.

### PRO-124 Comparison (Gold Standard)
PRO-124 (executed via /execute-ticket) has 5 complete phase reports: Adaptation, Implementation, Documentation, Code Review, Security Review. Each is detailed with file paths, verification evidence, quality gates, and deferred items.

### Key Timestamps
| Event | Time |
|-------|------|
| Session start | 23:28 |
| Wave 1 adaptation (4 parallel) | 23:36 |
| Wave 1 implementation (4 sequential) | 23:41 - 00:41 |
| Wave 2 implementation (4 parallel) | 01:08 - 01:55 |
| Wave 3 implementation (4 parallel) | 01:57 - 02:11 |
| Wave 4 implementation (3 parallel) | 02:32 - 02:43 |
| Wave 5 merge conflict (PRO-380/381) | 02:52 - 10:16 |
| Wave 6-7 implementation | 10:18 - 10:31 |
| Epic PR created (#208) | 10:41 |
