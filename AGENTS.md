# Agents: Specialized AI Roles

Agents are specialized AI roles that Claude assumes when executing workflow commands. Each agent has deep expertise in a specific domain and follows strict patterns for quality and consistency.

**Official Documentation**: [Claude Code Agents](https://code.claude.com/docs/en/agents)

## How Agents Work

**Commands** = Workflow phases you invoke (`/implementation`, `/testing`)
**Agents** = Specialized roles invoked BY commands via Task tool
**Skills** = Standards that auto-activate during agent work

```
You run /command → Command invokes Agent → Agent does work (with Skills active)
```

Agents receive context from the orchestrating command (which fetches ticket details, comments, etc.) and return structured reports that the command posts back to Linear.

## Available Agents

### 1. architect-agent

**Model**: Opus (deep reasoning)
**Color**: Blue
**Skills**: production-code-standards, service-reuse

**Used By**: `/discovery`, `/planning`, `/adaptation`

**Expertise**:
- System architecture discovery and analysis
- Technical decomposition and planning
- Service inventory creation
- Requirement analysis with reuse matrix
- Dependency management and risk assessment

**Key Responsibilities**:
- Creates comprehensive service inventories with exact paths
- Maps existing infrastructure, APIs, and data models
- Breaks down epics into technical tickets with dependencies
- Identifies reuse opportunities with specific references
- Documents technical constraints and baselines
- Enforces planning phase scope boundaries: restricts ticket creation to the requested epic(s) only, flags scope violations, and reports out-of-scope items
- **Doc-truth verification (v5.0)**: treats load-bearing claims in project memory (CLAUDE.md, READMEs, env docs, old tickets) as hypotheses, verifies them against HEAD, and reports every discrepancy with its correction
- **Guard-as-AC (v5.0)**: when a ticket establishes a convention, writes its structural guard (enforcement-ladder rung + artifact) into the acceptance criteria; adaptation guides name the guard in a Convention Guards section so code review treats its absence as a SCOPE_GAP
- **Vendor-surface discipline (v5.0)**: new vendor/SaaS dependencies require the concrete problem they solve, an inventory search showing no existing path, and the named coupling cost — rejected candidates go in the closure-log

**Output Format**: Structured reports with discovery analysis, service inventory, architecture overview, ticket breakdown, implementation sequences, and scope compliance checks (during planning phase).

---

### 2. backend-engineer-agent

**Model**: Opus (heavy reasoning)
**Color**: Green
**Skills**: production-code-standards, service-reuse, testing-philosophy, security-patterns

**Used By**: `/implementation` (for backend code)

**Expertise**:
- REST API and GraphQL development
- Database operations and optimization
- Authentication and authorization systems
- Microservices and event-driven architecture

**Key Responsibilities**:
- Implements secure API endpoints
- Uses repository pattern for data access
- Ensures proper error handling and logging
- Maintains performance standards
- Checks service inventory before any new code

**Implementation Rules**:
- Check service inventory before ANY code
- Use repository pattern exclusively (never direct ORM)
- Implement comprehensive input validation
- Production-error handling (fail-fast, no silent failures)
- No workarounds or temporary solutions

**Output Format**: Implementation report with status, summary, files changed, issues/blockers, and recommendations.

---

### 3. frontend-engineer-agent

**Model**: Opus (heavy reasoning)
**Color**: Green
**Skills**: production-code-standards, service-reuse

**Used By**: `/implementation` (for frontend code)

**Expertise**:
- React/Next.js component development
- Design system implementation
- Accessibility (WCAG 2.2 AA) compliance
- Performance optimization (Core Web Vitals)

**Key Responsibilities**:
- Builds reusable component libraries
- Implements responsive, accessible interfaces
- Ensures design-code parity (plus/minus 2px tolerance)
- Optimizes for Core Web Vitals targets
- Checks component inventory before creating new components

**Design Standards**:
- Design tokens MANDATORY (no hard-coded colors)
- Atomic design (atoms, molecules, organisms, templates, pages)
- shadcn/ui + Radix primitives with design system tokens
- LCP < 2.0s, INP < 200ms, CLS < 0.1

**Output Format**: Implementation report with status, summary, files changed, issues/blockers, and recommendations.

---

### 4. qa-engineer-agent

**Model**: Sonnet (balanced)
**Color**: Yellow
**Skills**: testing-philosophy, production-code-standards

**Used By**: `/testing`

**Expertise**:
- Test pyramid implementation (70% unit, 20% integration, 10% E2E)
- Security and penetration testing
- Performance testing and benchmarking
- Accessibility testing automation

**Key Responsibilities**:
- Creates comprehensive test suites
- Identifies edge cases and failure modes
- Implements test data factories
- Achieves 90%+ code coverage for critical paths

**Critical Philosophy**:
- **Gate #0**: Fix ALL broken existing tests BEFORE writing new tests
- **Gate #1**: API discovery (verify actual implementation before testing)
- **Gate #2**: Compilation (zero TypeScript errors)
- **Gate #3**: Execution (zero runtime errors)
- **Gate #4**: Coverage (secondary priority)

**Anti-Ballast Doctrine (v5.0)** — test mass is not confidence:
- Assert behavior and contracts, not call shapes (`toHaveBeenCalledWith` on internal collaborators pins implementation shape)
- A few real-infrastructure integration tests outrank thousands of mocked unit tests for the data layer
- Static guards count as tests — one source-scanning guard beats 30 per-surface mocked re-assertions of a convention
- Every new mock-heavy file must earn its place over a behavior-level or integration alternative

**Output Format**: Testing report with status, summary, test files created, coverage by area, verification checklist.

---

### 5. technical-writer-agent

**Model**: Sonnet (balanced)
**Color**: Yellow
**Skills**: mvd-documentation, production-code-standards

**Used By**: `/documentation`

**Expertise**:
- API documentation with examples
- Architecture and system design docs
- User guides and tutorials
- JSDoc and inline documentation

**Key Responsibilities**:
- Documents all public APIs (100% coverage)
- Creates quick start guides
- Maintains README and contribution guides
- Ensures documentation accuracy

**Documentation Standards**:
- Document "why", not "what" (TypeScript shows "what")
- No type duplication in JSDoc for TypeScript
- Security-sensitive functions ALWAYS documented
- No placeholder content (TODO, TBD)
- Complete documentation or none

**Output Format**: Documentation report with status, summary, files changed, issues/blockers, and recommendations.

---

### 6. code-reviewer-agent

**Model**: Opus (deep multi-dimensional analysis)
**Color**: Cyan
**Skills**: production-code-standards, service-reuse

**Used By**: `/codereview`

**Expertise**:
- Design pattern recognition
- Code maintainability assessment
- Performance analysis
- Best practice enforcement

**Key Responsibilities**:
- Validates code follows established patterns
- Identifies anti-patterns and code smells
- Checks performance implications
- Ensures code quality standards
- Verifies service reuse compliance
- **Convention Guard Verification (v5.0)**: detects whether the change establishes a convention; verifies a guard (enforcement-ladder rung 1–5) ships in the same change or the rule carries an explicit `[prose-only]` tag — neither is CHANGES_REQUESTED, same severity as missing tests

**Review Areas**:
1. Service inventory and duplication check (first priority)
2. Architecture and pattern integrity
3. Dependency analysis
4. Code quality and standards
5. Security considerations
6. Performance and scalability
7. Maintainability and documentation
8. Convention enforcement (guard shipped / prose-only tagged / missing)

**Output Format**: Code review report with summary, findings (must fix/should fix/suggestions), checklist, a 🛡️ Convention Guard Verification table (GUARD_SHIPPED / PROSE_ONLY_TAGGED / MISSING), and decision (APPROVE/REQUEST CHANGES).

---

### 7. design-reviewer-agent

**Model**: Sonnet (balanced — upgraded from Haiku in v4.5.0 per "never haiku" policy)
**Color**: Cyan
**Skills**: Design system enforcement specific

**Used By**: Optional UI/UX review phase

**Expertise**:
- Design token validation
- Accessibility compliance (WCAG 2.2 AA)
- Responsive design testing
- Performance validation (Core Web Vitals)

**Key Responsibilities**:
- Validates design-code parity (Figma vs implementation)
- Tests across viewports and browsers
- Ensures accessibility standards (WCAG 2.2 AA non-negotiable)
- Reviews micro-interactions and animations
- Uses Playwright for automated visual testing

**Systematic Review Process**:
- Phase 0: Context and setup
- Phase 1: User flow and interaction quality
- Phase 2: Design token compliance (ZERO hardcoded values)
- Phase 3: Responsive and cross-browser testing
- Phase 4: Accessibility audit
- Phase 5: Performance validation
- Phase 6: Component architecture
- Phase 7: Content and console quality

**Output Format**: Design review report with executive summary, strengths, critical issues, improvements, scores, and pre-merge checklist.

---

### 8. security-engineer-agent

**Model**: Opus (deep analysis)
**Color**: Cyan
**Skills**: security-patterns, production-code-standards

**Used By**: `/security-review`

**Expertise**:
- OWASP Top 10 assessment
- Penetration testing methodologies
- Secure coding practices
- Compliance (GDPR, HIPAA, SOC2)

**Key Responsibilities**:
- Identifies security vulnerabilities
- Performs threat modeling
- Reviews authentication/authorization
- Ensures compliance requirements
- Checks latest CVEs using dynamic vulnerability search

**OWASP Top 10 2021 Assessment**:
1. Broken Access Control
2. Cryptographic Failures
3. Injection Vulnerabilities
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

**Severity Classification**:
- CRITICAL (CVSS 9.0-10.0): Auth bypass, SQL injection, RCE, exposed secrets
- HIGH (CVSS 7.0-8.9): XSS, IDOR, missing rate limiting, data exposure
- MEDIUM (CVSS 4.0-6.9): Missing security headers, weak passwords, CSRF
- LOW (CVSS 0.1-3.9): Best practices, informational findings

**Workflow Position**: Security Review is the FINAL GATE that CLOSES TICKETS.

**Output Format**: Security review report with findings by severity, checks performed, recommendations (APPROVE/REJECT), and CVSS scores.

---

### 9. epic-closure-agent

**Model**: Opus (deep analysis)
**Color**: Magenta
**Skills**: production-code-standards, verify-implementation, epic-closure-validation

**Used By**: `/close-epic`

**Expertise**:
- Follow-up discipline (impact bar, boundary question, ≤3 ticket cap)
- Convention guard auditing against the enforcement ladder
- Downstream impact assessment
- Documentation gap analysis
- Lessons learned extraction

**Key Responsibilities**:
- Verifies all sub-tickets are Done or Cancelled
- **Convention Guard Audit (v5.0, Phase 2.5 — BLOCKING)**: enumerates every convention the epic established; confirms each has a verified guard artifact (rung 1–5, file exists and reports green) or an explicit `[prose-only]` tag with rationale — neither is a CRITICAL finding that blocks closure
- Applies the impact bar and boundary question to follow-up candidates (ratchets preferred over propagation tickets)
- Analyzes impact on dependent/related epics
- Audits CLAUDE.md coverage for new services/patterns
- **Prose pruning (v5.0, Phase 6)**: proposes retiring guarded rules to one-line `[enforced: <artifact>]` pointers, tags surviving rules `[prose-only]`, and reports the before/after tag census (the discipline-debt metric)
- Generates comprehensive closure reports with the Considered-but-not-pursued closure-log
- Extracts actionable lessons for future work

**Workflow (seven phases plus the Convention Guard gate at 2.5)**:
1. Completion verification & late findings (blocking gate)
2. Deferred work recovery
2.5. Convention Guard Audit (BLOCKING) — Convention Guards table required, even if "None"
3. Follow-up discipline — impact bar, boundary question, ≤3 cap
4. Downstream impact - guidance for dependent epics
5. Documentation audit - CLAUDE.md coverage gaps
6. CLAUDE.md updates - specific edit instructions, including prose pruning and the tag census
7. Closure summary - business value delivered, closure-log, Convention Guards summary

**Output Format**: Epic closure analysis report with phases, Convention Guards table, up to 3 follow-up ticket specifications, closure-log, downstream impact, documentation audit, CLAUDE.md updates with pruning proposals, and orchestrator action list.

---

### 10. ticket-context-agent

**Model**: Sonnet (mechanical context batching)
**Color**: Cyan
**Skills**: verify-implementation

**Used By**: `/close-epic` (for large epics with 7+ tickets)

**Expertise**:
- Linear ticket context gathering
- Information summarization and extraction
- Efficient context reduction for large epics

**Key Responsibilities**:
- Fetches ticket details and comments via Linear MCP
- Summarizes key information (implementation, testing, security findings)
- Returns condensed context to prevent context exhaustion
- Enables parallel processing of ticket batches

**When to Use**:
- Invoked by `/close-epic` orchestrator when epic has more than 6 sub-tickets
- Multiple instances run in parallel for different ticket batches
- Each instance handles 5-6 tickets and returns summarized context

**Context Reduction Strategy**:
- Fetches full ticket details and all comments
- Extracts only key information (decisions, patterns, findings)
- Returns structured summaries instead of raw Linear data
- Prevents context overflow when processing large epics

**Output Format**: Structured ticket summaries with work summary, key decisions, patterns introduced, issues resolved, testing coverage, security status, and key files.

---

### 11. entropy-auditor-agent

**Model**: Opus (cross-epic judgment — reading real code against census facts and committing to verdicts)
**Color**: Yellow
**Skills**: model-aware-behavior, no-silent-deferrals, production-code-standards

**Used By**: `/entropy-audit`

**Expertise**:
- Principal-engineer-grade judgment on top of a mechanical census
- Consolidation analysis (parallel vocabularies, duplicate matrices without drift tests, dead-but-maintained machinery)
- Enforcement-ladder promotion judgment (which prose-only rules are worth guarding)
- Test-ballast assessment (mock:integration concentration, call-count assertion density)

**Key Responsibilities**:
- Receives the orchestrator's mechanical census, doc-truth sweep results, and prior-scorecard deltas (no Linear access — everything arrives in the prompt)
- Reads real code on top of the census facts; bounded exploration, never re-running the census
- Filters every finding through the five-currency pragmatism filter (bug class made impossible, debugging session shortened, likely change made local, code deleted, real cost/latency) — "cleaner / more consistent / best practice" findings are cut
- Names the cost of being wrong for every keep/remove verdict (Chesterton's fence)
- Produces the mandatory Leave It Alone list — apparent debt that is correctly sized
- Commits to a forced stance: ONE highest-conviction change, or an argued "nothing worth changing"
- Ranks severity against the operator's north star, not a generic rubric
- Never blends facts with opinions — census numbers are not restated as discoveries

**Output Format**: Judgment-layer report with scorecard reaction, pragmatism-filtered findings table (currency + evidence + cost if wrong), Leave It Alone table, forced stance, cut findings log, and files read beyond the census — under 10,000 characters, written for a non-engineer operator.

---

## Workflow Phase Isolation

All ticket-level agents include **phase isolation** to prevent context contamination:

### Workflow Position Markers

Each agent clearly identifies its position in the workflow:
- **Implementation agents** (backend/frontend): Phase 6 - Code writing only
- **QA agent**: Phase 7 - Test creation and execution only
- **Technical writer**: Phase 8 - Documentation only
- **Code reviewer**: Phase 9 - Quality assessment only
- **Security engineer**: Phase 10 - Security review only (final gate)

### Context Isolation

Agents are protected from session context contamination:
- **Ignore session summaries**: Agents do not act on context from previous session phases
- **Explicit task requirement**: Agents only work when given an explicit task in the current prompt
- **No carryover**: Each agent invocation starts fresh with only orchestrator-provided context

### Phase Guardrails

Each agent has explicit STOP instructions for wrong-phase requests:
- Implementation agents stop if asked to review code, write tests, or perform security assessments
- QA agents stop if asked to fix production code or perform security reviews
- Security agents stop if asked to implement features or write documentation

This prevents the common issue where agents would act on accumulated session context rather than the specific task they were invoked to perform.

---

## Agent Orchestration Pattern

Commands act as orchestrators that:
1. **Pre-Agent**: Fetch ticket details and comments using Linear MCP
2. **Invocation**: Embed ALL context into the agent prompt
3. **Post-Agent**: Parse agent's structured report and write to Linear

**Important**: Agents do NOT have direct Linear access. The command handles all Linear I/O.

```
Command (Orchestrator)
    |
    v
[Fetch from Linear] → [Build Agent Prompt] → [Invoke Agent via Task]
    |
    v
[Agent returns structured report]
    |
    v
[Post report to Linear as comment]
```

## Skills Used by Agents

| Agent | Skills |
|-------|--------|
| architect-agent | production-code-standards, service-reuse |
| backend-engineer-agent | production-code-standards, service-reuse, testing-philosophy, security-patterns |
| frontend-engineer-agent | production-code-standards, service-reuse |
| qa-engineer-agent | testing-philosophy, production-code-standards |
| technical-writer-agent | mvd-documentation, production-code-standards |
| code-reviewer-agent | production-code-standards, service-reuse |
| design-reviewer-agent | Design system enforcement specific |
| security-engineer-agent | security-patterns, production-code-standards |
| epic-closure-agent | production-code-standards, verify-implementation, epic-closure-validation |
| ticket-context-agent | verify-implementation |
| entropy-auditor-agent | model-aware-behavior, no-silent-deferrals, production-code-standards |

## Workflow Sequence

```
Project-Level (Planning):
  /discovery → architect-agent
  /planning → architect-agent

Ticket-Level (Execution):
  /adaptation → architect-agent
  /implementation → backend-engineer-agent OR frontend-engineer-agent
  /testing → qa-engineer-agent
  /documentation → technical-writer-agent
  /codereview → code-reviewer-agent
  /security-review → security-engineer-agent (CLOSES TICKETS)

Epic-Level (Closure):
  /close-epic → epic-closure-agent (CLOSES EPICS)

Recurring Maintenance (every 3-6 months or ~10 epics):
  /entropy-audit → entropy-auditor-agent (judgment layer; orchestrator runs the census)
```

## Installation

Agents are automatically installed when you install the PM workflow plugin:

```bash
# Add the marketplace
/plugin marketplace add bdouble/pm-vibecode-ops

# Install from marketplace
/plugin install pm-vibecode-ops@pm-vibecode-ops
```

This installs all 11 agents automatically along with commands, skills, and hooks.

## Repository Location

In this repository, agent definitions are stored in:
```
agents/
├── architect-agent.md
├── backend-engineer-agent.md
├── code-reviewer-agent.md
├── design-reviewer-agent.md
├── entropy-auditor-agent.md
├── epic-closure-agent.md
├── frontend-engineer-agent.md
├── qa-engineer-agent.md
├── security-engineer-agent.md
├── technical-writer-agent.md
└── ticket-context-agent.md
```

## Creating Custom Agents

To add a new agent to your installation:

1. Create file: `~/.claude/agents/[agent-name].md` (global) or `.claude/agents/[agent-name].md` (project)
2. Use YAML frontmatter:

```yaml
---
name: agent-name
model: opus|sonnet|haiku
color: blue|green|yellow|cyan|magenta
skills: skill-1, skill-2
description: When to use this agent (shown in tool selection)
---

You are an expert-level [role] with deep expertise in [domains].

Your core responsibilities include:
- Responsibility 1
- Responsibility 2

[Detailed instructions, guidelines, and constraints]
```

**Key points**:
- `model` determines reasoning depth: opus (complex), sonnet (balanced), haiku (fast)
- `color` appears in Claude Code UI during agent execution
- `skills` list which skills this agent should follow
- `description` determines when the agent is suggested
