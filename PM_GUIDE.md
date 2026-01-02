# Product Manager's Guide to AI-Powered Development

## TL;DR (Executive Summary)

This guide teaches you to use AI coding agents with a structured workflow. You write product requirements; AI writes code with built-in quality gates (testing, security review, documentation). Best for: internal tools, MVPs, standard web apps. Not a replacement for engineering teams on complex/critical systems—but a powerful force multiplier for appropriate projects.

**Time to first feature**: 2-4 hours following the workflow
**Prerequisites**: Claude Code installed with PM workflow plugin (install from marketplace), Linear account, a codebase

---

## Welcome, Product Manager

This guide will walk you through using AI coding agents to build production-ready applications, even if you've never written code professionally. You'll learn how to leverage this workflow to move from product requirements to working software while maintaining quality and scalability.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Your Role in the Workflow](#your-role-in-the-workflow)
3. [Quick Start](#quick-start)
4. [Writing AI-Friendly PRDs](#writing-ai-friendly-prds)
5. [The Complete Workflow](#the-complete-workflow)
6. [Quality Control for PMs](#quality-control-for-pms)
7. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
8. [Measuring Success](#measuring-success)

---

## Core Concepts

### Best Practice: One Command Per Session

**Important:** Run each workflow command in a separate, fresh session. Don't chain commands together in the same session—this ensures optimal performance and prevents context pollution.

Think of it like this: each workflow phase is a focused task. Just as you wouldn't write a PRD, conduct a security review, and implement code all in one uninterrupted work session, the AI works best when each phase gets its own clean context.

**In practice:**
- Finish one command → Review the results → Close Claude Code
- Start a new Claude Code session for the next command
- This takes only seconds but dramatically improves quality

### What is "Vibe Coding"?

Traditional coding requires you to know syntax, patterns, frameworks, and best practices. **Vibe coding** means you describe *what* you want in natural language, and AI agents handle the *how*—but with structure and quality gates to ensure production readiness.

This workflow provides the **structure** that makes vibe coding reliable:
- Clear phases (discovery → planning → implementation → testing → review → documentation)
- Quality gates at each phase
- Automatic reuse detection to prevent duplication
- Built-in security and testing standards
- Complete workflow when documentation is committed

### The Three-Layer Architecture

```
┌─────────────────────────────────────┐
│  YOUR LAYER: Product Requirements   │  ← What to build, why, for whom
├─────────────────────────────────────┤
│  AI LAYER: Technical Execution      │  ← How to build it, code generation
├─────────────────────────────────────┤
│  QUALITY LAYER: Automated Checks    │  ← Testing, security, code review
└─────────────────────────────────────┘
```

**Your job**: Focus on the top layer (product requirements and business value)
**AI's job**: Handle the middle layer (writing production-quality code)
**Built-in**: Bottom layer ensures quality without you becoming a technical expert

### Auto-Enforced Quality (Skills)

The workflow includes **skills**—quality standards that AI enforces automatically as it works. You don't invoke these; they activate contextually:

- **Production Standards**: AI refuses to write temporary code, workarounds, or TODO comments
- **Service Reuse**: AI checks existing services before creating new ones
- **Security Patterns**: AI applies OWASP security best practices while writing code
- **Testing Philosophy**: AI fixes broken tests before writing new ones

**Why this matters for PMs**: Issues are prevented during development, not just caught at review. Fewer problems make it to code review and security review phases.

**Learn more**: [SKILLS.md](SKILLS.md) | [Official Skills Documentation](https://code.claude.com/docs/en/skills)

### Key Terminology (PM Translation)

| Technical Term | PM Translation | Why You Care |
|----------------|----------------|--------------|
| **Epic** | A major user capability | Your PRD gets broken into epics (big features) |
| **Service Inventory** | List of existing functionality | Prevents rebuilding what already exists |
| **Discovery** | Codebase analysis | AI learns your app's patterns before coding |
| **Technical Decomposition** | Breaking epics into tasks | Epics become 2-8 hour engineering tasks |
| **Service Reuse** | Using existing code | Keeps codebase maintainable, speeds development |
| **Quality Gates** | Automated checks | Code review, security, testing happen automatically |

---

## Your Role in the Workflow

### What You Do

✅ **Strategic Input** (You're the expert here):
- Write product requirements (PRDs)
- Define success criteria and KPIs
- Clarify user problems and business context
- Prioritize features and capabilities
- Approve AI-generated technical plans
- Review final implementations

✅ **Quality Oversight** (You stay in control):
- Review AI-generated epics match your vision
- Verify technical plans align with business goals
- Approve PR merges to production
- Monitor metrics and user feedback

### What You Don't Do

❌ **Technical Implementation** (AI handles this):
- Write code syntax
- Debug technical errors
- Configure build pipelines
- Set up testing frameworks
- Implement security patterns

❌ **Micromanagement** (Trust the process):
- Specify which database to use
- Dictate code structure
- Choose specific libraries
- Design API endpoints

### The Golden Rule

**You own the "what" and "why"—AI owns the "how."**

When you're tempted to specify *how* something should be built, ask yourself:
- "Is this a business requirement or a technical preference?"
- "Am I solving a user problem or making a technical decision?"

Let AI handle technical decisions. Focus on user value.

---

## Quick Start

This section walks you through your first feature. Setup time is approximately 45-60 minutes for first-time users; your first feature will take 2-4 hours following this workflow.

### What You'll Need

- [ ] Claude Code installed and configured
- [ ] PM workflow plugin installed (see [Installation Guide](docs/INSTALLATION.md))
- [ ] A Product Requirements Document (PRD)
- [ ] Access to a ticketing system with MCP integration (Linear or Jira recommended)
- [ ] A codebase (or start with a new project)

**First time using a terminal?** See our [Complete Setup Guide](docs/SETUP_GUIDE.md) for step-by-step installation instructions.

### Step-by-Step First Feature

**Scenario**: You want to add a user profile feature to your SaaS application.

#### Step 1: Inventory Existing Services (5 minutes)

```bash
/generate_service_inventory ./src inventory.md
```

**What this does**: AI scans your codebase and creates a list of all existing functionality.

**Why it matters**: Prevents building features that already exist. You'll see if user management, authentication, or data storage already exists.

**PM Action**: Review the inventory file. Note which services might be relevant to your new feature.

#### Step 2: Discovery - Understand the Codebase (10 minutes)

```bash
/discovery user-profile-prd.md MyProject ./src "user management, data storage"
```

**What this does**: AI analyzes your codebase patterns, tech stack, and existing similar features.

**Why it matters**: Ensures new code follows existing patterns. The AI learns your app's "style."

**PM Action**: Review the ticket created with discovery findings. Verify it understands your app's architecture.

#### Step 3: Epic Planning - Business Requirements (10 minutes)

```bash
/epic-planning user-profile-prd.md discovery-ticket-id "market leader" "user engagement"
```

**What this does**: AI transforms your PRD into business-focused epics (major capabilities).

**Why it matters**: This is where your PRD becomes actionable work items.

**PM Action**:
- Review generated epics in your ticketing system
- Verify they match your product vision
- Check that business value is clearly stated
- Approve or request modifications

**Example Epic Generated**:
```
Title: User Profile Customization
Description: Enable users to personalize their profile with photo, bio, and preferences
Business Value: Increases user engagement by 25% (benchmark: LinkedIn, Slack)
Success Metric: 70% of active users complete profile within 7 days
```

#### Step 4: Technical Planning - Engineering Tasks (5 minutes)

```bash
/planning EPIC-123 --discovery discovery-report.md
```

**What this does**: AI breaks epics into specific engineering tasks (2-8 hours each).

**Why it matters**: Your high-level requirements become concrete, sequenced work.

**PM Action**:
- Review task breakdown for completeness
- Verify dependencies make sense
- Check estimated effort seems reasonable
- Don't worry about technical specifics—focus on whether all user-facing functionality is covered

**Example Sub-tickets Generated**:
```
- Extend UserService with profile update methods
- Create profile upload UI component
- Add profile image storage integration
- Implement profile validation logic
- Create profile settings page
```

---

## Writing AI-Friendly PRDs

Your PRD is the foundation. AI coding works best with clear, structured requirements.

### The Essential Structure

```markdown
# [Feature Name] PRD

## Problem Statement
Who has this problem? What pain does it cause? Why now?

## User Personas
Who will use this feature? What are their goals?

## Success Criteria
How will we measure success? What are the target metrics?

## User Stories
As a [user type], I want [capability] so that [benefit]

## Business Context
Why does this matter to the business? Revenue impact? Competitive pressure?

## Scope
What's included in v1? What's explicitly out of scope?

## Non-Functional Requirements
Performance targets, security needs, compliance requirements
```

### ✅ Good PRD Examples

**Good - Clear and Specific**:
```markdown
## User Story: Export Report to CSV

As a data analyst, I want to export dashboard data to CSV format
so that I can perform custom analysis in Excel.

**Acceptance Criteria**:
- Export button visible on all dashboard views
- CSV includes all visible columns with proper headers
- File downloads with descriptive name: "dashboard-{name}-{date}.csv"
- Exports up to 10,000 rows (pagination for larger datasets)
- Loading indicator shows progress for exports >1000 rows

**Success Metric**: 30% of power users export data weekly
```

**Good - Business Context Included**:
```markdown
## Business Context

**Market Problem**: Competitors (Tableau, Looker) all offer CSV export.
We're losing deals to companies requiring this capability.

**Revenue Impact**: 5 lost deals in Q4 worth $120K ARR. Sales team
ranks this #2 feature request.

**User Research**: 87% of surveyed users said they'd use CSV export weekly.
```

### ❌ Bad PRD Examples

**Too Vague**:
```markdown
Add reporting features
```
*Problem*: What reports? For whom? What format? What data?

**Too Technical**:
```markdown
Create a PostgreSQL query that joins the reports table with users table,
formats the data as CSV using the csv-writer npm package, and serves it
via a new GET /api/reports/export endpoint.
```
*Problem*: You're doing the AI's job. Just say *what* you want, not *how* to build it.

**Missing Business Context**:
```markdown
Users should be able to export data to CSV format.
```
*Problem*: Why? Who cares? How do we measure success? AI has no context for prioritization.

### PRD Checklist

Before running epic-planning, ensure your PRD has:

- [ ] Clear problem statement (why this matters)
- [ ] Defined user personas (who benefits)
- [ ] Measurable success criteria (how we know it works)
- [ ] User stories with acceptance criteria
- [ ] Business context (revenue, competitive, strategic)
- [ ] Explicit scope boundaries (v1 vs future)
- [ ] Non-functional requirements (performance, security)

---

## The Complete Workflow

### Phase-by-Phase Guide

#### 1️⃣ **Service Inventory** (Before every new feature)
```bash
/generate_service_inventory [codebase-path] [output-file]
```

**Your Job**: Review the inventory to understand what already exists.

**Red Flags to Watch For**:
- Functionality that overlaps with your planned feature
- Services that should be extended vs. recreated
- Gaps in existing infrastructure

**Time Investment**: 5 minutes to run, 10 minutes to review

---

#### 2️⃣ **Discovery** (For new features or major changes)
```bash
/discovery [prd-file] [linear-project] [codebase-path] [focus-areas]
```

**Your Job**:
- Provide the PRD
- Review the discovery findings in your ticketing system
- Verify AI understands your tech stack correctly

**What to Look For**:
- Does AI identify relevant existing services?
- Are the discovered patterns appropriate?
- Any technical debt flagged that might block your feature?

**Time Investment**: 10 minutes to run, 15 minutes to review

---

#### 3️⃣ **Epic Planning** (Transform PRD → Business Capabilities)
```bash
/epic-planning [prd-file] [discovery-report] [business-context] [focus]
```

**Your Job**:
- Review proposed epics
- Verify business value statements are accurate
- Check success metrics align with your goals
- **Approve the epic creation plan** before AI proceeds

**Critical Review Questions**:
1. Does each epic represent a complete user capability?
2. Are business value statements compelling?
3. Do success metrics align with company OKRs?
4. Are epics appropriately sized (completable in 1-3 sprints)?
5. Is there clear ownership/assignment?

**Time Investment**: 20-30 minutes for review and approval

**Example Approval Decision**:
```
AI Proposed:
- Epic 1: User Profile Customization
- Epic 2: Profile Privacy Controls
- Epic 3: Profile Sharing Features

Your Decision:
✅ Approve Epic 1 (core value, quick win)
✅ Approve Epic 2 (regulatory requirement)
⏸️  Defer Epic 3 (nice-to-have, can wait)
```

---

#### 4️⃣ **Technical Planning** (Epic → Engineering Tasks)
```bash
/planning EPIC-123,EPIC-124 --discovery [discovery-report]
```

**Your Job**:
- Review task breakdown for completeness
- Verify dependencies make sense
- Spot any missing user-facing functionality

**What NOT to worry about**:
- Specific technologies chosen
- Code structure decisions
- Database schema details

**What TO verify**:
- All acceptance criteria from PRD are covered
- UI/UX tasks are included
- Testing is planned
- Documentation is planned

**Time Investment**: 15 minutes per epic

---

#### 5️⃣ **Adaptation** (Create Implementation Guide for Ticket)
```bash
/adaptation [ticket-id]
```

**Your Job**: Verify the adaptation guide makes sense.

**What's Happening Behind the Scenes**:
- AI analyzes service inventory for reuse opportunities
- Identifies existing patterns to follow
- Creates implementation guide specifying which services to use
- Maps event-driven patterns where applicable
- Documents anti-duplication requirements

**What to Look For**:
- Are existing services being reused appropriately?
- Does the approach follow discovered patterns?
- Are there good reasons if new code is needed?

**Time Investment**: 5 minutes to review

---

#### 6️⃣ **Implementation** (AI Writes the Code)
```bash
/implementation [ticket-id]
```

**Your Job**: Let it run. Seriously, don't interrupt.

**What's Happening Behind the Scenes**:
- AI reads ticket requirements
- Scans service inventory for reuse
- Follows codebase patterns from discovery
- Writes production-quality code
- Creates git branch and draft PR
- Updates ticket status automatically

**When to Intervene**:
- Never during implementation
- Only after implementation if PR review reveals issues

**Time Investment**: 0 minutes (AI is working)

---

#### 7️⃣ **Testing** (Build Test Suite)
```bash
/testing [ticket-id] unit,integration,e2e 90
```

**Your Job**: Review final test coverage report

**What's Happening Behind the Scenes**:
- QA engineer agent builds comprehensive test suite
- Tests run automatically
- Failed tests are fixed automatically in a loop
- Process repeats until all tests pass
- Passing test suite is committed with the feature code

**What to Look For**:
- Are happy paths tested?
- Are edge cases covered?
- Are error conditions tested?
- Does coverage meet target (default 90%)?

**Non-Technical Review**:
Look at test names—they should read like user scenarios:
```
✅ "should allow user to upload profile photo under 5MB"
✅ "should reject profile photos larger than 5MB"
✅ "should display error message when upload fails"
```

**Time Investment**: 10 minutes to review final report (AI handles the build-run-fix loop)

---

#### 8️⃣ **Documentation** (Generate Comprehensive Docs)
```bash
/documentation [ticket-id]
```

**Your Job**: Review documentation for completeness

**What's Happening Behind the Scenes**:
- Technical writer agent generates API documentation
- Creates inline JSDoc comments for all public APIs
- Generates user guides and examples
- Updates README if needed
- Commits documentation with the feature
- **Note**: Ticket remains "In Progress"—code review and security review still follow

**What to Look For**:
- Is all public functionality documented?
- Are code examples clear and tested?
- Do user guides explain the feature well?
- Is API documentation complete?

**Time Investment**: 10 minutes to review documentation quality

**Important**: Documentation does NOT end the workflow. Code review and security review phases still follow.

---

#### 9️⃣ **Code Review** (Quality Assurance)
```bash
/codereview [ticket-id]
```

**Your Job**: Review the summary, not the code

**What to Look For in Summary**:
- "✅ Code follows existing patterns"
- "✅ No anti-patterns detected"
- "✅ Performance concerns addressed"
- "✅ Documentation is complete"
- "⚠️ [Any warnings]"

**Red Flags**:
- Multiple anti-patterns detected
- Performance issues flagged
- Pattern violations noted
- Missing documentation

**Action**: If red flags appear, ask AI to fix them before proceeding.

**Time Investment**: 5 minutes

---

#### 🔟 **Security Review** (OWASP Compliance - Final Gate)
```bash
/security_review [ticket-id]
```

**Your Job**: Ensure critical issues are addressed

**What's Happening Behind the Scenes**:
- Security engineer agent performs OWASP Top 10 assessment
- Checks for latest CVEs in frameworks
- Reviews authentication and authorization
- Implements security fixes when issues found
- **This is the FINAL GATE**: Closes Linear ticket as "Done" when no critical/high issues
- **Keeps ticket open** if critical/high issues need fixing

**What to Look For**:
- CRITICAL severity issues: **Must be fixed before merge**
- HIGH severity issues: **Should be fixed before merge**
- MEDIUM/LOW: Note for future improvement

**Non-Technical Understanding**:
Security report will have plain-language descriptions:
```
🚨 CRITICAL: User passwords stored in plain text
   Risk: Database breach exposes all user passwords
   Fix: Use bcrypt hashing with salt
```

**Time Investment**: 10 minutes to review, ensure criticals are fixed

**Important**: This is the final workflow phase that closes the ticket. Only when security review passes with no critical/high issues is the ticket marked as "Done".

---

#### 1️⃣1️⃣ **Approval & Merge** (Ship It)

**Your Final Checklist**:
- [ ] All acceptance criteria from PRD are met
- [ ] Tests pass and coverage meets target
- [ ] No critical security issues (security review passed)
- [ ] Code review passed
- [ ] Documentation is complete
- [ ] PR description clearly explains changes
- [ ] **Ticket marked as "Done"** (automatically by security review)

**Action**: Merge the PR and deploy!

**Note**: If the ticket is still open, security review found critical/high issues that need fixing before the ticket can be closed.

---

## Quality Control for PMs

### How to Verify AI Output (Without Reading Code)

#### Epic Quality Checklist

When reviewing AI-generated epics:

✅ **Business Value is Clear**
- Each epic has a "why" that makes sense
- Success metrics are measurable
- Business impact is quantified

✅ **User Focus is Maintained**
- Epic describes user capabilities, not technical tasks
- Acceptance criteria are user-facing
- Stories follow "As a [user], I want [capability]..." format

✅ **Scope is Appropriate**
- Epic is completable in 1-3 sprints
- Not too granular (that's for sub-tickets)
- Not too broad (can be decomposed)

#### PR Quality Checklist

When reviewing pull requests (the code):

✅ **PR Description Quality**
- Clear title describing the change
- Lists what was implemented
- References original ticket/epic
- Notes any decisions made

✅ **Test Coverage Report**
- Coverage meets or exceeds target (90%+)
- Test names describe user scenarios
- Edge cases are covered

✅ **Review Bot Feedback**
- Code review agent approved
- Security review passed (no critical issues)
- No failing checks in CI/CD

### Metrics That Matter

Track these to measure workflow effectiveness:

**Velocity Metrics**:
- Time from PRD to production
- Story points completed per sprint
- Cycle time per ticket type

**Quality Metrics**:
- Production bugs per release
- Test coverage percentage
- Code review rejection rate
- Security issues found pre-production

**Reuse Metrics**:
- Percentage of new code vs. reused services
- Duplicate functionality detected and prevented
- Lines of code added vs. features delivered

**Team Health**:
- PM time spent on technical issues (should decrease)
- Developer satisfaction with requirements
- Stakeholder confidence in delivery

---

## Common Mistakes to Avoid

### ❌ Mistake #1: Writing Technical Specifications

**Don't do this**:
```markdown
Create a React component called ProfileEditor that uses useState
hooks for form management and connects to the /api/profile endpoint
using axios. Store data in PostgreSQL users table.
```

**Do this instead**:
```markdown
Users should be able to edit their profile information (name, bio, photo)
and see changes immediately reflected throughout the app. Changes should
be saved automatically as they type.
```

**Why**: AI knows React, databases, and APIs better than you. Describe the user experience, not the implementation.

---

### ❌ Mistake #2: Skipping Discovery

**Don't do this**:
Jump straight from PRD to epic planning without running discovery.

**Why it fails**:
- AI doesn't know your codebase patterns
- New code won't match existing style
- Existing services won't be reused
- Technical debt compounds quickly

**Do this instead**:
Run discovery for any new feature area, even if you've done it before. Codebases evolve.

---

### ❌ Mistake #3: Approving Epics Without Review

**Don't do this**:
Let AI create all epics automatically without reviewing the plan.

**Why it fails**:
- Epics might not align with current priorities
- Business value might be misunderstood
- Scope might be wrong
- Duplicate work might slip through

**Do this instead**:
Review the execution plan before AI creates anything. This is your quality gate.

---

### ❌ Mistake #4: Ignoring Service Inventory

**Don't do this**:
Skip the service inventory step because it seems like extra work.

**Why it fails**:
- AI rebuilds functionality that already exists
- Codebase becomes duplicative and unmaintainable
- Tech debt grows exponentially
- Future changes require updates in multiple places

**Do this instead**:
Run service inventory before every new feature. It takes 5 minutes and saves hours.

---

### ❌ Mistake #5: Merging Without Security Review

**Don't do this**:
Merge PRs before security review completes because you're in a hurry.

**Why it fails**:
- Security vulnerabilities make it to production
- Compliance issues arise
- User data could be exposed
- Fixing issues post-production is 10x harder

**Do this instead**:
Wait for security review. If there are critical issues, they MUST be fixed first.

---

### ❌ Mistake #6: Vague Success Criteria

**Don't do this**:
```markdown
Success Criteria: Users like the new profile feature
```

**Why it fails**:
- Can't measure success objectively
- No clear "done" definition
- Can't validate AI implementation meets goals
- Impossible to A/B test or iterate

**Do this instead**:
```markdown
Success Criteria:
- 70% of users complete profile within 7 days of signup
- Average profile completeness score >85%
- Profile edit completion rate >95%
- Profile page load time <800ms (p95)
```

---

### ❌ Mistake #7: Micromanaging Technical Decisions

**Don't do this**:
Specify database schemas, API endpoint names, component structures, or library choices.

**Why it fails**:
- You become the bottleneck
- AI can't leverage its knowledge
- You make suboptimal technical decisions
- Engineers resent being told "how" to code

**Do this instead**:
Focus on user outcomes and business requirements. Trust AI for technical decisions. Review the results, not the approach.

---

## Measuring Success

### For Individual Features

**Before Launch**:
- ✅ All acceptance criteria met
- ✅ 90%+ test coverage achieved
- ✅ No critical security issues
- ✅ Code review passed
- ✅ Performance targets met

**After Launch**:
- 📊 Success metrics from PRD achieved within target timeframe
- 👥 User adoption meets or exceeds projections
- 🐛 Production bugs below threshold (e.g., <5 per release)
- ⚡ Performance in production meets targets

### For the Workflow

**Speed**:
- ⏱️ Time from PRD to production (target: 50% reduction)
- 🔄 Cycle time per ticket (target: days, not weeks)
- 📈 Story points per sprint (target: 20% increase)

**Quality**:
- 🎯 Test coverage across codebase (target: 90%+)
- 🐛 Production bugs per 1000 lines of code (target: <1)
- 🔒 Security issues found pre-production (target: 100% critical issues caught)
- ♻️ Service reuse rate (target: 70%+ reuse of existing code)

**Team Effectiveness**:
- ⏰ PM time spent on technical issues (target: <10%)
- 😊 Developer satisfaction with requirements clarity (target: 8/10)
- 🎯 Stakeholder confidence in delivery (target: 9/10)
- 📚 Documentation completeness (target: 100% of public APIs)

### Red Flags to Watch

🚩 **Process Issues**:
- Discovery findings ignored in implementation
- Service inventory showing high duplication rate
- Consistent security issues slipping through
- Test coverage declining over time

🚩 **Quality Issues**:
- Production bugs increasing
- User complaints about performance
- Technical debt tickets piling up
- Security review finding critical issues regularly

🚩 **Workflow Issues**:
- PMs writing technical specifications
- Discovery skipped for "small" features
- Epics approved without review
- Security review bypassed for speed

**Action**: If you see these red flags, slow down and fix the process before continuing.

---

## Next Steps

### Recommended Learning Path

**Week 1: Foundations**
1. Read this guide completely
2. Review the [GLOSSARY.md](GLOSSARY.md) for technical terms
3. Study the [EXAMPLES.md](EXAMPLES.md) case studies
4. Set up your environment (Claude Code, ticketing system MCP)
5. Complete setup: [Setup Guide](docs/SETUP_GUIDE.md) and [MCP Setup](docs/MCP_SETUP.md)

**Week 2: First Feature**
1. Choose a small feature to implement
2. Write a comprehensive PRD
3. Run through the complete workflow
4. Review and refine based on results

**Week 3: Optimization**
1. Review metrics from your first feature
2. Identify process improvements
3. Train team members on workflow
4. Establish review cadences

**Month 2+: Scale**
1. Apply workflow to larger features
2. Build service inventory for entire codebase
3. Create reusable PRD templates
4. Measure velocity and quality improvements

### Resources

- **Technical Reference**: See main [README.md](README.md) for detailed command documentation
- **Examples**: Check [EXAMPLES.md](EXAMPLES.md) for real-world case studies
- **FAQ**: Review [FAQ.md](FAQ.md) for common questions
- **Glossary**: Use [GLOSSARY.md](GLOSSARY.md) to understand technical terms

### Getting Help

**Common Issues**:
- Epic planning creating duplicates → Review service inventory first
- Implementation not following patterns → Run discovery before planning
- Tests failing → Review acceptance criteria for clarity
- Security issues → Check PRD for security requirements

**Community**:
- Open an issue on GitHub for bugs or feature requests
- Share your success stories and metrics
- Contribute examples and improvements

---

## Final Thoughts

This workflow provides structure for AI-assisted development, helping you move from requirements to working software while maintaining quality standards.

**Key principles to remember:**
- **Trust but verify**: Quality gates exist for a reason—use them
- **Stay in your lane**: You own strategy and requirements; AI handles implementation
- **Start small**: Begin with simple features before tackling complex ones
- **Know when to escalate**: Some problems need engineering expertise

This isn't magic—it's a structured process that works well for appropriate projects. Start with something small, learn the workflow, and expand from there.

**Ready to begin?** Head to the [Quick Start](#quick-start) section.
