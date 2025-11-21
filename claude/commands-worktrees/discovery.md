---
description: Analyze codebase and create comprehensive technical discovery report as a Linear ticket in the project, documenting patterns, architecture, and service inventory for implementation phases.
allowed-tools: Task, Read, Write, Edit, Grep, Glob, LS, TodoWrite, Bash, WebSearch, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__create_issue, mcp__linear-server__list_issues, mcp__linear-server__list_projects, mcp__linear-server__get_project
argument-hint: [prd-file] [linear-project] [codebase-path] [focus-areas] (e.g., /discovery requirements.md MyProject ./src "auth,api")
workflow-phase: project-analysis
closes-ticket: false
workflow-sequence: "service-inventory → **discovery** → epic-planning → planning"
---

You are acting as a **Technical Architect** conducting comprehensive codebase discovery. Your goal is to map existing architecture, patterns, services, and integration points to inform technical planning and ensure maximum code reuse.

## Pre-flight Checks
Before running:
- [ ] Linear MCP connected (`claude mcp list` shows linear)
- [ ] Codebase path exists and is accessible
- [ ] PRD file exists and is readable

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **Get project**: Use `mcp__linear-server__list_projects` to find project by name
- **Create discovery ticket**: Use `mcp__linear-server__create_issue` in the project
- **Update ticket**: Use `mcp__linear-server__update_issue` for status changes
- **Add findings**: Use `mcp__linear-server__create_comment` for discovery report
- **DO NOT**: Create external markdown files - all findings go in Linear

Analyze the codebase and document findings in a Linear discovery ticket for the project.

PRD document: **$1** (for context and requirements understanding)
Linear project name: **$2** (project to attach discovery ticket to)
Codebase path: **$3** (root directory to analyze)
Focus areas: ${4:-"all areas"}

Use the **architect-agent** to systematically examine the codebase and create a comprehensive discovery ticket in Linear that all subsequent phases will reference.

## Pre-Discovery Setup

### 1. Load PRD for Context
```bash
# Load PRD to understand what we're building
if [ -f "$1" ]; then
    echo "✓ PRD document found: $1"
    echo "Analyzing requirements to guide discovery..."
else
    echo "⚠️ WARNING: No PRD provided - discovery will be generic"
fi
```

### 2. Find Linear Project
```bash
# Find the project created by planning phase
echo "Locating Linear project: $2"
# Use mcp__linear-server__list_projects to find project by name

# If project not found, check for standalone tickets
if [ -z "$PROJECT_ID" ]; then
    echo "No project found - checking for standalone tickets"
    # Use mcp__linear-server__list_issues to find related tickets
fi
```

### 3. Create Discovery Ticket
Create a discovery ticket in the Linear project:
```markdown
## Title: Technical Discovery - [Project Name]

### Type: Discovery/Analysis
### Status: In Progress
### Labels: discovery, technical-analysis, architecture

### Description
Technical discovery and analysis for implementing [PRD title].
This ticket documents the codebase analysis, architectural patterns,
and service inventory needed for implementation.
```

## Code Quality Standards - NO WORKAROUNDS OR FALLBACKS

**CRITICAL: Production-Ready Code Only**
During discovery analysis, identify and document any existing workarounds as technical debt:
- **Flag ALL workarounds**: Document any existing fallback logic or temporary fixes
- **Identify fail-fast violations**: Note where code suppresses errors improperly
- **Document technical debt**: Mark all temporary solutions needing replacement
- **NO NEW WORKAROUNDS**: Never suggest workarounds in recommendations
- **Production standards**: All recommendations must be production-ready

## Discovery Workflow

### 1. Codebase Structure Analysis
Document in Linear ticket comment:
```markdown
## 📁 Codebase Structure

### Project Overview
- **Framework**: [Detected framework/platform]
- **Language**: [Primary language and version]
- **Architecture**: [Monolith/Microservices/Serverless]
- **Database**: [Database type and ORM]

### Directory Structure
\`\`\`
src/
├── controllers/    # API endpoints
├── services/       # Business logic
├── repositories/   # Data access
├── models/         # Data models
├── middleware/     # Cross-cutting concerns
└── utils/          # Shared utilities
\`\`\`

### Configuration Files
- package.json / requirements.txt / go.mod
- .env.example / config files
- CI/CD configuration
- Docker/Kubernetes configs
```

### 2. Service Inventory Creation
**CRITICAL: Document ALL existing services for reuse**

Add to Linear ticket:
```markdown
## 🔧 Service Inventory

### Core Services
| Service | Purpose | Methods | Reuse Potential |
|---------|---------|---------|-----------------|
| AuthService | Authentication | login(), logout(), verify() | HIGH - Use for all auth |
| UserService | User management | create(), update(), find() | HIGH - Extend for profiles |
| EmailService | Email sending | send(), template() | HIGH - Use for notifications |

### Infrastructure Components
| Component | Type | Purpose | Reuse Potential |
|-----------|------|---------|-----------------|
| AuthGuard | Middleware | Route protection | HIGH - Apply to new routes |
| ValidationPipe | Decorator | Input validation | HIGH - Use on all DTOs |
| LoggerService | Utility | Centralized logging | HIGH - Use everywhere |

### Event System
| Event | Producer | Consumers | Purpose |
|-------|----------|-----------|---------|
| user.created | UserService | EmailService, AuditService | New user notifications |
| order.completed | OrderService | InventoryService, EmailService | Order processing |

### Repository Pattern
- ✅ Using repository pattern: [Yes/No]
- Base repository: [BaseRepository class if exists]
- Direct ORM usage: [List violations if any]
```

### 3. Pattern Analysis
Document architectural patterns found:
```markdown
## 🏗️ Architectural Patterns

### Design Patterns in Use
- **Repository Pattern**: [Implementation details]
- **Service Layer**: [How services are organized]
- **Dependency Injection**: [DI container/framework]
- **Event-Driven**: [Event bus implementation]
- **CQRS**: [If command/query separation exists]

### Code Conventions
- **Naming**: [camelCase/snake_case patterns]
- **File Organization**: [One class per file, barrel exports]
- **Error Handling**: [Error types and propagation]
- **Testing**: [Test file patterns, coverage tools]

### Security Patterns
- **Authentication**: [JWT/Session/OAuth strategy]
- **Authorization**: [RBAC/ABAC implementation]
- **Input Validation**: [Validation library/approach]
- **Secret Management**: [How secrets are handled]
```

### 4. PRD Alignment Analysis
Map PRD requirements to existing capabilities:
```markdown
## 📋 PRD Requirements Mapping

### Requirements Coverage
| PRD Requirement | Existing Service | Coverage % | Gap Analysis |
|-----------------|------------------|------------|--------------|
| User Auth | AuthService | 80% | Need MFA support |
| Data Export | ReportService | 60% | Need CSV format |
| Notifications | EmailService | 100% | Fully covered |
| Search | - | 0% | No search service exists |

### New Development Needed
1. **Search Service**: No existing search capability
2. **MFA Extension**: Extend AuthService for 2FA
3. **CSV Exporter**: Add to ReportService

### Reuse Opportunities
- Use existing AuthService for 80% of auth requirements
- Leverage EmailService for all notifications
- Extend ReportService instead of creating new export service
```

### 5. Technical Debt & Risks
Document findings that affect implementation:
```markdown
## ⚠️ Technical Debt & Risks

### Code Quality Issues
- **Workarounds Found**: [List with locations]
- **TODO Comments**: [Count and critical ones]
- **Deprecated Code**: [Methods/packages needing update]
- **Missing Tests**: [Critical untested services]

### Security Concerns
- **Vulnerabilities**: [Any security issues found]
- **Outdated Dependencies**: [Packages needing updates]
- **Hardcoded Secrets**: [If any found - CRITICAL]

### Performance Bottlenecks
- **N+1 Queries**: [Database query issues]
- **Missing Indexes**: [Database optimization needs]
- **Synchronous Operations**: [Should be async]

### Architectural Risks
- **Tight Coupling**: [Services that are too interdependent]
- **Missing Abstractions**: [Direct dependencies on external services]
- **Scalability Issues**: [Single points of failure]
```

### 6. Implementation Recommendations
Based on discovery, provide clear guidance:
```markdown
## 💡 Implementation Recommendations

### Service Reuse Strategy
1. **Mandatory Reuse** (>80% fit):
   - AuthService for authentication
   - EmailService for notifications
   - LoggerService for all logging

2. **Extend Existing** (50-80% fit):
   - Extend UserService for profile features
   - Add CSV to ReportService

3. **Create New** (<50% fit):
   - SearchService (no existing capability)
   - WebSocketService (real-time features)

### Implementation Order
1. **Phase 1**: Extend existing services
2. **Phase 2**: Create new infrastructure
3. **Phase 3**: Build feature services
4. **Phase 4**: Integration and testing

### Best Practices to Follow
- Use repository pattern for all data access
- Apply existing middleware for cross-cutting concerns
- Follow established error handling patterns
- Use existing validation decorators
```

## Discovery Ticket Updates

### Initial Creation
When creating the discovery ticket, use mcp__linear-server__create_issue with:
- **title**: "Technical Discovery - [Project Name]"
- **description**: "Codebase analysis for [PRD title] implementation"
- **projectId**: The project ID from Linear
- **labels**: ["discovery", "technical-analysis"]
- **status**: "In Progress"

### Progress Updates
Add comments as discovery progresses:
```markdown
## Discovery Progress Update

- ✅ Structure analysis complete
- ✅ Service inventory documented
- 🔄 Pattern analysis in progress
- ⏳ PRD mapping pending
```

### Final Report
Complete discovery with comprehensive report:
```markdown
## 🔍 Discovery Complete

### Summary
- **Services Identified**: X total (Y reusable)
- **Reuse Potential**: Z% of PRD requirements
- **New Development**: N services needed
- **Technical Debt**: M issues to address

### Key Findings
1. Strong existing auth infrastructure (80% reusable)
2. Missing search capability requires new service
3. Event system can handle all async requirements

### Critical Paths
- Database schema must be updated first
- Auth service extension blocks user features
- Search service has no dependencies

### Handoff to Implementation
- Service inventory documented
- Reuse mandates identified
- Technical constraints clear
- Ready for adaptation phase

**Discovery Completed**: [Date/Time]
**Analyst**: Architect Agent
**Ticket ID**: [LIN-XXX]
```

## Success Criteria

Discovery is successful when:
- **Linear ticket created** in project (not external file)
- **Complete service inventory** documented
- **All patterns identified** and documented
- **PRD requirements mapped** to existing services
- **Reuse opportunities** clearly identified (target >70%)
- **Technical debt** cataloged with risks
- **Clear recommendations** for implementation
- **No external artifacts** - everything in Linear

## Handoff to Adaptation Phase

After discovery completes:
1. Discovery ticket marked complete in Linear
2. Service inventory available in ticket comments
3. Adaptation phase references discovery ticket
4. Implementation has clear reuse mandates

## Common Discovery Patterns

### Monolithic Applications
- Focus on service boundaries within monolith
- Identify modules that could be services
- Document shared utilities and helpers

### Microservices Architecture  
- Map service communication patterns
- Document API contracts between services
- Identify shared libraries and contracts

### Serverless/FaaS
- Document function inventory and triggers
- Map event flows between functions
- Identify shared layers and utilities

The discovery phase creates a comprehensive technical analysis directly in Linear, providing the foundation for all subsequent development phases with a strong focus on maximizing reuse of existing code and patterns.