---
description: Technical decomposition of Linear epics into actionable implementation tickets with proper dependencies and technical specifications, using epic tickets as primary input with optional PRD, discovery report, and additional context.
allowed-tools: Task, Read, Write, Edit, MultiEdit, Grep, Glob, LS, TodoWrite, Bash, Bash(git branch:*), Bash(git status:*), WebSearch, mcp__linear-server__create_project, mcp__linear-server__create_issue, mcp__linear-server__list_teams, mcp__linear-server__list_projects, mcp__linear-server__update_issue, mcp__linear-server__list_issues, mcp__linear-server__get_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__get_project, mcp__linear-server__linear_get_milestones
argument-hint: <epic-ids> [--prd <prd-file>] [--discovery <discovery-report>] [--context <additional-context>]
workflow-phase: planning
closes-ticket: false
workflow-sequence: "discovery → epic-planning → **planning** (creates sub-tickets)"
---

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
- **Create issues**: Use `mcp__linear-server__create_issue` with unique scope
- **Update issues**: Use `mcp__linear-server__update_issue` for dependencies
- **Add comments**: Use `mcp__linear-server__create_comment` for updates
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

Transform Linear epics into technical implementation tickets with clear dependencies and specifications.

## Input Parameters

### Required:
**Epic IDs**: **$1** (Comma-separated Linear epic IDs like "LIN-123,LIN-124" or single project ID)

### Optional Context (Flags):
**--prd**: Original PRD document for additional business context
**--discovery**: Discovery report with technical analysis and patterns
**--context**: Additional ad-hoc context, requirements, or constraints

Examples:
```bash
# Single epic with no additional context
/planning LIN-123

# Multiple epics with discovery report
/planning LIN-123,LIN-124,LIN-125 --discovery discovery-report.md

# Project with all context
/planning PROJ-456 --prd requirements.md --discovery discovery.md --context "Must integrate with legacy system"

# Epic with just additional context
/planning LIN-789 --context "Performance critical - sub-100ms response required"
```

Use the **architect-agent** to decompose business epics into technical tickets with implementation details.

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
if [[ "$EPIC_IDS" == PROJ-* ]]; then
    echo "📊 Loading all epics from project: $EPIC_IDS"
    # Use mcp__linear-server__get_project to retrieve project
    # Use mcp__linear-server__list_issues to get all epics
else
    echo "🎯 Loading specific epics: $EPIC_IDS"
    # Split comma-separated epic IDs and load each
    IFS=',' read -ra EPIC_ARRAY <<< "$EPIC_IDS"
    for epic_id in "${EPIC_ARRAY[@]}"; do
        echo "  ✓ Loading epic: $epic_id"
        # Use mcp__linear-server__get_issue to retrieve epic
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

#### Primary Source: Epic Tickets
Extract from each epic (created by epic-planning):
- **User Capability**: What can the user accomplish?
- **Business Value**: Quantified impact and metrics
- **Acceptance Criteria**: Success scenarios from epic
- **User Workflow**: Step-by-step journey to implement
- **Architectural Context**: System integration points
- **Non-Functional Requirements**: Scale, performance, security
- **Dependencies**: Other epics this depends on or enables

#### Optional Enhancement: PRD Document
If PRD provided, extract additional context:
- **Detailed Requirements**: Specific features not in epic
- **Edge Cases**: Special scenarios to handle
- **Compliance**: Regulatory requirements
- **Timeline**: Original timeline expectations
- **Constraints**: Budget, resource, or technical limits

#### Optional Enhancement: Discovery Report
If discovery provided, leverage:
- **Existing Patterns**: Code patterns to follow
- **Service Inventory**: Services available for reuse
- **Technical Stack**: Current technology choices
- **Integration Points**: How to connect with existing systems
- **Performance Baselines**: Current system metrics

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
```javascript
// Create implementation tickets as children of epic
const createSubTicket = async (epicId, ticketData) => {
  return await mcp__linear-server__create_issue({
    ...ticketData,
    parentId: epicId,  // Links as sub-ticket to epic
    projectId: epic.projectId,
    labels: ['implementation', ticketData.type],
    estimate: ticketData.hours,
    stateId: 'backlog'
  });
};

// Example: Creating backend sub-ticket
await createSubTicket(epicId, {
  title: 'Implement user authentication API endpoints',
  description: '...',
  type: 'backend',
  hours: 4
});
```

#### Organize Sub-ticket Dependencies
- Set blocking relationships between sub-tickets
- Identify tickets that can proceed in parallel
- Map critical path through implementation
- Associate sub-tickets with project milestones
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

## Success Criteria

Technical planning is successful when:
- **All epic capabilities have technical implementation tickets**
- **All available context sources integrated appropriately**
- **Each ticket created as sub-ticket of parent epic**
- **Dependencies identified and documented**
- **No duplicate tickets created**
- **Timeline aligns with PRD expectations**
- **All tickets include production-ready requirements**
- **Clear "Definition of Done" for each ticket**

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