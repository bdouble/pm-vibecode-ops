---
description: Take a Linear issue and adapt requirements to existing codebase patterns, creating precise implementation guide that ensures consistent, high-quality code output.
allowed-tools: Task, Read, Write, Edit, Grep, Glob, LS, TodoWrite, Bash, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__create_issue, mcp__linear-server__list_issues, mcp__linear-server__create_project, mcp__linear-server__list_projects, mcp__linear-server__list_teams
argument-hint: [ticket-id] [discovery-report-optional] [additional-context]
workflow-phase: adaptation
closes-ticket: false
workflow-sequence: "**adaptation** → implementation → testing → documentation → code-review → security-review"
---

You are acting as the **Architect** for this ticket. Focus on analysis, planning, and decomposition only—no implementation, test code, or documentation files are created in this phase. Your primary deliverable is a clear, production-ready implementation guide documented in the Linear ticket.

# 📋 WORKFLOW REMINDER: Full Implementation Chain Ahead

**After adaptation, ticket proceeds through the complete implementation workflow:**

1. **Adaptation (YOU ARE HERE)** - Create implementation guide
2. **Implementation** - Write production code
3. **Testing** - Build test suite
4. **Documentation** - Create docs
5. **Code Review** - Quality assessment
6. **Security Review (FINAL GATE)** - Only this phase closes tickets

**Status remains 'In Progress' until security review passes and closes the ticket.**

---

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **Fetch ticket**: Use `mcp__linear-server__get_issue` with ticket ID
- **Update status**: Use `mcp__linear-server__update_issue` to set status
- **Add comments**: Use `mcp__linear-server__create_comment` for updates
- **List comments**: Use `mcp__linear-server__list_comments` to read existing comments
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

Take Linear issue **$1** and adapt all requirements to existing codebase patterns, creating a precise implementation guide.

Discovery report: ${2:-"none - will perform discovery as needed"}

Additional information may be provided to guide the adaptation work in **$3**

Use the **architect-agent** to perform comprehensive analysis and adaptation, including discovery if no discovery report is provided.

## 🚨 CRITICAL: Architect Agent Context

When invoking the **architect-agent**, provide this explicit context:

**ADAPTATION MODE - DEFAULT BEHAVIOR:**
- You are adapting an EXISTING Linear ticket (ID: $1)
- Your PRIMARY output is a COMMENT on that ticket using `mcp__linear-server__create_comment`
- DO NOT create new tickets UNLESS explicitly in Large Ticket Decomposition scenario

**Large Ticket Decomposition (RARE - See lines 64-84):**
- ONLY if ALL decomposition conditions are met (≥4 areas, >2 days each, >1 sprint total)
- In this case, create subtickets with proper parent relationships
- Otherwise, DEFAULT to commenting on the existing ticket

**NEVER:** Create new standalone tickets during adaptation - this duplicates the ticket unnecessarily.

## 📝 CRITICAL DOCUMENTATION APPROACH
**PRIMARY OUTPUT**: All adaptation guidance must be documented DIRECTLY in the Linear ticket comment.
**EXTERNAL FILES**: Should ONLY be created for exceptionally complex implementations (>5 technical areas) with long-term architectural value.
**DEFAULT BEHAVIOR**: NO external markdown files - everything goes in the Linear comment.
**TEMPORARY DOCS**: NEVER create adaptation documents that are only useful during implementation.

## ⚠️ CRITICAL BOUNDARIES - NO IMPLEMENTATION
**This phase is PLANNING ONLY. The architect-agent MUST NOT:**
- Write any actual implementation code (no controllers, services, models, etc.)
- Create test files or write actual test code
- Generate documentation files or API docs
- Make any code changes beyond discovery/analysis
- Execute database migrations or schema changes
- Create or modify configuration files

**Exception for TRIVIAL tasks (ALL conditions must be met):**
- Single file change with < 10 lines of code
- No new dependencies or imports required
- Follows existing pattern exactly (copy-paste level)
- Takes < 5 minutes to implement
- No testing or documentation needed
- User explicitly requested immediate implementation

**If trivial exception applies:** Document in Linear comment that trivial implementation was completed during adaptation phase.

## Code Quality Standards - NO WORKAROUNDS OR FALLBACKS

**CRITICAL: Production-Ready Solutions Only**
The adaptation phase must create implementation guides that result in production-ready code:
- **NO FALLBACK PATTERNS**: Never design fallback logic or workaround approaches
- **NO TEMPORARY SOLUTIONS**: All adapted patterns must be permanent, production-grade solutions
- **FAIL FAST PRINCIPLE**: Design error handling that fails immediately with clear errors, not silent fallbacks
- **NO MOCKED IMPLEMENTATIONS**: Never suggest mocked or stubbed code outside of test files
- **PROPER ERROR PROPAGATION**: Design proper error handling chains, not try-catch suppressions

**When adapting requirements:**
- If a proper solution requires fixing an existing bug first, specify that as a prerequisite
- Never suggest "temporary" implementations to be replaced later
- All adapted patterns must be maintainable long-term solutions
- Document where existing workarounds need removal before implementation

## CRITICAL: Large Ticket Decomposition Guidelines

### When to Create Subtickets (ALL conditions must be met):
1. **Ticket complexity requires ≥4 distinct implementation areas** (e.g., backend API, frontend UI, database schema, integration)
2. **Each area represents >2 days of development work**
3. **Areas can be developed semi-independently with clear interfaces**
4. **Total estimated effort exceeds 1 sprint (2 weeks)**

### When NOT to Create Subtickets:
- Single feature that should be implemented cohesively
- Changes that are tightly coupled and must be tested together
- Tickets that can be completed in <1 week
- Refactoring or bug fixes (keep atomic)
- Simple CRUD operations or basic UI changes

### If Subtickets ARE Created:
1. **ALWAYS create a new Linear project** for the parent ticket and all subtickets
2. **Use proper Linear parent-child relationships** via `mcp__linear-server__update_issue` with parentId field
3. **NEVER add parent ticket ID to subticket titles** - Linear handles this visually
4. **Create ONE project-level branch** for ALL work (format: `project/[project-name]`)
5. **All subtickets share the same branch** - no individual ticket branches

## Adaptation Workflow

1. **Context Loading**: Use `mcp__linear-server__get_issue` and `mcp__linear-server__list_comments` to fetch ticket details and requirements
2. **Complexity Assessment**: Evaluate if ticket requires decomposition based on strict guidelines above
3. **Status Update & Mode Confirmation**:
   - Use `mcp__linear-server__update_issue` to mark ticket status as "In Progress"
   - **Confirm to architect-agent**: This is ADAPTATION MODE - comment on ticket $1
   - **Large Decomposition**: ONLY if ALL conditions met (see lines 64-84)
4. **Discovery Check**: If discovery report not provided, perform codebase discovery:
   - Analyze directory structure and technology stack
   - Identify frameworks, patterns, and conventions
   - Map architectural components and data flows
   - Document security measures and constraints
   - **Repository Pattern Audit**: Verify ALL data access goes through repositories (no direct ORM usage)
   - **Base Class Consistency**: Check for duplicate base classes/abstractions that should be consolidated
   - **CRITICAL - Workaround Detection**: Flag ALL existing workarounds, fallbacks, and temporary code as technical debt:
     * Document any fallback logic or temporary fixes found
     * Identify try-catch blocks that suppress errors instead of handling them
     * Flag all "TODO" and "FIXME" comments that need resolution
     * Mark any mocked implementations outside of test files
     * Note where proper error handling is replaced with silent failures
   - **Production Standards Enforcement**: Ensure all recommendations avoid these anti-patterns
4. **CRITICAL: Service & Infrastructure Analysis** (PREVENTS DUPLICATION):
   - **Existing Service Discovery**: Search for ALL existing services/utilities that could be reused
   - **Event System Analysis**: Identify event-driven patterns and event buses already in place
   - **Security Infrastructure**: Map existing guards, decorators, middleware, and security services
   - **Data Access Patterns**: Identify repositories, ORM patterns, and data transformation utilities
   - **Common Utilities**: Find shared helpers, validators, formatters, and processing functions
   - **Configuration Management**: Locate config services, environment handling, feature flags
   - **Integration Points**: Map existing APIs, webhooks, queues, and external service integrations
5. **Duplication Prevention Analysis**:
   - **Service Reuse Matrix**: Create matrix of required functionality vs existing services
   - **Pattern Compliance Check**: Verify new feature aligns with established patterns
   - **Event Integration Planning**: Design event-based communication instead of direct coupling
   - **Decorator/Guard Reuse**: Identify existing security/validation decorators to reuse
   - **Shared Logic Extraction**: Determine what can be extracted to common modules
6. **Large Ticket Decomposition** (if complexity assessment indicates):
   - **Create Linear Project**: Use `mcp__linear-server__create_project` with parent ticket context
   - **Create Subtickets**: Use `mcp__linear-server__create_issue` for each decomposed area
   - **Link Subtickets**: Use `mcp__linear-server__update_issue` to set parentId for each subticket
   - **Project Branch**: Create ONE branch `project/[project-name]` for ALL subtickets
   - **Update Parent**: Add project reference and subticket list to parent ticket
7. **Pattern Matching**: Map requirements to existing patterns, identify reusable components
8. **Implementation Design**: Create detailed file structure WITH EXPLICIT REUSE ANNOTATIONS
9. **Test Specification**: Define comprehensive test cases and coverage requirements
10. **Branch Creation**: Create appropriate branch (feature branch for single ticket, project branch for multi-ticket)
11. **Documentation Decision**:
    - **DEFAULT**: Document ALL adaptation guidance in Linear ticket comment
    - **EXCEPTIONAL CASES ONLY**: Create external markdown file if:
      * Implementation spans >5 technical areas AND
      * Has long-term architectural value AND
      * Cannot fit reasonably in Linear comment
    - **NEVER**: Create temporary markdown files that won't be useful after implementation
12. **Linear Comment**: Use `mcp__linear-server__create_comment` to add COMPLETE adaptation report with ALL implementation guidance (do NOT change status to done)
    - This is the PRIMARY deliverable - should contain everything engineers need
    - External files are RARE exceptions, not the default

## Implementation Guide Template

**IMPORTANT: This guide should be included DIRECTLY in the Linear ticket comment, NOT as an external file.**

The adaptation process documents the following IN THE LINEAR COMMENT:

- **Service Reuse Directives**: MANDATORY list of existing services to use instead of creating new ones
- **File Structure**: Exact files to create/modify with directory placement AND reuse annotations
- **Pattern Alignment**: Specific existing patterns to follow with examples and anti-patterns to avoid
- **Interface Definitions**: Clear API contracts and data structures that extend/implement existing interfaces
- **Event Integration Points**: Specific events to emit/listen to instead of direct service calls
- **Security Reuse**: Existing guards, decorators, and middleware that MUST be used
- **Test Requirements**: Comprehensive test cases and coverage targets following existing test patterns
- **Implementation Steps**: Sequential development approach with mandatory reuse checkpoints
- **Anti-Duplication Checklist**: Explicit list of what NOT to create because it already exists

## Linear Project and Subticket Implementation

### When Creating Subtickets (Large Ticket Decomposition):

1. **Project Creation**:
Use the mcp__linear-server__create_project tool with these parameters:
- **name**: "[Parent Ticket Title] Implementation"
- **description**: "Project for implementing [ticket identifier]: [ticket description]"
- **teamId**: Use the parent ticket's team ID
- **leadId**: Use the parent ticket's assignee ID (if available)
- **targetDate**: Use the parent ticket's due date

Example tool invocation:
- Tool: `mcp__linear-server__create_project`
- Parameters should include the parent ticket information
- Save the returned project ID for linking subtickets

2. **Subticket Creation with Proper Linking**:
For each decomposed area, use mcp__linear-server__create_issue with:
- **title**: The subticket title (WITHOUT parent ID in the title)
- **description**: Detailed description of the subtask
- **teamId**: Parent ticket's team ID
- **projectId**: The project ID from step 1
- **parentId**: The parent ticket ID (CRITICAL for proper linking)
- **estimate**: Time estimate for the subtask
- **labels**: Appropriate labels for the subtask

Process each subticket individually:
- Use mcp__linear-server__create_issue for each decomposed area
- Ensure parentId is set to establish the relationship
- Link to the project via projectId

3. **Branch Strategy for Projects**:
```bash
# For multi-ticket projects, create ONE project branch
PROJECT_NAME=$(echo "$project_title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
git branch "project/$PROJECT_NAME" origin/main
git push origin "project/$PROJECT_NAME"

# DO NOT create individual ticket branches
# All subtickets use the same project branch
```

4. **Parent Ticket Update**:
Use mcp__linear-server__create_comment to update the parent ticket with project information:
- **issueId**: The parent ticket ID
- **body**: A markdown-formatted comment containing:
  - Project name
  - Project ID
  - Branch name (if created)

Comment template to use:
```
## 📋 Project Created for Large Feature

**Project**: [Project Name]
**Project ID**: [Project ID]
**Branch**: `project/[project-name]`
**Subtickets**: ${subtickets.length} created

### Subtickets:
${subtickets.map(t => `- ${t.identifier}: ${t.title}`).join('\n')}

All work will be done in the shared project branch.
`
});
```

## Conditional Discovery Process

When no discovery report is provided, the architect-agent will:

1. **Quick Discovery**: Perform rapid codebase analysis to understand:
   - Technology stack (frameworks, libraries, databases)
   - Project structure and organization
   - Coding patterns and conventions
   - Authentication/authorization patterns
   - Testing approaches and frameworks
   - Build and deployment processes

2. **Pattern Extraction**: Identify key patterns for adaptation:
   - Component/service architecture
   - API design patterns
   - Data validation approaches
   - Error handling strategies
   - Security implementations

3. **Context Building**: Create minimal discovery context needed for adaptation

This ensures adaptation can proceed independently without requiring a separate discovery phase.

## Pattern Matching Strategy & Duplication Prevention

### Core Pattern Matching
- **Code Style**: Follow established formatting, naming conventions
- **Architecture**: Align with existing service layers, component structure
- **Data Handling**: Use consistent validation, serialization patterns
- **Error Handling**: Follow established error response formats
- **Security**: Apply existing authentication, authorization patterns
- **Testing**: Match established test structure and assertion patterns
- **Repository Consistency**: Ensure single repository pattern (no mixed base implementations)
- **Module Dependencies**: Verify explicit imports and no implicit global dependencies

### CRITICAL: Duplication Prevention Checklist
Before creating ANY new code, the architect-agent MUST verify:

1. **Service Check**: Does a service with similar functionality already exist?
   - Search for services by functionality keywords
   - Check for utilities that could be extended
   - Look for partial implementations to enhance

2. **Event System Check**: Can this be achieved through events?
   - Identify existing event emitters/listeners
   - Check for event buses or message queues
   - Consider event-driven patterns over direct coupling

3. **Cross-Cutting Concerns Check**: Are there existing infrastructure components?
   - Search for middleware, guards, interceptors, decorators
   - Check for authentication, authorization, validation utilities
   - Look for logging, monitoring, error handling infrastructure

4. **Data Layer Check**: Can existing data patterns be reused?
   - Identify repositories and data access patterns
   - Check for ORM entities and migrations
   - Look for data transformation utilities

5. **Integration Check**: Are there existing integration points?
   - Search for API clients and webhooks
   - Check for queue processors and job handlers
   - Look for external service integrations

6. **Base Class Consolidation Check**: Are there multiple base abstractions for the same purpose?
   - Search for duplicate BaseRepository, BaseService, BaseController patterns
   - Check for divergent implementations of the same concept
   - Identify opportunities to consolidate onto single abstractions

7. **Direct ORM Usage Check**: Prevent direct database access outside repositories
   - Scan for Prisma/TypeORM/Mongoose usage in services
   - Verify all data operations go through repository layer
   - Flag any business logic containing direct database calls

## Expected Outputs (PLANNING ARTIFACTS ONLY)

### PRIMARY OUTPUT: Linear Ticket Documentation
**The adaptation phase should document ALL planning and guidance DIRECTLY in the Linear ticket comment.**

### CRITICAL: External Documentation Guidelines
**External markdown files should ONLY be created when ALL of the following conditions are met:**
1. **Implementation is exceptionally complex** (requires >5 distinct technical areas)
2. **Long-term documentation value exists** (will be referenced beyond initial implementation)
3. **Cannot be adequately captured in Linear comment** (exceeds reasonable comment length)
4. **Provides architectural significance** (establishes patterns for future features)

**DEFAULT BEHAVIOR: Document everything in Linear ticket comment - NO external files**

### Deliverables (In Order of Priority):
1. **Linear Adaptation Report** (REQUIRED): Comprehensive structured adaptation results added DIRECTLY to ticket comment
   - Service reuse inventory with usage instructions
   - Implementation steps with reuse mandates
   - Test specifications and coverage requirements
   - Integration notes and anti-duplication verification
   - Event architecture plan
   - Reuse metrics and duplication prevention score

2. **Feature Branch** (IF NEEDED): Created if necessary, ready for implementation phase

3. **External Markdown Files** (RARE - HIGH BAR TO CREATE):
   - Only for exceptionally complex implementations
   - Must provide long-term architectural value
   - Should be referenced from Linear comment
   - Examples: New microservice architecture, complex state machine design, multi-system integration

**REMINDER**: The Linear ticket comment is the PRIMARY deliverable. External files are EXCEPTIONS requiring strong justification. Actual code implementation happens in the implementation phase.

## Worktree and Branch Creation Strategy

### Overview: Git Worktrees for Concurrent Development

This workflow uses **git worktrees** to enable complete isolation between concurrent development sessions. Each ticket gets its own working directory, preventing interference between multiple AI agents working in parallel.

**Key Benefits:**
- ✅ Complete file system isolation - no conflicts between concurrent agents
- ✅ No context switching - each agent works in dedicated directory
- ✅ Clean commit history - changes isolated until merge
- ✅ Easy debugging - inspect any worktree independently
- ✅ Automatic cleanup - worktrees removed after merge

**Worktree Location:** `.worktrees/[ticket-id]` inside the target repository (gitignored)

---

## Branch Decision Based on Ticket Complexity:

**DECISION TREE FOR BRANCH CREATION:**

1. **For Single Ticket (No Decomposition)**:
   - Check current branch: Run `git branch --show-current`
   - If on `main` or `master` → CREATE new feature branch
   - If on existing feature branch → EVALUATE:
     - Does branch name match the ticket/feature? → USE existing branch
     - Is this a different feature/ticket? → CREATE new feature branch
   - Format: `feature/[ticket-id]-[brief-description]`

2. **For Multi-Ticket Project (With Decomposition)**:
   - ALWAYS create ONE project-level branch for ALL subtickets
   - Format: `project/[project-name]` (e.g., `project/user-management-system`)
   - DO NOT create individual branches per subticket
   - All implementation work happens in the shared project branch

3. **Check for existing related branches**: 
   - Run `git branch -r | grep -i [ticket-id or project-name]`
   - If matching branch exists → ASK user before creating new one

### Git Worktree and Branch Management Commands:

```bash
# STEP 1: Determine repository root and current state
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)
TICKET_ID="$1"  # From command argument
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${TICKET_ID}"

echo "Repository: $REPO_ROOT"
echo "Current branch: $CURRENT_BRANCH"
echo "Target worktree: $WORKTREE_PATH"

# STEP 2: Check for existing worktree
if [ -d "$WORKTREE_PATH" ]; then
    echo "⚠️  Existing worktree found for $TICKET_ID"

    # Get worktree status
    cd "$WORKTREE_PATH"
    EXISTING_BRANCH=$(git branch --show-current)
    UNCOMMITTED=$(git status --porcelain | wc -l)

    echo "  Branch: $EXISTING_BRANCH"
    echo "  Uncommitted changes: $UNCOMMITTED files"
    cd "$REPO_ROOT"

    # Use AskUserQuestion tool to prompt user
    # Options:
    # 1. "Reuse existing worktree" - Continue with current work
    # 2. "Remove and recreate" - Start fresh (⚠️  DESTROYS changes)
    # 3. "Cancel operation" - Stop and investigate manually

    # Based on user choice:
    # - If "Reuse": Skip worktree creation, use existing
    # - If "Remove and recreate": git worktree remove "$WORKTREE_PATH" --force
    # - If "Cancel": Exit adaptation command
fi

# STEP 3: Detect parent branch and determine merge target
# This allows worktrees to merge back to feature branches, not just main
PARENT_BRANCH=$(git branch --show-current)

# Determine if current branch is a feature branch that should be the merge target
if [[ "$PARENT_BRANCH" =~ ^(feature|feat|project)/ ]] && \
   [[ "$PARENT_BRANCH" != "main" ]] && \
   [[ "$PARENT_BRANCH" != "master" ]]; then
    # We're on a feature branch - use it as merge target
    MERGE_TARGET="$PARENT_BRANCH"
    BASE_BRANCH="$PARENT_BRANCH"
    echo "✅ Parent feature branch detected: $PARENT_BRANCH"
    echo "   This ticket will merge back to: $MERGE_TARGET (NOT main)"
    echo "   Worktree will be created from: $BASE_BRANCH"
else
    # Default: merge to main
    MERGE_TARGET="main"
    BASE_BRANCH="origin/main"
    echo "📍 Merge target: $MERGE_TARGET"
    echo "   Worktree will be created from: $BASE_BRANCH"
fi

# STEP 4: Create worktree with new branch (if needed)
BRANCH_NAME="feature/${TICKET_ID}-[brief-description]"

# Ensure .worktrees directory exists
mkdir -p "${REPO_ROOT}/.worktrees"

# Ensure .gitignore excludes .worktrees/
if [ -f "${REPO_ROOT}/.gitignore" ]; then
    if ! grep -q "^\.worktrees/" "${REPO_ROOT}/.gitignore"; then
        echo "Adding .worktrees/ to .gitignore..."
        echo ".worktrees/" >> "${REPO_ROOT}/.gitignore"
        echo ".worktree-registry.json" >> "${REPO_ROOT}/.gitignore"
    fi
else
    # Create .gitignore if it doesn't exist
    cat > "${REPO_ROOT}/.gitignore" << 'EOF'
# Git worktrees for concurrent development
.worktrees/
.worktree-registry.json
EOF
fi

# Fetch latest changes
echo "Fetching latest from origin..."
git fetch origin

# Create worktree with new branch from parent branch or main
echo "Creating worktree for $TICKET_ID from $BASE_BRANCH..."
if git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" "$BASE_BRANCH"; then
    echo "✅ Worktree created successfully!"
    echo "   Path: $WORKTREE_PATH"
    echo "   Branch: $BRANCH_NAME"

    # Validate worktree
    cd "$WORKTREE_PATH"
    VERIFY_BRANCH=$(git branch --show-current)
    if [ "$VERIFY_BRANCH" = "$BRANCH_NAME" ]; then
        echo "✅ Worktree validation passed"
    else
        echo "❌ WARNING: Branch mismatch in worktree"
    fi
    cd "$REPO_ROOT"
else
    echo "❌ ERROR: Failed to create worktree"
    echo "Common causes:"
    echo "  - Branch '$BRANCH_NAME' already exists"
    echo "  - Worktree path conflicts"
    echo "Troubleshooting:"
    echo "  - List worktrees: git worktree list"
    echo "  - List branches: git branch -a"
    echo "  - Prune stale: git worktree prune"
    exit 1
fi

# STEP 4: Document worktree path for downstream commands
# This will be added to Linear ticket comment
WORKTREE_INFO="**Worktree Path**: \`$WORKTREE_PATH\`"

# IMPORTANT: Do NOT cd into worktree during adaptation
# The implementation phase will work within the worktree
# Adaptation stays in the main repository directory
```

### Worktree Management Guidelines:
- **ALWAYS create worktree** for single tickets (provides isolation)
- **ASK user** when existing worktree detected (reuse vs recreate)
- **DOCUMENT worktree path** in Linear ticket comment (required for downstream commands)
- **STAY in main repo** during adaptation (don't cd into worktree)
- **VALIDATE .gitignore** excludes .worktrees/ directory
- **VERIFY worktree** is created correctly before proceeding

## Linear Adaptation Report Format

After completing the adaptation analysis, add the following structured comment to the Linear ticket:

### For Single Ticket (No Decomposition):
```markdown
## 🎯 Adaptation Results

### Adaptation Status: COMPLETE

### 🔄 Service Reuse Analysis (CRITICAL FOR PREVENTING DUPLICATION)
- **Existing Services to Reuse**: 
  - [Service Name]: [How it will be used instead of creating new code]
  - [Guard/Decorator]: [Which existing security components to apply]
  - [Event System]: [Events to emit/listen instead of direct calls]
- **Duplication Prevention Score**: [X services reused / Y total needed]
- **New Code Justification**: [Why any new code is absolutely necessary]
- **Anti-Patterns Avoided**: [List of duplications prevented]

### 📐 Requirements Analysis
- **Feature Scope**: [Summary of what will be built]
- **Discovery Status**: [Used provided report / Performed quick discovery]
- **Pattern Matching**: [Existing patterns to follow with specific examples]
- **Architecture Decisions**: [How feature fits existing architecture WITHOUT DUPLICATION]
- **Dependencies**: [EXISTING services and libraries to reuse]

### 📁 Implementation Plan
- **Services to Reuse** (DO NOT RECREATE):
  - [Existing service/utility]: [Specific methods/features to use]
  - [Common guards/decorators]: [Which to apply and where]
  - [Shared utilities]: [Helper functions to leverage]
- **Files to Create** (ONLY IF NO ALTERNATIVE EXISTS): 
  - [List of new files with justification why existing code cannot be reused]
- **Files to Modify**: 
  - [Existing files that need changes with specific modifications]  
- **Event Architecture**:
  - Events to Emit: [Instead of direct service calls]
  - Events to Listen: [For reactive behavior]
- **Component Structure**: [How new components extend/compose existing ones]
- **Database Changes**: [Reusing existing schemas/repositories where possible]

### 🧪 Test Strategy
- **Existing Test Utilities to Reuse**: [Test helpers, mocks, fixtures already available]
- **Unit Tests**: [Test files following existing patterns]
- **Integration Tests**: [Leveraging existing test infrastructure]
- **Security Tests**: [Using existing security test utilities]
- **Performance Tests**: [Reusing existing performance test frameworks]

### 🔗 Integration Points
- **Existing Services Integration**:
  - [Service]: [Methods to call, events to emit]
  - [Repository]: [Existing data access to leverage]
  - [Queue/Job]: [Existing processors to extend]
- **API Endpoints**: [Extending existing controllers where possible]
- **Database Layer**: [Reusing existing repositories and entities]
- **Frontend Components**: [Composing from existing component library]
- **External Services**: [Leveraging existing integrations]

### 🛡️ Infrastructure Reuse Strategy
- **Existing Middleware/Guards**: [List applicable middleware, guards, interceptors]
- **Existing Decorators**: [List reusable decorators and their purposes]
- **Shared Services**: [Authentication, validation, transformation services to reuse]
- **Common Utilities**: [Helpers, formatters, processors already available]

### 🛠️ Development Environment
- **Worktree Path**: `[absolute-path-to-worktree]` ⚠️ **CRITICAL: All downstream commands read this path**
- **Branch**: `[branch-name]` (created in worktree)
- **Parent Branch**: `[parent-branch-name]` (what this branch was created from)
- **Merge Target**: `[merge-target-branch]` ⚠️ **CRITICAL: Security review will merge to this branch**
  - [If feature branch]: `feature/large-feature` (merges to parent feature branch, NOT main)
  - [If main]: `main` (merges directly to main)
- **Worktree Status**:
  - [If new worktree created]: ✅ New worktree created and validated
  - [If reusing worktree]: ♻️ Reusing existing worktree (user confirmed)
- **Build Requirements**: [Any new build steps or configuration changes]
- **Environment Variables**: [Reusing existing env vars where possible]

**Important**: Implementation, testing, documentation, code review, and security review phases will automatically work within this worktree. User does not need to manually navigate to worktree.

**Merge Flow**: When security review passes, the worktree branch will be merged to **`[merge-target-branch]`**, then the worktree will be removed. If merging to a feature branch, that feature branch must eventually be merged to main separately.

### ✅ Implementation Readiness Checklist
- [x] Requirements fully understood and documented
- [x] ALL EXISTING SERVICES INVENTORIED FOR REUSE
- [x] Duplication prevention analysis complete
- [x] Event-driven patterns identified over direct coupling
- [x] Security infrastructure reuse planned
- [x] Patterns and conventions identified with examples
- [x] Implementation approach validated against discovery findings
- [x] Test strategy defined using existing test infrastructure
- [x] Branch strategy determined (created new / using existing / staying on current)
- [x] Integration points clearly documented WITHOUT DUPLICATION
- [x] Ready for implementation handoff WITH REUSE MANDATES

### 🎯 Next Steps for Implementation Phase
1. Implementation MUST follow service reuse directives
2. MUST NOT create new code for functionality that exists
3. MUST use event patterns where specified
4. MUST apply existing infrastructure components
5. Create DRAFT PR when implementation begins
6. Reference this adaptation plan throughout development

### ⚠️ Duplication Prevention Warnings
- DO NOT recreate functionality that exists in shared modules
- DO NOT implement custom solutions for solved problems
- DO NOT create direct service dependencies where events/messaging exists
- DO NOT duplicate data access patterns or repositories
- DO NOT build new infrastructure for cross-cutting concerns

**Adaptation Completed**: [Date/Time]
**Architect Agent**: Used for comprehensive analysis and adaptation
**Services Reused**: [X existing services identified for reuse]
**Duplication Prevented**: [Y potential duplications avoided]
**Worktree Created**: `[worktree-path]`
**Feature Branch**: `[branch-name]` (in worktree)
**Next Phase**: Ready for Implementation WITH MANDATORY REUSE (will execute in worktree)
```

### For Multi-Ticket Project (With Decomposition):
```markdown
## 🎯 Large Feature Decomposition Results

### Decomposition Status: COMPLETE

### 📋 Project Information
- **Project Created**: [Project Name]
- **Project ID**: [Linear Project ID]
- **Parent Ticket**: [Parent Ticket ID]
- **Subtickets Created**: [Number] subtickets
- **Project Branch**: `project/[project-name]`
- **Estimated Total Effort**: [Days/Sprints]

### 🔗 Subticket Breakdown
1. **[Subticket ID]**: [Title]
   - Area: [Backend/Frontend/Database/Integration]
   - Estimate: [Days]
   - Dependencies: [Other subticket IDs if any]

2. **[Subticket ID]**: [Title]
   - Area: [Component area]
   - Estimate: [Days]
   - Dependencies: [Dependencies]

[Continue for all subtickets...]

### 🏗️ Implementation Strategy
- **Shared Branch**: All work in `project/[project-name]`
- **Integration Points**: [How subtickets connect]
- **Testing Strategy**: [Integrated testing approach]
- **PR Strategy**: Single PR for entire project

### 🔄 Service Reuse Across Subtickets
- **Shared Services**: [Services used by multiple subtickets]
- **Common Infrastructure**: [Shared guards, middleware, etc.]
- **Event Architecture**: [Cross-subticket event communication]

### ⚠️ Critical Notes
- All subtickets linked to parent via Linear parent-child relationships
- Single project branch for ALL implementation work
- Commits reference individual subticket IDs
- Final PR encompasses entire project scope

**Project Created**: [Date/Time]
**Next Phase**: Implementation begins with first subticket
```

## Success Criteria

Adaptation is successful when:

### For All Tickets:
- **ALL existing services inventoried** and reuse opportunities identified
- **Duplication prevention score calculated** showing high reuse percentage
- **Event-driven patterns prioritized** over direct service coupling
- **Security infrastructure mapped** for complete reuse of guards/decorators
- Requirements fully mapped to existing codebase patterns with specific examples
- Implementation guide **MANDATES reuse** with explicit directives
- **Anti-duplication warnings** prominently displayed
- All patterns and conventions properly documented WITH REUSE EMPHASIS
- Test specifications ensure adequate coverage USING EXISTING UTILITIES
- Integration points clearly defined WITHOUT CREATING DUPLICATES

### For Single Tickets:
- **Worktree created** in `.worktrees/[ticket-id]` with isolated working directory
- Feature branch created in worktree following `feature/[ticket-id]-[description]` format
- **Worktree path documented** in Linear ticket comment (required for downstream commands)
- `.gitignore` updated to exclude `.worktrees/` directory
- Linear ticket updated with comprehensive adaptation report including worktree path
- Clear handoff prepared for implementation phase with worktree isolation enabled

### For Multi-Ticket Projects:
- **Complexity assessment properly justified** (≥4 areas, >2 days each, >1 sprint total)
- **Linear project created** with appropriate metadata
- **All subtickets properly linked** to parent via parentId
- **Single project branch created** following `project/[name]` format
- **NO individual ticket branches** created
- **Subticket titles clean** (no parent ID references)
- Parent ticket updated with project information
- Clear implementation sequence defined across subtickets

### Common Requirements:
- Ticket remains in "In Progress" status (only documentation phase marks as done)
- Clear handoff prepared for implementation phase WITH MANDATORY REUSE REQUIREMENTS

## Workflow Orchestration

### Linear Status Management:
- **Start**: Update ticket status to "In Progress" when beginning adaptation
- **Branch Evaluation**: Check current branch state and determine if new branch needed (create WITHOUT switching if required)
- **Complete**: Add comprehensive adaptation report comment to Linear ticket (do NOT mark as done)
- **Handoff**: Provide complete implementation roadmap with clear branch strategy documented
- **Important**: Only documentation phase marks ticket as "Done"

The adaptation phase, powered by the architect-agent, bridges planning and implementation by providing detailed guidance that ensures code consistency and quality. It can operate independently by performing its own discovery when needed, eliminating dependencies on previous phases while maintaining comprehensive analysis quality. This phase prepares everything for implementation including branch setup and comprehensive Linear tracking.
