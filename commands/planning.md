---
description: Technical decomposition of Linear epics into actionable implementation tickets with proper dependencies and technical specifications, using epic tickets as primary input with optional PRD, discovery report, and additional context.
allowed-tools: Task, Read, Write, Edit, MultiEdit, Grep, Glob, LS, TodoWrite, Bash, Bash(git branch:*), Bash(git status:*), WebSearch, mcp__linear-server__create_project, mcp__linear-server__create_issue, mcp__linear-server__list_teams, mcp__linear-server__list_projects, mcp__linear-server__update_issue, mcp__linear-server__list_issues, mcp__linear-server__get_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__get_project
argument-hint: <epic-ids> [--prd <prd-file>] [--discovery <ticket-id-or-file>] [--context <additional-context>]
workflow-phase: planning
closes-ticket: false
workflow-sequence: "discovery → epic-planning → **planning** (creates sub-tickets)"
---

## MANDATORY: Agent Invocation Required

**You MUST use the Task tool to invoke the `architect-agent` for this phase.**

Before performing ANY planning work yourself:
1. Use the Task tool with the `architect-agent`
2. Provide the agent with all context from this command (epic IDs, PRD, discovery report, additional context)
3. Let the agent perform the actual ticket decomposition
4. Only proceed after the agent completes

DO NOT attempt to perform planning work directly. The specialized architect-agent handles this phase.

---

## CRITICAL: Epic Scope Isolation

**The `/planning` command operates on ONE EPIC AT A TIME.** When given a single epic ID, ALL tickets created MUST belong exclusively to that epic's features.

### Scope Rules:
1. **Single epic = single feature scope.** If the user passes `CON-146` (Habit Tracker), you plan ONLY the Habit Tracker. You do NOT plan Health Metrics, Content Calendar, or any other feature—even if the PRD describes them.
2. **PRD is REFERENCE CONTEXT, not scope.** When a PRD is provided alongside a specific epic, the PRD helps you understand the broader system but does NOT expand your planning scope. You must filter the PRD to extract only sections relevant to the epic being planned.
3. **Epic description defines scope.** The epic's title and description are the authoritative source for what features to plan. If the epic says "Enable habit tracking," you plan habit tracking—nothing else.
4. **Never distribute tickets across multiple epics.** If you are planning epic CON-146, every ticket you create has `parentId: CON-146`. You do NOT create tickets under CON-147, CON-148, or any other epic.
5. **When the PRD contains features for multiple epics**, you MUST:
   - Identify which PRD sections map to the epic being planned
   - Explicitly state which PRD sections you are INCLUDING and which you are EXCLUDING
   - If uncertain about feature-to-epic mapping, ASK the user before creating tickets
6. **Multi-epic planning requires explicit opt-in.** To plan multiple epics at once, the user must provide comma-separated IDs (e.g., `LIN-123,LIN-124,LIN-125`). A single epic ID always means single-epic scope.

### Scope Violation Detection:
If at any point during planning you find yourself creating tickets that don't directly serve the epic's stated capability, **STOP and reassess**. Ask:
- "Does this ticket implement a feature described in the epic's title/description?"
- "Would this ticket make more sense under a different epic?"
- If yes to the second question, **do not create the ticket**. Note it as out-of-scope.

---

## Required Skills
- **divergent-exploration** - Explore technical approaches before decomposition
- **service-reuse** - Factor in existing services during planning

You are acting as a **Technical Planning Architect** responsible for decomposing epics into well-scoped, implementable tickets. Focus on technical feasibility, dependency management, service reuse, and creating clear acceptance criteria for each ticket.

# 📋 Sub-Ticket Workflow: Each Ticket Goes Through Full Implementation Chain

**When creating sub-tickets, each ticket will proceed through:**

1. **Adaptation** - Create implementation guide for the ticket
2. **Implementation** - Write production code
3. **Testing** - Build comprehensive test suite
4. **Documentation** - Generate docs and API references
5. **Code Review** - Quality and pattern assessment
6. **Security Review (FINAL GATE)** - Only this phase closes tickets

**Important:**
- All sub-tickets start in 'Todo' status
- They remain 'In Progress' through phases 1-5
- Only security review closes tickets when passed

---

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **List teams**: Use `mcp__linear-server__list_teams` to identify target team
- **Check projects**: Use `mcp__linear-server__list_projects` to prevent duplicates
- **Create project**: Use `mcp__linear-server__create_project` for 4+ tickets
- **List issues**: Use `mcp__linear-server__list_issues` before creating new tickets
- **Get issue**: Use `mcp__linear-server__get_issue` to retrieve epic details (body/description)
- **List comments**: Use `mcp__linear-server__list_comments` to retrieve all comments on an epic (CRITICAL: always fetch comments alongside issue details)
- **Create issues**: Use `mcp__linear-server__create_issue` with unique scope
- **Update issues**: Use `mcp__linear-server__update_issue` for dependencies
- **Add comments**: Use `mcp__linear-server__create_comment` for updates
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

Transform Linear epics into technical implementation tickets with clear dependencies and specifications.

## Input Parameters

### Required:
**Epic IDs**: **$1** (One or more Linear epic IDs, comma-separated like "LIN-123,LIN-124")

**SCOPE RULE**: Each epic ID defines a discrete planning scope. A single epic ID means you plan ONLY that epic's features. Multiple comma-separated IDs mean you plan each epic's features independently, creating sub-tickets under their respective parent epics.

**NOTE**: Project IDs (PROJ-*) are NOT accepted. Use specific epic IDs from the project. If the user wants to plan all epics in a project, they should provide all epic IDs explicitly (e.g., `LIN-123,LIN-124,LIN-125`).

### Optional Context (Flags):
**--prd**: Original PRD document for additional business context
**--discovery**: Discovery ticket ID (e.g., `DISC-123`) or markdown file path with technical analysis and patterns
**--context**: Additional ad-hoc context, requirements, or constraints

Examples:
```bash
# Single epic with no additional context
/planning LIN-123

# Multiple epics with discovery ticket (recommended)
/planning LIN-123,LIN-124,LIN-125 --discovery DISC-001

# Project with all context (ticket ID)
/planning PROJ-456 --prd requirements.md --discovery DISC-002 --context "Must integrate with legacy system"

# Alternative: using discovery markdown file
/planning LIN-123,LIN-124 --discovery ./docs/discovery-report.md

# Epic with just additional context
/planning LIN-789 --context "Performance critical - sub-100ms response required"
```

**You MUST invoke the `architect-agent` via the Task tool** to decompose business epics into technical tickets with implementation details.

## Pre-Planning Analysis

### 1. Parse Input and Load Epics
```bash
# Parse command line arguments
EPIC_IDS="$1"  # Required: epic IDs or project ID
PRD_FILE=""
DISCOVERY_FILE=""
ADDITIONAL_CONTEXT=""

# Parse optional flags
while [[ $# -gt 1 ]]; do
    case $2 in
        --prd)
            PRD_FILE="$3"
            shift 2
            ;;
        --discovery)
            DISCOVERY_FILE="$3"
            shift 2
            ;;
        --context)
            ADDITIONAL_CONTEXT="$3"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Load epics from Linear
# NOTE: Project IDs (PROJ-*) are NOT supported. Use explicit epic IDs.
if [[ "$EPIC_IDS" == PROJ-* ]]; then
    echo "❌ ERROR: Project IDs are not accepted by /planning."
    echo "   Use specific epic IDs instead: /planning LIN-123 or /planning LIN-123,LIN-124"
    echo "   To find epic IDs in a project, use: mcp__linear-server__list_issues with project filter"
    exit 1
else
    echo "Loading specific epics: $EPIC_IDS"
    # Split comma-separated epic IDs and load each
    IFS=',' read -ra EPIC_ARRAY <<< "$EPIC_IDS"
    for epic_id in "${EPIC_ARRAY[@]}"; do
        echo "  Loading epic: $epic_id"
        # MCP: mcp__linear-server__get_issue - retrieve epic body/description
        # MCP: mcp__linear-server__list_comments - retrieve ALL comments on epic
        # CRITICAL: Review BOTH description AND comments for complete context
    done
fi

# Load optional context files
if [ -n "$PRD_FILE" ] && [ -f "$PRD_FILE" ]; then
    echo "📄 PRD document loaded: $PRD_FILE"
fi

if [ -n "$DISCOVERY_FILE" ] && [ -f "$DISCOVERY_FILE" ]; then
    echo "🔍 Discovery report loaded: $DISCOVERY_FILE"
fi

if [ -n "$ADDITIONAL_CONTEXT" ]; then
    echo "💡 Additional context provided: $ADDITIONAL_CONTEXT"
fi
```

### 2. Context Integration and Analysis

#### Primary Source: Epic Tickets (Description AND Comments)
**CRITICAL: For each epic, fetch BOTH the issue body AND all comments:**
1. Use `mcp__linear-server__get_issue` to get the epic description
2. Use `mcp__linear-server__list_comments` to get all comments

Extract from each epic (description and comments combined):
- **User Capability**: What can the user accomplish?
- **Business Value**: Quantified impact and metrics
- **Acceptance Criteria**: Success scenarios from epic
- **User Workflow**: Step-by-step journey to implement
- **Architectural Context**: System integration points
- **Non-Functional Requirements**: Scale, performance, security
- **Dependencies**: Other epics this depends on or enables
- **Previous Phase Outputs**: Planning reports, discovery findings, etc. (often in comments)

#### Optional Enhancement: PRD Document (FILTERED TO EPIC SCOPE)
If PRD provided, you MUST filter it before passing to the agent:

**Step 1: Check for Feature-to-Epic Mapping**
If the PRD contains a `## Feature-to-Epic Mapping` section (appended by `/epic-planning`), use it to identify which PRD sections belong to the epic(s) being planned. Extract ONLY those sections.

**Step 2: Manual Filtering (if no mapping exists)**
If no mapping exists in the PRD:
1. Read the epic's title and description
2. Identify which PRD sections/features correspond to the epic's capability
3. Extract ONLY those sections as filtered context
4. Explicitly document which PRD sections are IN SCOPE and which are EXCLUDED

**Step 3: Pass Filtered Context to Agent**
When invoking the architect-agent, include:
- The epic description (primary scope)
- The FILTERED PRD sections (not the full PRD)
- A clear statement: "Plan ONLY for epic [ID]: [title]. The following PRD sections are in scope: [list]. All other PRD sections are OUT OF SCOPE."

From the filtered PRD sections, extract:
- **Detailed Requirements**: Features specific to this epic
- **Edge Cases**: Scenarios relevant to this epic's capability
- **Compliance**: Regulatory requirements affecting this epic
- **Timeline**: Timeline expectations for this epic's phase
- **Constraints**: Constraints relevant to this epic

#### Optional Enhancement: Discovery Report
If discovery provided (as Linear ticket ID or file), leverage:
- **Existing Patterns**: Code patterns to follow
- **Service Inventory**: Services available for reuse
- **Technical Stack**: Current technology choices
- **Integration Points**: How to connect with existing systems
- **Performance Baselines**: Current system metrics

**When discovery is a Linear ticket ID:**
1. Use `mcp__linear-server__get_issue` to fetch the ticket description
2. Use `mcp__linear-server__list_comments` to fetch ALL comments
3. Discovery findings, patterns, and analysis are often documented in comments

#### Optional Enhancement: Additional Context
User-provided context may include:
- **Technical Constraints**: Specific requirements or limitations
- **Performance Targets**: Response time, throughput needs
- **Security Requirements**: Special security considerations
- **Integration Needs**: Third-party or legacy system requirements
- **Team Preferences**: Preferred approaches or technologies

## Code Quality Standards - NO WORKAROUNDS OR FALLBACKS

**CRITICAL: Production-Ready Planning Only**
When creating tickets from the PRD, the planning phase MUST:
- **NO WORKAROUND TICKETS**: Never create tickets for temporary solutions
- **PRODUCTION STANDARDS**: All tickets must describe production-ready implementations
- **FAIL FAST REQUIREMENTS**: Include proper error handling requirements
- **NO PLACEHOLDER FEATURES**: Every ticket must deliver complete functionality
- **PROPER DEPENDENCY CHAINS**: Identify and document all prerequisite work

## Technical Planning Workflow

### 1. Epic Decomposition & Technical Analysis
Analyze the epic(s) to determine technical implementation using this process:

#### Decomposition Strategy:
1. **Analyze Epic Requirements**
   - Read the epic description and acceptance criteria
   - Identify distinct technical areas (backend, frontend, infrastructure)
   - Determine integration points between components

2. **Backend Implementation Breakdown**
   If backend work is required, create tickets for:
   - API endpoints design and specification
   - Service layer implementation
   - Database schema design and migrations
   - Integration with external systems
   - Authentication/authorization implementation

3. **Frontend Implementation Breakdown**
   If frontend work is required, create tickets for:
   - Component architecture and design
   - State management setup
   - UI component implementation
   - API integration and data fetching
   - User interaction and validation

4. **Cross-Cutting Concerns**
   Identify and create tickets for:
   - Security implementation
   - Performance optimization
   - Monitoring and logging
   - Documentation requirements
   - Testing infrastructure

5. **Context Integration**
   - Review any additional context provided
   - Incorporate specific requirements from context
   - Adjust ticket breakdown based on technical constraints
   - Document dependencies between tickets

### 2. Context Synthesis
**IMPORTANT: Combine all context sources for comprehensive planning**

```bash
# Synthesize context from all available sources
echo "🔄 Synthesizing technical context..."

CONTEXT_PRIORITY=(
    "Epic requirements (primary)"
    "Additional context (current needs)"
    "Discovery report (technical truth)"
    "PRD document (original intent)"
)

# Build comprehensive context
for source in "${CONTEXT_PRIORITY[@]}"; do
    if [[ "$source" == *"Epic"* ]] || context_available "$source"; then
        echo "  ✓ Incorporating: $source"
    fi
done
```

### 3. Technical Architecture Review

#### Analyze Available Context
```bash
# Build technical approach from all context sources
echo "Analyzing technical requirements from all sources..."

# From Epic (always available)
echo "Epic acceptance criteria and workflows"

# From Discovery (if provided)
if [ -n "$DISCOVERY_FILE" ]; then
    echo "Existing patterns and service inventory"
    # Extract reusable services
    # Identify established patterns
fi

# From PRD (if provided)
if [ -n "$PRD_FILE" ]; then
    echo "Original requirements and constraints"
    # Extract detailed requirements
    # Identify edge cases
fi

# From Additional Context (if provided)
if [ -n "$ADDITIONAL_CONTEXT" ]; then
    echo "Specific constraints: $ADDITIONAL_CONTEXT"
    # Apply specific requirements
    # Adjust technical approach
fi
```

#### Define Technical Approach
Based on all available context:
```markdown
## Technical Implementation Plan

### Context Sources Used
- Epic Requirements: [Primary capabilities]
- PRD Details: [If provided - additional requirements]
- Discovery Patterns: [If provided - reusable services]
- Additional Context: [If provided - specific constraints]

### Architecture Decisions
- Pattern: [Based on epic + context]
- Reuse Strategy: [From discovery if available]
- Performance Targets: [From context if specified]
- Security Requirements: [Aggregated from all sources]
```

### 4. Technical Ticket Creation from Epic

**For Each Epic Capability**, create implementation tickets:

```markdown
## Ticket Title: [Technical implementation of capability aspect]

### Context References
- Parent Epic: [LIN-XXX]
- PRD Section: [If PRD provided]
- Discovery Pattern: [If discovery provided]
- Additional Requirements: [If context provided]

### Requirements
- Functional: [From PRD functional requirements]
- Non-functional: [Performance, security from PRD]
- Acceptance Criteria: [Derived from PRD success criteria]

### Technical Approach
- Implementation strategy: [How to build this]
- Architecture alignment: [How it fits the system]
- Dependencies: [Other tickets that must complete first]

### Definition of Done
- [ ] Meets PRD acceptance criteria
- [ ] Passes quality gates
- [ ] No workarounds or temporary code
- [ ] Documentation complete
```

### 5. Sub-ticket Creation and Organization

#### Create Implementation Tickets as Sub-tickets
**CRITICAL: All implementation tickets must be created as sub-tickets of the epic**

**Use MCP tool:** `mcp__linear-server__create_issue` to create each implementation ticket.

**Required parameters for sub-ticket creation:**
- `title`: Technical implementation task title
- `description`: Detailed implementation requirements
- `parentId`: Parent epic ID (links as sub-ticket to epic)
- `projectId`: Project ID from the parent epic
- `labels`: Array including 'implementation' and ticket type (e.g., 'backend', 'frontend')
- `estimate`: Estimated hours for the task
- `stateId`: Initial state (typically 'backlog' or 'todo')

**Example workflow:**
1. **Get epic details:** Use `mcp__linear-server__get_issue` with the epic ID
2. **Extract projectId** from the epic response
3. **Create sub-ticket:** Use `mcp__linear-server__create_issue` with `parentId` set to epic ID

**Example sub-ticket structure:**
```markdown
Title: Implement user authentication API endpoints
Parent: [EPIC-ID]
Labels: implementation, backend
Estimate: 4 hours
State: backlog
```

#### Organize Sub-ticket Dependencies
- Set blocking relationships between sub-tickets
- Identify tickets that can proceed in parallel
- Map critical path through implementation
- Document timeline considerations in ticket descriptions
- Update epic with implementation summary

### 6. Service Inventory Check (If Available)

If a previous discovery has been run:
```bash
# Check for existing service inventory
if [ -f "context/service-inventory.yaml" ]; then
    echo "✓ Service inventory found - checking for reuse opportunities"
    # Analyze which PRD requirements can use existing services
    # Add reuse notes to relevant tickets
fi
```

## Ticket Sizing Guidelines

Based on PRD requirements, size tickets appropriately:
- **Small (2-4 hours)**: Single endpoint, simple UI component, configuration change
- **Medium (4-8 hours)**: Multiple endpoints, complex component, service integration  
- **Large (8+ hours)**: MUST SPLIT - Break into smaller tickets
- **Epic-level**: Create sub-tickets, never assign epic directly

## Technical Decomposition Patterns

| Epic Type | Typical Tickets | Implementation Order |
|-----------|-----------------|---------------------|
| New Service | DB schema, API design, service impl, UI, tests | Backend → Frontend |
| Integration | Client library, data mapping, error handling, monitoring | External → Internal |
| UI Feature | Components, state mgmt, API integration, tests | Design → Logic → API |
| Data Pipeline | Schema, ETL, validation, monitoring, backfill | Schema → Pipeline → Monitor |
| Security | Auth service, middleware, audit, compliance | Core → Enforcement → Audit |

## Technical Planning Report Format

After completing technical planning, add comment to epic:

```markdown
## 🔧 Technical Planning Complete

### Planning Context
- **Epic(s) Processed**: $1
- **PRD Reference**: ${PRD_FILE:-"Not provided"}
- **Discovery Report**: ${DISCOVERY_FILE:-"Not provided"}
- **Additional Context**: ${ADDITIONAL_CONTEXT:-"None"}

### 📊 Planning Metrics
- **Total Tickets Created**: X
- **Project Created**: Yes/No (X tickets threshold)
- **Complexity Distribution**: S small, M medium, L large
- **Estimated Timeline**: N sprints
- **Dependencies Identified**: Y critical paths

### 🎯 Ticket Breakdown
| Ticket | PRD Section | Type | Priority | Complexity |
|--------|-------------|------|----------|------------|
| LIN-123 | Auth Requirements | Backend | P0 | Medium |
| LIN-124 | User Dashboard | Frontend | P1 | Large |
| LIN-125 | Data Privacy | Security | P0 | Medium |

### 🔗 Dependency Chain
1. Critical Path: LIN-123 → LIN-124 → LIN-125
2. Parallel Work: LIN-126, LIN-127 can start immediately
3. Blockers: None identified

### ⚠️ Risk Assessment
- **Technical Risks**: [From PRD constraints]
- **Timeline Risks**: [Aggressive deadlines]
- **Resource Risks**: [Skill gaps identified]

### 🚀 Next Steps
1. Run discovery phase for technical analysis
2. Begin implementation with P0 tickets
3. Schedule design review for UI components

**Technical Planning Completed**: [Date/Time]
**Epic(s) Processed**: $1
**Context Sources**:
  - PRD: ${PRD_FILE:-"Not provided"}
  - Discovery: ${DISCOVERY_FILE:-"Not provided"}
  - Additional: ${ADDITIONAL_CONTEXT:-"None"}
**Total Technical Tickets Created**: X
```

## Post-Agent Validation (MANDATORY)

After the architect-agent returns its report, the orchestrator MUST validate scope compliance before posting to Linear:

### Validation Checklist:
1. **Epic Scope Check**: Verify every proposed ticket maps to a feature in the planned epic's description. If any ticket serves a feature from a DIFFERENT epic, flag it as out-of-scope.
2. **Parent ID Check**: Confirm all tickets use the correct `parentId` matching the requested epic(s). No tickets should be created under epics that were not explicitly requested.
3. **Ticket Count Sanity Check**: For a single epic, expect 3-10 sub-tickets. If the agent proposes 15+ tickets for a single epic, this likely indicates scope creep into other epics. Review carefully.
4. **Cross-Epic Distribution Check**: If the agent's report mentions distributing tickets across multiple epics but only one epic was requested, this is a SCOPE VIOLATION. Do not proceed—re-invoke the agent with stronger scope constraints.

### If Scope Violation Detected:
1. **Do NOT create the out-of-scope tickets**
2. **Inform the user**: "The planning agent proposed [N] tickets, but [M] appear to belong to other epics. Only [N-M] tickets are in scope for [EPIC-ID]."
3. **List the out-of-scope tickets** with their apparent parent epic
4. **Ask the user** whether to proceed with only the in-scope tickets or re-plan

## Success Criteria

Technical planning is successful when:
- **SCOPE COMPLIANCE: All tickets belong exclusively to the requested epic(s)** — no tickets created under unrelated epics
- **SCOPE COMPLIANCE: PRD was filtered to only in-scope sections** before passing to agent
- **All epic capabilities have technical implementation tickets**
- **All available context sources integrated appropriately**
- **Each ticket created as sub-ticket of parent epic**
- **Dependencies identified and documented**
- **No duplicate tickets created**
- **Timeline aligns with PRD expectations**
- **All tickets include production-ready requirements**
- **Clear "Definition of Done" for each ticket**
- **Post-agent validation completed** with no scope violations

## Common PRD Patterns and Ticket Mapping

### Authentication/Authorization PRD Section
Typically generates:
- Database schema ticket
- Auth service implementation ticket  
- Frontend login/signup tickets
- Session management ticket
- Security review ticket

### Dashboard/Analytics PRD Section
Typically generates:
- Data aggregation service ticket
- API endpoints ticket
- Frontend dashboard tickets
- Caching layer ticket (if performance requirements)

### Integration PRD Section
Typically generates:
- External API client ticket
- Webhook handler ticket
- Data synchronization ticket
- Error handling/retry ticket

## Context Priority and Integration

### Context Source Priority
When multiple context sources are available:
1. **Epic ticket** (primary source of truth - always required)
2. **Additional context** (user's current specific needs)
3. **Discovery report** (technical ground truth if available)
4. **PRD document** (original intent if provided)

### Conflict Resolution
If context sources conflict:
- Epic requirements take precedence
- Additional context overrides historical documents
- Discovery patterns guide technical approach
- PRD provides fallback for missing details

## Handoff to Implementation Phase

After technical planning completes:
1. All technical tickets created as sub-tickets under epic(s)
2. Dependencies and relationships properly set
3. Context from all sources documented in tickets
4. Implementation can begin with independent tickets
5. Service reuse opportunities identified (if discovery provided)

The technical planning phase transforms business epics into implementation-ready sub-tickets, integrating all available context sources while maintaining the epic as the primary source of truth.