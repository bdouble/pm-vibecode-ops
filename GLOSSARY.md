# Glossary: Technical Terms for Product Managers

A PM-friendly guide to technical terminology used in AI-powered development workflows.

## Quick Reference

**Most Important Terms**:
- [Epic](#epic) - A major user capability
- [Service Inventory](#service-inventory) - List of existing functionality
- [Discovery](#discovery) - Codebase analysis phase
- [Acceptance Criteria](#acceptance-criteria) - Specific requirements for completion
- [Technical Decomposition](#technical-decomposition) - Breaking features into tasks
- [PR (Pull Request)](#pr-pull-request) - Code submission for review
- [Quality Gates](#quality-gates) - Automated checks before shipping

---

## A

### Acceptance Criteria
**PM Definition**: Specific, testable conditions that must be true for a feature to be considered complete.

**Example**:
```
Feature: CSV Export
Acceptance Criteria:
- Export button visible on dashboard
- CSV includes all visible columns
- File downloads with descriptive name
```

**Why it matters**: Clear criteria prevent misunderstandings between PMs and developers. AI uses these to validate implementation.

---

### Adaptation Guide
**PM Definition**: Document mapping PRD requirements to existing codebase patterns.

**Think of it as**: Translation guide from "what you want" to "how it fits in the codebase."

**Created by**: Discovery phase
**Used by**: Implementation phase

---

### Agent
**PM Definition**: Specialized AI assistant optimized for specific tasks (e.g., frontend-engineer-agent, security-engineer-agent).

**Analogy**: Like having expert consultants for different areas—one for UI, one for security, one for backend.

**Example**:
- **frontend-engineer-agent**: Builds user interfaces
- **security-engineer-agent**: Reviews for vulnerabilities
- **qa-engineer-agent**: Creates test suites

---

### API (Application Programming Interface)
**PM Definition**: A way for different software systems to communicate with each other.

**Real-world analogy**: Like a restaurant menu—it shows what you can order (available functions) without needing to know how the kitchen works.

**Example**: Your app might use Stripe's API to process payments without building payment processing yourself.

**Why PMs care**: When writing PRDs, you might reference integrating with external APIs (Stripe, Twilio, etc.).

---

### API Key
A secret code that authenticates your access to a service. Think of it like a password for apps to talk to each other. Some MCP servers require API keys (like Perplexity), while others use OAuth authentication (like Linear). Claude Code authentication is handled separately through the CLI.

**Example**: `pplx-abc123...` (Perplexity API key)

**Note**: Linear MCP uses OAuth 2.1, not API keys—authenticate via `/mcp` command or browser prompts.

**See**: [Perplexity MCP Setup](https://docs.perplexity.ai/guides/mcp-server) for official documentation on obtaining and using Perplexity API keys.

---

### Architecture
**PM Definition**: The high-level structure and organization of a software system.

**Analogy**: Like a building's blueprint—shows how major components connect.

**Example architectures**:
- **Monolithic**: Everything in one codebase (like a single building)
- **Microservices**: Separate services for different functions (like a campus)
- **Serverless**: Cloud provider manages infrastructure (like coworking space)

**Why PMs care**: Affects how quickly features can be built and how the system scales.

---

## B

### Backend
**PM Definition**: The server-side part of an application that users don't see directly.

**What it does**:
- Processes data
- Manages database
- Handles business logic
- Provides APIs for frontend

**Example**: When a user clicks "Export to CSV," the backend:
1. Fetches data from database
2. Formats it as CSV
3. Sends file to user's browser

**Opposite of**: [Frontend](#frontend)

---

### Branch (Git)
**PM Definition**: A parallel version of the code where new features are developed without affecting production.

**Analogy**: Like making edits to a Google Doc in "suggesting mode" instead of directly changing it.

**Workflow**:
1. Create branch from main codebase
2. Develop feature on branch
3. Test and review
4. Merge branch back to main when ready

**Why PMs care**: Allows multiple features to be developed simultaneously without conflicts.

---

### Build
**PM Definition**: The process of converting source code into a runnable application.

**Analogy**: Like compiling ingredients (code) into a finished meal (app).

**When it fails**: Usually means code has errors or dependencies are missing.

**PM action**: If build fails, ask developers to investigate and fix.

---

## C

### CICD (Continuous Integration / Continuous Deployment)
**PM Definition**: Automated system that tests and deploys code changes.

**What it does**:
1. **Continuous Integration**: Automatically tests new code when submitted
2. **Continuous Deployment**: Automatically deploys passing code to production

**Benefits**:
- Catches bugs early
- Faster releases
- Consistent quality

**PM impact**: Features ship faster with less manual process.

---

### CLI (Command Line Interface)
A text-based way to interact with your computer by typing commands instead of clicking. Also called "terminal" or "shell." See [Setup Guide](docs/SETUP_GUIDE.md) for a beginner introduction.

**Example**: Running `claude --version` in your terminal

---

### Codebase
**PM Definition**: The complete collection of source code for a project.

**Analogy**: Like a library of all the written material for your application.

**Includes**:
- Application code
- Tests
- Configuration files
- Documentation

**Why PMs care**: This is what gets analyzed during the discovery phase.

---

### Code Review
**PM Definition**: Process where code is examined for quality, security, and best practices before merging.

**Who reviews**:
- Other developers (manual review)
- AI agents (automated review)
- Automated tools (linters, security scanners)

**What they check**:
- Does code work correctly?
- Is it maintainable?
- Does it follow team standards?
- Are there security issues?

**PM role**: Review the summary (don't read code directly)

---

### Component
**PM Definition**: Reusable piece of user interface.

**Examples**:
- Button
- Form input field
- Navigation menu
- Data table
- Modal dialog

**Analogy**: Like LEGO blocks—build complex UIs from simple, reusable pieces.

**Why it matters**: Reusing components keeps UI consistent and speeds development.

---

### CRUD
**PM Definition**: **C**reate, **R**ead, **U**pdate, **D**elete - the four basic operations for managing data.

**Real-world example** (User management):
- **Create**: Add new user
- **Read**: View user details
- **Update**: Edit user profile
- **Delete**: Remove user account

**Why PMs care**: Most basic features are CRUD operations. These are perfect for AI-powered implementation.

---

### CVE (Common Vulnerabilities and Exposures)
**PM Definition**: Publicly disclosed security vulnerabilities in software.

**Example**: "CVE-2025-1234: SQL injection vulnerability in Package X"

**Why PMs care**: Security review checks for known CVEs in your dependencies.

**PM action**: If critical CVE found, prioritize fixing before shipping.

---

## D

### Database
**PM Definition**: System for storing and retrieving structured data.

**Types**:
- **SQL** (PostgreSQL, MySQL): Structured tables with relationships
- **NoSQL** (MongoDB): Flexible document storage

**Example**: User profiles, order history, analytics data.

**PM perspective**: Think of it as an Excel spreadsheet, but way more powerful and reliable.

---

### Dependencies
**PM Definition**: External code libraries your application relies on.

**Analogy**: Like ingredients you buy from the store instead of making from scratch.

**Examples**:
- Authentication library (Auth0, Supabase)
- Payment processing (Stripe)
- Email sending (SendGrid)

**Risks**:
- Security vulnerabilities in dependencies
- Outdated or unmaintained packages
- License compatibility issues

**PM care**: Security review checks dependencies for known vulnerabilities.

---

### Deployment
**PM Definition**: The process of releasing code to production so users can access it.

**Stages**:
1. **Development**: Code being written
2. **Staging**: Test environment mirroring production
3. **Production**: Live environment serving real users

**PM role**: Approve deployment after reviewing quality gates.

---

### Discovery
**PM Definition**: Phase where AI analyzes the codebase to understand patterns, architecture, and existing services.

**What it produces**:
- Technology stack documentation
- Existing service inventory
- Code patterns and conventions
- Reuse opportunities

**Why it matters**: Ensures new code matches existing patterns and maximizes reuse.

**Duration**: 10-15 minutes

---

## E

### Epic
**PM Definition**: A large user capability that provides significant value and typically takes multiple sprints to complete.

**Size**: Too big to complete in one sprint, should decompose into multiple [sub-tickets](#sub-ticket)

**Example**:
```
Epic: User Profile Customization
├── Sub-ticket: Profile photo upload
├── Sub-ticket: Bio editor
├── Sub-ticket: Custom profile URL
└── Sub-ticket: Social links integration
```

**PM ownership**: PMs define epics based on user value, engineers decompose into sub-tickets.

---

### Environment Variable
A way to store configuration values (like API keys) that programs can access. Set once and all programs can use them, keeping sensitive info out of your code.

**Example**: `export LINEAR_API_KEY="lin_api_..."` sets the Linear API key for MCP servers

---

### Endpoint (API)
**PM Definition**: A specific URL where an application accepts requests.

**Example**:
```
GET /api/users/123       → Get user with ID 123
POST /api/users          → Create new user
PUT /api/users/123       → Update user 123
DELETE /api/users/123    → Delete user 123
```

**PM perspective**: Think of endpoints as specific actions your app can perform.

---

## F

### Framework
**PM Definition**: Pre-built foundation for building applications, providing common functionality out of the box.

**Examples**:
- **Frontend**: React, Vue, Angular
- **Backend**: Next.js, NestJS, Django, Rails
- **Mobile**: React Native, Flutter

**Analogy**: Like a house frame—provides structure, you add the details.

**Why PMs care**: Framework choice affects development speed and available features.

---

### Frontend
**PM Definition**: The user-facing part of an application that runs in the browser or mobile app.

**What it includes**:
- User interface
- Interactions
- Visual design
- Client-side logic

**Example**: Everything you see and click in a web app.

**Opposite of**: [Backend](#backend)

---

## G

### Git
**PM Definition**: Version control system that tracks changes to code over time.

**What it does**:
- Saves history of all changes
- Allows multiple people to work on same codebase
- Enables branching and merging
- Provides backup and rollback capability

**PM needs to know**:
- Changes are tracked automatically
- You can always revert to previous versions
- Branches allow parallel development

---

## I

### Integration
**PM Definition**: Connecting your application with external services or systems.

**Examples**:
- **Payment**: Stripe, PayPal
- **Email**: SendGrid, Mailgun
- **Authentication**: Auth0, Okta
- **Analytics**: Segment, Mixpanel

**Why PMs care**: Integrations extend functionality without building from scratch.

---

## L

### Linear / Ticketing System
**PM Definition**: Project management tool for software teams. Linear is recommended for this workflow, but Jira and other ticketing systems with MCP integration also work.

**What a ticketing system provides**:
- Issue tracking (epics, tasks, bugs)
- Project organization
- Sprint planning
- Roadmap visualization
- Automation via MCP

**Why this workflow needs MCP integration**: MCP (Model Context Protocol) allows AI agents to create and update tickets automatically. Linear and Jira both have MCP servers available.

**Linear MCP**: Official remote server using OAuth 2.1 authentication (no API key needed). See [Linear MCP Documentation](https://linear.app/docs/mcp).

**Alternatives**:
- **Jira** (supported): [Jira MCP](https://github.com/zcaceres/jira-mcp)
- **Others**: Any ticketing system with MCP integration

---

## M

### Merge
**PM Definition**: Combining code from a branch back into the main codebase.

**Process**:
1. Developer completes feature on branch
2. Creates pull request for review
3. Code passes quality gates
4. PM or tech lead approves
5. Code is merged to main
6. Branch is deleted

**PM role**: Final approval before merge (after quality gates pass).

---

### MCP (Model Context Protocol)
A standard for connecting AI assistants to external services. MCP "servers" give Claude Code new capabilities—like creating Linear tickets, searching the web, performing deep research, and enhanced reasoning.

**Official MCP Servers Used**:
- **Linear MCP**: Project management integration ([Linear Docs](https://linear.app/docs/mcp))
- **Perplexity MCP**: Web search and AI research ([Perplexity Docs](https://docs.perplexity.ai/guides/mcp-server))
- **Sequential Thinking MCP**: Enhanced reasoning capabilities
- **Playwright MCP**: Browser automation ([Microsoft GitHub](https://github.com/microsoft/playwright-mcp))

**See**: [MCP Setup Guide](docs/MCP_SETUP.md)

---

### Microservices
**PM Definition**: Architecture where application is built from small, independent services.

**Example**:
- User Service (handles user accounts)
- Order Service (processes orders)
- Payment Service (handles payments)
- Notification Service (sends emails/SMS)

**Benefits**:
- Services can be updated independently
- Easier to scale specific functionality
- Teams can work in parallel

**Drawbacks**:
- More complexity
- Harder to test end-to-end

---

## N

### npm (Node Package Manager)
A tool for installing JavaScript packages and tools. Used to install Claude Code and MCP servers. Comes bundled with Node.js.

**Example**: `npm install -g @anthropic-ai/claude-code`

---

### npx
A tool that runs npm packages without permanently installing them. Used for MCP servers that run on-demand.

**Example**: `npx -y @modelcontextprotocol/server-linear`

---

## O

### ORM (Object-Relational Mapping)
**PM Definition**: Tool that lets developers work with databases using code instead of SQL queries.

**Examples**: Prisma, TypeORM, Django ORM

**Benefit**: Makes database operations safer and easier.

**PM perspective**: You don't need to understand ORMs, but they prevent SQL injection vulnerabilities.

---

### OWASP
**PM Definition**: Open Web Application Security Project - organization that publishes security best practices.

**OWASP Top 10**: Most critical web security risks:
1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Authentication Failures
8. Data Integrity Failures
9. Logging Failures
10. Server-Side Request Forgery

**Why PMs care**: Security review checks against OWASP Top 10.

---

## P

### PR (Pull Request)
**PM Definition**: Request to merge code changes from a branch into main codebase.

**What it includes**:
- Description of changes
- Code diff (what changed)
- Test results
- Review comments

**PR lifecycle**:
1. Developer creates PR
2. Automated tests run
3. Code review (AI + human)
4. Security review
5. PM approval
6. Merge to main

**PM role**: Review PR description (not code), approve if quality gates pass.

---

### PATH
A list of directories where your computer looks for programs. If you get "command not found" errors, the program might not be in your PATH.

---

### Production
**PM Definition**: The live environment serving real users.

**Stages** (typical):
- **Development**: Where developers write code
- **Staging**: Test environment mimicking production
- **Production**: Live system users interact with

**"Shipping to production"** = Making feature available to real users

**PM perspective**: This is where your product lives and users experience features.

---

## Q

### Quality Gates
**PM Definition**: Automated checks that code must pass before shipping.

**This workflow's quality gates**:
1. **Service Inventory**: Prevent duplication
2. **Code Review**: Check quality and patterns
3. **Testing**: Achieve 90%+ coverage
4. **Security Review**: No critical vulnerabilities

**PM role**: Ensure no quality gates are skipped, review reports.

**Benefits**:
- Consistent quality
- Catch issues early
- Reduce production bugs

---

## R

### Repository (Repo)
**PM Definition**: Storage location for code, typically on GitHub, GitLab, or Bitbucket.

**Contains**:
- All source code
- Version history
- Documentation
- Configuration

**Analogy**: Like a project folder in Google Drive, but with full history and collaboration features.

---

### REST API
**PM Definition**: Common style for building web APIs.

**How it works**:
- URLs represent resources (e.g., /users, /orders)
- HTTP methods indicate actions (GET, POST, PUT, DELETE)
- Returns data in JSON format

**PM perspective**: When you say "build an API," this is usually what you mean.

---

## S

### Service
**PM Definition**: A module of code responsible for specific functionality.

**Examples**:
- **AuthService**: Handles login/logout
- **EmailService**: Sends emails
- **ReportService**: Generates reports
- **UserService**: Manages user accounts

**Why it matters**: Service inventory identifies reusable services.

---

### Service Inventory
**PM Definition**: Complete catalog of all existing functionality in the codebase.

**What it includes**:
- All services and their methods
- Utility functions
- Middleware components
- Integration points

**Why critical**: Prevents rebuilding functionality that already exists.

**When to run**: Before every new feature.

---

### Skill (Claude Code Skill)
**PM Definition**: Auto-activated quality enforcement that Claude applies during development without explicit invocation.

**How it differs from commands**:
- **Commands**: You explicitly run (`/implementation`, `/testing`)
- **Skills**: Activate automatically based on context

**Available skills in this workflow**:
- **production-code-standards**: Blocks workarounds, temporary code
- **service-reuse**: Requires checking inventory before creating services
- **testing-philosophy**: Requires fixing broken tests first
- **mvd-documentation**: Enforces documentation standards
- **security-patterns**: Applies OWASP patterns during code writing

**Why PMs care**: Skills prevent issues during development, reducing problems that reach review phases. Think of them as guardrails that are always on.

**Analogy**: Like spell-check that runs automatically as you type, not just when you click "Check Spelling."

**See also**: [SKILLS.md](SKILLS.md) for workflow-specific skills, [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) for official reference.

---

### Sprint
**PM Definition**: Fixed time period (usually 1-2 weeks) for completing planned work.

**Example sprint**:
- Week 1: Planning, discovery
- Week 2: Implementation, testing
- End of sprint: Review, demo, retrospective

**AI impact**: With this workflow, features that took full sprint now complete in days.

---

### Sub-ticket
**PM Definition**: Small, specific task that's part of an epic.

**Size**: 2-8 hours of work (completable in 1-2 days)

**Example** (from CSV Export epic):
- TASK-101: Create CSV formatter utility
- TASK-102: Add export API endpoint
- TASK-103: Build export button UI
- TASK-104: Add permission checks

**Created by**: Technical planning phase (AI decomposition)

---

## T

### Technical Debt
**PM Definition**: Shortcuts or workarounds in code that will need to be fixed later.

**Examples**:
- Temporary workarounds
- TODO comments
- Missing error handling
- Skipped tests

**Cost**: Accumulates over time, slows future development.

**Discovery phase**: Flags existing technical debt.

---

### Terminal
The application where you type commands. Called "Terminal" on Mac/Linux, "PowerShell" or "Command Prompt" on Windows. Same as CLI.

---

### Test Coverage
**PM Definition**: Percentage of code that has automated tests.

**Target**: 90%+ for production features

**Example**:
```
Total lines: 1000
Tested lines: 940
Coverage: 94%  ✅
```

**Why it matters**: Higher coverage = fewer bugs in production.

**PM perspective**: Look for the percentage, not the code details.

---

### Browser Automation / Visual QA
**PM Definition**: Testing tools (Playwright, Puppeteer, Chrome DevTools) that let AI agents test applications in real browsers like a human user would.

**What it enables**:
- Screenshots of actual UI for before/after comparison
- Testing on real browsers (Chrome, Safari, Firefox, Edge)
- Catching visual bugs (layout issues, broken images, animations)
- Testing user interactions (clicks, form fills, navigation)
- Detecting console errors and performance issues

**Real-world analogy**: Like having a QA tester who opens the app in a browser, clicks around, fills out forms, and takes screenshots to verify everything works and looks right.

**Examples of what it catches**:
- Button appears in wrong position on mobile
- Image doesn't load properly
- Form validation shows wrong error message
- Animation stutters or breaks
- Page takes too long to load

**Why PMs care**: Dramatically improves test quality for user-facing applications. Catches the visual/UX bugs that code-only tests miss.

**When to use**: Essential for consumer web apps, optional for backend APIs.

---

## U

### UI (User Interface)
**PM Definition**: Visual elements and controls users interact with.

**Components**:
- Buttons
- Forms
- Navigation
- Data displays
- Modals/dialogs

**PM ownership**: Define UI requirements in PRD, approve final implementation.

---

### UX (User Experience)
**PM Definition**: Overall experience of using your product, including usability, accessibility, and satisfaction.

**Aspects**:
- How easy is it to complete tasks?
- How fast does it feel?
- Is it accessible to all users?
- Does it guide users effectively?

**PM ownership**: Define UX requirements, validate against user research.

---

## V

### Version Control
**PM Definition**: System for tracking changes to code over time (usually Git).

**Benefits**:
- Full history of all changes
- Ability to revert to previous versions
- Parallel development on branches
- Collaboration without conflicts

**PM interaction**: Minimal—developers and AI handle this automatically.

---

## W

### Workflow
**PM Definition**: Series of steps to accomplish a task.

**This repository's workflow**:
```
Service Inventory → Discovery → Epic Planning →
Technical Planning → Implementation → Testing →
Code Review → Security Review → Documentation → Ship
```

**Each phase**: Has specific inputs, outputs, and quality gates.

---

## Common Acronyms

| Acronym | Full Term | PM Translation |
|---------|-----------|----------------|
| **API** | Application Programming Interface | Way for systems to talk to each other |
| **CICD** | Continuous Integration/Deployment | Automated testing and deployment |
| **CLI** | Command Line Interface | Text-based way to run programs |
| **CRUD** | Create, Read, Update, Delete | Basic data operations |
| **CVE** | Common Vulnerabilities and Exposures | Known security bugs |
| **DB** | Database | Where data is stored |
| **MCP** | Model Context Protocol | Standard for AI-to-service connections |
| **npm** | Node Package Manager | Tool for installing JavaScript packages |
| **PR** | Pull Request | Code submission for review |
| **QA** | Quality Assurance | Testing and quality checks |
| **REST** | Representational State Transfer | API design style |
| **UI** | User Interface | What users see and click |
| **UX** | User Experience | How it feels to use |

---

## PM Quick Reference Card

**Before Epic Planning**:
- PRD = Product Requirements Document (what you write)
- Epic = Major user capability (what AI creates)
- Sub-ticket = Small task (what engineers complete)

**During Implementation**:
- Branch = Parallel version for development
- PR = Request to merge code
- Quality Gates = Automated checks

**Before Shipping**:
- Test Coverage = % of code with tests (target: 90%+)
- Security Review = OWASP vulnerability check
- Production = Live environment for users

**Metrics**:
- Code Review: ✅ or ⚠️ (should be ✅)
- Security: 🚨 CRITICAL, ⚠️ HIGH, 🟡 MEDIUM (fix critical/high)
- Tests: X% coverage (target: >90%)

---

## v4.7 Terms

### Observability Stream
**PM Definition**: A structured log of what the workflow actually did, written as one event per JSON line.

**Why it matters**: Workflows can drift — Linear comments say one thing, the underlying execution did another. The observability stream is the single source of truth. When you ask "are we deferring too much?" or "did the impact bar help?", the answer comes from the stream, not from skimming Linear by hand.

**How to use**: Run `/swarm-stats [epic-id]` for a formatted dashboard. Don't grep the JSONL files yourself — the dashboard already handles known edge cases (legacy badges, epic vs ticket events, profile envelope variations).

**Location**: `.swarm/observability/<epic-id>/<ticket-id>.jsonl` and `.swarm/observability/_solo/<ticket-id>.jsonl`.

---

### Protected Region
**PM Definition**: A fenced section in a skill file that marks the "foundational principle" — the one rule that, if removed, defeats the skill's purpose.

**Looks like**:
```
<!-- @protected reason="why this matters" -->
**Violating the letter of this skill is violating the spirit.** ...
<!-- @end-protected -->
```

**Why it matters**: AI-driven skill rewrites tend to soften the rules that matter most. Protected regions force any change to come with an explicit operator decision (an `@override` marker) — they cannot be silently rewritten.

**Source**: SkillOpt §3.6 (Yang et al., 2026) — the highest-ablation safety mechanism in the paper. Removing the analog cost SpreadsheetBench 22 points.

**CI enforcement**: `scripts/validate-skill-invariants.sh` fails any PR that modifies a protected region without a paired `@override` marker.

---

### Skill Audit
**PM Definition**: A structured pass that measures whether a skill is actually doing its job and proposes bounded edits when it's not.

**Two paths**:
- **Discipline skills** get the full audit: tripartite scenarios (train/selection/test splits with the test split LOCKED), baseline measurement, bounded edits (max 4 per pass), selection-gate validation, single-touch test measurement.
- **Reference skills** get a light audit: structural checklist (filename, frontmatter, description style, token budget) and an optional description rewrite.

**Operator handoff**: `docs/SKILL_AUDIT_PLAYBOOK.md`.

**Cadence**: light audits per minor release; discipline-skill audits quarterly or triggered by 3+ observed compliance failures.

---

### SkillOpt
**PM Definition**: The methodology v4.7 adopts for evolving the skill suite — Yang et al., *SkillOpt: Executive Strategy for Self-Evolving Agent Skills* (Microsoft, May 2026).

**Key mechanics the workflow uses**:
- Tripartite train/selection/test scenario splits (§3.1)
- Strictly-greater-than selection gate — no ties merge (§3.2)
- Bounded edits per audit pass, max 4 (§3.3)
- Cosine-decay edit budget across passes (§3.4)
- Rejected-edit buffer for negative-feedback continuity (§3.5)
- Protected regions to safeguard foundational content (§3.6 — the highest-ablation mechanism)

**Why it matters**: Skills are how the workflow keeps AI honest. SkillOpt is how the workflow keeps the skills themselves from drifting under repeated edits.

---

### @override Marker
**PM Definition**: An inline approval record that lets a PR modify a protected region in a skill file.

**Looks like**:
```
<!-- @override approved-by="brian" reason="v4.7 audit pass — see context/skill-audits/no-silent-deferrals.md" -->
```

**Why it matters**: Protected regions are mutable, but never silently. The `@override` marker is the equivalent of a security exception — the operator who approved the change is on the record, and the reason is in the diff history forever.

**CI enforcement**: each `@override` marker pairs to exactly one diff hunk. Two unrelated protected-region edits in the same PR need two separate markers.

---

## v5.0 Terms

### Activation Metric
**PM Definition**: A counter or log line attached to a piece of defensive machinery (a retry, a cleanup job, a recovery process) that records whether it has ever actually fired.

**Why it matters**: With AI, building "just in case" machinery is nearly free — so it accumulates. The activation metric is how you find out, months later, that a safety net has caught zero falls since the problem it guarded was fixed. Machinery with zero activations is a retirement candidate; `/entropy-audit` checks this.

**Analogy**: Like a "days since last incident" sign — if a fire extinguisher has never been touched in 10 years and the building is now concrete, maybe you don't need six of them per room.

---

### Anti-Ballast (Testing)
**PM Definition**: The v5.0 doctrine that test *quantity* is not test *confidence* — a bloated test suite can resist improvements more than it catches bugs.

**The rules**: Tests should check what code *produces* (results, saved data), not *how* it was called internally; a few tests against real infrastructure beat thousands against fakes; one structural guard can replace dozens of repetitive tests.

**Why it matters**: AI writes tests at near-zero cost, so suites balloon. "We have 17,000 tests" sounds safe but can mean the suite is mostly ballast — dead weight that makes every future change slower. `/entropy-audit` trends the warning signs.

---

### Discipline Debt
**PM Definition**: The count of project rules that exist only as prose (tagged `[prose-only]`) rather than as automatic tests (guards). It's the number of rules you're taking on faith.

**Why it matters**: This is a number a non-engineer can watch. Every epic closure reports it (before → after), `/swarm-stats` shows it in the DISCIPLINE DEBT section, and `/entropy-audit` trends it quarterly. Down is good.

**PM action**: If the prose-only count isn't shrinking over time, ask why guards aren't shipping.

---

### Drift Test
**PM Definition**: A test that pins two copies of the same information to each other, so they can't silently disagree (rung 3 on the [enforcement ladder](#enforcement-ladder)).

**Example**: Your pricing tiers exist in a database table AND in a marketing display map. A drift test fails the build the moment someone updates one without the other.

**Why it matters**: Duplicated information always drifts apart eventually — the drift test makes the disagreement visible the day it happens, not the day a customer notices.

---

### Enforcement Ladder
**PM Definition**: The v5.0 ranking of ways to enforce a rule, from strongest (the wrong thing is impossible to write) to weakest (the rule is written down in prose). Six rungs: type chokepoint, static-guard test, drift test, ratchet, runtime assert, tagged prose.

**The principle**: Every rule the AI establishes climbs as high on the ladder as its nature allows, and the enforcement ships in the same PR as the rule.

**Why it matters**: Field data shows guarded rules had zero regressions while the most-documented prose rule regressed four times. AI sessions don't remember rules — but they can't ignore a red test.

**Reference**: `skills/production-code-standards/references/enforcement-ladder.md`

---

### `[enforced:]` / `[prose-only]` Status Tags
**PM Definition**: Inline labels on every rule written into project documentation. `[enforced: <test file>]` means a guard test enforces the rule automatically (the prose shrinks to a one-line pointer). `[prose-only]` means no guard exists, with one line explaining why.

**Why it matters**: The tags make rule enforcement *countable*. The `[prose-only]` count is your [discipline debt](#discipline-debt) — and untagged rules are debt that isn't even counted yet.

---

### Entropy Audit
**PM Definition**: A recurring health check (`/entropy-audit`, every 3–6 months or ~10 epics) that looks *across* epics for the decay no single ticket ever sees: duplicate concepts under different names, dead-but-maintained machinery, stale project memory, test ballast.

**What you get**: A [scorecard](#scorecard-entropy) you can trend run-over-run, a mandatory "Leave It Alone" list (things that look like problems but aren't), and exactly ONE highest-conviction recommendation — never a refactoring wishlist.

**When to re-run early**: A scorecard number moves the wrong way, or an AI agent acted on project documentation that turned out to be stale.

---

### Model Calibration
**PM Definition**: The practice of re-checking, at each new AI model generation, which of the toolkit's rules are still needed — and retiring the ones that police problems models no longer have.

**Why it matters**: Over-instructing a strong model measurably degrades it. v5.0's calibration kept every rule that protects the operator (evidence, security, closure gates) and retired the model-babysitting (read-before-edit reminders, anti-laziness apparatus).

**The receipts**: `docs/MODEL_CALIBRATION.md` — every kept rule is dated and sourced, with an explicit retirement condition.

---

### Ratchet
**PM Definition**: A shrink-only allowlist (rung 4 on the [enforcement ladder](#enforcement-ladder)). When a new pattern should eventually cover N existing places in the code, the ratchet lists the current offenders and enforces two directions: no NEW violations ever, and the list may only get shorter.

**Why it matters**: It replaces "migration tickets" entirely. Field data: per-surface propagation tickets went 14 opened, 0 closed — they rot in the backlog. A ratchet costs 1–2 hours, never rots, and migration happens opportunistically as files get touched.

**PM translation**: Instead of 14 tickets nobody will ever do, one test that guarantees the problem only shrinks.

---

### Scorecard (Entropy)
**PM Definition**: The machine-comparable JSON file each entropy audit produces — discipline debt counts, guard/ratchet inventory, dead-machinery list, test-ballast ratios — saved to `.swarm/entropy/scorecard-<date>.json` and embedded in the audit's Linear comment.

**Why it matters**: Run-over-run deltas turn "is my codebase getting better?" from a feeling into a numbers trend a non-engineer can read. Every number states how it was measured and what it might have missed.

---

### Static-Guard Test
**PM Definition**: A test that scans the *source code itself* (not the running app) and fails if any file breaks a project rule — "never call the database directly," "every endpoint validates input" (rung 2 on the [enforcement ladder](#enforcement-ladder)).

**Why it matters**: It's the workhorse guard — roughly 200 lines, no new tooling, runs in CI like any other test. A violating change is a red build at commit time, caught even when the AI that wrote it never read the rule. The error message teaches the rule at exactly the right moment.

---

### Structural Guard
**PM Definition**: Umbrella term for any automatic enforcement of a project rule — a type chokepoint, [static-guard test](#static-guard-test), [drift test](#drift-test), [ratchet](#ratchet), or runtime assert (rungs 1–5 of the [enforcement ladder](#enforcement-ladder)).

**The slogan**: "A pattern that ships without its guard is a wish." Prose rules don't propagate across AI sessions; guards do.

**Why PMs care**: "Guard test: green" is a verification you can perform without reading code.

---

### Symmetric Bar
**PM Definition**: The v5.0 rule that the same justification bar applied to *skipping* work also applies to *adding* defensive machinery. Building a retry system, cleanup job, or recovery process requires naming a concrete failure that actually happened — "this could theoretically fail" doesn't qualify.

**Why it matters**: With AI, building machinery costs almost nothing, so speculative infrastructure accumulates forever. The symmetric bar keeps the system as small as the evidence justifies — and anything built must ship with an [activation metric](#activation-metric) so the next audit can check whether it ever fired.

---

### Verification Over Recall
**PM Definition**: The v5.0 doctrine that documentation, project memory, and tickets are *hypotheses* about the code — not facts. Before acting on a claim like "the migration is complete," the AI verifies it against the actual code.

**Why it matters**: Project memory drifts — field audits found multiple confidently-stated claims in one project's documentation that were simply no longer true, priming every AI session with falsehoods. Under this doctrine a stale claim is itself a finding, and fixing the documentation is part of the job.

---

## Still Confused?

**For more context**: See [PM_GUIDE.md](PM_GUIDE.md) for detailed explanations with examples.

**For common questions**: Check [FAQ.md](FAQ.md) for PM-specific Q&A.

**For real examples**: Review [EXAMPLES.md](EXAMPLES.md) to see terms in action.

**General rule**: If you don't understand a technical term, ask "What does this mean for the user?" rather than "How does this work technically?"
