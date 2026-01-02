# Skills: Auto-Activated Quality Enforcement

Skills are contextual capabilities that Claude automatically activates based on what you're doing. Unlike slash commands (which you explicitly invoke with `/command`), skills activate proactively when relevant.

**Official Documentation**: [Claude Code Skills](https://code.claude.com/docs/en/skills)

## How Skills Work

**Commands** = Explicit workflow phases you invoke (`/implementation`, `/testing`)
**Skills** = Standards that auto-activate during development

```
Skills (preventive)     →  Your Work  →  Commands (verification)
"Enforce while working"    [code/docs]    "Review what was done"
```

Skills shift enforcement LEFT - catching issues during creation rather than at review phases.

## Available Skills

### 1. production-code-standards

**Activates when**: Writing code, implementing features, fixing bugs, creating services

**Enforces**:
- No workarounds or temporary solutions
- No fallback logic that hides errors
- No TODO/FIXME/HACK comments
- No mocked services in production code
- Fail-fast error handling
- Repository pattern for data access

**Example trigger**: "Implement the user registration endpoint"

### 2. service-reuse

**Activates when**: Creating new services, utilities, helpers, middleware, guards, infrastructure

**Enforces**:
- Check service inventory before creating anything new
- Reuse existing authentication services
- Reuse existing validation utilities
- Extend existing base classes
- Use event-driven patterns over direct coupling

**Example trigger**: "Create a new email notification service"

### 3. testing-philosophy

**Activates when**: Writing tests, debugging test failures, improving coverage

**Enforces**:
- Fix existing broken tests BEFORE writing new tests
- Verify actual API via code reading before testing
- Tests must compile (zero TypeScript errors)
- Tests must execute (zero runtime errors)
- Strategic test creation (quality over coverage)

**Example trigger**: "Write tests for the payment module"

### 4. mvd-documentation

**Activates when**: Writing JSDoc, README files, API docs, inline comments

**Enforces**:
- Document "why", not "what" (TypeScript shows "what")
- No type duplication in JSDoc for TypeScript
- Security-sensitive functions require documentation
- No placeholder content (TODO, TBD)
- Complete documentation or none

**Example trigger**: "Document the authentication API"

### 5. security-patterns

**Activates when**: Writing auth code, input handling, API endpoints, database queries

**Enforces**:
- Authentication on every protected endpoint
- Authorization checks on data access
- Parameterized queries (no SQL injection)
- Input validation at system boundaries
- No sensitive data in error responses
- Security event logging

**Example trigger**: "Add login endpoint with password validation"

### 6. model-aware-behavior

**Activates when**: Exploring codebases, proposing code changes, making architectural decisions, using tools for code modification

**Enforces**:
- Read all relevant files before proposing any changes
- Never speculate about code not yet inspected
- Search for existing implementations before creating new ones
- Make only requested changes (no unrequested improvements)
- No helpers/utilities for one-time operations
- Parallel tool execution when operations are independent

**Example trigger**: "Implement the user profile feature"

### 7. using-pm-workflow

**Activates when**: Starting any PM workflow session, before responding to requests, when switching contexts, or when unsure which command to use

**Enforces**:
- Check which skills apply BEFORE any action (including clarifying questions)
- Follow the correct workflow phase sequence
- Use project-level commands (phases 1-4) for new projects
- Use ticket-level commands (phases 5-10) for each ticket
- Explain technical decisions clearly for non-engineers

**Example trigger**: Session start, or "What command should I use?"

### 8. verify-implementation

**Activates when**: Claiming any work is complete, fixed, or passing; before committing, creating PRs, or marking tickets done

**Enforces**:
- Never claim completion without verification evidence
- Run actual tests before saying "tests pass"
- Execute builds before saying "build succeeds"
- Demonstrate features before saying "feature works"
- Show output/evidence for every completion claim
- Avoid speculation phrases like "should work" or "probably passes"

**Example trigger**: "I've finished implementing the feature"

### 9. divergent-exploration

**Activates when**: Creating features, designing architecture, planning epics, solving complex problems

**Enforces**:
- Generate 3-5 genuinely distinct approaches before converging
- Never jump to "the obvious solution" without exploring alternatives
- Evaluate trade-offs across dimensions (user impact, complexity, time, dependencies)
- Present options with clear pros/cons before recommending
- Document why alternatives were rejected

**Example trigger**: "Design the notification system architecture"

## Skills vs Commands vs Agents

| Aspect | Skills | Commands | Agents |
|--------|--------|----------|--------|
| **Invocation** | Auto (contextual) | Explicit (`/command`) | Via commands |
| **Purpose** | Enforce standards | Execute workflow phases | Provide expertise |
| **Timing** | During work | Deliberate phases | During phases |
| **Output** | Inline guidance | Deliverables | Task completion |

## How Skills Complement the Workflow

The pm-vibecode-ops workflow has 10 phases. Skills add a proactive enforcement layer:

```
Traditional:
  /implementation → code with issues → /codereview catches issues → fix

With Skills:
  /implementation → skill prevents issues → /codereview (fewer issues)
```

**Example flow**:

1. You run `/implementation` for a ticket
2. **production-code-standards** skill activates as Claude writes code
3. Claude refuses to add a TODO comment (skill enforcement)
4. Claude uses existing auth service (service-reuse skill)
5. You run `/codereview`
6. Fewer issues found because skills prevented them

## Skill Strictness

All skills in this repo use **strict enforcement**:
- Skills actively block prohibited patterns
- Claude will refuse to write code that violates skills
- No "warnings only" - violations are blocked

## Installation

### Plugin Installation (Recommended)

Skills are automatically installed when you install the PM workflow plugin:

```bash
# Add the marketplace
/plugin marketplace add bdouble/pm-vibecode-ops

# Install from marketplace
/plugin install pm-vibecode-ops@bdouble/pm-vibecode-ops
```

This installs all 9 skills automatically along with commands, agents, and hooks.

### Manual Installation (Not Recommended)

If you prefer to install skills manually:

```bash
# Global installation (all projects)
mkdir -p ~/.claude/skills
cp -r skills/* ~/.claude/skills/

# Project-specific installation
mkdir -p .claude/skills
cp -r /path/to/pm-vibecode-ops/skills/* .claude/skills/
```

### Verify Installation

For plugin installation:
```bash
/plugin list
# Should show: pm-vibecode-ops
```

For manual installation, skills should be in:
- **Global**: `~/.claude/skills/[skill-name]/SKILL.md`
- **Project**: `.claude/skills/[skill-name]/SKILL.md`

## Repository Location

In this repository, skill definitions are stored in:
```
skills/
├── divergent-exploration/
│   └── SKILL.md
├── model-aware-behavior/
│   └── SKILL.md
├── mvd-documentation/
│   └── SKILL.md
├── production-code-standards/
│   └── SKILL.md
├── security-patterns/
│   └── SKILL.md
├── service-reuse/
│   └── SKILL.md
├── testing-philosophy/
│   └── SKILL.md
├── using-pm-workflow/
│   └── SKILL.md
└── verify-implementation/
    └── SKILL.md
```

## Creating Custom Skills

To add a new skill to your installation:

1. Create directory: `~/.claude/skills/[skill-name]/` (global) or `.claude/skills/[skill-name]/` (project)
2. Create `SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: When to activate. Use keywords that match user intent.
---

# Skill Title

Instructions for Claude when skill is active...
```

**Key points**:
- `description` determines when skill activates - use specific trigger keywords
- Name must be lowercase with hyphens (max 64 chars)
- Instructions should be actionable and enforceable

## Troubleshooting

**Skill not activating?**
- Ensure skill is installed to `~/.claude/skills/[name]/SKILL.md` or `.claude/skills/[name]/SKILL.md`
- Check the `description` field has relevant keywords
- Verify YAML frontmatter syntax is valid

**Skill too aggressive?**
- Refine the description to be more specific about when to activate
- Add "Use when" phrases to narrow context

**Skill conflicts with command?**
- Skills provide standards, commands provide workflow
- They should complement, not conflict
- If conflict occurs, command takes precedence during its phase
