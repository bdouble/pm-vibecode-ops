# Changelog

All notable changes to PM Vibe Code Operations will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - `/generate_service_inventory` - Run after major codebase updates
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
- `codex/prompts/generate_service_inventory.md` - Removed 116 lines
- `codex/prompts/security_review.md` - Removed 112 lines
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
- `/generate_service_inventory` - Catalog existing services to prevent duplication
- `/discovery` - Analyze codebase patterns and architecture
- `/epic-planning` - Transform PRDs into business-focused epics with duplicate prevention
- `/planning` - Technical decomposition of epics into actionable tickets

**Ticket-Level Commands:**
- `/adaptation` - Create implementation guides with service reuse analysis
- `/implementation` - AI-powered code generation following adaptation guides
- `/testing` - QA agent builds comprehensive test suites (90%+ coverage target)
- `/documentation` - Technical writer agent generates API docs and guides
- `/codereview` - Automated code quality and pattern compliance review
- `/security_review` - OWASP Top 10 vulnerability assessment (final gate, closes tickets)

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
