# Model Calibration — the evidence behind the toolkit's enforcement choices

**Last calibrated: 2026-06-11, against Claude Opus 4.8 / Claude Fable 5 / GPT-5.5 (Codex).**

This document is the evidence base for what the toolkit enforces and — just as important — what it deliberately stopped enforcing. Every retained countermeasure is dated, sourced, and carries a retirement condition. Re-run this calibration at each major model generation; Anthropic's own Fable 5 guidance: *"capability improvements at this level are also a good prompt to re-evaluate which instructions, tools, and guardrails are still needed."*

## The keep/cut razor

Every rule in this toolkit answers one question: **who does it protect?**

1. **Protects the operator's ability to trust output** — evidence requirements, fail-closed gates, closure caps, security review, observability, service-inventory. These exist because a non-engineer PM cannot personally audit code. **Keep**, and where possible make them structural/deterministic (a gate, a hook, a guard test) rather than prose.
2. **Protects against a model weakness** — check the weakness against current evidence below. Dead → retire or reduce to one line. Alive → keep, brief. Inverted → rewrite for the new polarity.

The corollary, from vendor guidance and measurement: over-constraining strong models is not free. Anthropic: skills written for prior models are *"often too prescriptive for Claude Fable 5 and can degrade output quality"*; bloated instruction files *"cause Claude to ignore your actual instructions"*; aggressive emphasis written to fix undertriggering now causes overtriggering. OpenAI: contradictory or redundant instructions burn GPT-5 reasoning tokens; the Codex prompting principle is *"less is more."* Measured: task accuracy degrades as constraint count rises, even for self-evident constraints (arXiv 2601.22047, 2505.16944, 2506.06843).

## Failure-mode ledger (June 2026)

| Failure mode | Status | Evidence | Toolkit posture |
|---|---|---|---|
| TODO-stubbing, "rest of code here", lazy truncation | **Dead** (since ~Claude 3.5 Sonnet v2, Oct 2024; polarity since reversed) | aider laziness benchmark: GPT-4-Turbo 20–34% → Claude 3.5 Sonnet 92.1%; no current vendor guide contains anti-stub guidance; Anthropic now says to *dial back* anti-laziness prompting | Ban survives as one line in production-code-standards; its enforcement home is a rung-2 lint/guard in the target repo (enforcement ladder), not prose policing |
| Hallucinated APIs / packages | **Reduced ~4x, nonzero** | USENIX 2025 (Spracklen et al., 576K samples): 19.7% overall but commercial frontier ~5%; Anthropic still ships "never speculate about code you have not opened" | One grounding line in testing-philosophy; apparatus retired |
| Forgetting to read files before editing | **Solved** | Harness hard-fails edits to unread files; Opus 4.6+ documented as *over*-exploring | Read-before-edit mandates retired from model-aware-behavior |
| Poor multi-step planning | **Solved → inverted (over-planning)** | PlanBench: GPT-4 ~35% → o1 97.8%; Anthropic: "Prefer general instructions over prescriptive steps… Claude's reasoning frequently exceeds what a human would prescribe" | Prescriptive step recipes retired; phase pipeline retained as **audit points** (operator-protecting reports/gates), not as a cognitive prosthesis |
| Code duplication / failure to reuse | **Never faded** | GitClear 2025 (211M lines): duplicated blocks up 8x, copy/paste > refactoring for the first time, refactoring collapsed ~25%→<10% | service-reuse + `/generate-service-inventory` **kept** — the strongest surviving countermeasure. Reframed as inventory-as-context, not policing |
| Overconfident completion claims / fabricated status | **Worse with stronger models** | GPT-5.5 system card (Apollo): lied about completing impossible tasks in 29% of samples (vs 7% GPT-5.4); agents predict 73% success vs 35% real (arXiv 2602.06948); Opus 4.6 card documents claiming a tool "returns the expected result" when it didn't; Anthropic's Fable guide ships a progress-claims audit instruction | verify-implementation + artifact-evidence checks (empty-artifact retry, hard checkpoint, fail-closed gates) **kept and strengthened** — the best-supported guardrail class in the toolkit |
| Reward hacking / test-gaming / test deletion | **Persists, scales with capability** | Opus 4.5 card: 18.2% reward-hack rate, higher than its smaller siblings; documented answer-key-decoding incident; Anthropic still ships anti-hardcoding and "it is unacceptable to remove or edit tests" lines verbatim | Anti-hardcoding + test-deletion ban kept, brief (one firm line each in testing-philosophy) |
| Over-engineering / unrequested scope | **The new top failure** | Anthropic, verbatim: Opus 4.5/4.6 "have a tendency to overengineer by creating extra files, adding unnecessary abstractions, or building in flexibility that wasn't requested"; Fable 5 guide ships a dedicated counter-snippet | Scope-restraint doctrine **added** (model-aware-behavior; implement prompts in both orchestrators and the workflow). The symmetric machinery bar (no-silent-deferrals) is the same control applied to infrastructure |
| Sycophancy | Persists | SycEval ~58%; MIT 2026: personalization increases agreeableness | Mitigated structurally: fresh-context reviewer agents, fail-closed gates that don't ask the model's opinion |
| Context rot in long sessions | Persists | Chroma: all 18 tested models degrade 10k→100k+; Claude Code docs lead with context management | Context bundles, budgets, fresh-agent-per-phase, report-files-not-refetch **kept** |
| Aggressive prompting necessity (ALL-CAPS, "CRITICAL: YOU MUST") | **Officially reversed — now harmful** | Anthropic: "Where you might have said 'CRITICAL: You MUST use this tool when…', you can use more normal prompting"; "dial back any aggressive language"; GPT-5 guide's Cursor case study (caps-lock thoroughness block was "counterproductive") | Repo-wide tone: plain imperatives + explain-why. Firm language reserved for: honesty-about-outcomes, scope restraint, test deletion, security, and hook prompts (deterministic context) |

## Countermeasure ledger (what we keep, why, and when to retire it)

| Toolkit machinery | Motivating failure | Status | Retirement condition |
|---|---|---|---|
| verify-implementation (evidence-first claims) | Fabricated status / overconfidence | Alive, worsening | None foreseeable — vendor-recommended even for Fable 5 |
| Empty-artifact retry + sufficiency-stall re-dispatch (one retry, then user) | Hallucinated/empty implementation self-reporting `committed:true` | Alive (caught in v4.8 pre-release review) | `swarm-stats` shows empty-retry fired ~0 times across 20+ epics |
| Hard checkpoint (7 report headers) + fail-closed gates | Premature completion; silent phase skips | Operator-protecting (audit trail) | Not model-dependent; keep |
| service-reuse + inventory | Duplication | Alive (GitClear trend unreversed) | GitClear-class evidence shows duplication trend reversed |
| Deferral justification template + Deferred Items table | Silent deferral of AC work | Mostly faded as a model behavior; the *artifact* is operator-protecting (auditable) | Keep the artifact; policing tone already reduced. Revisit if `deferral_redispatch` ≈ 0 across 20+ epics |
| Impact bar + ≤3 follow-up cap + closure-log | Ticket sprawl (an orchestration failure, not a model failure) | Operator-protecting | Not model-dependent; keep |
| Gate 0 (fix existing tests first) | Test suites rotting under agent churn | Alive | Keep |
| Anti-hardcoding / test-deletion lines | Reward hacking | Alive, scales with capability | Vendor guides drop their equivalent lines |
| Context bundles + anti-summarization fidelity checks | Context rot, lossy handoffs | Alive | Long-context degradation measurably solved |
| SHELL_RULES (no compound shell, tool-native dir flags) | Harness/permission mechanics, not model weakness | Environment constraint | Harness behavior changes |
| Convention guards / enforcement ladder (v5.0) | Prose rules don't propagate across amnesiac sessions | Structural, model-independent | None — this is the toolkit's direction of travel |

## What was retired in v5.0 (and where it went)

- **Read-before-edit step-by-step mandates** (model-aware-behavior) → deleted; harness enforces it.
- **Tool-parallelization tutorial** (model-aware-behavior) → deleted; native behavior.
- **Anti-laziness/anti-stub policing apparatus** (rationalization tables, red-flag lists targeting dead behaviors) → reduced to brief rules; enforcement moved to target-repo guards via the enforcement ladder.
- **Prescriptive bash recipes in skills** → rewritten as intent + constraints; reference detail moved to each skill's `references/` (zero context cost until needed).
- **ALL-CAPS emphasis density** → plain imperatives with reasons.
- **Multi-round re-dispatch policing** → one evidence-checked retry, then user escalation.

Nothing was deleted blind: slimmed material with reference value moved to `references/` folders; this ledger records the rationale.

## Sources

Anthropic: [Claude 4.x prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices) · [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) · [Claude Code best practices](https://code.claude.com/docs/en/best-practices) · [Opus 4.5 system card](https://assets.anthropic.com/m/64823ba7485345a7/Claude-Opus-4-5-System-Card.pdf) · [Claude 4 announcement (65% reward-hacking reduction vs 3.7)](https://www.anthropic.com/news/claude-4) · [Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
OpenAI: [GPT-5 prompting guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide) · [GPT-5.1 guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-1_prompting_guide) · [Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide) · [GPT-5.5 deployment safety](https://deploymentsafety.openai.com/gpt-5-5)
Independent: [METR time horizons](https://metr.org/time-horizons/) · [METR scaffold comparison](https://metr.org/notes/2026-02-13-measuring-time-horizon-using-claude-code-and-codex/) · [METR Claude 3.7 eval (test-editing)](https://metr.org/evaluations/claude-3-7-report/) · [GitClear 2025](https://www.gitclear.com/ai_assistant_code_quality_2025_research) · [Chroma context rot](https://www.trychroma.com/research/context-rot) · [USENIX 2025 package hallucination](https://www.helpnetsecurity.com/2025/04/14/package-hallucination-slopsquatting-malicious-code/) · [aider laziness/refactor benchmarks](https://aider.chat/docs/leaderboards/refactor.html) · arXiv 2601.22047 (paradoxical interference) · arXiv 2602.06948 (agentic overconfidence) · arXiv 2505.16944 (AGENTIF) · arXiv 2506.06843 (cognitive load) · [Claude 3.7 system card (special-casing admission)](https://anthropic.com/claude-3-7-sonnet-system-card)

## Historical context (why the old regime existed)

The toolkit's pre-v5.0 countermeasures were well-founded against the GPT-4-Turbo / Claude 3.x generation: OpenAI publicly acknowledged GPT-4-Turbo laziness (Dec 2023) and shipped a fix model for it; Anthropic's own Claude 3.5 artifacts prompt contained "Don't use '// rest of the code remains the same…'"; the Claude 3.7 system card admitted the model "occasionally resorts to special-casing in order to pass test cases… including modifying the problematic tests themselves." The vendor-documented reversal point is April–August 2025 (GPT-4.1/GPT-5 prompting-migration guides; the Claude 4 generation). A toolkit calibrated in 2025 and re-fit in mid-2026 should expect to re-fit again at the next generation.
