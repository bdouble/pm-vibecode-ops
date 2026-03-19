# Divergent Exploration Patterns

Detailed patterns and templates for structured exploration.

## Self-Check Questions to Generate Distinct Options

1. What if we solved the opposite problem instead?
2. What would a competitor with unlimited resources do?
3. What would a scrappy startup with no resources do?
4. What if we eliminated this requirement entirely?
5. What existing system could we extend vs. building new?
6. What would users build if we gave them primitives instead?
7. What's the "do nothing" option and its consequences?
8. What if the constraint we're assuming doesn't actually exist?

**Red flag**: If your options are "Option A", "Option A but faster", and "Option A with better UI"—you haven't diverged. Those are variations, not alternatives.

## Evaluation Dimensions

For each option, assess:

| Dimension | Questions to Answer |
|-----------|---------------------|
| **User Impact** | Who benefits? Who loses? How much friction? |
| **Technical Complexity** | New systems? Integration points? Maintenance burden? |
| **Time to Value** | When do users see benefit? Incremental delivery possible? |
| **Dependencies** | What must exist first? External teams? Third parties? |
| **Reversibility** | Can we change course later? Lock-in risks? |
| **Risk Profile** | What could go wrong? Known unknowns? |

## Output Format Template

When presenting divergent exploration results, use this structure:

```markdown
## Exploration: [Problem Statement]

### The Core Question
[One sentence framing the decision to be made]

### Option 1: [Descriptive Name]
**Approach**: [2-3 sentence summary]

- **Pros**: [Bullet list]
- **Cons**: [Bullet list]
- **Effort**: [T-shirt size + brief justification]
- **Dependencies**: [What's needed first]
- **Best if**: [Conditions that make this the right choice]

### Option 2: [Descriptive Name]
[Same structure]

### Option 3: [Descriptive Name]
[Same structure]

---

### Recommendation
**If [condition], choose Option X because [reasoning].**
**If [different condition], choose Option Y because [reasoning].**

### Questions Before Deciding
1. [Clarifying question that would change the recommendation]
2. [Constraint question that might eliminate options]
3. [Priority question that would reorder options]
```

## Calibrating Depth

| Decision Type | Options Needed | Evaluation Depth |
|---------------|----------------|------------------|
| Epic scope | 3-5 | Full template |
| Architecture pattern | 3-4 | Full template |
| Feature approach | 3 | Abbreviated (pros/cons/effort) |
| Implementation detail | 2-3 | Quick comparison |
| Bug fix strategy | 2 | Inline analysis |

## Anti-Patterns to Avoid

**Premature convergence**: "The obvious approach is..." — Stop. Generate alternatives first.

**False diversity**: Presenting the same idea with different labels. Each option should have a different core mechanism.

**Analysis paralysis**: Exploration has a time limit. Set one. Three solid options beat seven half-baked ones.

**Hidden preference**: If you already know what you want to recommend, be explicit about it—but still generate real alternatives.

**Skipping for "simple" decisions**: Many "simple" decisions have non-obvious alternatives that produce better outcomes.

## Integration with Workflow

This skill activates during:

- `/epic-planning` — Before defining epic scope
- `/planning` — Before technical decomposition
- `/adaptation` — When multiple implementation approaches exist
- `/discovery` — When analyzing patterns with multiple valid interpretations

The output feeds into decision documentation, ensuring future readers understand why alternatives were rejected.

## Weighted Scoring Matrix

When options have multiple evaluation dimensions with different importance levels, use a weighted scoring matrix to make trade-offs explicit and comparable.

**Steps:**
1. List evaluation dimensions (from the table above or domain-specific criteria)
2. Assign a weight to each dimension reflecting its relative importance (weights should sum to 1.0 or 100%)
3. Score each option on each dimension using a consistent scale (e.g., 1-5)
4. Multiply each score by its weight and sum across dimensions for a weighted total

| Dimension | Weight | Option A | Option B | Option C |
|-----------|--------|----------|----------|----------|
| User Impact | 0.30 | 4 (1.20) | 3 (0.90) | 5 (1.50) |
| Technical Complexity | 0.20 | 3 (0.60) | 5 (1.00) | 2 (0.40) |
| Time to Value | 0.25 | 5 (1.25) | 2 (0.50) | 3 (0.75) |
| Reversibility | 0.15 | 4 (0.60) | 4 (0.60) | 2 (0.30) |
| Risk Profile | 0.10 | 3 (0.30) | 4 (0.40) | 3 (0.30) |
| **Weighted Total** | **1.00** | **3.95** | **3.40** | **3.25** |

**When to use**: Apply the weighted matrix when stakeholders disagree on priorities, when dimensions have clearly unequal importance, or when you need an auditable rationale for the chosen option. The matrix does not replace judgment — use it to surface trade-offs, not to mechanically pick the highest score.

## Architecture Decision Canvas

The Architecture Decision Canvas is a complementary visual tool for structured decision-making. It captures the decision context (drivers, constraints, quality attributes), the options considered, and the rationale on a single page. Use it alongside the weighted scoring matrix when the decision is architecturally significant and the rationale needs to be communicated to stakeholders who were not part of the exploration.
