# Technical Reference

Complete command documentation, agent specifications, and architecture details for PM Vibe Code Operations.

**For non-technical users**: See [PM_GUIDE.md](PM_GUIDE.md) instead.

---

## Table of Contents

1. [Command Reference](#command-reference)
2. [Specialized Agents](#specialized-agents)
3. [Git Worktree Architecture](#git-worktree-architecture)
4. [Workflow Integration](#workflow-integration)
5. [Repository Structure](#repository-structure)
6. [Best Practices](#best-practices)

---

## Command Reference

### Project-Level Commands

These commands run at recurring intervals throughout the project lifecycle—not just once at setup. Service inventory runs after major codebase changes, discovery runs before each epic planning phase, epic planning runs for each new feature or PRD, and planning runs for each new epic.

#### `/generate_service_inventory`

**Purpose**: Creates comprehensive inventory of all existing services, utilities, and infrastructure components to prevent duplication.

**Usage**: `/generate_service_inventory [root-path] [output-file]`

**Examples**:
```bash
# Scan src directory, output to inventory.md
/generate_service_inventory ./src inventory.md

# Scan entire project
/generate_service_inventory . services-inventory.md
```

**Key Features**:
- Catalogs all services, utilities, helpers, and components
- Maps middleware, guards, decorators, and interceptors
- Documents event systems and data access patterns
- Creates reuse matrix for future development

**Output**: Markdown file with complete service catalog and reuse recommendations.

**Time**: 2-5 minutes

---

#### `/discovery`

**Purpose**: Analyzes codebase structure, patterns, and architectural decisions before implementation.

**Usage**: `/discovery [ticket-id] [codebase-path] [focus-areas]`

**Examples**:
```bash
# Basic discovery
/discovery prd.md ProjectName ./src

# With focus areas
/discovery user-profile-prd.md MyApp ./src "user management, data storage"
```

**Key Features**:
- Maps directory structure and technology stack
- Identifies design patterns and conventions
- Documents integration points and dependencies
- Creates foundation for adaptation and planning

**Output**: Creates Linear ticket with discovery findings.

**Time**: 5-10 minutes

---

#### `/epic-planning`

**Purpose**: Transforms PRD and business requirements into capability-focused epics with comprehensive duplicate prevention.

**Usage**: `/epic-planning [prd-document] [discovery-report] [business-context] [strategic-focus]`

**Examples**:
```bash
# Basic epic planning
/epic-planning prd.md discovery-report.md

# With business context
/epic-planning prd.md DISC-001 "market-leader" "user-value"
```

**Key Features**:
- **Duplicate Prevention**: Multi-layered checks prevent creating duplicate epics
- Pre-flight verification of ALL existing epics before creation
- Similarity scoring and execution plan with user approval
- Creates capability-focused epics (WHAT and WHY, not HOW)
- Quantifies business value for each epic
- Creates project for 4+ epics (Linear project, Jira board, etc.)
- Unique labels ensure idempotency if interrupted

**Duplicate Prevention Workflow**:
1. Queries and documents all existing epics
2. Cross-references each new capability against existing work
3. Creates execution plan (CREATE/SKIP/UPDATE) for user approval
4. Atomic creation with tracking prevents partial states
5. Recovery procedures if duplicates detected

**Ticketing System Integration**:
- **Project Management**: Appends epic planning summary to project description
- **Milestone Creation**: Creates milestones for delivery phases
- **Epic Association**: Links epics to appropriate project milestones with unique labels
- **Business Metrics**: Tracks user outcomes and success metrics in epic descriptions

**Output**: Creates epics in Linear/Jira with complete business context.

**Time**: 10-15 minutes + 20-30 minutes PM review

---

#### `/planning`

**Purpose**: Technical decomposition - breaks epics into actionable sub-tickets with proper dependencies.

**Usage**: `/planning <epic-ids> [--prd <prd-file>] [--discovery <discovery-report>] [--context <additional-context>]`

**Examples**:
```bash
# Single epic
/planning LIN-123

# Multiple epics with discovery
/planning LIN-123,LIN-124 --discovery discovery-report.md

# Epic with all context sources
/planning LIN-456 --prd requirements.md --discovery discovery.md --context "Must support 10k concurrent users"

# Process all epics in a project
/planning PROJ-789 --discovery discovery.md
```

**Key Features**:
- **Primary Input**: Epic IDs (comma-separated) or Project ID
- **Optional Context**:
  - `--prd`: Original PRD for detailed requirements
  - `--discovery`: Technical patterns and service inventory
  - `--context`: Ad-hoc constraints or requirements
- **Sub-ticket Creation**: All tickets created as children of parent epics
- **Technical Sizing**: 2-8 hour implementation chunks
- **Dependencies**: Maps blocking relationships between sub-tickets
- **Context Priority**: Epic → User context → Discovery → PRD

**Output**: Creates sub-tickets in ticketing system with technical specifications.

**Time**: 5-10 minutes + 15 minutes PM review

---

### Ticket-Level Commands

These commands run for each individual ticket through the development lifecycle.

#### `/adaptation`

**Purpose**: Creates a comprehensive implementation guide for a specific ticket, analyzing service reuse opportunities and determining the optimal implementation approach.

**Usage**: `/adaptation [ticket-id]`

**Examples**:
```bash
/adaptation TICKET-201
/adaptation LIN-456
```

**Key Features**:
- Analyzes service inventory for reuse opportunities
- Identifies existing patterns and infrastructure to leverage
- Creates adaptation guide specifying which services/components to use
- Maps event-driven patterns where applicable
- Documents anti-duplication requirements
- Provides implementation recommendations for the ticket

**Output**: Updates ticket with detailed adaptation guide.

**Time**: 5-10 minutes

---

#### `/implementation`

**Purpose**: Executes feature development following the adaptation guide with proper Git/PR management.

**Usage**: `/implementation [ticket-id]`

**Examples**:
```bash
/implementation TICKET-201
```

**Key Features**:
- Creates feature branches automatically
- Implements features following adaptation guide recommendations
- Reuses services and patterns identified in adaptation phase
- Updates ticket status in real-time
- Creates draft PR with proper documentation

**Output**: Feature branch with implemented code, draft PR created.

**Time**: 2-4 hours (AI autonomous)

---

#### `/testing`

**Purpose**: Builds comprehensive test suites using the QA engineer agent, then runs and fixes tests until they all pass.

**Usage**: `/testing [ticket-id] [test-scope] [coverage-target] [test-types]`

**Examples**:
```bash
# Basic testing with defaults
/testing TICKET-201

# Specific coverage target
/testing TICKET-201 unit,integration 90

# Comprehensive testing
/testing TICKET-201 unit,integration,e2e 95
```

**Key Features**:
- QA agent builds test suite following existing patterns
- Achieves specified coverage targets (default 90%)
- Implements unit, integration, edge case, and security tests
- Automatically runs tests and fixes failures in a loop
- Commits passing test suite as part of ticket work
- Updates PR with final test results

**Testing Philosophy** (Accuracy-First):
1. API Accuracy (100% required) - Use actual implementation
2. Compilation (100% required) - Zero TypeScript errors
3. Execution (100% required) - Tests must run
4. Coverage (secondary) - 70-90% after gates 1-3

**Priority Testing**:
- **High**: Complex business logic, financial calculations, auth/authz, data transformation
- **Low/Skip**: Simple CRUD without logic, configuration files, UI without behavior

**Output**: Passing test suite committed to feature branch.

**Time**: 30-60 minutes + 10 minutes PM review

---

#### `/documentation`

**Purpose**: Creates comprehensive documentation using the technical writer agent after testing is complete. Does NOT close the ticket—subsequent phases (code review, security review) still follow.

**Usage**: `/documentation [ticket-id]`

**Examples**:
```bash
/documentation TICKET-201
```

**Key Features**:
- Technical writer agent generates API documentation
- Creates user guides and inline code documentation
- Ensures 100% JSDoc coverage for public APIs
- Generates examples and usage patterns
- Creates README updates if needed
- Commits documentation with the feature code
- **Keeps ticket "In Progress" for subsequent review phases**

**Output**: Documentation committed to feature branch, ticket remains open.

**Time**: 15-20 minutes + 10 minutes PM review

---

#### `/codereview`

**Purpose**: Performs thorough code quality review focusing on patterns, best practices, and maintainability.

**Usage**: `/codereview [ticket-id]`

**Examples**:
```bash
/codereview TICKET-201
```

**Key Features**:
- Analyzes code quality and pattern adherence
- Checks for performance issues and anti-patterns
- Reviews PR comments for addressed concerns
- Adds `code-reviewed` label to PR
- Verifies documentation completeness

**What It Checks**:
- Code follows existing patterns
- No anti-patterns detected
- Performance concerns addressed
- Documentation complete
- Tests comprehensive

**Output**: Review comments on PR, `code-reviewed` label added.

**Time**: 10-15 minutes + 5 minutes PM review

---

#### `/security_review`

**Purpose**: Conducts comprehensive security assessment against OWASP Top 10 and CVE databases. This is the final gate that closes Linear tickets.

**Usage**: `/security_review [ticket-id]`

**Examples**:
```bash
/security_review TICKET-201
```

**Key Features**:
- Performs OWASP Top 10 vulnerability assessment
- Checks for latest CVEs in frameworks
- Reviews authentication and authorization
- Implements security fixes when issues found
- **Final quality gate before deployment**
- **Closes Linear ticket as "Done" when no critical/high issues found**
- **Keeps ticket open if critical/high issues need fixing**

**Security Checks**:
- SQL injection vulnerabilities
- XSS (cross-site scripting) issues
- Authentication bypass risks
- Data exposure risks
- Permission/authorization holes
- Known CVEs in dependencies

**Output**: Security report, ticket closed if passing, fixes implemented if issues found.

**Time**: 15-20 minutes + 10 minutes PM review

---

## Specialized Agents

### Architect Agent

**Role**: System architecture, discovery, planning, and technical decomposition

**Expertise**:
- Codebase analysis and pattern recognition
- Requirements decomposition into tickets
- Technology evaluation and decision-making
- Architectural consistency enforcement
- Precise technical landscape documentation

**Key Responsibilities**:
- Creates comprehensive service inventories with exact paths and capacities
- Maps existing infrastructure, APIs, and data models precisely
- Breaks down epics into technical tickets while preserving context
- Identifies reuse opportunities with specific service references
- Documents technical constraints and performance baselines

**Used By**: `/discovery`, `/planning`, `/adaptation`

---

### Backend Engineer Agent

**Role**: Server-side implementation with security and scalability focus

**Expertise**:
- REST API and GraphQL development
- Database operations and optimization
- Authentication and authorization systems
- Microservices and event-driven architecture

**Key Responsibilities**:
- Implements secure API endpoints
- Follows repository pattern for data access
- Ensures proper error handling and logging
- Maintains performance standards

**Used By**: `/implementation` (for backend code)

---

### Frontend Engineer Agent

**Role**: UI implementation following world-class design standards

**Expertise**:
- React/Next.js component development
- Design system implementation
- Accessibility (WCAG 2.2 AA) compliance
- Performance optimization (Core Web Vitals)

**Key Responsibilities**:
- Builds reusable component libraries
- Implements responsive, accessible interfaces
- Ensures design-code parity (±2px tolerance)
- Optimizes for Core Web Vitals targets

**Used By**: `/implementation` (for frontend code)

---

### QA Engineer Agent

**Role**: Comprehensive testing strategy and implementation

**Expertise**:
- Test pyramid implementation (70% unit, 20% integration, 10% E2E)
- Security and penetration testing
- Performance testing and benchmarking
- Accessibility testing automation

**Key Responsibilities**:
- Creates comprehensive test suites
- Identifies edge cases and failure modes
- Implements test data factories
- Ensures 90%+ code coverage

**Used By**: `/testing`

---

### Technical Writer Agent

**Role**: Creating clear, comprehensive technical documentation

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

**Used By**: `/documentation`

---

### Security Engineer Agent

**Role**: Security analysis, threat modeling, and vulnerability assessment

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

**Used By**: `/security_review`

---

### Code Reviewer Agent

**Role**: Code quality analysis and pattern compliance verification

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

**Used By**: `/codereview`

---

### Design Reviewer Agent

**Role**: UI/UX review for design system compliance and quality

**Expertise**:
- Design token validation
- Accessibility compliance (WCAG 2.2 AA)
- Responsive design testing
- Performance validation

**Key Responsibilities**:
- Validates design-code parity
- Tests across viewports and browsers
- Ensures accessibility standards
- Reviews micro-interactions and animations

**Used By**: Optional UI/UX review phase

---

## Git Worktree Architecture

> **Note**: This section describes **Worktree Mode** in `claude/commands-worktrees/`. If you're using Simple Mode in `claude/commands/`, you can skip this section.

### Overview

The worktree mode uses **git worktrees** to enable true concurrent development with complete isolation between tickets. Each ticket gets its own working directory, eliminating conflicts when multiple AI agents or developers work in parallel.

**Key Benefits**:
- ✅ **Complete Isolation**: Each ticket has dedicated file system - no interference between concurrent work
- ✅ **No Context Switching**: Multiple Claude Code sessions can run simultaneously on different tickets
- ✅ **Clean History**: Changes isolated until merge, producing clean commit graphs
- ✅ **Easy Debugging**: Inspect any ticket's worktree independently without affecting others
- ✅ **Automatic Cleanup**: Worktrees merged and removed after ticket completion

### How It Works

1. **Adaptation Phase** (`/adaptation`):
   - Creates worktree in `.worktrees/[ticket-id]` directory
   - Creates feature branch in the worktree
   - Documents worktree path in Linear ticket for downstream commands

2. **Development Phases** (`/implementation`, `/testing`, `/documentation`, `/codereview`):
   - Auto-load worktree path from Linear ticket
   - Navigate to worktree directory automatically
   - All work happens in isolation
   - Changes committed to worktree's feature branch

3. **Security Review Phase** (`/security_review`):
   - Performs final security assessment
   - **Merges worktree branch to main** when review passes
   - **Removes worktree** automatically after successful merge
   - Closes Linear ticket (final gate)

### Concurrent Development Example

```bash
# Terminal 1: Agent working on authentication (TICKET-101)
claude code
/adaptation TICKET-101
/implementation TICKET-101
# Works in .worktrees/TICKET-101/

# Terminal 2: Agent working on payments (TICKET-102) - NO CONFLICT!
claude code
/adaptation TICKET-102
/implementation TICKET-102
# Works in .worktrees/TICKET-102/

# Both agents work simultaneously without any interference
```

### Worktree Lifecycle

```
Adaptation → Implementation → Testing → Documentation → Code Review → Security Review → Merge & Cleanup
    ↓             ↓             ↓            ↓               ↓               ↓              ↓
  CREATE      Navigate      Navigate     Navigate        Navigate        Navigate    MERGE + REMOVE
 worktree    to worktree   to worktree  to worktree     to worktree     to worktree   worktree
```

### Manual Worktree Inspection

Users can inspect any active worktree:

```bash
# List all active worktrees
git worktree list

# Navigate to specific ticket's worktree
cd .worktrees/TICKET-123

# View worktree status
git status

# Return to main repo
cd ../..
```

### Error Recovery

If a worktree becomes corrupted or needs cleanup:

```bash
# Remove specific worktree
git worktree remove .worktrees/TICKET-123

# Or force removal if needed
git worktree remove --force .worktrees/TICKET-123

# Clean up stale worktree metadata
git worktree prune
```

**See [WORKTREE_GUIDE.md](docs/WORKTREE_GUIDE.md) for comprehensive details.**

---

## Workflow Integration

### Ticketing System Integration

All commands integrate with your ticketing system via MCP (Linear recommended, Jira supported):
- **Epic Planning**: Creates projects, epics, and milestones
- **Technical Planning**: Creates sub-tickets under epics
- **Hierarchy**: Maintains proper parent-child relationships
- **Status Management**: Updates across all phases
- **Documentation**: Comments added to tickets at each step
- **Dependencies**: Tracks relationships between tickets

**MCP Servers**:
- Linear: [linear-mcp](https://github.com/QuantGeekDev/linear-mcp)
- Jira: [jira-mcp](https://github.com/zcaceres/jira-mcp)

### Git/GitHub Integration

Automated Git workflow management:
- Feature branch creation and management
- Draft PR creation with proper templates
- PR label management (code-reviewed, security-approved, etc.)
- Commit message standardization

### Quality Gates

Each phase adds quality labels to PRs:
- `code-reviewed` - Code review phase complete
- `security-approved` - Security review passed
- `tests-complete` - Testing phase finished
- `docs-complete` - Documentation added

---

## Repository Structure

```
pm-vibecode-ops/
├── claude/
│   ├── agents/                  # Specialized AI agent configurations (shared)
│   │   ├── architect_agent.md
│   │   ├── backend_engineer_agent.md
│   │   ├── code_reviewer_agent.md
│   │   ├── design_reviewer_agent.md
│   │   ├── frontend_engineer_agent.md
│   │   ├── qa_engineer_agent.md
│   │   ├── security_engineer_agent.md
│   │   └── technical_writer_agent.md
│   │
│   ├── commands/                # DEFAULT: Simple mode commands
│   │   ├── README.md            # Simple mode documentation
│   │   ├── adaptation.md
│   │   ├── codereview.md
│   │   ├── discovery.md
│   │   ├── documentation.md
│   │   ├── epic-planning.md
│   │   ├── generate_service_inventory.md
│   │   ├── implementation.md
│   │   ├── planning.md
│   │   ├── security_review.md
│   │   └── testing.md
│   │
│   └── commands-worktrees/      # EXPERIMENTAL: Worktree mode commands
│       ├── README.md            # Worktree mode documentation
│       ├── _worktree_helpers.md # Reusable git worktree utilities
│       ├── adaptation.md        # (with worktree logic)
│       └── ... (same commands with worktree integration)
│
├── codex/
│   └── prompts/                 # Platform-agnostic prompts (OpenAI Codex compatible)
│       └── [mirrors claude/commands/ - simple mode only]
│
├── docs/                        # Advanced documentation
│   ├── INSTALLATION.md          # Comprehensive installation guide
│   ├── SETUP_GUIDE.md           # Terminal basics for beginners
│   ├── MCP_SETUP.md             # MCP server configuration
│   ├── WORKTREE_GUIDE.md        # Git worktree technical reference
│   ├── WORKTREE_MIGRATION.md    # Switching between modes
│   └── TROUBLESHOOTING.md       # Common issues and solutions
│
├── PM_GUIDE.md                  # Non-technical guide for Product Managers
├── GET_STARTED.md               # Quick start and navigation
├── TECHNICAL_REFERENCE.md       # This file - complete technical documentation
├── EXAMPLES.md                  # Real-world case studies
├── FAQ.md                       # Common questions answered
├── GLOSSARY.md                  # Technical terms explained
├── CHANGELOG.md                 # Version history
├── LICENSE                      # CC BY 4.0
└── README.md                    # Value-oriented overview
```

---

## Best Practices

### Service Reuse

- Always check service inventory before creating new functionality
- Mandate reuse of existing services in tickets
- Prefer event-driven patterns over direct coupling
- Document anti-duplication requirements

### Branch Management

- Never commit to main/master branches
- Use consistent feature branch naming: `feature/[ticket-id]-description`
- Verify branch before any commits
- Keep all phases on same feature branch

### Scope Control

- Each phase handles only its responsibilities
- Implementation doesn't write tests
- Testing doesn't fix unrelated issues
- Security review doesn't fix code quality

### Documentation Standards

- 100% JSDoc coverage for public APIs
- No placeholder content or TODOs
- All code examples must be tested
- Document actual behavior, not intended

### Success Metrics

Commands track and report:
- **Reuse Rate**: Percentage of existing services leveraged
- **Coverage**: Test coverage percentages
- **Security Score**: OWASP compliance rating
- **Performance**: Core Web Vitals metrics
- **Quality**: Code review scores and findings

---

## Platform Comparison

| Feature | Claude Code Simple | Claude Code Worktree | OpenAI Codex |
|---------|-------------------|----------------------|--------------|
| **Command Style** | Slash commands | Slash commands | Copy-paste prompts |
| **Agents** | Specialized via Task tool | Specialized via Task tool | Platform-agnostic |
| **Installation** | Copy to `~/.claude/` | Copy to `~/.claude/` | Reference prompts |
| **Concurrency** | One ticket at a time | Multiple simultaneous | One at a time |
| **Git Strategy** | Feature branches | Isolated worktrees | Feature branches |
| **Complexity** | Low | Medium | Low |
| **Best For** | Beginners, standard workflow | Concurrent development | Flexibility, custom integration |

---

**For additional technical details, see:**
- [Installation Guide](docs/INSTALLATION.md)
- [Worktree Guide](docs/WORKTREE_GUIDE.md)
- [MCP Setup](docs/MCP_SETUP.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
