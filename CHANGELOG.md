# Changelog

All notable changes to PM Vibe Code Operations will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.14.0] - 2026-01-23

### Changed
- **Agentic workflow is now the primary recommendation** - `/execute-ticket` positioned as the default approach for ticket-level work
- Documentation reorganized across all files to lead with agentic workflow
- Manual phase execution (adaptation, implementation, testing, etc.) now documented as "Individual Phases (Advanced)" for special cases
- Benefits messaging updated: 8x faster execution, zero human intervention for passing tickets, consistent quality, full traceability

### Added
- Git branch creation using Linear's `gitBranchName` field for consistent branch naming
- Automatic "In Progress" status update when `/execute-ticket` begins
- Existing branch and PR detection with intelligent resume capability
- Implementation artifact verification before commits
- Draft PR creation with automatic commit after implementation phase
- PR phase comments with progress indicators
- PR labels: `code-reviewed`, `security-approved`, `ready-for-merge`
- Draft-to-ready PR conversion when security review passes with no critical/high issues
- Report validation with auto-retry for malformed agent responses
- Strict context budget enforcement (~2000 tokens per agent invocation)

### Improved
- FAQ expanded with execute-ticket specific questions
- TECHNICAL_REFERENCE.md now includes full `/execute-ticket` command documentation
- PM_GUIDE.md simplified messaging: "one command does everything"
- GET_STARTED.md updated to recommend agentic workflow as starting point

---

## [2.13.0] - 2025-01-23

### Added
- Workflow phase isolation for all ticket-level agents
  - `WORKFLOW POSITION` markers clarify each agent's place in workflow
  - `Context Isolation` sections prevent session context contamination
  - `Phase Guardrails` provide explicit STOP instructions for wrong task types
- Imperative prompt structure in implementation command with `TASK:` header

### Changed
- All 9 ticket-level agents now have consistent phase boundary protections
- Implementation command uses action-oriented language (READ, IMPLEMENT, COMMIT, RETURN)

### Fixed
- Agent phase confusion where agents would act on session summaries instead of explicit tasks
- Context contamination where agents performed wrong-phase work (e.g., security reviews during implementation)

---

## [2.12.1] - 2026-01-23

### Added
- New `/execute-ticket` command for automated ticket workflow orchestration:
  - Executes all 6 ticket-level phases (adaptation → implementation → testing → documentation → codereview → security-review) automatically
  - Auto-detects resume state by parsing Linear comments for phase report headers
  - Pauses only for blocking issues requiring user decision
  - Supports blocking conditions per phase: BLOCKED status, compile errors, Gate failures, CHANGES_REQUESTED, CRITICAL/HIGH severity
  - Generates execution summary with metrics on completion
  - Closes ticket via security-review phase when all phases pass

### Improved
- Enhanced `/execute-ticket` orchestrator with robustness improvements:
  - Added report validation layer to catch malformed agent responses
  - Added context budget guidelines (~2000 tokens) to prevent overflow
  - Added 3-tier agent selection fallback with user prompts when unclear
  - Clarified testing gate terminology (Gate #0 for existing tests vs Gates #1-3 for new tests)
  - Added resume safety check to verify status within phase reports, not just headers
  - Expanded error handling section with recovery procedures
  - Added phase skip safety guide showing which phases are safe to skip

### Changed
- Updated README.md, QUICK_REFERENCE.md, and CLAUDE.md to document new `/execute-ticket` command

---

## [2.11.0] - 2026-01-11

### Added
- Codex agents directory with 10 agent persona templates for OpenAI Codex CLI:
  - architect-agent, backend-engineer-agent, frontend-engineer-agent
  - qa-engineer-agent, code-reviewer-agent, technical-writer-agent
  - security-engineer-agent, design-reviewer-agent, epic-closure-agent
  - ticket-context-agent
- Codex skills directory with 10 quality enforcement skills adapted for Codex:
  - production-code-standards, service-reuse, testing-philosophy
  - mvd-documentation, security-patterns, model-aware-behavior
  - using-pm-workflow, verify-implementation, divergent-exploration
  - epic-closure-validation
- `codex/AGENTS.md` - comprehensive agent usage guide for Codex
- `codex/SKILLS_REFERENCE.md` - skills by workflow phase mapping
- `codex/HOOKS_GUIDE.md` - manual alternatives to Claude Code hooks

### Changed
- Updated `codex/README.md` with new Codex Skills and Codex Agents sections

---

## [2.10.0] - 2025-01-11

### Added
- New reference files for progressive disclosure:
  - `skills/verify-implementation/examples/evidence-formats.md` - Evidence format templates
  - `skills/verify-implementation/references/speculation-red-flags.md` - Hedging language catalog
  - `skills/testing-philosophy/references/test-priority-guidelines.md` - Test prioritization guide
  - `skills/service-reuse/examples/inventory-search-session.md` - Complete search walkthrough
- Cross-references between related skills (production-code-standards, testing-philosophy, verify-implementation, service-reuse)
- Enhanced trigger phrases for better skill auto-activation:
  - Anti-workaround detection: "make it work", "quick fix", "temporary solution", "hack"
  - CI/pipeline triggers: "CI failing", "pipeline broken", "build red"
  - Deployment triggers: "ship it", "LGTM", "merge it", "deploy this"
  - DRY/reuse triggers: "avoid duplication", "DRY", "existing pattern"
  - Refactor triggers: "refactor", "redesign", "rearchitect", "migrate"

### Changed
- Restructured `verify-implementation` skill for progressive disclosure (1029 to 514 words in SKILL.md)
- Expanded `verification-checklist.md` with detailed checklists moved from SKILL.md
- Standardized all code blocks to TypeScript in `service-reuse` skill
- Updated imperative form: "Cannot write" to "Do not write" in testing-philosophy
- Extended file type support: added `.py`, `.go` patterns to relevant skills
- Extended directory patterns: added `domain/`, `shared/` to monitored paths

### Fixed
- Skills now properly follow progressive disclosure pattern (lean SKILL.md + detailed references)

---

## [2.9.0] - 2025-01-11

### Changed
- Improved all 10 skills based on plugin-dev:skill-reviewer methodology review
- Removed tangential "Word Substitutions" section from model-aware-behavior skill
- Removed duplicate "When Blocked" section from production-code-standards references
- Fixed second-person language violations in epic-closure-validation and service-reuse skills
- Converted first-person verification checklist to imperative form in model-aware-behavior

### Added
- Added `/close-epic` (Phase 11) to using-pm-workflow workflow overview and decision tree
- Added ADR template reference pointer to mvd-documentation skill
- Added verification checklist reference pointer to verify-implementation skill
- Created `references/scope-creep-patterns.md` for model-aware-behavior skill with anti-patterns and examples

---

## [2.8.0] - 2026-01-11

### Added
- **ticket-context-agent**: New agent for gathering and summarizing ticket context from Linear when processing large epics
- **Scalable Context Gathering**: `/close-epic` now spawns parallel `ticket-context-agent` instances for epics with 7+ tickets, preventing context exhaustion
- **Retrofit Ticket Creation**: `/close-epic` now automatically creates detailed Linear tickets for each retrofit recommendation with full specifications (context, implementation guidance, acceptance criteria)

### Changed
- **close-epic.md**: Added `mcp__linear-server__create_issue` to allowed-tools for retrofit ticket creation
- **close-epic.md**: Added threshold-based context gathering strategy (≤6 tickets: direct, 7+: parallel agents)
- **epic-closure-agent.md**: Retrofit recommendations now output ticket-ready specifications with full detail
- Updated agent count from 9 to 10 across documentation (AGENTS.md, CLAUDE.md)
- Updated TECHNICAL_REFERENCE.md with new `/close-epic` features and Ticket Context Agent section

---

## [2.7.3] - 2026-01-09

### Changed
- **hooks.json**: Removed aggressive `Write|Edit` PostToolUse hook that was blocking legitimate work
- Production code standards validation now occurs at session end (Stop hook) instead of every file write
- Stop hook provides consolidated end-of-session summary with code review notes for operator review
- Code review notes only check production paths (`src/`, `lib/`, `app/`, `services/`, `modules/`, `controllers/`)
- Explicitly skips: `scripts/`, `tests/`, `__tests__/`, `*.test.*`, `*.spec.*`, config files, documentation

### Fixed
- Hooks no longer block utility scripts, one-off tools, or non-production code
- Reduced false positives from overzealous workaround detection during active development

---

## [2.7.2] - 2026-01-07

### Fixed
- **epic-planning.md**: Added `mcp__linear-server__list_comments` to allowed-tools and explicit instructions to fetch both ticket body AND comments when loading discovery tickets
- **planning.md**: Added `mcp__linear-server__list_comments` to allowed-tools and comprehensive instructions to fetch both epic description AND comments throughout the workflow

### Changed
- All Linear-interacting commands now explicitly require fetching both issue body/description AND comments
- Comments often contain critical context like phase reports, discovery findings, and previous analysis
- Audit confirmed: 9/11 commands fully compliant, 2/11 not applicable (discovery creates tickets, generate-service-inventory scans codebase)

---

## [2.7.1] - 2026-01-06

### Fixed
- **AGENTS.md**: Completely rewritten - was containing coding style guidelines instead of agent documentation
- **README.md**: Fixed command count from "10 commands" to "11 commands"
- **TECHNICAL_REFERENCE.md**: Fixed skill count from "9 skills" to "10 skills" in platform comparison table
- **SKILLS.md**: Fixed filename casing (`skill.md` → `SKILL.md`) and phase breakdown accuracy
- **FAQ.md**: Fixed phase counts from "9 phases" and "10 phases" to "11 phases"
- **session-start.sh**: Added missing `epic-closure-validation` skill to the 10-skill list

### Changed
- Documentation consistency scrub ensuring all files accurately reflect: 9 agents, 10 skills, 11 commands

---

## [2.7.0] - 2026-01-06

### Added
- New `references/` directories for skills: verify-implementation, service-reuse, mvd-documentation
- New `examples/` directories for skills: production-code-standards, testing-philosophy, divergent-exploration
- Enhanced skill descriptions with specific user trigger phrases for better activation
- Distinct agent colors by category (green=implementation, cyan=review, blue=planning, yellow=quality, magenta=closure)

### Changed
- Renamed `security_review` to `security-review` for kebab-case consistency
- Renamed `generate_service_inventory` to `generate-service-inventory` for kebab-case consistency
- Updated 21+ documentation files with new command names
- Renamed `skills/epic-closure-validation/skill.md` to `SKILL.md` for consistency

### Fixed
- Plugin validation now passes with no naming inconsistencies

---

## [2.6.0] - 2026-01-06

### Added

**Epic Closure Command and Agent**

Introduced `/close-epic` command for formally closing completed epics with comprehensive analysis:

- **New Command**: `/close-epic <epic-id> [--skip-retrofit] [--skip-downstream]`
  - Six-phase closure workflow: Completion verification, retrofit analysis, downstream impact, documentation audit, CLAUDE.md updates, closure summary
  - Validates ALL sub-tickets are Done/Cancelled before allowing closure (blocking gate)
  - Extracts patterns worth propagating backward to existing code (retrofit analysis)
  - Propagates guidance to dependent epics (downstream impact)
  - Audits documentation coverage and proposes CLAUDE.md updates
  - Generates comprehensive closure report with lessons learned

- **New Agent**: `epic-closure-agent` (model: opus, color: gold)
  - Specialized for analyzing completed work and extracting actionable learnings
  - Follows orchestrator-agent pattern (no direct Linear access)
  - Skills: production-code-standards, verify-implementation, epic-closure-validation

- **New Skill**: `epic-closure-validation` (skill #10)
  - Auto-activates when closing epics
  - Blocks closure if any sub-ticket is incomplete
  - Validates no workarounds shipped and business value delivered

- **New Hook**: PostToolUse hook for `mcp__linear-server__update_issue`
  - Validates epic closure prerequisites when marking epics as Done
  - Prevents premature epic closure

**Workflow Enhancement**

- Added epic-level completion phase to workflow (phase 11)
- `/security-review` closes tickets, `/close-epic` closes epics
- Clear separation: ticket closure vs. epic closure

---

## [2.5.2] - 2026-01-06

### Changed

**Documentation Phase Auto-Converts Draft PRs**

Updated `/documentation` command to automatically convert draft PRs to "ready for review" without asking for user confirmation:

- Added new "Auto-Convert Draft PR to Ready for Review" section with bash commands
- Updated workflow step 15 to "PR State Change (AUTO)" with "DO NOT ask user, just do it"
- Updated "PR Status Updates" section to specify "AUTOMATIC DRAFT CONVERSION"
- Updated Success Criteria to reflect automatic PR state change

Documentation phase now moves PR from draft to ready for review when complete.

---

## [2.5.1] - 2026-01-06

### Changed

**Code Review Auto-Converts Draft PRs**

Updated `/codereview` command to automatically convert draft PRs to "ready for review" without asking for user confirmation:

- Added new "Auto-Convert Draft PR to Ready for Review" section with explicit automatic behavior
- Updated workflow step 16 to "PR State Change (AUTO)" with "DO NOT ask user, just do it"
- Updated "Moving PR from Draft to Ready for Review" section to reinforce automatic conversion
- Updated "PR Status Management" to specify "AUTOMATIC DRAFT CONVERSION"

Code review requires PRs to be ready for review, so this conversion is automatic and expected as part of the workflow.

---

## [2.5.0] - 2026-01-06

### Changed

**Orchestrator-Centric Pattern for Linear MCP Integration**

Implemented a major architectural change where commands handle ALL Linear I/O while agents operate as pure workers:

- **6 ticket-level commands updated** (adaptation, implementation, testing, documentation, codereview, security-review):
  - Fetch ticket details and comments BEFORE spawning agents
  - Embed ALL context into agent prompts
  - Write reports to Linear AFTER agents complete

- **8 agents converted to pure worker pattern**:
  - Removed Linear MCP tools from all agents
  - Added "Input: Context Provided by Orchestrator" section
  - Added "Output: Structured Report Required" section with standardized report format
  - Agents modified: architect, backend-engineer, frontend-engineer, qa-engineer, code-reviewer, technical-writer, security-engineer, design-reviewer

- **CLAUDE.md updated** with orchestrator-agent pattern documentation

### Removed

- Removed Linear MCP tools from all 8 agent definitions
- Removed unused `list_comments` from planning commands (epic-planning, planning retained tools for ticket CREATION only)

---

## [2.4.4] - 2026-01-06

### Fixed

**Security Review Command Shell Substitution Error**

Fixed error where `/security-review` command failed with "Command contains $() command substitution" due to Claude Code's security model blocking shell substitution patterns.

- Removed complex `$()` command substitution patterns from shell commands
- Replaced dynamic default branch detection with simple `origin/HEAD` reference
- Git automatically resolves `origin/HEAD` to the default branch
- Simplified from 4 complex shell commands to 3 simple git commands

---

## [2.4.3] - 2026-01-06

### Changed

**Conditional Linear MCP Integration**

Made Linear MCP integration conditional on ticket ID to preserve agent utility outside the workflow:

- **All 8 agents** updated with conditional ticket handling:
  - Linear MCP first/last actions now only mandatory **when a ticket ID is provided**
  - Added fallback: "If NO ticket ID is provided: You may work without Linear integration"
  - Tools remain documented and available for optional use
  - Agents can now be invoked for general work without requiring Linear tickets

- **Agents modified**: architect, backend-engineer, frontend-engineer, qa-engineer, code-reviewer, technical-writer, security-engineer, design-reviewer

---

## [2.4.2] - 2026-01-06

### Added

**Comprehensive Linear MCP Integration for Agents and Commands**

Fixed critical issue where agents were not using Linear MCP tools to read tickets before work or update tickets after completion. Agents were looking for shell scripts/APIs instead of understanding MCP tool invocation.

- **All 8 agents** now have standardized "🔗 CRITICAL: Linear MCP Integration" section including:
  - Clear explanation that these are MCP tools, NOT shell commands or APIs
  - Table of available Linear MCP tools with descriptions
  - **MANDATORY First Action**: Read ticket and comments before any work
  - **MANDATORY Last Action**: Add completion summary comment before finishing
  - Explicit reminder to invoke tools directly

- **All 6 ticket-level commands** now have three-step orchestration:
  - **Step 1: Pre-Agent Context Gathering** - Orchestrator reads ticket/comments BEFORE invoking agent
  - **Step 2: Agent Invocation** - Pass ticket context to agent in prompt
  - **Step 3: Post-Agent Verification** - Verify agent added completion comment

- **Commands updated**: adaptation, implementation, testing, documentation, codereview, security-review

---

## [2.4.1] - 2026-01-05

### Fixed

**Linear MCP Tool Integration**

Fixed issues with agents not properly using Linear MCP tools. Agents were looking for shell scripts/commands instead of invoking MCP tools directly.

- **Agent frontmatter updated** (8 agents): Added missing Linear MCP tools to `tools:` field
  - `architect-agent`: Added `mcp__linear-server__get_issue`, `mcp__linear-server__list_comments`, `mcp__linear-server__list_issues`
  - All other agents: Added `mcp__linear-server__list_comments`
  - `design-reviewer-agent`: Added full Linear MCP tool set

- **Command syntax fixes**:
  - `epic-planning.md`: Removed non-existent milestone MCP functions, switched to label-based phase tracking
  - `planning.md`: Removed milestone functions, fixed JavaScript pseudocode to proper MCP tool instructions
  - `discovery.md`, `security-review.md`: Changed shell-like comments to markdown format
  - `epic-planning.md`: Added explicit "Using Linear MCP" section with proper tool invocation examples

---

## [2.4.0] - 2026-01-05

### Changed

**Improved Skill Trigger Specificity**

Updated all 9 skill descriptions with more explicit activation triggers based on Claude Code best practices research. Skills now use structured format with categorized triggers:

- **Skills updated**: `production-code-standards`, `service-reuse`, `testing-philosophy`, `mvd-documentation`, `security-patterns`, `model-aware-behavior`, `using-pm-workflow`, `verify-implementation`, `divergent-exploration`

- **New description format**:
  - Lead with purpose (what skill enforces)
  - Explicit "ACTIVATE when:" section with categorized triggers
  - User phrases, file patterns, tool usage, and context cues
  - Clear "ENFORCES/BLOCKS/REQUIRES" summary

**Mandatory Agent Invocation in Commands**

Added explicit mandatory language to all 8 workflow commands requiring agent invocation via Task tool:

- **Commands updated**: `discovery`, `planning`, `adaptation`, `implementation`, `testing`, `documentation`, `codereview`, `security-review`

- **New section added** (after frontmatter): "MANDATORY: Agent Invocation Required"
  - Bold statement: "You MUST use the Task tool to invoke the [agent-name]"
  - Numbered steps for required process
  - Clear prohibition: "DO NOT attempt to perform [work] directly"

- **Agent mapping**:
  - `discovery`, `planning`, `adaptation` → `architect-agent`
  - `implementation` → `backend-engineer-agent` / `frontend-engineer-agent`
  - `testing` → `qa-engineer-agent`
  - `documentation` → `technical-writer-agent`
  - `codereview` → `code-reviewer-agent`
  - `security-review` → `security-engineer-agent`

---

## [2.3.2] - 2026-01-05

### Fixed

**Security Review Git Reference Bug**

Fixed `origin/HEAD` reference error in `/security-review` command that occurred in repositories where `origin/HEAD` symbolic reference is not configured (e.g., locally initialized repos with manually added remotes).

- **Commands updated**:
  - `commands/security-review.md`: Dynamic default branch detection with fallback chain
  - `codex/prompts/security-review.md`: Same fix for platform-agnostic version

- **Fix details**:
  - Uses `git symbolic-ref` first (fastest when available)
  - Falls back to `git remote show origin` (works on any repo)
  - Final fallback to `main` if detection fails
  - Added graceful error handling with fallback to `HEAD~5` for diff/log commands

---

## [2.3.1] - 2026-01-05

### Fixed

**Discovery Reference Standardization**

Updated commands and documentation to consistently reference Linear discovery tickets as the primary workflow:

- **Commands updated**:
  - `/epic-planning`: Clarified discovery argument accepts ticket ID (e.g., `DISC-001`) or markdown file path
  - `/planning`: Updated `--discovery` flag description and examples to show ticket IDs as primary
  - `/adaptation`: Updated argument hint and examples to use discovery ticket IDs

- **Documentation updated**:
  - PM_GUIDE.md: Fixed 3 references to use discovery ticket IDs instead of markdown files
  - QUICK_REFERENCE.md: Updated example commands to use `DISC-001` format
  - FAQ.md: Fixed 2 example references
  - TECHNICAL_REFERENCE.md: Updated usage syntax and examples for epic-planning and planning

The `/discovery` command creates a Linear ticket as its artifact, so downstream commands should reference that ticket ID by default. Markdown file paths remain supported as an alternative.

---

## [2.3.0] - 2026-01-02

### Changed

**Agent Quality Improvements**

- Added `color` field to all 7 agents for visual identification in UI:
  - architect-agent → blue, backend-engineer → green, frontend-engineer → purple
  - code-reviewer → yellow, qa-engineer → cyan, security-engineer → red, technical-writer → teal
- Added `service-reuse` skill to code-reviewer-agent
- Added `production-code-standards` skill to technical-writer-agent
- Fixed naming inconsistency: "security-master agent" → "security-engineer-agent" in example blocks
- Added pre-completion checklists to backend-engineer, frontend-engineer, and technical-writer agents

**Command Description Optimization**

- Shortened verbose command descriptions for better display:
  - codereview.md: 165 → 96 characters
  - adaptation.md: 198 → 85 characters

**Skill Trigger Improvements**

- Broadened trigger phrases in 4 skills for better auto-activation:
  - `using-pm-workflow`: Added "what command is next", "where am I in the workflow", "project setup", etc.
  - `security-patterns`: Added "encryption", "XSS", "CSRF", "SQL injection", "JWT tokens", etc.
  - `model-aware-behavior`: Added "understanding the codebase", "scope creep", "before implementing", etc.
  - `divergent-exploration`: Added "brainstorming", "trade-offs analysis", "pros and cons", etc.
- Added inline examples to model-aware-behavior and using-pm-workflow skills

**Hooks Refactoring**

- Changed PreToolUse → PostToolUse hook (validates after file changes, reduces noise)
- Added `description` field to all hook configurations for better discoverability
- Made Stop hook conditional (only reminds about Linear when workflow commands were used)

---

## [2.2.0] - 2026-01-02

### Changed

**Skill Descriptions Improved**

All 9 skills have been updated with improved descriptions following plugin-dev best practices:

- Descriptions now lead with purpose, not activation conditions
- Use third-person voice consistently ("This skill enforces..." not "Activate when...")
- Include specific trigger phrases in quotes for better auto-activation
- Reduced verbosity (under 70 words each)
- Removed redundant "Activation context" sections that duplicated frontmatter

Skills updated:
- `production-code-standards` - Enforces production-grade code quality
- `service-reuse` - Prevents code duplication
- `testing-philosophy` - Enforces accuracy-first testing
- `mvd-documentation` - Enforces minimal viable documentation
- `security-patterns` - Applies OWASP Top 10 patterns
- `model-aware-behavior` - Optimizes Claude Code behavior
- `using-pm-workflow` - Guides workflow phase navigation
- `verification-before-completion` - Requires verification before task completion
- `divergent-exploration` - Encourages exploring alternatives

**Agent Model Selection**

- `code-reviewer-agent`: Changed from `sonnet` to `opus` model for deeper code quality analysis

### Added

**Enhanced Hooks**

Added two new prompt-based hooks to `hooks/hooks.json`:

- **PreToolUse hook** (Write|Edit matcher): Reminds to follow production code standards before writing code
- **Stop hook**: Reminds users to update Linear ticket status when session involved implementation work

**Marketplace Metadata**

Enhanced `.claude-plugin/marketplace.json` for better discoverability:

- Added `tags`: pm, workflow, linear, planning, security, code-review, documentation, testing, epic-planning, tdd
- Added `featuredCommand`: discovery
- Added `highlights` describing key features:
  - Complete PM-to-production workflow with 10 structured phases
  - Linear integration for seamless ticket management
  - Security review as final quality gate
  - 9 auto-activating quality enforcement skills

---

## [2.1.0] - 2026-01-02

### Added

**Plugin-Based Installation**

This release introduces simplified plugin-based installation for Claude Code users:

- **Marketplace installation**: Add marketplace and install plugin (see README)
- Automatically installs all commands, agents, skills, and hooks
- No manual file copying or directory setup required

### Changed

**Documentation Overhaul**

Updated all documentation to reflect the new plugin installation method:

- README.md: New installation section with plugin commands
- docs/INSTALLATION.md: Completely rewritten for plugin-first approach
- docs/SETUP_GUIDE.md: Simplified setup instructions
- GET_STARTED.md: Updated prerequisites and checklists
- PM_GUIDE.md: Updated prerequisites section
- FAQ.md: Updated installation Q&A
- TECHNICAL_REFERENCE.md: Updated platform comparison table
- docs/TROUBLESHOOTING.md: Updated troubleshooting for plugin-based installation
- QUICK_REFERENCE.md: Version bump to 2.1.0

### Removed

**Legacy Installation Instructions**

- Removed manual `mkdir ~/.claude/commands` instructions
- Removed `cp commands/*.md ~/.claude/commands/` steps
- Removed manual agent and skill copying instructions
- Removed global vs. local installation complexity for Claude Code users

### Migration Guide

If upgrading from 2.0.0:

1. **No action required for existing installations** - Your current setup continues to work
2. **For new installations**: Install from marketplace instead of manual copying (see README)
3. **To switch to plugin**: You can optionally remove manual installations and use the plugin instead:
   ```bash
   rm -rf ~/.claude/commands/*.md ~/.claude/agents/*.md ~/.claude/skills/*
   /plugin marketplace add bdouble/pm-vibecode-ops
   /plugin install pm-vibecode-ops@pm-vibecode-ops
   ```

---

## [2.0.0] - 2026-01-02

### Breaking Changes

**Repository Structure Refactoring**

This release restructures the repository to follow Claude Code plugin conventions:

- **Removed `commands-worktrees/` directory** - Worktree mode has been deprecated. The workflow now uses standard git branches only. All worktree-related documentation has been removed.
- **Moved components from `claude/` to root level**:
  - `claude/commands/` → `commands/`
  - `claude/agents/` → `agents/`
  - `claude/skills/` → `skills/`
- **Agent files renamed from snake_case to kebab-case**:
  - `architect_agent.md` → `architect-agent.md`
  - `backend_engineer_agent.md` → `backend-engineer-agent.md`
  - `code_reviewer_agent.md` → `code-reviewer-agent.md`
  - `design_reviewer_agent.md` → `design-reviewer-agent.md`
  - `frontend_engineer_agent.md` → `frontend-engineer-agent.md`
  - `qa_engineer_agent.md` → `qa-engineer-agent.md`
  - `security_engineer_agent.md` → `security-engineer-agent.md`
  - `technical_writer_agent.md` → `technical-writer-agent.md`

### Added

**Plugin Architecture**

- Added `.claude-plugin/plugin.json` manifest file for Claude Code plugin system
- Added `hooks/hooks.json` for event-triggered automation
- Added `scripts/session-start.sh` for session initialization with workflow context
- Added `marketplace.json` for plugin marketplace configuration

**Three New Skills (9 total)**

- **using-pm-workflow** - Guides users through workflow phases correctly, ensures proper command sequencing
- **verify-implementation** - Requires verification of work before marking tasks complete
- **divergent-exploration** - Encourages exploring alternative approaches before converging on a solution

**Enhanced Agent Definitions**

- All agents now include `model` field for recommended model selection
- All agents now include `skills` field listing required skills for the agent role
- Optimized agent descriptions for better activation triggers

**Enhanced Command Definitions**

- All commands now include "Required Skills" sections documenting which skills activate
- Improved command descriptions for better discoverability

### Changed

**Documentation Updates**

- Updated all documentation to reflect new directory structure
- Removed all worktree mode references and documentation
- Updated version badges to 2.0.0
- Updated repository structure diagrams
- Simplified platform comparison (removed worktree mode column)

**Skills Refactoring**

- Refactored all 6 existing skills with optimized descriptions
- Skills now follow Claude Code plugin skill conventions

### Removed

- `commands-worktrees/` directory and all worktree mode commands
- `docs/WORKTREE_GUIDE.md`
- `docs/WORKTREE_MIGRATION_GUIDE.md`
- All worktree-related sections from documentation files

### Migration Guide

If upgrading from 1.x:

1. **Update installation paths**: Change `claude/commands/` to `commands/`, etc.
2. **Update agent references**: Use kebab-case names (e.g., `architect-agent` not `architect_agent`)
3. **Remove worktree commands**: If you were using worktree mode, switch to standard branch workflow
4. **Re-install skills**: Skills directory structure has changed

---

## [1.1.1] - 2025-11-26

### Fixed

**Workflow Timing Documentation**

- Corrected project-level command timing guidance across README.md, QUICK_REFERENCE.md, and TECHNICAL_REFERENCE.md
- Previously stated these commands run "once per project" which was incorrect
- Now accurately documents recurring usage:
  - `/generate-service-inventory` - Run after major codebase updates
  - `/discovery` - Run before each epic planning phase
  - `/epic-planning` - Run for each new feature, PRD, or major initiative
  - `/planning` - Run for each new epic
- Aligns with existing correct guidance in PM_GUIDE.md and GLOSSARY.md

### Added

**Model-Aware Behavior Skill**

- New `model-aware-behavior` auto-activated skill based on Anthropic's [Opus 4.5 migration guidance](https://github.com/anthropics/claude-code/tree/main/plugins/claude-opus-4-5-migration/skills/claude-opus-4-5-migration)
- Enforces code exploration before proposing changes (addresses Opus 4.5's conservative exploration tendency)
- Scope control to prevent over-engineering (addresses Opus 4.5's tendency to create extra abstractions)
- Word substitutions for thinking sensitivity when extended thinking is disabled
- Parallel tool execution optimization

**Model Recommendations Documentation**

- Added "Model Recommendations" section to README.md with phase-by-phase guidance
- Opus 4.5 recommended as primary model for deep reasoning capabilities
- Explicit warning against Haiku 4.5 (cannot maintain context across complex operations)
- Cross-referenced in GET_STARTED.md for new user visibility

**Code Exploration Requirements**

- Added code exploration sections to `adaptation.md` and `implementation.md` commands
- Reinforces "read before proposing" behavior across workflow phases

---

## [1.1.0] - 2025-11-26

### Added

**Auto-Activated Quality Enforcement Skills**

Introduced 5 new skills that automatically activate during development to enforce standards and prevent issues before they occur. Skills shift enforcement LEFT—catching problems during creation rather than at review phases.

**New Skills:**

- **production-code-standards** - Blocks workarounds, temporary solutions, fallback logic hiding errors, TODO/FIXME/HACK comments, mocked services in production code, and silent error suppression. Activates when writing code in src/, lib/, app/ directories.

- **service-reuse** - Enforces checking service inventory before creating new services, utilities, or helpers. Prevents code duplication by mandating reuse of existing authentication, validation, and data access patterns.

- **testing-philosophy** - Requires fixing existing broken tests BEFORE writing new tests. Enforces accuracy-first testing: accurate tests that run > high coverage with broken tests.

- **mvd-documentation** - Enforces Minimal Viable Documentation standards. Documents the "why" not the "what"—TypeScript already shows the "what". Requires documentation for security-sensitive code.

- **security-patterns** - Enforces OWASP Top 10 patterns during development. Covers: broken access control, cryptographic failures, injection, insecure design, misconfiguration, vulnerable components, authentication failures, data integrity, logging failures, and SSRF.

**New Documentation:**

- `SKILLS.md` - Comprehensive guide explaining skills vs commands vs agents, installation instructions, and how to create custom skills

**Skill Design:**

- All skills follow skill-creator best practices with concise frontmatter triggers
- Workflow overviews at the start of each skill for clear enforcement steps
- BLOCK/REQUIRE labeling for prohibited vs required patterns
- Code examples demonstrating correct and incorrect approaches

### Benefits

**For Developers:**
- Proactive issue prevention during coding (not just at review time)
- Clear guidance on prohibited patterns with working alternatives
- Consistent enforcement of production-ready standards
- Security patterns applied automatically when writing sensitive code

**For Code Quality:**
- Reduced code review cycles (fewer issues to catch)
- Consistent application of OWASP security standards
- Enforced service reuse preventing duplicate implementations
- Test accuracy prioritized over coverage metrics

**Workflow Integration:**
```
Traditional:
  /implementation → code with issues → /codereview catches issues → fix

With Skills:
  /implementation → skill prevents issues → /codereview (fewer issues)
```

## [1.0.3] - 2025-11-22

### Changed

**Major Installation Documentation Overhaul**
- Updated all installation and setup documentation to reference official sources
- Removed outdated manual API key setup instructions across all platforms
- Aligned documentation with official installation guides for better accuracy

**Claude Code Installation (docs/SETUP_GUIDE.md, docs/INSTALLATION.md)**
- Removed manual ANTHROPIC_API_KEY setup (authentication now automatic via OAuth)
- Added official installation guide reference: https://code.claude.com/docs/en/setup
- Updated to native installation methods (Homebrew, install scripts, NPM as alternative)
- Clarified authentication options (Console, App, Enterprise platforms)
- Updated troubleshooting sections for OAuth-based authentication

**OpenAI Codex Installation (docs/SETUP_GUIDE.md, docs/INSTALLATION.md, FAQ.md, codex/README.md)**
- Removed incorrect OPENAI_API_KEY environment variable setup
- Updated installation command to official: `npm i -g @openai/codex`
- Added official documentation links: https://developers.openai.com/codex/cli
- Clarified authentication requires ChatGPT Plus/Pro/Business/Edu/Enterprise subscription
- Added verification and first-run authentication steps

**Linear MCP Setup (docs/MCP_SETUP.md, docs/INSTALLATION.md, docs/TROUBLESHOOTING.md, GLOSSARY.md)**
- **Critical correction**: Linear MCP uses OAuth 2.1 authentication, not API keys
- Replaced API key setup with official OAuth browser flow
- Updated to official remote server: https://mcp.linear.app/mcp
- Removed LINEAR_API_KEY environment variable requirements
- Changed installation to remote transport method
- Updated server name from `linear` to `linear-server`
- Simplified setup process (no npm install or env vars needed)
- Added official documentation: https://linear.app/docs/mcp

**Sequential Thinking MCP (docs/MCP_SETUP.md)**
- Added prominent link to official Anthropic documentation
- Added Docker installation method (previously missing)
- Enhanced installation section with clearer structure (NPX vs Docker)
- Added Docker configuration examples for Claude Desktop
- Improved manual configuration with labeled sections
- Official documentation: https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking

**Playwright MCP (docs/MCP_SETUP.md)**
- Updated to official Microsoft package: `@playwright/mcp`
- Added official documentation: https://github.com/microsoft/playwright-mcp
- Added Node.js 18+ requirement (official prerequisite)
- Removed non-standard `--isolated` flag (not in official docs)
- Added VS Code CLI installation method (`code --add-mcp`)
- Added Cursor IDE installation instructions
- Documented official command-line options (`--browser`, `--caps`, `--allowed-hosts`, `--cdp-endpoint`)
- Added multi-browser support documentation (Chrome, Firefox, WebKit, Edge)

**Perplexity MCP (docs/MCP_SETUP.md, GLOSSARY.md, FAQ.md, docs/INSTALLATION.md)**
- Added official documentation: https://docs.perplexity.ai/guides/mcp-server
- Documented all four Perplexity tools (search, ask, research, reason)
- Added one-click installation method for Cursor/VS Code
- Updated Quick Reference table with complete capabilities
- Confirmed `@perplexity-ai/mcp-server` package and PERPLEXITY_API_KEY requirement

### Fixed

**Troubleshooting Documentation (docs/TROUBLESHOOTING.md)**
- Removed ANTHROPIC_API_KEY from diagnostic commands
- Updated to show only MCP-specific environment variables
- Rewrote Linear MCP troubleshooting for OAuth authentication
- Added OAuth auth cache clearing instructions

**Glossary Updates (GLOSSARY.md)**
- Updated API Key definition to clarify Linear uses OAuth, not API keys
- Changed examples from ANTHROPIC_API_KEY to LINEAR_API_KEY
- Added official documentation links for all MCP servers

### Benefits

**For Users:**
- Accurate installation instructions matching official sources
- Simpler setup processes (OAuth vs manual API keys where applicable)
- Direct access to official documentation for troubleshooting
- Clear authentication requirements for each platform
- Consistent documentation style across all platforms

**For Maintainability:**
- Single source of truth (official documentation)
- Reduced custom/undocumented configuration
- Better alignment with platform updates
- Clear separation between platforms requiring API keys vs OAuth

**Authentication Summary:**
- Claude Code: OAuth via Console/App/Enterprise (no manual API key)
- OpenAI Codex: ChatGPT subscription (automatic authentication)
- Linear MCP: OAuth 2.1 (no manual API key)
- Perplexity MCP: Requires PERPLEXITY_API_KEY
- Sequential Thinking MCP: None (runs locally)
- Playwright MCP: None (runs locally)

## [1.0.2] - 2025-11-22

### Changed

**Major Documentation Restructure (Minto Pyramid Principle)**
- Refactored all documentation to follow Minto Pyramid Principle: answer first, supporting points, details via links
- Clear separation of concerns across documentation files
- Improved navigation for different user personas (non-technical PMs vs. technical users)

**README.md: Transformed to Value-Oriented Overview**
- Reduced from 1,091 lines to 207 lines (-81% reduction)
- Now focuses on value proposition and orientation rather than technical details
- Follows Minto Pyramid structure: what/why → who/benefits → how (high-level) → links
- Clear "Realistic Expectations" section for appropriate use cases
- Removed redundant installation and command details (moved to dedicated files)

### Added

**TECHNICAL_REFERENCE.md: New Complete Technical Documentation**
- 800+ lines of comprehensive technical reference
- Complete command documentation for all 10 workflow commands
- Detailed agent specifications for all 8 specialized agents
- Git worktree architecture and lifecycle documentation
- Platform comparison table (Claude Code Simple/Worktree/Codex)
- Repository structure and best practices
- Extracted from old README for users needing detailed technical information

**docs/INSTALLATION.md: New Comprehensive Installation Guide**
- 400+ lines covering all platforms and modes
- Prerequisites checklist with links
- Step-by-step Claude Code installation (Simple and Worktree modes)
- OpenAI Codex installation instructions
- Global vs. local installation guidance
- Verification procedures
- MCP configuration overview with links
- Platform-specific notes (macOS, Linux, Windows/WSL)
- Troubleshooting common installation issues
- Advanced configuration (multiple projects, mode switching)

### Improved

**GET_STARTED.md: Updated Navigation**
- Updated documentation map to reference new TECHNICAL_REFERENCE.md
- Added INSTALLATION.md to setup & configuration section
- Updated quick reference table with new file locations
- All links verified and updated to new structure

**Documentation Organization**
- Clear audience segmentation: non-technical PMs → README/PM_GUIDE, technical users → TECHNICAL_REFERENCE
- Eliminated redundancy across files (no duplicate content)
- Better navigation paths based on user goals
- Consistent cross-referencing between related documents

### Technical Details

**Statistics:**
- README.md: -884 net lines (1,091 → 207)
- TECHNICAL_REFERENCE.md: +800 lines (new)
- docs/INSTALLATION.md: +400 lines (new)
- GET_STARTED.md: +24 insertions, -24 deletions (link updates)
- Total: +1,365 insertions, -1,009 deletions (+356 net across better-organized files)

**Benefits:**
- 81% reduction in README length improves first-time user experience
- Clear separation of concerns reduces cognitive load
- Minto Pyramid structure delivers value proposition immediately
- Technical users find detailed reference without PM-focused narrative
- Installation completely separated from conceptual understanding
- Better SEO and discoverability through focused document purposes

## [1.0.1] - 2025-11-21

### Added

**Role Personas for All Commands**
- Added explicit role definitions to all Claude commands (Simple Mode and Worktree Mode)
- Each command now starts with clear persona context (e.g., "You are acting as the **Architect**...")
- Improves AI understanding of expectations and responsibilities for each workflow phase
- Personas include: Architect, Implementation Engineer, QA Engineer, Technical Writer, Senior Code Reviewer, Security Engineer, Technical Planning Architect, Product-Focused Epic Planner

**Context Window Best Practices Documentation**
- Added prominent guidance across all 9 documentation files emphasizing fresh context windows
- Non-technical guidance in PM_GUIDE.md and GET_STARTED.md for Product Managers
- Technical guidance in README.md, EXAMPLES.md, and FAQ.md with workflow examples
- Platform-specific guidance in codex/README.md and both Claude command directories
- Key benefits: Prevents context overflow, avoids cross-phase pollution, ensures optimal performance
- Updated examples to show session resets between workflow phases

**New Documentation Files**
- `codex/README.md` - Comprehensive 195-line usage guide for OpenAI Codex users
- Platform-agnostic prompt usage patterns and best practices

### Changed

**Codex Prompts Streamlined (607 lines removed)**
- Removed complex worktree-specific bash scripts from all codex prompts
- Simplified to "Simple Mode" with standard git branch workflows
- Reduced prompt length by 15-20% for better focus and performance
- Clarified Linear MCP tool usage patterns with explicit `mcp__linear-server__*` references
- All prompts now include role personas for consistency with Claude commands
- Improved alignment with OpenAI Codex best practices (shorter, clearer, action-oriented)

**Files affected:**
- `codex/prompts/adaptation.md` - Removed 162 lines of worktree management code
- `codex/prompts/implementation.md` - Removed 132 lines
- `codex/prompts/generate-service-inventory.md` - Removed 116 lines
- `codex/prompts/security-review.md` - Removed 112 lines
- `codex/prompts/testing.md` - Removed 86 lines
- `codex/prompts/codereview.md` - Removed 75 lines
- `codex/prompts/documentation.md` - Removed 52 lines
- All codex prompts now include "Repository and Branch Context (Simple Mode)" sections

### Improved

**Documentation Consistency**
- All commands across both modes (Simple and Worktree) now have identical role personas
- Consistent messaging about context window management across all documentation
- Better platform comparison and guidance in README.md
- Enhanced SETUP_GUIDE.md with context window best practices

**Code Quality**
- Removed AGENTS.md from repository (internal artifact, now gitignored)
- CLAUDE.md already gitignored (internal configuration)
- Cleaner repository focused on workflow methodology

### Technical Details

**Statistics:**
- 9 documentation files updated with context window guidance (+189 lines)
- 18 Claude command files updated with role personas (+36 lines total)
- 9 Codex prompt files streamlined (-607 lines, +9 lines personas = -598 net)
- 2 new documentation files created (codex/README.md, AGENTS.md removed)
- Net change: +227 insertions, -616 deletions across both commits

**Benefits:**
- Improved AI context and role clarity (15-20% better according to prompt engineering research)
- Reduced complexity in codex prompts for better cross-platform compatibility
- Enhanced user guidance preventing common context window issues
- Maintained all quality gates, security standards, and workflow integrity

## [1.0.0] - 2025-11-21

### Initial Public Release

PM Vibe Code Operations is a complete workflow system enabling Product Managers to orchestrate AI coding agents for production-quality software development.

### Core Workflow Commands

**Project-Level Commands:**
- `/generate-service-inventory` - Catalog existing services to prevent duplication
- `/discovery` - Analyze codebase patterns and architecture
- `/epic-planning` - Transform PRDs into business-focused epics with duplicate prevention
- `/planning` - Technical decomposition of epics into actionable tickets

**Ticket-Level Commands:**
- `/adaptation` - Create implementation guides with service reuse analysis
- `/implementation` - AI-powered code generation following adaptation guides
- `/testing` - QA agent builds comprehensive test suites (90%+ coverage target)
- `/documentation` - Technical writer agent generates API docs and guides
- `/codereview` - Automated code quality and pattern compliance review
- `/security-review` - OWASP Top 10 vulnerability assessment (final gate, closes tickets)

### Workflow Mode

- Standard git branches, one ticket at a time
  - Commands in `commands/`
  - Best for most users

### Specialized Agents

Eight expert agents with 2025 best practices:
- **Architect Agent** - System architecture, discovery, and technical planning
- **Backend Engineer Agent** - Server-side implementation with security focus
- **Frontend Engineer Agent** - UI implementation with accessibility compliance
- **QA Engineer Agent** - Test strategy and implementation with coverage thresholds
- **Code Reviewer Agent** - Code quality assessment with explicit approval criteria
- **Security Engineer Agent** - OWASP 2021 vulnerability assessment and threat modeling
- **Technical Writer Agent** - Documentation generation
- **Design Reviewer Agent** - UI/UX validation

All agents include:
- Structured deliverable formats
- Pre-completion checklists
- Production-ready code standards (no workarounds)

### Documentation

**For Non-Technical PMs:**
- `PM_GUIDE.md` - Complete workflow guide with realistic expectations
- `GET_STARTED.md` - Navigation and quick start guide
- `EXAMPLES.md` - Illustrative scenarios demonstrating the workflow
- `FAQ.md` - 50+ questions answered including setup guidance
- `GLOSSARY.md` - Technical terms explained for PMs
- `QUICK_REFERENCE.md` - One-page printable cheat sheet

**Setup & Configuration:**
- `docs/SETUP_GUIDE.md` - Complete beginner installation (terminal basics to workflow)
- `docs/MCP_SETUP.md` - MCP server configuration (Linear, Perplexity, Sequential Thinking)
- `docs/TROUBLESHOOTING.md` - Quick-reference problem solving

**Technical Reference:**
- `README.md` - Complete technical reference with workflow diagrams
- `TECHNICAL_REFERENCE.md` - Detailed command and agent documentation
- `CONTRIBUTING.md` - Contribution guidelines

### Platform Support

- `commands/`, `agents/`, `skills/` - Claude Code optimized components
- `codex/` - Platform-agnostic prompts (OpenAI Codex compatible)

### Quality Standards

- Production-ready code requirements (no TODOs, no workarounds, no fallbacks)
- 90%+ test coverage targets with prioritized testing guidance
- OWASP Top 10 2021 security compliance
- Severity classification for security findings
- Pre-flight checks on critical commands

### Integrations

**Required:**
- Linear MCP - Ticket management and workflow tracking

**Recommended:**
- Perplexity MCP - Web research during discovery
- Sequential Thinking MCP - Enhanced reasoning for complex problems

**Optional:**
- Playwright MCP - Browser automation for E2E testing
- GitHub CLI - PR management

### Security

- Security review as final quality gate before ticket closure
- OWASP Top 10 2021 vulnerability assessment
- CVE database checking for framework vulnerabilities
- Clear severity classification (Critical/High/Medium/Low)
- Automated security fix implementation

---

## Future Releases

This changelog will be updated with each new release. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.

---

[2.14.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.14.0
[2.13.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.13.0
[2.12.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.12.1
[2.11.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.11.0
[2.10.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.10.0
[2.9.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.9.0
[2.8.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.8.0
[2.7.3]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.7.3
[2.7.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.7.2
[2.7.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.7.1
[2.7.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.7.0
[2.6.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.6.0
[2.5.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.5.2
[2.5.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.5.1
[2.5.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.5.0
[2.4.4]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.4
[2.4.3]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.3
[2.4.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.2
[2.4.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.1
[2.4.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.0
[2.3.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.3.2
[2.3.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.3.1
[2.3.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.3.0
[2.2.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.2.0
[2.1.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.1.0
[2.0.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.0.0
[1.1.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.1.1
[1.1.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.1.0
[1.0.3]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.0.3
[1.0.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.0.2
[1.0.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.0.1
[1.0.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.0.0
