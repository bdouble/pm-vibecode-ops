# Skill Audit Playbook

How to run a manual SkillOpt-style audit on a pm-vibecode-ops skill. This is the operator handoff document — read it once before starting your first audit, then keep it open as a reference while you work.

**Source:** Yang et al., *SkillOpt: Executive Strategy for Self-Evolving Agent Skills* (Microsoft, May 2026, arXiv:2605.23904). Methodology adapted for manual audits because v4.7 doesn't ship an auto-grader (the "verification bottleneck" deferred to v4.8+).

**Companion docs:**
- `commands/references/skill-audit-schema.md` — formal schemas for `rejected-edits.md` and `edit-apply-report.jsonl`
- `scripts/validate-skill-invariants.sh` — CI enforcement of protected-region invariants
- `context/v4.7-release-plan.md` Appendix B — full SkillOpt method summary

**Prerequisites:** None to read this. Before STARTING an audit, you need:
- The target skill identified (one skill per audit pass)
- An hour minimum for a light audit; half a day for a full discipline-skill audit
- Linear/codebase access (to author scenarios that resemble real workflow situations)

---

## The Operator Loop

Audits aren't on a calendar — they're driven by signal from the observability stream. The loop is:

1. **Ship.** Run `/execute-ticket` and `/epic-swarm` on real work. Every ticket emits to `.swarm/observability/<epic-id>/<ticket-id>.jsonl` automatically — no extra step.
2. **Measure.** After each epic (or at your weekly/monthly review cadence), run `/swarm-stats <epic-id>` for the headline dashboard, and `/swarm-stats <epic-id> --per-skill` for per-skill activation and compliance rates.
3. **Diagnose.** Map dashboard signals to audit candidates using the table below.
4. **Audit.** When a signal crosses threshold (cadence rule: *discipline-skill audits quarterly OR triggered by 3+ observed compliance failures in the wild*), pick that skill and run the 11-step pass below.
5. **Re-measure.** Next epic's dashboard tells you whether the audit moved the needle. If yes, audit budget consumed for that skill; if no, the next pass starts from the REFACTOR-phase rationalizations you logged at Step 8.

### Diagnostic signals → audit candidates

| Dashboard signal | Likely cause | Audit candidate |
|---|---|---|
| Deferral acceptance rate rising past 30% across consecutive epics | Padded justifications slipping through; orchestrator being permissive. Read 2-3 raw `data.items[].catastrophic_condition` payloads to confirm. | `no-silent-deferrals` |
| Few closure-log entries + many follow-up filings | Impact-bar discipline not firing — agents defaulting to "file ticket" without considering the bar | `no-silent-deferrals` Part 2 (impact bar) and/or `epic-closure-validation` |
| Codex auto-fix rate <50% | Humans doing too much of codex's job; disposition discipline drifting | `codex-finding-resolution` |
| Closure-log roll-up suspiciously low + mixed h2/h3 headings observed in sub-tickets | Aggregator dropping entries at the heading-drift boundary | `closure-log-aggregation` |
| Per-skill compliance <90% on `--per-skill` view | That specific skill is observably failing in the wild | Audit THAT skill, whatever it is |
| `phase_skipped_na` count doesn't match the profile's expected skip set | Phases being skipped without N/A justification | Usually `testing-philosophy`; sometimes profile-classifier logic (not a skill audit) |
| Falling N/A rate on MINIMAL tickets without a ticket-mix shift | Profile classifier mis-routing — observability surfaces it first | `execute-ticket.md` profile selection (not a skill audit) |

**Healthy patterns** (audit NOT needed): codex auto-fix rate ≥70%, deferral acceptance <30%, non-zero closure-log volume paired with low follow-up volume, phase skips matching the profile spec. The workflow is doing what it was designed to do — audit only when one of these moves materially against you across **2-3 consecutive epics**, not on a single bad epic.

### Worked example

Q1 review across three epics shipped through `/epic-swarm`. The aggregated dashboard shows:

```
DEFERRAL DISCIPLINE
  deferral_redispatch: 14
  deferral_accepted:   11
  Acceptance rate:     44%   ← target <30%
```

Acceptance is high and rising. Read three random `deferral_accepted` events' `data.items[].catastrophic_condition` field. Two of three contain time/effort phrasings — "would require significant testing", "edge case that's tricky" — rather than the four enumerated catastrophic conditions. **Diagnosis: `no-silent-deferrals` is drifting** — the orchestrator is letting padded justifications through.

Run the 11-step audit on `no-silent-deferrals`:

- **Step 2 (scenarios):** pull 5 train scenarios verbatim from the three Linear sessions where padded justifications were accepted; author 3 selection + 3 test scenarios from related but unseen sessions; lock the test split.
- **Step 3 (RED baseline):** 4 of 5 train scenarios produce the same padded phrasing without the skill loaded.
- **Step 4 (bounded edits):** 2 edits — add the two new padded phrasings to the Rationalization Prevention table; add "tricky" and "would require significant" to the Red-Flag Phrases list. (Edit budget used: 2 of 4.)
- **Step 6 (selection gate):** all 3 selection scenarios improve; no regression. Accept.
- **Step 8 (REFACTOR):** one new rationalization appears ("the spec is ambiguous on this case") — logged for the next pass, not closed this pass.
- **Step 9 (TEST):** 3/3 pass after edits; 1/3 passed before the change. Generalization confirmed.
- **Ship.** SKILL.md change wrapped in `<!-- @override approved-by="brian" reason="Q1 audit — see .swarm/skill-audits/no-silent-deferrals/" -->`; `bash scripts/validate-skill-invariants.sh main` passes; commit.

Next epic's dashboard: `deferral_accepted: 3, deferral_redispatch: 18, acceptance rate 14%`. The audit landed.

---

## Step 1: Decide discipline vs reference

The first decision: is this a discipline skill or a reference skill? The full SkillOpt-style audit (tripartite scenarios + bounded edits + rejected-edit buffer + edit-apply-report) applies only to discipline skills. Reference skills get a lighter pass.

**Discipline skill heuristic:** the skill exists to PREVENT a specific failure mode. Agents have a default behavior the skill counters. The skill body contains "STOP" instructions, foundational principles, rationalization tables, Red Flags lists, or banned phrasings.

**Reference skill heuristic:** the skill exists to provide saturated DOCUMENTATION agents look up on demand. The body contains tables of correct values, templates, schemas, or canonical patterns.

| Skill | Classification | Protected | Why |
|---|---|---|---|
| no-silent-deferrals | Discipline | Yes | Counters the default-to-defer instinct; foundational principle + impact bar |
| production-code-standards | Discipline | Yes | Counters the temporary-fix instinct; prohibits patterns |
| service-reuse | Discipline | Yes | Counters the create-new instinct; check-first procedure |
| testing-philosophy | Discipline | Yes | Counters the skip-broken-tests instinct; gate sequence |
| verify-implementation | Discipline | Yes | Counters the assume-it-works instinct; evidence requirement |
| epic-closure-validation | Discipline | Yes | Counters the close-with-pending-work instinct; closure gates |
| systematic-debugging | Discipline | Yes | Counters the guess-and-try instinct; Iron Law + 4-phase process |
| mvd-documentation | Reference | Yes | Decision matrix lookup (carries a "letter ≠ spirit" foundational principle) |
| security-patterns | Reference | Yes | OWASP pattern catalog lookup (carries a "letter ≠ spirit" foundational principle) |
| model-aware-behavior | Reference | Yes | Pre-change verification checklist (carries a "letter ≠ spirit" foundational principle) |
| divergent-exploration | Reference | Yes | Three-phase template (carries a "letter ≠ spirit" foundational principle) |
| swarm-observability | Reference | Yes | Dashboard interpretation guide (carries a "letter ≠ spirit" foundational principle) |
| closure-log-aggregation | Reference | Yes | Aggregation algorithm (carries a "letter ≠ spirit" foundational principle) |
| using-pm-workflow | Reference | No | Pure workflow phase routing table — no foundational principle to protect |
| codex-finding-resolution | Reference | No | Finding-disposition flowchart — no foundational principle to protect |
| swarm-phase-reporting | Reference | No | Report template + posting checklist — no foundational principle to protect |

**Two orthogonal dimensions.** Classification (Discipline vs Reference) governs **audit depth**: discipline skills get the full tripartite-scenario pass below; reference skills get the [light audit](#the-light-audit-path-reference-skills) checklist. The Protected column is independent: it tracks whether the SKILL.md contains a `<!-- @protected -->` envelope around a "Violating the letter is violating the spirit" foundational principle. A reference skill can carry such a principle (and the wrap that protects it) even though its audit cadence is lighter. The wrap criterion is presence of a foundational principle, not classification.

A gray-zone skill (`divergent-exploration`, `codex-finding-resolution`, `swarm-phase-reporting`) can be audited as discipline if you want the rigor; otherwise treat as reference. The audit playbook below covers both; sections marked **[discipline only]** apply to the full audit.

---

## Step 2: Author the tripartite scenario set [discipline only]

Per SkillOpt §3.1, three splits:

| Split | Count | Purpose | When touched |
|---|---|---|---|
| Train | ~5 | RED phase (identify violations) + GREEN-REFACTOR (develop fix) | Throughout the audit pass |
| Selection | ~3 | Merge gate for candidate edits | Each time an edit is evaluated |
| Test | ~3 | Generalization measurement | **LOCKED at audit start; run ONCE at end** |

**Author the test split FIRST and lock it.** "Lock" means: write the scenarios, sign them off, and DO NOT LOOK AT THEM during the audit. If you read the test scenarios while drafting edits, the audit is overfit. SkillOpt is rigorous about this — the test set is held-out for a structural reason, not a procedural one.

**Then author the train + selection splits.** Both can draw from the same source pool (real ProductLobster patterns from session transcripts, recent epic post-mortems, observed agent failures). Each scenario file has the shape documented in `commands/references/skill-audit-schema.md`:
1. Setup — prompt the agent receives
2. Without-skill expected failure (RED)
3. With-skill expected behavior (GREEN)
4. Pass criteria — concrete verification

**Tip: pull verbatim from real failures.** A scenario authored from a real session transcript (`/Users/brian/.claude/projects/-Users-brian-ProductLobster/`) is automatically grounded; a scenario authored from imagination drifts. The audit is only as good as the scenarios.

---

## Step 3: Baseline RED — run train scenarios without the skill [discipline only]

For each train scenario:
1. Spawn a subagent (use the `general-purpose` agent type) with the scenario's setup prompt and NO loaded skill.
2. Capture the agent's output.
3. Score it against the scenario's "Without-skill expected failure" — does the agent fall into the trap?
4. Capture verbatim rationalizations — the actual sentences the agent used to defer/skip/rationalize. These become Rationalization-table entries in the GREEN phase.

**Baseline compliance rate:** what percentage of train scenarios produced the expected failure? This is your starting point. The audit's success is measured against this baseline.

If the baseline is already >90%, the skill is doing its job and an audit pass may not be needed. The check-first discipline matters — don't audit a working skill.

---

## Step 4: Draft a bounded edit set (max 4 edits per pass) [discipline only]

Per SkillOpt §3.3, each audit pass is limited to **at most 4 edits**. SkillOpt's ablation (Table 3) shows that wholesale rewrites regress every benchmark — bounded edits are the textual analog of a learning rate.

**What counts as one edit:** add one new section, delete one section, replace one section, or modify one foundational principle. Adjusting a Rationalization-table row counts as one edit. Adding a paragraph to a Rationalization-table row also counts as one edit. Be honest about the count.

**Edit-budget cosine decay (per SkillOpt §3.4):** if you're running multiple audit passes on the same skill, start larger (4 edits) and shrink toward 2 over passes (4 → 3 → 2). Diminishing returns are real — after pass 3 you're polishing.

**Source the edits from the RED-phase rationalizations.** Each verbatim rationalization the agent produced becomes a candidate edit: "Add to Rationalizations table: '<verbatim phrase>' → '<reality>'." Use the agent's actual phrasing, not your interpretation.

---

## Step 5: GREEN — apply edits, re-run train scenarios [discipline only]

Apply the bounded edit set to the working copy of `skills/<skill>/SKILL.md`. Re-run all train scenarios with the updated skill loaded. The agent should now comply.

If train compliance doesn't improve: the edits are wrong. STOP, revert, and re-draft. Do NOT proceed to the selection gate with edits that don't even fix the training set.

If train compliance improves but is below 90%: the edits are partially right. Iterate within this pass — refine the edits using new rationalizations the partial-fix produced. Each refinement is still one edit toward the cap of 4.

---

## Step 6: Run the selection gate [discipline only]

Per SkillOpt §3.2, the validation gate is **strictly greater than**: the selection set's compliance must go UP, and no scenario may regress. Ties don't merge.

For each candidate edit (or batch of edits applied together):
1. Run all selection scenarios with the edited skill loaded.
2. Score against each scenario's pass criteria.
3. Compare to the prior selection score (the running baseline for this audit pass).
4. **Compliance up + no regression → ACCEPT.** Move on to the next candidate.
5. **Compliance flat OR any regression → REJECT.** Revert the edit. Append to `rejected-edits.md` with reason and insights.

**Why strictly greater than:** silent drift accumulates. SkillOpt's empirical finding is that aggregate compliance can hold while individual scenarios degrade — the "no regression" half of the rule prevents that. Ties don't merge for the same reason.

**Honesty discipline:** It is tempting to mark an edit "accepted" because the regression is "small" or "in an edge case." This is the failure mode the gate exists to prevent. Reject; document why; try again next pass. The audit's compounding value depends on the gate being honest.

---

## Step 7: Document every proposal in `edit-apply-report.jsonl`

Whether accepted or rejected, every proposed edit goes in `.swarm/skill-audits/<skill>/edit-apply-report.jsonl` per the schema in `commands/references/skill-audit-schema.md`. One JSONL line per edit.

This is the recoverable audit log — without it, the audit is unreplayable, the deltas are uncomparable, and the rejected-edit buffer can't link back to specific proposals. The schema document covers field semantics; the only soft rule is: append immediately, don't batch at end of pass.

---

## Step 8: REFACTOR — search for new rationalizations [discipline only]

After the bounded edit set is locked in, run a FRESH round of train scenarios designed to find NEW rationalizations the updated skill doesn't yet counter.

This step is the highest-leverage in the whole audit. Per SkillOpt §3.3, edits are bounded, but rationalizations aren't — the model invents new ones in response to the ones you closed. The REFACTOR phase catches the next layer.

If new rationalizations appear, they become candidates for the NEXT audit pass (you've already spent your edit budget on this pass). Document them in `rejected-edits.md` as "Insights for next pass" — they aren't rejections of YOUR edits, but they ARE forward-looking content for the next pass author.

---

## Step 9: TEST — unlock the test set, run ONCE [discipline only]

This is the only time during the entire audit pass you touch the test split. Per SkillOpt §3.1, the test set measures generalization to scenarios the audit was not optimized against.

1. Unseal the test scenarios authored in Step 2.
2. Run all of them with the edited skill loaded.
3. Score against each scenario's pass criteria.
4. Compare to a baseline (run the test scenarios with the PRE-EDIT skill, separately, capturing the same scores).
5. **Test compliance ≥ baseline on every scenario** → audit pass merges. Append `test_delta` to the final `edit-apply-report.jsonl` record.
6. **ANY test scenario regresses** → audit overfit. **Do NOT merge.** Restart with a fresh selection split (the prior selection split is now contaminated). Document the overfit in `rejected-edits.md` and `slow-meta-log.md`.

The single-touch discipline is critical. If you "just peek" at one test scenario mid-audit, the test set is no longer held-out and the overfitting protection is gone. SkillOpt is rigorous about this for a reason: it's the only mechanism that distinguishes "the audit improved the skill" from "the audit overfit to the validation set."

---

## Step 10: Update the slow/meta log

After test passes, append a new entry to `.swarm/skill-audits/<skill>/slow-meta-log.md` per the schema. 2-5 bullets, what stayed true across this audit pass.

Then mirror the same content into the SKILL.md's `### Slow/Meta Update Log` subsection inside its `<!-- @protected -->` region. Wrap your edit in `<!-- @override approved-by="<your-name>" reason="audit pass N — see .swarm/skill-audits/<skill>/" -->` so `scripts/validate-skill-invariants.sh` accepts the modification to the protected region.

---

## Step 11: Verify, commit, ship

1. Run `scripts/validate-skill-invariants.sh main` to confirm protected-region modifications have valid `@override` markers.
2. Run `git diff skills/<skill>/SKILL.md` and read the full diff carefully. Confirm the edits match what you intended.
3. Commit the SKILL.md change. Commit `.swarm/skill-audits/<skill>/` to your local repo IF and ONLY IF your workflow tracks it (the v4.7 default is `.swarm/` gitignored — audit working files stay local).
4. If shipping the SKILL.md change as a PR, reference the audit pass in the PR description so reviewers can find the supporting `rejected-edits.md` and `edit-apply-report.jsonl` content.

---

## The Light-Audit Path (reference skills)

Reference skills skip Steps 2-9 in favor of a single-pass checklist. The whole pass is ~1 hour per skill.

1. **5a checklist** (from `context/v4.7-release-plan.md` Tier 5a):
   - Filename is exactly `SKILL.md` (case-sensitive)
   - Folder is kebab-case
   - Frontmatter has `name` + `description`
   - Description starts with "Use when..."
   - Description has no workflow summary
   - Description under 1024 chars
   - SKILL.md body has critical instructions at top
   - SKILL.md body under 5,000 words
   - References folder for >100-line reference material
   - Cross-references use skill name, not `@` link
2. **5b description rewrite** — pass the description through the rule: "Does this sentence describe WHEN to load, or HOW the skill works?" If it describes HOW, rewrite as "Use when [symptom/situation/context]."
3. **5c token efficiency** — if frequently loaded (`using-pm-workflow`, `mvd-documentation`, `security-patterns`, `model-aware-behavior` qualify), trim body toward <200 words. Push detail to `references/`.

Light audits don't author scenarios; the cost is too high for the marginal value. Light audits also don't, by themselves, introduce protected regions — but a reference skill that already carries a "Violating the letter is violating the spirit" foundational principle DOES get a `<!-- @protected -->` wrap around that principle (see the Protected column in Step 1). The wrap criterion is presence of a foundational principle, not classification; the audit-depth criterion is classification, not the wrap.

---

## When NOT to audit

Don't audit a skill that:
- Has a baseline compliance rate >90% on candidate scenarios — it's working
- Was last audited in the current minor version — bounded edits compound, but only across reasonable cadence
- Hasn't accumulated rationalization signal — if you can't draft 3 train scenarios from observed failures, you don't have evidence to act on

The audit is a heavy tool. Use it when the skill is observably failing, not as a recurring task.

---

## Audit pass cadence

Quick reference (see [The Operator Loop](#the-operator-loop) above for the full signal-driven trigger flow):

- **Light audits:** once per minor release (every 2-3 months)
- **Discipline-skill audits:** once per quarter, OR triggered by 3+ observed compliance failures in the wild, whichever is sooner
- **New-skill authoring:** treat as audit pass 0 — author the train/selection/test splits when the skill is created so future audits start from a known baseline

"Observed compliance failures" means signal from `/swarm-stats --per-skill`, not gut feel. The Operator Loop's diagnostic-signals table is the routing layer between observability and audit.

The infrastructure (`.swarm/skill-audits/`, the schemas, this playbook) is built in v4.7. The first FULL audit using it is a v4.8 effort. v4.7's contribution is the scaffold + the two new skills built to the spec (`swarm-observability`, `closure-log-aggregation`).
