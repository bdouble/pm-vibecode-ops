# Codex Agents Guide

This guide explains how to use agent persona templates in Codex for specialized development tasks.

---

## What Are Codex Agents?

Unlike Claude Code where agents are automatically invoked via the Task tool, Codex agents are **persona templates** designed to be copy-pasted into your Codex session. They provide specialized expertise for different phases of the development workflow.

**Key characteristics:**
- **Not executable** - They're prompt templates, not runnable programs
- **Context-dependent** - You must provide ALL context the agent needs
- **Structured output** - Each agent returns a specific report format
- **Manual integration** - You post results to Linear manually

---

## How to Use Agents in Codex

### Step-by-Step Process

1. **Select the right agent** for your task (see catalog below)
2. **Open a fresh Codex session** to avoid context pollution
3. **Copy the agent template** from `codex/agents/[agent-name].md`
4. **Paste into your Codex session** as the initial prompt
5. **Provide ALL context** the agent needs:
   - Ticket ID and full description
   - Relevant code files or discovery reports
   - Any previous phase outputs
   - Specific questions or focus areas
6. **Let the agent work** and produce a structured report
7. **Copy the report** and post to Linear or take action on recommendations
8. **Close the session** before starting the next phase

### Example Usage

```bash
# 1. View the agent template
cat codex/agents/architect-agent.md

# 2. Copy to clipboard (macOS)
cat codex/agents/architect-agent.md | pbcopy

# 3. Open Codex and paste the template
# 4. Add your context below the template:
#    "Here is the ticket I need you to analyze: APP-123..."
```

---

## Key Differences from Claude Code

| Aspect | Claude Code | Codex |
|--------|-------------|-------|
| **Invocation** | Automatic via Task tool | Manual copy-paste |
| **Linear I/O** | Orchestrator handles via MCP | You post results manually |
| **MCP tools** | `mcp__linear-server__*` available | No MCP tools |
| **Agent execution** | Runs in subprocess | Agent is inline prompt |
| **Context passing** | Task tool provides context | You embed ALL context in prompt |
| **Session management** | Multiple agents in one session | Fresh session per agent recommended |

### The Context-Passing Model

In Claude Code, the orchestrator-agent pattern works like this:
1. Command fetches ticket details via MCP
2. Command invokes agent via Task tool with context
3. Agent returns report
4. Command posts report to Linear via MCP

In Codex, **you are the orchestrator**:
1. **You** fetch ticket details (from Linear web UI or API)
2. **You** paste agent template + context into Codex
3. Agent returns report
4. **You** post report to Linear manually

---

## Agent Catalog

### Available Agents (11 total)

| Agent | Role | Primary Use Cases |
|-------|------|-------------------|
| [architect-agent](#architect-agent) | Senior Technical Architect | Discovery, planning, technical decomposition, doc-truth verification |
| [backend-engineer-agent](#backend-engineer-agent) | Backend Implementation Specialist | Server-side code, APIs, databases |
| [frontend-engineer-agent](#frontend-engineer-agent) | Frontend Implementation Specialist | UI components, frontend logic |
| [qa-engineer-agent](#qa-engineer-agent) | QA & Testing Specialist | Test creation, verification, anti-ballast discipline |
| [code-reviewer-agent](#code-reviewer-agent) | Code Quality Specialist | Code review, pattern compliance, convention guard verification |
| [technical-writer-agent](#technical-writer-agent) | Documentation Specialist | API docs, user guides |
| [security-engineer-agent](#security-engineer-agent) | Security Specialist | OWASP assessment, security review |
| [design-reviewer-agent](#design-reviewer-agent) | UI/UX Design Validator | Design review, accessibility |
| [epic-closure-agent](#epic-closure-agent) | Epic Completion Analyst | Follow-up discipline, convention guard audit, lessons learned |
| [ticket-context-agent](#ticket-context-agent) | Context Gathering Support | Parallel context for large epics |
| [entropy-auditor-agent](#entropy-auditor-agent) | Cross-Epic Entropy Auditor | Recurring consolidation audit, pragmatism-filtered findings |

---

### Architect Agent

**File**: `codex/agents/architect-agent.md`

**Role**: Senior Technical Architect (15+ years experience)

**When to Use**:
- Codebase discovery and service inventory
- Requirements decomposition into tickets
- Technical planning and architecture design
- Implementation guides (adaptation phase)
- Doc-truth verification (project memory vs HEAD) and guard-as-AC for conventions
- Vendor-surface discipline (new dependencies require justification)

**Example Invocation**:
```
[Paste architect-agent.md content]

---

## Your Task

Analyze the following PRD and decompose it into Linear tickets:

**PRD**: User Notification System
[Paste PRD content here]

**Existing Service Inventory**: 
[Paste or reference service inventory]

**Constraints**:
- Must integrate with existing event bus
- Target: 5-7 tickets, each 2-4 hours
```

---

### Backend Engineer Agent

**File**: `codex/agents/backend-engineer-agent.md`

**Role**: Backend Implementation Specialist

**When to Use**:
- Server-side feature implementation
- API endpoint development
- Database schema and queries
- Service layer logic

**Example Invocation**:
```
[Paste backend-engineer-agent.md content]

---

## Your Task

Implement the following ticket:

**Ticket ID**: APP-456
**Title**: Add user notification preferences API
**Acceptance Criteria**: [paste criteria]

**Adaptation Guide**: [paste relevant sections]
**Service Inventory**: [paste services to reuse]
```

---

### Frontend Engineer Agent

**File**: `codex/agents/frontend-engineer-agent.md`

**Role**: Frontend Implementation Specialist

**When to Use**:
- UI component development
- Frontend state management
- User interaction logic
- Client-side integrations

**Example Invocation**:
```
[Paste frontend-engineer-agent.md content]

---

## Your Task

Implement the following ticket:

**Ticket ID**: APP-457
**Title**: Notification preferences settings page
**Acceptance Criteria**: [paste criteria]

**Design Specs**: [paste or describe]
**Adaptation Guide**: [paste relevant sections]
```

---

### QA Engineer Agent

**File**: `codex/agents/qa-engineer-agent.md`

**Role**: QA & Testing Specialist

**When to Use**:
- Test suite creation
- Accuracy-first testing (fix broken tests first)
- Coverage analysis
- Test strategy planning

**Key Philosophy**: Accuracy > Compilation > Execution > Coverage. Anti-ballast: assert behavior not call shapes; never hard-code values or delete failing tests to go green.

**Example Invocation**:
```
[Paste qa-engineer-agent.md content]

---

## Your Task

Create tests for the following ticket:

**Ticket ID**: APP-456
**Implementation Report**: [paste implementation summary]
**Affected Modules**: [list modules/files changed]

**Priority**: Fix any broken existing tests first
```

---

### Code Reviewer Agent

**File**: `codex/agents/code-reviewer-agent.md`

**Role**: Code Quality Specialist

**When to Use**:
- Code review before merge
- Pattern compliance checking
- SOLID principles validation
- Convention guard verification (a convention without its guard is CHANGES_REQUESTED)
- Refactoring recommendations

**Example Invocation**:
```
[Paste code-reviewer-agent.md content]

---

## Your Task

Review the following changes:

**Ticket ID**: APP-456
**Git Diff**: [paste diff or describe changes]
**Implementation Report**: [paste summary]
**Test Results**: [paste test outcomes]
```

---

### Technical Writer Agent

**File**: `codex/agents/technical-writer-agent.md`

**Role**: Documentation Specialist

**When to Use**:
- API documentation generation
- User guide creation
- README updates
- Architecture decision records (ADRs)

**Key Philosophy**: Document "why", not "what" (MVD - Minimal Viable Documentation)

**Example Invocation**:
```
[Paste technical-writer-agent.md content]

---

## Your Task

Create documentation for:

**Ticket ID**: APP-456
**Implementation Report**: [paste summary]
**API Endpoints**: [list new/changed endpoints]
**User-Facing Changes**: [describe if any]
```

---

### Security Engineer Agent

**File**: `codex/agents/security-engineer-agent.md`

**Role**: Security Specialist

**When to Use**:
- OWASP vulnerability assessment
- Security review (final gate before ticket closure)
- Auth/authz validation
- Input sanitization review

**Note**: This is the ONLY phase that closes tickets.

**Example Invocation**:
```
[Paste security-engineer-agent.md content]

---

## Your Task

Security review for:

**Ticket ID**: APP-456
**Implementation Report**: [paste summary]
**Code Changes**: [paste diff or file list]
**Dependencies Added**: [list any new deps]

**Previous Reviews**: Testing PASS, Documentation PASS, Code Review PASS
```

---

### Design Reviewer Agent

**File**: `codex/agents/design-reviewer-agent.md`

**Role**: UI/UX Design Validator

**When to Use**:
- Design implementation review
- Accessibility (a11y) validation
- UX consistency checking
- Responsive design verification

**Example Invocation**:
```
[Paste design-reviewer-agent.md content]

---

## Your Task

Review UI implementation for:

**Ticket ID**: APP-457
**Design Specs**: [paste or reference]
**Implementation Report**: [paste summary]
**Screenshots/Components**: [describe or reference]
```

---

### Epic Closure Agent

**File**: `codex/agents/epic-closure-agent.md`

**Role**: Epic Completion Analyst

**When to Use**:
- Epic completion validation
- Follow-up discipline (impact bar + boundary question + ≤3 cap) and lessons learned
- Convention guard audit (blocks closure if a convention lacks its guard or [prose-only] tag)
- Cross-cutting follow-ups (ratchet first — never per-surface propagation tickets)
- Downstream impact assessment
- Project memory update proposals, including pruning guarded prose to [enforced:] pointers

**Prerequisites**: All sub-tickets must be Done or Cancelled.

**Example Invocation**:
```
[Paste epic-closure-agent.md content]

---

## Your Task

Close the following epic:

**Epic ID**: EPIC-123
**Title**: User Notification System

**Sub-Ticket Summaries**:
[Paste summaries from ticket-context-agent or manual aggregation]

**Related Epics**: [list any related work]
```

---

### Ticket Context Agent

**File**: `codex/agents/ticket-context-agent.md`

**Role**: Context Gathering Support

**When to Use**:
- Large epics with 7+ tickets
- Parallel context gathering to prevent context exhaustion
- Used in separate Codex sessions for ticket batches

**Usage Pattern**: Run multiple instances in parallel, each handling a subset of tickets.

**Example Invocation**:
```
[Paste ticket-context-agent.md content]

---

## Your Task

Summarize the following tickets for epic closure:

**Epic ID**: EPIC-123

## Ticket 1: APP-456
**Title**: [title]
**Status**: Done
**Description**: [paste]
**Comments**: [paste phase reports]

## Ticket 2: APP-457
[same format]
```

---

### Entropy Auditor Agent

**File**: `codex/agents/entropy-auditor-agent.md`

**Role**: Cross-Epic Entropy Auditor (consolidator role no per-ticket phase performs)

**When to Use**:
- Recurring entropy audit across epics (consolidation, dead machinery, test ballast)
- Promoting prose-only rules to structural guards
- Producing a pragmatism-filtered findings report with a mandatory Leave It Alone list and one forced highest-conviction stance

**Key Philosophy**: Every finding must pay in one of five currencies (bug class closed, debugging shortened, change made local, code deleted, real cost). "Cleaner" is not a currency.

**Example Invocation**:
```
[Paste entropy-auditor-agent.md content]

---

## Your Task

Run the judgment layer of an entropy audit:

**North Star**: [paste the operator's severity calibration]
**Mechanical Census**: [paste counts: prose rules, guards/ratchets, machinery activation, test ratios]
**Doc-Truth Sweep Results**: [paste verified/stale claims]
**Prior Scorecard + Deltas**: [paste, or "baseline run"]
```

---

## Workflow Phase to Agent Mapping

| Workflow Phase | Primary Agent | When to Use Agent |
|----------------|---------------|-------------------|
| Discovery | architect-agent | Always |
| Epic Planning | architect-agent | For technical decomposition |
| Planning | architect-agent | For ticket breakdown |
| Adaptation | architect-agent | For implementation guides |
| Implementation | backend-engineer-agent / frontend-engineer-agent | Based on ticket type |
| Testing | qa-engineer-agent | Always |
| Documentation | technical-writer-agent | Always |
| Code Review | code-reviewer-agent | Always |
| Security Review | security-engineer-agent | Always (final gate) |
| Epic Closure | epic-closure-agent | When closing epics |
| Entropy Audit | entropy-auditor-agent | Recurring, between epics (not per-ticket) |

---

## Relationship Between Skills and Agents

**Skills** are quality enforcement guidelines that apply during any work:
- `production-code-standards` - No workarounds, no fallbacks
- `service-reuse` - Check inventory before creating new code
- `testing-philosophy` - Fix broken tests before writing new ones

**Agents** are specialized personas for specific workflow phases:
- Each agent embodies relevant skills in their instructions
- Agents produce structured reports
- Agents focus on a specific domain of expertise

**Best Practice**: When using an agent, also include relevant skill content in your prompt for additional quality enforcement.

---

## Tips for Effective Agent Usage

### Do's
- **Fresh sessions**: Start a new Codex session for each agent/phase
- **Complete context**: Include ALL relevant information upfront
- **Structured input**: Format your context clearly with headers
- **Follow the report**: Use the agent's structured output format

### Don'ts
- **Don't chain agents**: Don't run multiple agents in one session
- **Don't assume context**: Agents only know what you tell them
- **Don't skip phases**: Each phase builds on previous outputs
- **Don't modify reports**: Keep agent outputs intact for Linear

### Context Checklist

Before invoking any agent, ensure you have:
- [ ] Ticket ID and full description
- [ ] Acceptance criteria
- [ ] Relevant code file paths/contents
- [ ] Previous phase outputs (if applicable)
- [ ] Service inventory (for planning/architecture)
- [ ] Specific questions or constraints
