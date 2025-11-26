# PM Vibe Code Operations

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)

## What This Is

A battle-tested workflow that enables Product Managers and other non-engineers to transform product requirements into production-ready code through structured AI collaboration.

Write a PRD. Run 10 commands. Ship features with tests, documentation, and security review.

**Time**: Significantly faster delivery for routine features (50-75% time savings typical)
**Quality**: 90%+ test coverage, automated security review, comprehensive documentation
**Output**: Production-ready code that integrates cleanly with existing codebases

---

## Why This Matters

Traditional product development bottlenecks on engineering capacity. AI coding tools promise speed but without structure create unmaintainable chaos—duplicate code, security holes, missing tests, and technical debt.

This workflow provides the structure AI needs to help non-engineers move beyond prototypes and build production software reliably:

### Six Key Innovations

**1. Service Inventory System**
Automatically catalogs existing code before building anything new. Prevents the #1 AI coding disaster: rebuilding functionality that already exists.

**2. Adaptation Phase**
Transforms "what exists" into "how to build this feature." AI gets explicit guidance on which services to reuse and how to integrate with existing patterns.

**3. Automated Ticket Memory**
Your ticketing system (Linear/Jira) becomes AI's external memory. Discovery findings, architectural decisions, and implementation guidance persist across sessions—and you can read and verify everything AI knows.

**4. Specialized Agent Workflow**
Instead of one generic AI, you work with expert agents—architect, backend engineer, QA, security, technical writer. Each focuses on their specialty with strict boundaries to prevent scope creep.

**5. Auto-Activated Quality Skills (Claude Only)**
Skills enforce standards during development, not just at review time. Production code standards, security patterns, and testing philosophy activate automatically as Claude writes code—preventing issues before they're created.

**6. Production-First Quality Focus**
Zero tolerance for workarounds, fallbacks, or temporary solutions. Risk-based testing focuses on code that matters. Inline documentation AI can't miss. Strong guidance to fail fast and fix issues rather than building workarounds you'd otherwise miss. 

### What You Get

- **Prevent duplication**: Service inventory catches 60-75% code reuse opportunities
- **Maintain quality at scale**: Built-in gates ensure code remains maintainable as applications grow
- **Move faster on routine work**: Handle straightforward features without bottlenecking on engineering
- **Preserve engineering focus**: Engineers tackle complex challenges while AI handles CRUD operations

---

## Who This Is For

**Perfect for:**
- Product Managers leading technical teams who want to accelerate delivery
- Technical PMs who want to multiply their output on routine development
- Solo founders building MVPs with AI assistance
- Engineering leaders enabling non-technical staff to contribute safely

**Best suited for:**
- Internal tools and operational software
- MVPs and prototypes that evolve into products
- Standard web applications with common patterns
- Features for existing codebases following established conventions

**Requires additional engineering expertise for:**
- Mission-critical systems where failures have serious consequences
- Highly regulated industries (healthcare, finance) requiring deep compliance review
- Novel architectures or cutting-edge technology integration
- Systems requiring significant performance optimization

---

## Have Realistic Expectations

This workflow helps PMs and other non-engineers build software that works in production—with proper tests, documentation, and security review.

**It will not** produce the elegant, highly-optimized code that senior engineers would write.

**It will** enable you to ship real features, maintain code quality as your application grows, and avoid the unmaintainable mess that unstructured AI coding creates.

The honest truth: AI-assisted development with proper quality gates produces reliable software for many use cases. It does not replace the judgment of experienced engineers for complex systems. Use this workflow for appropriate projects, and involve engineering expertise when stakes demand it.

---

## How It Works

The workflow consists of two phases:

### Project-Level Commands (Recurring)
1. `/generate_service_inventory` - Catalog existing code *(run after major codebase updates)*
2. `/discovery` - Analyze patterns and architecture *(run before each epic planning phase)*
3. `/epic-planning` - Create business-focused epics *(run for each new feature, PRD, or major initiative)*
4. `/planning` - Decompose epics into engineering tickets *(run for each new epic)*

### Ticket-Level Execution (For Each Feature)
5. `/adaptation` - Create implementation guide (reuse analysis, pattern selection)
6. `/implementation` - AI writes production code following guide
7. `/testing` - Build and fix comprehensive test suite until passing
8. `/documentation` - Generate API docs, user guides, inline documentation
9. `/codereview` - Automated quality checks and pattern compliance
10. `/security_review` - OWASP vulnerability scan → **closes ticket when passing**

Each phase includes quality gates. Security review is the final gate that marks tickets as complete.

**Best practice**: Run each command in a fresh Claude Code session to prevent context overflow and ensure optimal performance.

---

## Model Recommendations

**Primary Recommendation: Claude Opus 4.5**

This workflow is designed for deep reasoning and comprehensive analysis. Opus 4.5 is the recommended model for most phases due to its superior reasoning capabilities.

| Phase | Recommended Model | Rationale |
|-------|------------------|-----------|
| Discovery | Opus 4.5 | Deep architectural analysis |
| Epic Planning | Opus 4.5 | Strategic reasoning |
| Planning | Opus 4.5 | Complex ticket breakdown |
| Adaptation | Opus 4.5 | Thorough implementation planning |
| Implementation | Opus 4.5 or Sonnet 4.5 | Strong coding with reasoning |
| Testing | Opus 4.5 or Sonnet 4.5 | Multi-file test creation |
| Documentation | Sonnet 4.5 | Straightforward generation |
| Code Review | Opus 4.5 | Deep analysis |
| Security Review | Opus 4.5 | Critical security reasoning |

### Model Behavioral Notes

**Opus 4.5 (Recommended)**:
- Excellent for deep reasoning and architecture decisions
- Best choice for complex, multi-step operations
- The `production-code-standards` skill prevents over-engineering
- The `model-aware-behavior` skill ensures thorough code exploration

**Sonnet 4.5 (Alternative)**:
- Good for agentic coding tasks when cost/speed is a concern
- Responds well to emphatic instructions
- Excellent parallel tool execution
- Use when Opus throughput is insufficient

**Haiku 4.5 (Not Recommended)**:
- DO NOT USE for this workflow
- Cannot maintain context across complex multi-phase operations
- May produce incomplete or inaccurate analysis
- If you must use Haiku, limit to isolated single-file documentation tasks only

---

## Quick Start

### Choose Your Platform

**For Claude Code Users** (Recommended):
- **Simple Mode**: Standard git branches, one ticket at a time → [Installation](docs/INSTALLATION.md)
- **Worktree Mode**: Git worktrees for concurrent development → [Worktree Guide](docs/WORKTREE_GUIDE.md)

**For OpenAI Codex Users**:
- Platform-agnostic prompts in `codex/prompts/` → [Codex Guide](codex/README.md)

### Prerequisites

- AI coding tool (Claude Code or OpenAI Codex)
- Ticketing system with MCP integration ([Linear](https://linear.app) recommended, [Jira](https://www.atlassian.com/software/jira)  and other systems with MCP integrations supported)
- Git repository
- [Complete prerequisite checklist](docs/INSTALLATION.md#prerequisites)

### Installation

**Quick install for Claude Code (Simple Mode)**:
```bash
git clone https://github.com/your-org/pm-vibecode-ops.git
cd pm-vibecode-ops

# Global installation (commands, agents, and skills)
mkdir -p ~/.claude/commands ~/.claude/agents ~/.claude/skills
cp claude/commands/*.md ~/.claude/commands/
cp claude/agents/*.md ~/.claude/agents/
cp -r claude/skills/* ~/.claude/skills/
```

**What gets installed:**
- **Commands** (`/adaptation`, `/implementation`, etc.) - Explicit workflow phases you invoke
- **Agents** - Specialized AI roles (architect, QA engineer, security engineer)
- **Skills** - Auto-activated quality enforcement during development ([details](https://code.claude.com/docs/en/skills))

**Complete installation guide**: [docs/INSTALLATION.md](docs/INSTALLATION.md)
**First-time terminal users**: [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
**MCP configuration**: [docs/MCP_SETUP.md](docs/MCP_SETUP.md)

### Your First Feature (2-4 Hours)

1. Write a PRD with clear success criteria → [Writing AI-Friendly PRDs](PM_GUIDE.md#writing-ai-friendly-prds)
2. Run project-level commands (inventory, discovery, epic planning, technical planning)
3. Run ticket-level commands for each feature (adaptation through security review)
4. Merge when all quality gates pass

**Detailed walkthrough**: [GET_STARTED.md](GET_STARTED.md#your-first-feature-2-4-hours)

---

## Documentation

### For Non-Technical Product Managers

Start here if you don't have a development background:

- **[PM_GUIDE.md](PM_GUIDE.md)** - Complete workflow guide with non-technical explanations
- **[GET_STARTED.md](GET_STARTED.md)** - Quick start and navigation guide
- **[EXAMPLES.md](EXAMPLES.md)** - Real-world case studies showing the workflow in action
- **[FAQ.md](FAQ.md)** - Common questions and troubleshooting
- **[GLOSSARY.md](GLOSSARY.md)** - Technical terms explained for PMs

### For Technical Reference

Detailed command syntax and architecture:

- **[TECHNICAL_REFERENCE.md](TECHNICAL_REFERENCE.md)** - Complete command documentation, agent specifications, architecture details
- **[SKILLS.md](SKILLS.md)** - Auto-activated quality enforcement (production standards, security patterns, testing philosophy)
- **[INSTALLATION.md](docs/INSTALLATION.md)** - Comprehensive installation guide for all platforms and modes
- **[WORKTREE_GUIDE.md](docs/WORKTREE_GUIDE.md)** - Git worktrees for concurrent development (advanced)

---

## What You Can Expect

Based on workflow capabilities and user experiences:

**Speed**:
- 50-75% reduction in development time for routine features
- Faster iteration cycles (hours to days vs. days to weeks)
- Reduced time-to-production for well-defined requirements

**Quality**:
- 90%+ test coverage achievable consistently
- Automated security review catches vulnerabilities before production
- Comprehensive documentation generated automatically
- Code follows existing patterns and conventions

**Team Impact**:
- PMs can ship routine features without bottlenecking engineering
- Engineers focus on complex challenges requiring human expertise
- Reduced context switching for development teams
- Better alignment between product requirements and implementation

**Process Benefits**:
- Service inventory prevents code duplication (60-75% reuse typical)
- Quality gates ensure consistent standards
- Clear audit trail from requirements to deployment
- Predictable delivery timelines for appropriate features

[See educational walkthroughs demonstrating the workflow](EXAMPLES.md)

---

## Support & Community

- **Questions?** Start with [FAQ.md](FAQ.md) - 50+ answered questions
- **Stuck?** Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Issues?** [Open an issue on GitHub](https://github.com/bdouble/pm-vibecode-ops/issues)
- **Contributing?** [CONTRIBUTING.md](CONTRIBUTING.md)

---

## License

This work is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

You are free to share and adapt this material for any purpose, even commercially, as long as you give appropriate credit. See the [LICENSE](LICENSE) file for full details.

---

**Ready to transform how you build software?** Start with [PM_GUIDE.md](PM_GUIDE.md) or jump straight to [GET_STARTED.md](GET_STARTED.md).
