# Workflow Profiles

The orchestrator selects ONE profile per ticket based on objective signals. Default is **STANDARD**. The user can force a profile with `--profile <name>` or `--strict`.

This is the authoritative profile reference. Both `/epic-swarm` and `/execute-ticket` consult this file at ticket entry to determine which phases run.

---

## Profile Selection Algorithm

For every ticket entering the workflow, the orchestrator runs this algorithm exactly once, in order:

1. **If `--strict` flag is set on the command** → assign `STRICT`. Stop.
2. **If `--profile <name>` flag is set on the command** → assign that profile explicitly. Stop.
3. **Evaluate MINIMAL criteria** (see below). If ALL criteria match → assign `MINIMAL`. Stop.
4. **Otherwise** → assign `STANDARD`.

The profile decision is **one-shot**. Once assigned, the orchestrator MUST NOT downgrade a STANDARD ticket to MINIMAL mid-execution. Upgrading STANDARD → STRICT requires user approval (the orchestrator surfaces a question).

The decision is recorded in:
- `.swarm/observability/<epic-id>/<ticket-id>.jsonl` (machine-readable)
- A Linear comment on the ticket with title `## Profile Assignment` containing the chosen profile, the matched criteria, and the orchestrator's reasoning (human-readable audit trail)

---

## Profile: MINIMAL (3 phases)

**Phases that run:** `adaptation`, `implementation`, `codereview`

**Phases skipped** (orchestrator posts N/A reports for audit trail): `testing`, `documentation`, `codex-review`, `security-review`

**Criteria — ALL must match for MINIMAL assignment:**

- [ ] Ticket has at least one of the following Linear labels: `docs-only`, `typo`, `config-only`, `comment-only`, `lockfile`, `lint-only`, `readme-only`, `error-message-wording`, `dep-bump-patch`
  - **OR** ticket title/description matches one of the keyword patterns: `"fix typo"`, `"update README"`, `"doc fix"`, `"docs only"`, `"config tweak"`, `"comment only"`, `"rename variable"`, `"lockfile update"`, `"lint fix"`, `"error message wording"`
- [ ] No acceptance criterion in the ticket mentions: logic, behavior, API, endpoint, query, mutation, authentication, authorization, validation, test coverage, performance, security
- [ ] Estimated change scope: <30 lines net, 1-3 files affected
- [ ] No new dependencies introduced
- [ ] No schema changes (database, GraphQL, OpenAPI, JSON Schema, Zod)

**When MINIMAL is the right call:** README typo, code comment fix, config value tweak (e.g., timeout from 30s to 60s with no logic change), lockfile sync, lint-only rename, error-message wording polish, dependency patch bump with no breaking changes.

**When MINIMAL is the wrong call:** Anything that touches runtime behavior, anything that adds or removes a public API surface, anything that affects performance or security posture, anything where a bug in the change could cause an incident. Default to STANDARD when uncertain.

---

## Profile: STANDARD (7 phases) — DEFAULT

**Phases that run:** `adaptation`, `implementation`, `testing`, `documentation`, `codereview`, `codex-review`, `security-review`

**Criteria:** This is the default. Any ticket that does NOT match MINIMAL criteria gets STANDARD. No explicit signals required.

**When STANDARD is the right call:** Default for any feature work, bug fix that touches logic, API change, schema change, performance optimization, security-relevant change, or anything where reasonable doubt exists about cognitive demand.

---

## Profile: STRICT (7 phases, no reclassification)

**Phases that run:** Identical to STANDARD — all 7 phases.

**Difference from STANDARD:** The orchestrator MUST NOT reclassify this ticket to MINIMAL even if signals later appear to match MINIMAL criteria. No phase may be skipped for any reason except an agent returning `BLOCKED` status.

**When STRICT is the right call:** High-stakes tickets where you want absolute audit coverage regardless of apparent simplicity. Examples: security-relevant change that *looks* small, payment-handling change, auth-flow change, anything touching production data integrity.

**How to engage STRICT:**
- CLI flag: `/epic-swarm <epic-id> --strict` or `/execute-ticket <ticket-id> --strict`
- The flag applies to the entire invocation. In epic-swarm, every ticket in the epic runs STRICT.

---

## N/A Phase Reports (audit trail for skipped phases)

For every phase NOT in the active profile's phase list, the orchestrator posts a Linear comment with the exact header the hard checkpoint expects:

```
## <Phase Name> Report

Status: N/A — Skipped per MINIMAL profile

This phase is not applicable to this ticket. See profile justification in the Profile Assignment comment.
```

This satisfies the hard-checkpoint requirement that all 7 expected headers exist on the ticket before merge — without weakening that check. The hard checkpoint is preserved as the enforcement mechanism that prevents the prior failure mode (orchestrator skipping phases unilaterally).

---

## Why This Design

**Why discrete profiles instead of per-phase relevance decisions?** Per-phase decisions multiply judgment points — and the failure mode this workflow exists to prevent is agents making too many unilateral judgment calls. Three discrete profiles is the smallest set that covers the actual ticket-shape distribution observed in practice. The orchestrator makes ONE decision per ticket (which profile), not N decisions per phase.

**Why is MINIMAL so narrow?** Because the failure mode is over-skipping, not under-skipping. The cost of running an unnecessary phase is ~1 phase's worth of tokens. The cost of skipping a necessary phase is a missed bug, a missed security finding, or a missed regression that surfaces in production. Asymmetric — bias toward STANDARD.

**Why does STRICT exist?** Because there are tickets whose surface appearance underrepresents their risk (a one-line auth change, a "small" payment fix). STRICT gives the user an escape valve to force full coverage when they have context the orchestrator lacks.

**Why are N/A reports posted?** Because the hard checkpoint (epic-swarm.md lines 1356-1410) validates that all 7 expected headers exist on the ticket. The N/A report satisfies that check while documenting the skip. This preserves the prior failure-mode fix without relaxing it.

---

## Related

- `epic-swarm.md` §1.5 "Profile Selection" — orchestrator implementation
- `execute-ticket.md` profile-selection section — orchestrator implementation
- `epic-swarm.md` Constraint #6 — phases-must-run rule (updated to be profile-aware)
- `epic-swarm.md` hard checkpoint §3.3 — validates headers per active profile
