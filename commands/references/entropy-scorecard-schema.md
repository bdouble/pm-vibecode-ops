# Entropy Scorecard Schema (v1)

Canonical schema for the machine-diffable scorecard `/entropy-audit` produces. The scorecard is the trend instrument — run-over-run deltas turn "is my codebase getting better?" from vibes into numbers a non-engineer operator can read without reading code.

**Versioning discipline** (mirrors `skill-audit-schema.md`): this is schema v1. Future changes go in a separate `entropy-scorecard-schema-v<N>.md` file — never edit this one in place, or historical scorecards stop being comparable.

## Where scorecards live

- **File:** `.swarm/entropy/scorecard-<YYYY-MM-DD>.json` in the target repo. Used for cheap machine diffs against the previous run. Note `.swarm/` is typically gitignored, so this copy is per-machine.
- **Linear:** the full JSON is embedded verbatim in the audit's Linear comment inside a ` ```json ` block. This is the durable, cross-machine trend record — when no local prior scorecard exists, the audit recovers the previous run from Linear.
- **Observability:** the audit emits one `entropy_scorecard_recorded` event to `.swarm/observability/_audit.jsonl` (see `observability-schema.md`).

## Top-level shape

```json
{
  "schema_version": 1,
  "date": "2026-06-11",
  "north_star": "workflow completion outranks cost strictness; maintainability outranks scale",
  "scope": ".",
  "canonical_coverage": [
    {
      "concern": "input validation on mutations",
      "coverage_pct": 98.5,
      "method": "AST scan of route handlers for validate() call; 2 generated files excluded",
      "blind_spots": "GraphQL resolvers not scanned"
    }
  ],
  "prose_rules": {
    "total": 37,
    "prose_only": 25,
    "enforced": 12,
    "method": "grep for [prose-only] and [enforced: tags in CLAUDE.md + docs/conventions/"
  },
  "guards": {
    "count": 10,
    "inventory": ["tests/guards/llm-boundary.test.ts", "tests/guards/zod-mutations.test.ts"]
  },
  "ratchets": [
    { "artifact": "tests/guards/icon-migration.test.ts", "allowlist_size": 14, "previous_size": 19 }
  ],
  "runtime_machinery": {
    "count": 12,
    "zero_activation_count": 5,
    "method": "inventory of crons/sweeps/retry-tiers cross-checked against their activation counters",
    "zero_activation_list": ["reconcile-orphaned-runs cron (0 fires since 2026-02)"]
  },
  "test_ballast": {
    "mock_to_integration_ratio": 5.4,
    "call_count_assertion_density": 0.061,
    "method": "ratio = files importing mocks / files using real infra; density = toHaveBeenCalled* assertions per test"
  },
  "vocabulary": {
    "parallel_vocabularies_found": 4,
    "examples": ["tier/plan/level/sku for the same concept"]
  },
  "deltas_vs_previous": {
    "previous_date": "2026-03-02",
    "prose_only": -3,
    "guards": 2,
    "mock_to_integration_ratio": -0.3
  }
}
```

## Field rules

1. **Every number states its method.** A count without a `method` field (what was scanned, what was excluded, known blind spots) is invalid — the census layer must be reproducible and honestly bounded.
2. **Fixed keys.** The top-level keys above are the contract. Add concern entries, not new top-level keys (new keys = new schema version).
3. **Deltas are computed, not estimated.** `deltas_vs_previous` is the diff of two scorecards. If no previous scorecard exists (first run), the field is `null` and the report says "baseline run".
4. **The headline metrics for the operator** (surfaced first in the report and by `/swarm-stats`): `prose_rules.prose_only` (discipline debt — should trend down), `guards.count` (should trend up), `runtime_machinery.zero_activation_count` (retirement candidates), `test_ballast.mock_to_integration_ratio` (rising = suite accreting ballast).

## What the scorecard deliberately omits

- Subjective quality scores (the judgment layer's opinions live in the report prose, not the scorecard — facts and opinion never blend).
- Per-file listings beyond the inventories above (drill-down lives in the report).
- Severity rankings (severity is calibrated to the operator's stated north star, which changes; the scorecard stores the north star used so runs remain interpretable).
