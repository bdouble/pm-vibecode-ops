# Codex Skills Reference

This guide explains how to apply PM workflow skills in Codex. Unlike Claude Code where skills auto-activate based on context, Codex requires manual inclusion of skill content in your prompts.

---

## Overview

**What are skills?**
Skills are quality enforcement guidelines that help maintain production standards during development. Each skill defines:
- Activation triggers (when to apply the skill)
- Prohibited patterns (what to avoid)
- Required patterns (what to use instead)
- Enforcement steps (how to apply the skill)

**How skills work in Claude Code vs Codex:**

| Aspect | Claude Code | Codex |
|--------|-------------|-------|
| **Activation** | Auto-triggers based on context keywords | Manual - you include skill content |
| **Enforcement** | Claude actively blocks prohibited patterns | You reference skill to guide behavior |
| **Location** | `~/.claude/skills/` or `.claude/skills/` | `codex/skills/` (reference only) |

---

## How to Apply Skills in Codex

### Method 1: Copy Skill Content into Prompt

1. Identify which skills apply to your task
2. Copy the relevant skill content from `codex/skills/[skill-name]/SKILL.md`
3. Paste at the beginning of your Codex prompt, before the workflow prompt

```bash
# Example: Implementation with production standards
cat codex/skills/production-code-standards/SKILL.md codex/prompts/implementation.md | pbcopy
# Then paste into Codex
```

### Method 2: Reference Key Rules Inline

For shorter prompts, reference only the critical rules:

```markdown
## Quality Standards (from production-code-standards skill)

**Prohibited**: TODO/FIXME comments, empty catch blocks, fallback logic hiding errors
**Required**: Fail-fast validation, typed custom errors, repository pattern

---

[Your actual prompt here]
```

### Method 3: Include Reference Files

Some skills have supporting `references/` and `examples/` directories with detailed patterns:

```bash
# Include anti-patterns reference for extra detail
cat codex/skills/production-code-standards/SKILL.md \
    codex/skills/production-code-standards/references/anti-patterns.md \
    codex/prompts/implementation.md
```

---

## Skills by Workflow Phase

### Project-Level Phases (1-4)

#### Discovery Phase
**Primary Skills:**
- `model-aware-behavior` - Verify doc/memory claims against the code; read before proposing changes
- `service-reuse` - Catalog existing services for the inventory
- `divergent-exploration` - Explore multiple architectural approaches

**How to Apply:**
Include these skills when running the discovery prompt. They ensure thorough codebase analysis and consideration of alternatives.

```markdown
## Skills Applied This Session

### Model-Aware Behavior
- Read ALL relevant files before documenting findings
- Never speculate about code not yet inspected
- Search for existing implementations comprehensively

### Divergent Exploration
- Document 3-5 distinct architectural approaches discovered
- Present trade-offs for each approach

---

[Paste discovery.md prompt here]
```

#### Epic Planning Phase
**Primary Skills:**
- `divergent-exploration` - Consider multiple epic breakdowns
- `using-pm-workflow` - Follow correct workflow sequence

**How to Apply:**
Include divergent-exploration to ensure epic breakdown considers alternatives before converging.

#### Planning Phase (Ticket Decomposition)
**Primary Skills:**
- `service-reuse` - Verify tickets leverage existing services
- `production-code-standards` - Ensure no workaround tickets are created
- `divergent-exploration` - Consider multiple decomposition strategies

**How to Apply:**
Critical for planning: include service-reuse to prevent creating tickets for functionality that already exists.

```markdown
## Service Reuse Enforcement

Before creating any new service/utility ticket:
1. CHECK: Does this exist in the service inventory?
2. VERIFY: Can existing services be extended?
3. DOCUMENT: If new service truly needed, explain why reuse impossible

---

[Paste planning.md prompt here]
```

---

### Ticket-Level Phases (5-10)

#### Adaptation Phase
**Primary Skills:**
- `model-aware-behavior` - Read all relevant code before creating guide
- `service-reuse` - Identify reusable components for implementation

**How to Apply:**
The adaptation prompt already includes service reuse checks, but explicitly including the skill reinforces the pattern.

#### Implementation Phase
**Primary Skills:**
- `production-code-standards` - **CRITICAL** - No workarounds, no temporary code
- `service-reuse` - Use existing services, don't duplicate
- `security-patterns` - Apply OWASP patterns during coding
- `model-aware-behavior` - Read before modifying

**How to Apply:**
This is the most important phase for skill enforcement. Always include production-code-standards.

```bash
# Recommended combination for implementation
cat codex/skills/production-code-standards/SKILL.md \
    codex/skills/service-reuse/SKILL.md \
    codex/skills/security-patterns/SKILL.md \
    codex/prompts/implementation.md
```

#### Testing Phase
**Primary Skills:**
- `testing-philosophy` - **CRITICAL** - Fix broken tests first, accuracy > coverage
- `verify-implementation` - Verify tests actually pass before claiming success

**How to Apply:**
Always include testing-philosophy. It prevents the common mistake of writing new tests while existing tests are broken.

```markdown
## Testing Philosophy (ENFORCE)

**Gate 0**: Fix ALL existing broken tests before writing new tests
**Priority Order**: Accuracy > Compilation > Execution > Coverage

Do NOT proceed to new tests until existing tests pass.

---

[Paste testing.md prompt here]
```

#### Documentation Phase
**Primary Skills:**
- `mvd-documentation` - Document "why", not "what"

**How to Apply:**
Include MVD principles to prevent over-documentation or placeholder content.

```markdown
## MVD Documentation Principles

- Document WHY decisions were made, not WHAT the code does
- No placeholder content (TODO, TBD, will add later)
- Complete documentation or none - no partial stubs
- TypeScript shows "what"; docs should show "why"

---

[Paste documentation.md prompt here]
```

#### Code Review Phase
**Primary Skills:**
- `production-code-standards` - Verify no workarounds in reviewed code; any convention introduced must ship its guard or carry a `[prose-only]` tag
- `verify-implementation` - Ensure claims are verified before approval

**How to Apply:**
Include production-code-standards to catch prohibited patterns in the review.

#### Security Review Phase
**Primary Skills:**
- `security-patterns` - **CRITICAL** - OWASP vulnerability assessment
- `verify-implementation` - Verify security claims

**How to Apply:**
Always include security-patterns and the OWASP reference file.

```bash
# Security review with full OWASP patterns
cat codex/skills/security-patterns/SKILL.md \
    codex/skills/security-patterns/references/owasp-patterns.md \
    codex/prompts/security-review.md
```

---

### Epic-Level Phase (11)

#### Epic Closure Phase
**Primary Skills:**
- `epic-closure-validation` - **CRITICAL** - All sub-tickets must be Done/Cancelled; conventions the epic established must have guards (or `[prose-only]` tags); cross-cutting follow-ups are ratchet-first
- `verify-implementation` - Verify all completion claims

**How to Apply:**
Include epic-closure-validation to enforce the requirement that all sub-tickets are complete.

---

## Skill Combinations Quick Reference

| Workflow Phase | Recommended Skills | Priority |
|----------------|-------------------|----------|
| Discovery | model-aware-behavior, divergent-exploration, service-reuse | High |
| Epic Planning | divergent-exploration, using-pm-workflow | Medium |
| Planning | service-reuse, production-code-standards, divergent-exploration | High |
| Adaptation | model-aware-behavior, service-reuse | Medium |
| Implementation | production-code-standards, service-reuse, security-patterns | **Critical** |
| Testing | testing-philosophy, verify-implementation | **Critical** |
| Documentation | mvd-documentation | Medium |
| Code Review | production-code-standards, verify-implementation | High |
| Security Review | security-patterns, verify-implementation | **Critical** |
| Epic Closure | epic-closure-validation, verify-implementation | **Critical** |

---

## All Skills Quick Reference

| Skill | One-Line Description | Key Trigger |
|-------|---------------------|-------------|
| `production-code-standards` | Blocks workarounds, TODO comments, empty catches, fallback logic, speculative abstractions; conventions ship with their structural guards (enforcement ladder) | Any production code writing; establishing a convention |
| `service-reuse` | Requires checking service inventory before creating new services — duplication is the AI-era failure that never faded | Creating services, utilities, helpers |
| `testing-philosophy` | Fix existing broken tests before writing new; accuracy first; anti-ballast (assert contracts, never hard-code or delete failing tests) | Any test writing or debugging |
| `mvd-documentation` | Document "why" not "what"; no placeholders; conventions carry [enforced:]/[prose-only] status tags and guarded prose gets pruned | Writing docs, README, convention docs |
| `security-patterns` | OWASP patterns: auth, parameterized queries, input validation; recurring rules become rung-2 guard tests | Auth code, API endpoints, DB queries |
| `model-aware-behavior` | Verification over recall: docs/memory/tickets are hypotheses — verify against the code; do only what was requested | Acting on doc/memory claims, modifying code |
| `using-pm-workflow` | Guide through correct workflow phases | Session start, phase transitions |
| `verify-implementation` | Verify claims with evidence before saying "complete"; audit every claim against actual tool results | Before any completion claim |
| `divergent-exploration` | Explore 3-5 alternatives before converging on solution | Architecture, design, planning |
| `epic-closure-validation` | All sub-tickets Done/Cancelled; convention guard audit; ratchet-first for cross-cutting follow-ups | Closing epics |

---

## Skill Reference Files

Some skills include additional reference material in subdirectories:

| Skill | Reference Files |
|-------|-----------------|
| `production-code-standards` | `references/anti-patterns.md` - Detailed prohibited/required code examples |
| `service-reuse` | `references/service-inventory-template.md` - Inventory format |
| `testing-philosophy` | `examples/test-templates.md` - Test structure templates |
| `mvd-documentation` | `references/adr-template.md` - Architecture Decision Record template |
| `security-patterns` | `references/owasp-patterns.md` - OWASP implementation patterns |
| `verify-implementation` | `references/verification-checklist.md` - Completion checklist |
| `divergent-exploration` | `references/exploration-patterns.md` - Divergent thinking patterns |

Include these files when you need detailed guidance beyond the core skill rules.

---

## Usage Examples

### Example 1: Implementation with Full Quality Enforcement

```bash
# Combine skills for implementation
cat codex/skills/production-code-standards/SKILL.md \
    codex/skills/service-reuse/SKILL.md \
    codex/prompts/implementation.md > /tmp/impl-prompt.md

# Review the combined prompt
less /tmp/impl-prompt.md

# Copy to clipboard and paste into Codex
cat /tmp/impl-prompt.md | pbcopy
```

### Example 2: Inline Skill Reference

```markdown
## Quality Enforcement

### Production Code Standards
- NO TODO/FIXME/HACK comments
- NO empty catch blocks
- NO fallback logic (value || default) that hides errors
- YES fail-fast validation at entry points
- YES typed custom errors for debugging

### Service Reuse
Before creating any new service:
1. Check service inventory for existing solutions
2. Verify if existing service can be extended
3. Document why new service is required if creating one

---

## Task

[Ticket ID]: APP-123
[Description]: Implement user notification preferences API

Implement the feature following the quality standards above.
```

### Example 3: Security Review with OWASP Reference

```bash
# Full security review prompt with OWASP patterns
echo "# Security Review Session" > /tmp/security-prompt.md
echo "" >> /tmp/security-prompt.md
cat codex/skills/security-patterns/SKILL.md >> /tmp/security-prompt.md
echo "" >> /tmp/security-prompt.md
echo "## OWASP Pattern Details" >> /tmp/security-prompt.md
echo "" >> /tmp/security-prompt.md
cat codex/skills/security-patterns/references/owasp-patterns.md >> /tmp/security-prompt.md
echo "" >> /tmp/security-prompt.md
cat codex/prompts/security-review.md >> /tmp/security-prompt.md

cat /tmp/security-prompt.md | pbcopy
```

---

## Troubleshooting

**Skill content not being followed?**
- Ensure skill content appears BEFORE the main prompt
- Highlight critical rules with markdown emphasis (`**CRITICAL**`)
- Use explicit "DO" and "DO NOT" language

**Prompt too long with multiple skills?**
- Include only the "Prohibited Patterns" and "Required Patterns" sections
- Reference skill name and key rules rather than full content
- For complex phases, accept longer prompts as necessary for quality

**Conflicts between skills?**
- Skills are designed to complement, not conflict
- If apparent conflict: production-code-standards takes precedence for code
- testing-philosophy allows patterns in test code that production-code-standards blocks in production code
