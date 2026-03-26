---
name: divergent-exploration
description: Explores 3-5 genuinely distinct approaches before committing to one. Use when facing a non-trivial design decision, architecture choice, or implementation approach, or when user asks about "options", "alternatives", "trade-offs", "best way", "how should we", or "compare approaches". Do NOT use for trivial or single-path decisions.
---

# Divergent Exploration

Creative work demands divergent thinking before convergent decisions. This skill enforces structured exploration to prevent premature commitment to the first idea that seems reasonable.

## The Three Phases

### Phase 1: Diverge
Generate 3-5 **genuinely distinct** approaches. Not variations on a theme—fundamentally different solutions.

**Red flag**: If options are "Option A", "Option A but faster", and "Option A with better UI"—divergence has not occurred.

### Phase 2: Evaluate
Assess each option on: User Impact, Technical Complexity, Time to Value, Dependencies, Reversibility, Risk Profile.

### Phase 3: Converge
Present options with clear recommendations. Never decide for users on significant choices.

## When to Apply

Not every decision warrants full divergent exploration. Apply this skill based on decision characteristics:

### Decisions That Warrant Exploration

| Decision Type | Why Explore | Options Needed |
|---------------|-------------|----------------|
| Architecture choices | High cost to reverse, long-term impact | 3-5, full template |
| Technology selection | Lock-in risk, team capability implications | 3-4, full template |
| Data model design | Schema changes are expensive migrations | 3-4, full template |
| API contract design | External consumers depend on stability | 3, abbreviated |
| Feature approach | Multiple valid paths with different trade-offs | 3, abbreviated |
| Integration patterns | Coupling decisions affect future flexibility | 3, abbreviated |

### Decisions That Do NOT Warrant Exploration

- Bug fixes with clear root cause — fix the bug
- Typo corrections — correct the typo
- Configuration values — use the documented value
- Following established patterns — apply the pattern
- Single viable approach with no meaningful alternatives — proceed
- Cosmetic choices with no architectural impact — pick one and move on

**Quick test:** If reversing the decision costs less than an hour of work, skip exploration and proceed.

## Generating Distinct Options

Use these self-check questions to push beyond the obvious first idea. The full set of eight questions lives in `references/exploration-patterns.md`; these four are the most effective at generating genuinely distinct options:

1. **"What existing system could we extend vs. building new?"** — Forces consideration of reuse, which is often overlooked when the instinct is to create something fresh. Frequently surfaces the lowest-effort, lowest-risk option.

2. **"What would a scrappy startup with no resources do?"** — Strips away over-engineering bias. Produces the minimal viable approach that may turn out to be sufficient.

3. **"What if we eliminated this requirement entirely?"** — Challenges whether the problem needs solving at all. Sometimes the best option is to remove the feature, simplify the workflow, or push complexity to the user.

4. **"What's the 'do nothing' option and its consequences?"** — Establishes the baseline. If doing nothing has acceptable consequences, every other option must justify its cost against that baseline.

After generating options with these prompts, verify each option has a **different core mechanism** — not just different parameters, naming, or presentation of the same approach.

## The Mindset

The first idea that comes to mind is often:
1. The most conventional (not necessarily best)
2. Anchored on recent experience (may not fit this context)
3. Missing creative solutions that require more thought

By forcing generation of genuine alternatives, the outcome is either:
- **Discovering a better approach** that would have been missed
- **Validating the initial instinct** with confidence it survived comparison

Both outcomes improve decision quality.

## Evaluation Framework

Evaluate every option against these six dimensions. Present results in a comparison table so trade-offs are visible at a glance:

| Dimension | Questions to Answer |
|-----------|---------------------|
| **User Impact** | Who benefits? Who loses? How much friction? |
| **Technical Complexity** | New systems? Integration points? Maintenance burden? |
| **Time to Value** | When do users see benefit? Incremental delivery possible? |
| **Dependencies** | What must exist first? External teams? Third parties? |
| **Reversibility** | Can we change course later? Lock-in risks? |
| **Risk Profile** | What could go wrong? Known unknowns? |

### Scoring Guidance

For each dimension, use a simple High/Medium/Low scale:
- **User Impact**: High = core workflow improvement; Low = nice-to-have
- **Technical Complexity**: High = new infrastructure or systems; Low = extends existing patterns
- **Time to Value**: High = days to first benefit; Low = weeks or months
- **Dependencies**: High = no external dependencies; Low = blocked by other teams
- **Reversibility**: High = easy to undo; Low = committed once deployed
- **Risk Profile**: High = well-understood; Low = significant unknowns

Present the comparison as a table, then state conditional recommendations: "If [condition], choose Option X because [reasoning]."

## Cognitive Bias Awareness

Four biases commonly undermine exploration quality. Recognize and counter them:

- **Anchoring bias** — The first option generated disproportionately influences evaluation of all others. Counter: generate all options before evaluating any. Deliberately explore the opposite of the first idea.
- **Confirmation bias** — Tendency to evaluate options in ways that confirm an existing preference. Counter: assign someone (or force yourself) to argue for the least-favored option.
- **Sunk cost fallacy** — Favoring an option because effort was already invested in a similar approach. Counter: evaluate each option as if starting fresh today with no prior investment.
- **Availability heuristic** — Overweighting approaches seen recently or used in the last project. Counter: explicitly ask "what approach have I NOT used recently that might fit here?"

See `references/exploration-patterns.md` for self-check questions, evaluation dimensions, output templates, and anti-patterns.

See `examples/exploration-session.md` for a complete divergent exploration session walkthrough.
