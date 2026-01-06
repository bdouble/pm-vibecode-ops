---
name: divergent-exploration
description: |
  Enforces exploring 3-5 distinct approaches before committing to one. ACTIVATE when:
  - User says: "design", "architect", "plan", "how should we", "what's the best way"
  - User says: "options", "alternatives", "trade-offs", "pros and cons", "compare approaches"
  - User asks: "which approach", "what are my options", "how would you solve this"
  - Planning: epic creation, feature design, architecture decisions, complex problem solving
  - About to recommend a single approach for a non-trivial decision

  ENFORCES: Generate 3-5 GENUINELY DISTINCT alternatives (not variations). Evaluate each on:
  user impact, complexity, time to value, dependencies, reversibility, risk. Present options, don't decide.
---

# Divergent Exploration

Creative work demands divergent thinking before convergent decisions. This skill enforces structured exploration to prevent premature commitment to the first idea that seems reasonable.

## The Three Phases

### Phase 1: Diverge
Generate 3-5 **genuinely distinct** approaches. Not variations on a theme—fundamentally different solutions.

**Red flag**: If options are "Option A", "Option A but faster", and "Option A with better UI"—you haven't diverged.

### Phase 2: Evaluate
Assess each option on: User Impact, Technical Complexity, Time to Value, Dependencies, Reversibility, Risk Profile.

### Phase 3: Converge
Present options with clear recommendations. Never decide for users on significant choices.

## The Mindset

The first idea that comes to mind is often:
1. The most conventional (not necessarily best)
2. Anchored on recent experience (may not fit this context)
3. Missing creative solutions that require more thought

By forcing yourself to generate genuine alternatives, you either:
- **Discover a better approach** you would have missed
- **Validate your instinct** with confidence it survived comparison

Both outcomes improve decision quality.

See `references/exploration-patterns.md` for self-check questions, evaluation dimensions, output templates, and anti-patterns.
