# Get Started with PM Vibe Code Operations

Welcome! This guide will help you navigate the documentation and get up and running quickly.

## Documentation Map

### For First-Time Users

**Start here** → [PM_GUIDE.md](PM_GUIDE.md)
- Complete walkthrough of the workflow
- Quick start tutorial
- Non-technical explanations
- Step-by-step instructions

**New to command line?** → [Setup Guide](docs/SETUP_GUIDE.md)
- Complete beginner installation
- Terminal basics
- Step-by-step instructions

**Need to configure integrations?** → [MCP Setup](docs/MCP_SETUP.md)
- Linear, Perplexity, Sequential Thinking setup
- API key configuration

**Then review** → [EXAMPLES.md](EXAMPLES.md)
- Real-world case studies
- See the workflow in action
- Understand what results to expect
- Learn from others' successes

**Keep handy** → [FAQ.md](FAQ.md)
- Common questions answered
- Troubleshooting guide
- Quick solutions to blockers

**Reference as needed** → [GLOSSARY.md](GLOSSARY.md)
- Technical terms explained
- PM-friendly definitions
- Real-world analogies

### For Technical Reference

**Detailed commands** → [TECHNICAL_REFERENCE.md](TECHNICAL_REFERENCE.md)
- Complete command documentation
- Agent specifications
- Git worktree architecture
- Integration details

**For AI agents** → `/claude/agents/` directory
- Specialized agent configurations
- Technical implementation details

**For commands** → `/claude/commands/` directory
- Detailed command workflows
- Implementation guidelines

### Setup & Configuration

**Installation** → [docs/INSTALLATION.md](docs/INSTALLATION.md)
- Complete installation guide
- All platforms and modes
- Verification and troubleshooting

**Terminal Basics** → [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
- For first-time terminal users
- Step-by-step from scratch

**Integrations** → [docs/MCP_SETUP.md](docs/MCP_SETUP.md)
- MCP server configuration
- Linear, Perplexity, Sequential Thinking

**Troubleshooting** → [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- Common issues and solutions
- Debug techniques

**Contributing** → [CONTRIBUTING.md](CONTRIBUTING.md)
- How to contribute to this project
- Code of conduct

---

## Choose Your Platform and Mode

Before starting, choose your AI platform and workflow mode:

### For Claude Code Users

| Mode | Best For | Commands Location |
|------|----------|-------------------|
| **Simple Mode** | Most users, beginners, one ticket at a time | `claude/commands/` |
| **Worktree Mode** | Advanced users, concurrent development | `claude/commands-worktrees/` |

#### Simple Mode (Recommended)
Use standard git branches. Work on one ticket at a time. This is the recommended starting point.

#### Worktree Mode
Use git worktrees for complete isolation. Work on multiple tickets simultaneously. Choose this if:
- You need multiple AI agents working in parallel
- You're comfortable with git worktrees
- See [Worktree Guide](docs/WORKTREE_GUIDE.md) for details

### For OpenAI Codex Users

| Type | Location | Notes |
|------|----------|-------|
| **Platform-Agnostic Prompts** | `codex/prompts/` | Compatible with Codex and other AI platforms |

Use the prompts from `codex/prompts/` which are platform-agnostic versions without Claude-specific agent references.

**Our recommendation**:
- New users should start with Claude Code Simple Mode for the best experience
- Codex users can adapt the prompts from `codex/prompts/` to their workflow

---

## Getting Started Checklist

### 1. Understand the Value

This workflow enables you to:
- ✅ Transform PRDs into production code in days (not weeks)
- ✅ Maintain high quality with automated testing and security
- ✅ Scale your product org without scaling engineering proportionally
- ✅ Focus on strategy while AI handles implementation

### 2. Check Prerequisites

You need:
- [ ] Claude Code installed ([get it here](https://claude.ai/code))
- [ ] Ticketing system with MCP integration ([Linear](https://linear.app) or [Jira](https://www.atlassian.com/software/jira))
- [ ] Access to a codebase (or start a new project)
- [ ] A feature idea to implement

### 3. Read the Right Docs

**If you're non-technical**: Start with [PM_GUIDE.md](PM_GUIDE.md) sections:
- Core Concepts
- Your Role in the Workflow
- Quick Start

**If you're technical**: Skim [PM_GUIDE.md](PM_GUIDE.md), then dive into [README.md](README.md)

**If you learn by example**: Go straight to [EXAMPLES.md](EXAMPLES.md)

---

## Your First Feature (2-4 Hours)

### Context Window Best Practice

**Important:** Run each command in a fresh Claude Code session. Close the session after each command completes and reviewing the output. This prevents context overflow and ensures each phase works with clean, focused context.

**Why:** Each workflow phase generates substantial context. Running multiple commands in one session can:
- Overflow your available context window
- Pollute context across phases (e.g., security review seeing implementation details)
- Reduce the effectiveness of each phase

**How:** After completing each command below, close Claude Code and start a new session before running the next command.

### Phase 1: Preparation (10 minutes)
1. Write a simple PRD (see [PM_GUIDE.md - Writing AI-Friendly PRDs](PM_GUIDE.md#writing-ai-friendly-prds))
2. Choose a small feature (CRUD operation ideal for first time)
3. Review [EXAMPLES.md](EXAMPLES.md) for similar features

### Phase 2: Discovery (10 minutes)
1. Run `/generate_service_inventory` to catalog existing code
2. Run `/discovery` to analyze patterns
3. Review findings in your ticketing system

### Phase 3: Planning (15 minutes)
1. Run `/epic-planning` with your PRD
2. Review proposed epics
3. Approve or provide feedback
4. Run `/planning` to create sub-tickets

### Phase 4: Execution (25-30 minutes)

**Remember:** Start a fresh Claude Code session for each command below.

1. **New session** → Run `/adaptation` → Review output → Close session
2. **New session** → Run `/implementation` → Review output → Close session
3. **New session** → Run `/testing` → Review output → Close session
4. **New session** → Run `/documentation` → Review output → Close session
5. **New session** → Run `/codereview` → Review output → Close session
6. **New session** → Run `/security_review` → Review output → Close session

Each command builds on artifacts created by previous commands (tickets, PRs, code), so starting fresh doesn't lose progress—it just gives each phase clean context to work with.

### Phase 5: Ship It! (5 minutes)
1. Verify security review passed (ticket marked as "Done")
2. Verify all quality gates passed
3. Verify documentation is complete
4. Merge PR to production
5. Monitor deployment
6. Celebrate!

**Note**: If ticket is still open after security review, critical/high security issues need fixing first.

---

## Success Criteria

You'll know you're successful when:

**After First Feature**:
- ✅ Feature shipped to production
- ✅ Tests passing (90%+ coverage)
- ✅ No critical security issues
- ✅ Acceptance criteria met

**After First Month**:
- ✅ 3-5 features shipped
- ✅ 50%+ faster than traditional development
- ✅ Quality metrics maintained or improved
- ✅ Team confident in the process

**After First Quarter**:
- ✅ 10+ features shipped
- ✅ 70%+ code reuse rate
- ✅ PM can ship features independently
- ✅ Engineering focused on complex work

---

## When You Get Stuck

### Common Issues

**"I don't understand the technical terms"**
→ See [GLOSSARY.md](GLOSSARY.md)

**"My PRD isn't working well with AI"**
→ See [PM_GUIDE.md - Writing AI-Friendly PRDs](PM_GUIDE.md#writing-ai-friendly-prds)

**"Tests are failing"**
→ See [FAQ.md - Tests are failing](FAQ.md#tests-are-failing-what-do-i-do)

**"Security review found issues"**
→ See [FAQ.md - Security review found critical issues](FAQ.md#security-review-found-critical-issues-now-what)

**"Implementation doesn't match my PRD"**
→ See [FAQ.md - Implementation doesn't match](FAQ.md#the-implementation-doesnt-match-my-prd-help)

**"I need inspiration"**
→ See [EXAMPLES.md](EXAMPLES.md) for real-world case studies

**Quick troubleshooting** → [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

### Still Stuck?

1. Check [FAQ.md](FAQ.md) - 50+ questions answered
2. Review similar scenario in [EXAMPLES.md](EXAMPLES.md)
3. Open an issue on GitHub

---

## Recommended Reading Order

### Week 1: Foundations
**Day 1-2**: Read [PM_GUIDE.md](PM_GUIDE.md) completely (2-3 hours)
**Day 3-4**: Study [EXAMPLES.md](EXAMPLES.md) case studies (1-2 hours)
**Day 5**: Review [FAQ.md](FAQ.md) for common issues (1 hour)

### Week 2: Hands-On
**Day 1**: Set up tools and environment
**Day 2-3**: Implement first feature following [PM_GUIDE.md - Quick Start](PM_GUIDE.md#quick-start)
**Day 4**: Review results and refine process
**Day 5**: Document learnings and plan next feature

### Week 3+: Mastery
**Ongoing**: Reference [GLOSSARY.md](GLOSSARY.md) as needed
**Ongoing**: Use [README.md](README.md) for command details
**Ongoing**: Contribute your own examples to [EXAMPLES.md](EXAMPLES.md)

---

## Learning Paths by Background

### Non-Technical PM
**Goal**: Ship your first feature confidently

1. Read [PM_GUIDE.md - Core Concepts](PM_GUIDE.md#core-concepts)
2. Study [EXAMPLES.md - Example 1 (CSV Export)](EXAMPLES.md#example-1-export-to-csv-feature)
3. Follow [PM_GUIDE.md - Quick Start](PM_GUIDE.md#quick-start)
4. Keep [GLOSSARY.md](GLOSSARY.md) open as reference
5. Lean on [FAQ.md](FAQ.md) when stuck

**Learning curve**: Expect 2-3 weeks to become comfortable with the workflow

### Technical PM
**Goal**: Move faster than manual development

1. Skim [PM_GUIDE.md](PM_GUIDE.md) for workflow overview
2. Read [README.md](README.md) for technical details
3. Review [EXAMPLES.md](EXAMPLES.md) for patterns
4. Jump into first feature immediately
5. Reference [FAQ.md](FAQ.md) for edge cases

**Learning curve**: Expect 1-2 weeks to become proficient

### Former Developer
**Goal**: Transition from coding to orchestrating

1. Read [PM_GUIDE.md - The Golden Rule](PM_GUIDE.md#the-golden-rule)
2. Study [EXAMPLES.md - Example 2](EXAMPLES.md#example-2-user-profile-customization) (technical PM)
3. Practice letting go of implementation details
4. Focus on [PM_GUIDE.md - Common Mistakes](PM_GUIDE.md#common-mistakes-to-avoid)
5. Use [README.md](README.md) only when absolutely necessary

**Learning curve**: Expect 1-2 weeks (unlearning implementation details takes time!)

---

## Goals by Timeline

### Week 1
- [ ] Read [PM_GUIDE.md](PM_GUIDE.md) completely
- [ ] Review at least 2 case studies in [EXAMPLES.md](EXAMPLES.md)
- [ ] Set up Claude Code and ticketing system MCP
- [ ] Write first PRD using templates

### Month 1
- [ ] Ship 2-3 features to production
- [ ] Achieve 90%+ test coverage on shipped features
- [ ] Zero critical security issues
- [ ] Build confidence in the process

### Quarter 1
- [ ] Ship 10+ features
- [ ] Reduce time-to-production by 50%+
- [ ] Achieve 70%+ code reuse rate
- [ ] Train team members on workflow

### Quarter 2+
- [ ] Full team adoption
- [ ] Process optimizations documented
- [ ] Contributing examples back to community
- [ ] Mentoring other PMs

---

## Pro Tips

### From Successful PMs

**Tip 1**: "Don't skip service inventory. That 5 minutes saves hours." - PM, Example 1

**Tip 2**: "Write PRDs for the user, not the AI. Good user requirements = good AI implementation." - PM, Example 2

**Tip 3**: "Trust the quality gates. They catch things I never would have." - PM, Example 3

**Tip 4**: "Start small. My first feature was CSV export (4 days). My 10th feature was a complete notification system (10 days)." - PM, Example 3

**Tip 5**: "Review the reports, not the code. You don't need to be technical to ensure quality." - PM, Example 4

### Common Pitfalls

❌ **Don't**: Skip discovery to "save time"
✅ **Do**: Run discovery—it ensures AI learns your patterns

❌ **Don't**: Write technical specifications in PRD
✅ **Do**: Focus on user outcomes and business value

❌ **Don't**: Approve epics without reviewing
✅ **Do**: Carefully review epic execution plan before AI creates them

❌ **Don't**: Merge without security review
✅ **Do**: Always run security review, fix CRITICAL issues

❌ **Don't**: Try to micromanage AI implementation
✅ **Do**: Trust the process, review outputs

---

## Community & Support

### Getting Help

**Documentation**: Start with [FAQ.md](FAQ.md) for common questions

**Examples**: Check [EXAMPLES.md](EXAMPLES.md) for similar scenarios

**Technical Terms**: Reference [GLOSSARY.md](GLOSSARY.md)

**GitHub Issues**: Report bugs or unclear documentation

**Discussions**: Share experiences and ask questions (when available)

### Contributing

**Share Your Success**:
- Add your case study to [EXAMPLES.md](EXAMPLES.md)
- Document lessons learned
- Help other PMs succeed

**Improve Documentation**:
- Fix typos or unclear sections
- Add missing FAQ entries
- Expand glossary terms

**Build Tools**:
- Create PRD templates
- Build quality checklists
- Develop metrics dashboards

---

## Quick Reference

| I want to... | Read this... |
|-------------|-------------|
| **Print a cheat sheet** | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) |
| Understand the workflow | [PM_GUIDE.md](PM_GUIDE.md) |
| See real examples | [EXAMPLES.md](EXAMPLES.md) |
| Find answers to questions | [FAQ.md](FAQ.md) |
| Look up technical terms | [GLOSSARY.md](GLOSSARY.md) |
| Learn command syntax | [TECHNICAL_REFERENCE.md](TECHNICAL_REFERENCE.md) |
| Install the workflow | [docs/INSTALLATION.md](docs/INSTALLATION.md) |
| Ship my first feature | [PM_GUIDE.md - Quick Start](PM_GUIDE.md#quick-start) |
| Write better PRDs | [PM_GUIDE.md - AI-Friendly PRDs](PM_GUIDE.md#writing-ai-friendly-prds) |
| Fix failing tests | [FAQ.md - Tests Failing](FAQ.md#tests-are-failing-what-do-i-do) |
| Understand metrics | [PM_GUIDE.md - Measuring Success](PM_GUIDE.md#measuring-success) |
| Get unstuck | [FAQ.md](FAQ.md) + [EXAMPLES.md](EXAMPLES.md) |

---

## Ready to Start?

**Your next steps**:
1. Open [PM_GUIDE.md](PM_GUIDE.md) and read "Core Concepts"
2. Review [EXAMPLES.md - Example 1](EXAMPLES.md#example-1-export-to-csv-feature)
3. Write a simple PRD for a small feature
4. Follow the [Quick Start](PM_GUIDE.md#quick-start)
5. Ship your first feature!

**Remember**:
- Start small (CRUD feature ideal)
- Follow the process completely (don't skip steps)
- Review outputs (don't read code directly)
- Trust the quality gates

---

**Welcome to the future of product development. Let's build something amazing.**
