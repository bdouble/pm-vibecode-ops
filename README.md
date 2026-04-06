# PM Vibe Code Operations

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
![Version](https://img.shields.io/badge/version-3.2.0-blue.svg)

**A production development workflow for Product Managers who build with AI.**

Write a PRD. Run a few commands. Ship features with tests, documentation, and security review, without waiting for engineering.

We're in the era of personal software, where non-engineers can build real applications with AI. This workflow is the structure that makes it reliable.

---

## AI Coding Without Structure Fails in Specific, Predictable Ways

AI coding tools are powerful enough that non-engineers can build real applications. But without structure, the output breaks down fast:

- **Duplicate functions everywhere.** AI forgets what it built yesterday and recreates the same logic in a different file. You end up with `sendMessage()`, `transmitMessage()`, and `deliverMessage()`, none of them talking to each other.
- **Features that look done but aren't.** AI cheerfully reports "complete" on code that doesn't work. You can't read thousands of lines to verify.
- **Security holes left open.** Authentication without rate limiting. Inputs validated but SQL injection vectors missed.
- **Workarounds hiding bugs.** Try-catch blocks that swallow exceptions. Fallback logic that papers over failures. Technical debt accumulating from day one.
- **Unmaintainable code.** Every change breaks something else. The codebase works just enough to be dangerous.

Workflows like [Superpowers](https://github.com/obra/superpowers) and [gstack](https://github.com/garrytan/gstack) solve this well for engineers. They assume you can read code, debug failures, and make architectural decisions yourself.

**This workflow is for everyone else.** Product Managers, founders, and non-engineers who need production-quality output from AI but can't be their own code reviewer.

---

## AI Needs More Structure Than Human Developers

Human engineers carry context in their heads: what services exist, what patterns the codebase follows, what the team decided last sprint. AI starts fresh every session with zero memory, zero awareness of existing code, and zero quality instincts.

PM Vibe Code Ops provides that structure through discovery, planning, implementation, testing, review, and security, so non-engineers get production-quality results instead of prototypes that collapse under real use.

---

## What Makes This Different

### AI knows what exists before writing a single line

The **Service Inventory** catalogs your entire codebase before any new code is written. AI sees what's already built, with reuse scores for each service. This prevents the most common AI coding failure: rebuilding functionality that already exists.

### Context engineering over prompt engineering

Most people focus on writing better prompts. The real unlock is giving AI the right context about your project, and making that context inspectable.

Your **ticketing system becomes AI's memory**. Discovery findings, architectural decisions, and implementation guidance are written to Linear or Jira tickets automatically. You can read everything AI knows. You can correct it when it's wrong. The context lives in a system you can inspect, even if you can't inspect the code itself.

### Specialized agents with strict scope boundaries

Instead of one generic AI trying to do everything at once, **10 specialized agents** each handle their phase. The architect creates implementation guidance and never writes code. The backend engineer follows that guidance and never makes architecture decisions. The reviewer catches problems and never adds features. Each agent stays in its lane.

### Security review blocks completion

Tickets don't close until they pass **OWASP + STRIDE + supply chain + CI/CD security review**. This isn't optional. Vulnerabilities block "done." Production readiness is enforced at the workflow level.

### Quality standards enforced during coding

AI loves temporary solutions. This workflow forbids them through **auto-activated quality skills** that enforce production code standards, testing philosophy, and security patterns as code is written. Not in a review step afterward, but during the actual writing.

---

## Who This Is For

**Built for:**
- Product Managers who build with AI tools but keep hitting quality walls
- Technical PMs who want to multiply their output on routine development
- Solo founders building MVPs that need to actually work in production
- Engineering leaders enabling non-technical staff to ship safely

**Best suited for:**
- Internal tools and operational software
- MVPs and prototypes that evolve into real products
- Standard web applications with common patterns
- Features for existing codebases following established conventions

**Bring engineering expertise for:**
- Mission-critical or safety-critical systems
- Highly regulated industries requiring deep compliance review
- Novel architectures or performance-critical systems

---

## The Workflow

![PM Vibecode Ops Workflow](assets/workflow-pipeline-v2.png)

One command, `/execute-ticket`, orchestrates the full ticket lifecycle: adaptation, implementation, testing, documentation, two-stage code review, cross-model Codex review, and security review. It creates a PR, pauses only for blocking issues, and marks tickets done when security passes.

For epics with independent tickets, `/epic-swarm` runs multiple tickets concurrently with automatic dependency management, isolated git worktrees, and phase-synchronized execution. Write phases dispatch sequentially to guarantee worktree isolation; read-only phases (adaptation, code review) run in parallel. Mandatory approval gates before merge and push, dual-layer security review (per-ticket pre-merge + comprehensive post-merge), and persistent swarm state for resume.

---

## Quick Start

### Installation

**Claude Code (recommended):**
```bash
# Add the marketplace
/plugin marketplace add bdouble/pm-vibecode-ops

# Install the plugin
/plugin install pm-vibecode-ops@pm-vibecode-ops
```

Select **"User" scope** when prompted to make it available across all projects.

**OpenAI Codex:** Platform-agnostic prompts in `codex/prompts/`. See [Codex Guide](codex/README.md).

### Prerequisites

- AI coding tool (Claude Code or OpenAI Codex)
- Ticketing system with MCP integration ([Linear](https://linear.app) recommended, [Jira](https://www.atlassian.com/software/jira) and other MCP-integrated systems supported)
- Git repository
- (Optional) [Codex Review MCP Server](https://github.com/bdouble/codex-review-server) for cross-model code review
- [Complete prerequisite checklist](docs/INSTALLATION.md#prerequisites)

### Your First Feature (2-4 Hours)

1. Write a PRD with clear success criteria → [Writing AI-Friendly PRDs](PM_GUIDE.md#writing-ai-friendly-prds)
2. Run project-level commands (inventory, discovery, epic planning, technical planning)
3. Run `/execute-ticket [ticket-id]` for each ticket
4. Merge when all quality gates pass

**Detailed walkthrough:** [GET_STARTED.md](GET_STARTED.md#your-first-feature-2-4-hours)

---

## Realistic Expectations

This workflow helps non-engineers build software that works in production, with proper tests, documentation, and security review.

It will not produce the elegantly architected code that senior engineers write. It will let you ship real features, maintain quality as your application grows, and avoid the unmaintainable mess that unstructured AI coding creates.

AI-assisted development with proper quality gates produces reliable software for many use cases. It does not replace engineering judgment for complex systems. Use this for appropriate projects, and involve engineers when stakes demand it.

---

## Outcomes

**Speed:**
- 50-75% reduction in development time for routine features
- `/execute-ticket` is 8x faster than running phases manually
- Hours-to-days iteration cycles vs. days-to-weeks

**Quality:**
- 90%+ test coverage achievable consistently
- Automated security review catches vulnerabilities before production
- Comprehensive documentation generated automatically
- Code follows existing patterns via service inventory

**Team impact:**
- PMs ship routine features without bottlenecking engineering
- Engineers focus on complex challenges requiring human expertise
- Clear audit trail from requirements to deployment

---

## Complete Workflow Reference

### Project-Level Commands (Recurring)

| # | Command | Purpose | When to Run |
|---|---------|---------|-------------|
| 1 | `/generate-service-inventory` | Catalog existing code | After major codebase updates |
| 2 | `/discovery` | Analyze patterns and architecture | Before each epic planning phase |
| 3 | `/epic-planning` | Create business-focused epics | For each new feature or PRD |
| 4 | `/planning` | Decompose epics into engineering tickets | For each new epic |

### Ticket-Level: Agentic Workflow (Recommended)

**`/execute-ticket [ticket-id]`** orchestrates all phases automatically:
- Creates feature branch using Linear's branch naming
- Gathers parent epic context, referenced documents, and external URLs
- Classifies research briefs as prescriptive or contextual; extracts conformance checklists
- Runs adaptation, implementation, testing, documentation, code review, and security review
- Includes cross-model Codex review between code review and security review
- Two-stage code review: spec compliance gates code quality review
- Creates draft PR after implementation, converts to ready when security passes
- Pauses only for blocking issues (failing tests, security vulnerabilities, conformance gaps)

### Ticket-Level: Individual Phases (Advanced)

For cases requiring phase-by-phase control:

| # | Command | Purpose |
|---|---------|---------|
| 5 | `/adaptation` | Create implementation guide (reuse analysis, pattern selection) |
| 6 | `/implementation` | AI writes production code following guide |
| 7 | `/testing` | Build and fix comprehensive test suite until passing |
| 8 | `/documentation` | Generate API docs, user guides, inline documentation |
| 9 | `/codereview` | Two-stage review: spec compliance then code quality |
| 10 | `/codex-review` | Cross-model adversarial review using OpenAI Codex |
| 11 | `/security-review` | OWASP + STRIDE + supply chain + CI/CD security scan |

### Epic-Level

| Command | Purpose |
|---------|---------|
| `/close-epic` | Close completed epic with deferred work recovery and retrofit analysis |
| `/epic-swarm [epic-id]` | Execute multiple tickets concurrently with dependency management, approval gates, and dual security review |

**Best practice:** Run each command in a fresh Claude Code session to prevent context overflow.

---

## Documentation

### For Product Managers

| Guide | Contents |
|-------|----------|
| [PM_GUIDE.md](PM_GUIDE.md) | Complete workflow guide with non-technical explanations |
| [GET_STARTED.md](GET_STARTED.md) | Quick start and navigation |
| [EXAMPLES.md](EXAMPLES.md) | Real-world case studies |
| [FAQ.md](FAQ.md) | 50+ answered questions |
| [GLOSSARY.md](GLOSSARY.md) | Technical terms explained for PMs |

### Technical Reference

| Guide | Contents |
|-------|----------|
| [TECHNICAL_REFERENCE.md](TECHNICAL_REFERENCE.md) | Complete command documentation and architecture |
| [SKILLS.md](SKILLS.md) | Auto-activated quality enforcement details |
| [AGENTS.md](AGENTS.md) | Specialized agent specifications |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Comprehensive installation guide |
| [docs/MCP_SETUP.md](docs/MCP_SETUP.md) | MCP configuration (Linear, Perplexity, etc.) |
| [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | First-time terminal user guide |

---

## Plugin Components

The plugin system automatically provides all components:

| Component | What It Does |
|-----------|-------------|
| **Commands** | 11 workflow phases you invoke (`/adaptation`, `/implementation`, `/execute-ticket`, `/epic-swarm`, etc.) |
| **Agents** | 10 specialized AI roles (architect, backend engineer, QA, security engineer, etc.) |
| **Skills** | 11 auto-activated quality standards (production code, security patterns, testing philosophy, etc.) |
| **Hooks** | Session automation for workflow context |

**Scope options:** User (recommended, all projects), Project (all collaborators), Local (this project only).

---

## Support & Community

- **Questions?** Start with [FAQ.md](FAQ.md)
- **Stuck?** Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Issues?** [Open an issue on GitHub](https://github.com/bdouble/pm-vibecode-ops/issues)
- **Contributing?** [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Acknowledgments

Several open-source projects inspired key design decisions in v3.0:

- **[Superpowers](https://github.com/obra/superpowers)** by Jesse Vincent. The skill triggering architecture, two-stage code review, anti-sycophancy protocol, verification intensity patterns, no-placeholders planning rule, and defense-in-depth debugging methodology draw from superpowers' battle-tested skill designs.

- **[gstack](https://github.com/garrytan/gstack)** by Garry Tan. The enhanced security review (attack surface census, secrets archaeology, dependency supply chain audit, CI/CD pipeline security, STRIDE threat modeling, confidence gating) was inspired by gstack's `/cso` Chief Security Officer skill.

---

## License

This work is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/). You are free to share and adapt for any purpose, including commercially, with appropriate credit. See [LICENSE](LICENSE).
