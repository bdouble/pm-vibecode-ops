# Skill Audit Schema

Canonical schemas for the per-skill audit infrastructure introduced in v4.7 Tier 5f. These schemas operationalize SkillOpt's rejected-edit buffer (§3.5) and edit-apply-report (§3.6) for manual audits. When v4.8+ adds an automated optimizer loop, these schemas become its input/output contract — author them in line with the SkillOpt paper, not for short-term convenience.

**Companion docs:**
- `docs/SKILL_AUDIT_PLAYBOOK.md` — operator handoff: how to author scenarios, draft edits, run gates, fill these files
- `scripts/validate-skill-invariants.sh` — CI enforcement of protected-region invariants (orthogonal to these schemas; both ship together)

---

## Per-skill directory layout

The audit infrastructure lives under `.swarm/skill-audits/<skill-name>/` (the `.swarm/` tree is gitignored at the project level; audit outputs are local working artifacts, not shipped repo content). Per-skill directory:

```
.swarm/skill-audits/<skill-name>/
├── scenarios/
│   ├── train/                       # ~5 scenarios used to identify violations and develop fixes
│   │   ├── 01-deferral-in-implementation.md
│   │   ├── 02-followup-cap-pressure.md
│   │   └── ...
│   ├── selection/                   # ~3 scenarios used as merge gate (every candidate edit re-runs these)
│   │   ├── 01-...
│   │   └── ...
│   └── test/                        # ~3 scenarios LOCKED at audit start, run ONCE at end
│       ├── 01-...
│       └── ...
├── rejected-edits.md                # SkillOpt §3.5 — negative feedback for future passes
├── edit-apply-report.jsonl          # SkillOpt §3.6 — one record per proposed edit (accepted + rejected)
└── slow-meta-log.md                 # longitudinal lessons across audit passes
```

**Scenario files** are markdown — one file per scenario, containing:
1. **Setup** — the prompt the agent receives
2. **Without-skill expected failure** (RED) — what the agent does without the skill loaded
3. **With-skill expected behavior** (GREEN) — what the skill must produce
4. **Pass criteria** — concrete verification (e.g., "agent's response does NOT contain the string 'follow-up ticket'")

The discipline-vs-reference classification (full audit vs light) determines whether tripartite scenarios are required. Reference skills (light audit) may skip scenarios entirely — the playbook covers when.

---

## `rejected-edits.md` — negative feedback buffer

**Purpose:** Every edit that failed the selection gate is appended here with the reason. Future audit passes (and humans) read this file before drafting new proposals so failed approaches aren't retried. SkillOpt §3.5 reports that removing this buffer cost SearchQA / SpreadsheetBench / LiveMath 1.6 / 4.6 / 2.4 points respectively — the buffer is more important than it sounds.

**Format:** plain markdown, append-only, newest entries at the top within each audit pass. One section per audit pass.

```markdown
## 2026-06-03 — Audit pass 2

### Rejected: "Add 'check for race conditions' to Red Flags"
- **Selection-set delta:** -0.05 (regression)
- **Failed scenarios:** scenarios/selection/02-async-edit-pressure.md, scenarios/selection/04-event-loop.md
- **Reason:** caused agents to over-flag harmless async code on Scenarios 2 and 4; specifically, the new red-flag fired
  on standard `await` usage in legitimate async pipelines, classifying them as race-condition risks
- **Verbatim agent rationalization observed:** "I see an await here, which the Red Flags say I should investigate as a
  race-condition risk before proceeding."
- **Insight for next pass:** race-condition guidance needs scope qualifier ("in production deploy paths only")
  or a positive example to anchor what counts (e.g., "uncoordinated shared-state mutation across handlers")
- **Linked edit-apply-report entry:** content_hash:sha256:abc123def456...

### Rejected: "Tighten the foundational principle to require ts-strict mode"
- **Selection-set delta:** -0.12 (regression)
- **Failed scenarios:** scenarios/selection/01-... (all 3)
- **Reason:** triggered the skill on every TypeScript file even when no strict-mode-relevant content was at issue;
  effectively re-routed the skill from "production code standards" to "TypeScript pedantry"
- **Verbatim agent rationalization observed:** "ts-strict is mentioned in the foundational principle, so I should
  audit this file for ts-strict compliance even though the change is in a Python helper."
- **Insight for next pass:** language-specific requirements belong in references/, not in the foundational principle
- **Linked edit-apply-report entry:** content_hash:sha256:fedcba654321...

## 2026-05-27 — Audit pass 1

### Rejected: "Remove the impact-bar sentence template"
- **Selection-set delta:** -0.21 (regression)
- ...
```

**Why structured insights matter:** "It regressed by 0.05" is necessary but not sufficient — the next pass needs to know WHY so it doesn't propose a near-variant. The "Insight for next pass" line is the only forward-looking content in the entry; treat it as the actual deliverable.

**Append-only discipline:** Never edit a prior pass's entries. The audit trail's value is its immutability. If a prior pass's reasoning turns out to be wrong, document the correction in the NEXT pass's entries with a back-reference.

---

## `edit-apply-report.jsonl` — recoverable audit log

**Purpose:** One JSONL record per proposed edit (accepted OR rejected). Functions as both the audit trail and the input to `/swarm-stats --audit-deltas`. SkillOpt §3.6 calls this the "recoverable audit log" — every change can be replayed, every regression can be attributed to a specific pass.

**Common envelope:**

```json
{
  "ts": "2026-06-03T14:22:11Z",
  "audit_pass": 2,
  "skill": "no-silent-deferrals",
  "edit_type": "add|delete|replace",
  "section": "## Red Flags",
  "content_hash": "sha256:...",
  "accepted": true,
  "selection_delta": 0.08,
  "test_delta": 0.05,
  "rejection_reason": null
}
```

**Field definitions:**

| Field | Required | Notes |
|---|---|---|
| `ts` | yes | ISO 8601 UTC timestamp of the edit proposal |
| `audit_pass` | yes | Integer audit-pass number; pass 1 is the first audit |
| `skill` | yes | Skill name (matches `.swarm/skill-audits/<skill>/` dir) |
| `edit_type` | yes | `add` (new section/line), `delete` (removed content), `replace` (rewrote existing) |
| `section` | yes | Markdown header text of the affected section, verbatim |
| `content_hash` | yes | sha256 hash of the proposed content (allows dedup across passes; links to rejected-edits.md entries) |
| `accepted` | yes | Boolean — did this edit clear the selection gate? |
| `selection_delta` | yes | Float — compliance delta on the selection set after the edit was applied |
| `test_delta` | conditional | Float — compliance delta on the locked test set; populated ONLY in the final pass record (when test set is unlocked) |
| `rejection_reason` | conditional | One-line reason if `accepted: false`; null if accepted |

**Example records (one accepted, one rejected, both from pass 2):**

```json
{"ts":"2026-06-03T14:22:11Z","audit_pass":2,"skill":"no-silent-deferrals","edit_type":"add","section":"## Red Flags","content_hash":"sha256:a1b2c3...","accepted":true,"selection_delta":0.08,"test_delta":null,"rejection_reason":null}
{"ts":"2026-06-03T14:23:42Z","audit_pass":2,"skill":"no-silent-deferrals","edit_type":"replace","section":"## Description","content_hash":"sha256:d4e5f6...","accepted":false,"selection_delta":-0.02,"test_delta":null,"rejection_reason":"description rewrite triggered re-test; compliance dropped on Scenario 1 — agent began over-applying skill to docs-only tickets"}
```

**Test-set delta semantics:** `test_delta` is populated only on the FINAL pass record, after the locked test set is unlocked and run once per SkillOpt §3.1. Every prior record has `test_delta: null` — the test set was not consulted yet. This single-touch discipline is what prevents overfitting; the field nullability encodes the invariant.

---

## `slow-meta-log.md` — longitudinal lessons

**Purpose:** Per SkillOpt §3.6 "slow/meta update," a short longitudinal guidance block authors append to after each audit pass capturing what stayed true across iterations. This is the slow-state content that lives INSIDE a `<!-- @protected -->` region of the SKILL.md itself (see Tier 5e protected region annotations). The file in `.swarm/skill-audits/<skill>/` is the working draft; the protected region in `skills/<skill>/SKILL.md` is the canonical version that ships.

**Format:**

```markdown
# Slow/Meta Log — no-silent-deferrals

## Pass 3 (2026-07-15)
- The four catastrophic conditions remain the right enumeration; pass 2 tried to add a fifth ("dependency-blocked-on-CI"), regressed, never recovered. Stop trying.
- Per-skill effect size is much larger than aggregate; corpus compliance moved 1.4pp on pass 2 but this skill moved 8.7pp. Don't chase aggregate.

## Pass 2 (2026-06-03)
- Rationalization tables outperform Red Flags lists 2-to-1 on compliance delta. When in doubt, add to the rationalization table.
- "Spirit over letter" sentence cannot be paraphrased without regression — the literal phrasing is load-bearing.

## Pass 1 (2026-05-27)
- Initial audit pass. Baseline: 73% compliance on selection set.
- Discovered: agents respond more strongly to verbatim "follow-up ticket" → "subsequent iteration" rationalization examples than to abstract "be careful about renaming" guidance.
```

**Each entry is 2-5 short bullets, written backwards in time** (newest pass at top). The discipline is the same as in `rejected-edits.md`: append-only, never edit prior entries, document corrections in the next pass with a back-reference.

**Authoring the slow/meta update into the SKILL.md protected region:** After each pass, copy the new bullet block from this file into the `### Slow/Meta Update Log` subsection inside the SKILL.md's `<!-- @protected -->` block. Wrap the copy in `<!-- @override ... -->` since you're modifying a protected region. The validator (`scripts/validate-skill-invariants.sh`) enforces this discipline.

---

## What's intentionally not in this schema

- **Per-pass model version.** The schema captures *what* changed, not *who* proposed the change. Adding optimizer-model fields couples this schema to one particular optimizer; the SkillOpt paper supports multiple optimizer choices. Leave it out until v4.8 demands it.
- **Compliance rubric.** The schema captures deltas, not the rubric that produced them. Per-skill rubrics are out-of-scope for v4.7 (the "auto-grader" problem cited in `context/v4.7-release-plan.md` Out of Scope). When a future pass adds a rubric, store it in `scenarios/<split>/<n>-rubric.md`, not in this schema.
- **Cross-skill correlations.** Per SkillOpt's principle #22, per-skill drill-down matters; aggregates hide movement. This schema is per-skill by design. Cross-skill analysis is a `/swarm-stats` concern, not an audit-infrastructure concern.

---

## Versioning

The schema version is `1` for v4.7. Future schema changes go in a separate `commands/references/skill-audit-schema-v<N>.md` file with a one-paragraph rationale for the bump. **Never edit this schema in place** — any audit that consumed schema v1 must remain replayable against v1. The `audit_pass` records in `edit-apply-report.jsonl` are durable evidence; if the schema mutates underneath them, the audit history becomes uninterpretable.
