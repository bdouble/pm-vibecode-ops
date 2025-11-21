---
description: Create comprehensive documentation for implemented features, including API docs, user guides, and technical architecture documentation with real code examples.
allowed-tools: Task, Read, Write, Edit, Grep, Glob, LS, TodoWrite, Bash, Bash(gh pr comment:*), WebSearch, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__create_issue, mcp__linear-server__list_issues, mcp__linear-server__create_project, mcp__linear-server__list_projects, mcp__linear-server__list_teams
argument-hint: [ticket-id] [doc-types] [format] [update-strategy]
workflow-phase: documentation
closes-ticket: false
workflow-sequence: "testing → **documentation** → code-review → security-review"
---

You are acting as a **Technical Writer** responsible for creating clear, accurate, and comprehensive documentation for this ticket. Focus on developer-facing documentation with real code examples and practical usage guidance.

# ⚠️ IMPORTANT: Documentation Phase Does NOT Close Tickets

**Tickets remain 'In Progress' until security review passes.**
- After documentation completes, ticket proceeds to code review → security review
- Only security review has authority to close tickets
- Documentation adds the `docs-complete` label but keeps status as "In Progress"

---

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **Fetch ticket**: Use `mcp__linear-server__get_issue` with ticket ID
- **Update status**: Use `mcp__linear-server__update_issue` to set status
- **Add comments**: Use `mcp__linear-server__create_comment` for updates
- **List comments**: Use `mcp__linear-server__list_comments` to read existing comments
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

Create **minimal viable documentation (MVD)** for ticket **$1** focusing on **essential information only**, avoiding over-documentation and redundancy.

Doc types: ${2:-"essential"}
Output format: ${3:-"markdown"}  
Update strategy: ${4:-"minimal"}
Documentation approach: ${5:-"pragmatic"}

## CRITICAL: Linear Ticket and Comments Retrieval

**BEFORE ANY OTHER WORK**, retrieve the Linear ticket details AND all comments:
1. Use `mcp__linear-server__get_issue` with ticket ID $1 to get full ticket details
2. Use `mcp__linear-server__list_comments` with ticket ID $1 to get ALL comments
3. Analyze both the ticket body AND comments for:
   - Documentation requirements or expectations
   - User stories that need documentation
   - API contracts requiring documentation
   - Architecture decisions needing explanation
   - Known pain points requiring guides
   - Previous documentation feedback or requests

**Wait for the Linear MCP responses before proceeding with documentation.**

Use the **technical-writer-agent** to create **minimal viable documentation (MVD)**: focused, essential docs that provide value without redundancy or over-documentation.

## Worktree Context Setup

Before generating documentation, load the worktree context where implementation and tests reside:

```bash
TICKET_ID="$1"  # From command argument

# Get worktree path (consistent with adaptation phase pattern)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${TICKET_ID}"

echo "Loading worktree context for documentation..."
echo "Worktree: $WORKTREE_PATH"

# Validate worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "❌ ERROR: Worktree not found"
    echo "Run /adaptation $TICKET_ID first"
    exit 1
fi

# Navigate to worktree
ORIGINAL_DIR=$(pwd)
cd "$WORKTREE_PATH"

CURRENT_BRANCH=$(git branch --show-current)
echo "✅ Worktree context loaded"
echo "   Branch: $CURRENT_BRANCH"
echo "   Directory: $(pwd)"

# All documentation work happens in this worktree
# Return to original at end: cd "$ORIGINAL_DIR"
```

---

## Documentation Workflow

1. **Linear Context Loading**: Load ticket details and all comments (using MCP tools above)

2. **Worktree Context Loading**: Navigate to ticket's isolated worktree (see above section)

3. **PR Discovery**: Find existing PR for the ticket using GitHub CLI
4. **JSDoc Audit**: Review existing JSDoc from implementation phase, identify gaps and areas for enhancement
5. **JSDoc Enhancement**: Improve existing JSDoc with better descriptions, examples, edge cases, and cross-references
6. **Missing JSDoc Addition**: Add JSDoc to any functions/classes/methods missed during implementation
7. **Type Documentation**: Enhance TypeScript interface/type documentation with detailed property descriptions
8. **Complex Algorithm Documentation**: Add detailed step-by-step explanations for complex logic
9. **External API Documentation**: Create markdown docs for REST/GraphQL endpoints with examples
10. **User Guides**: Create step-by-step tutorials only for user-facing features
11. **Architecture Docs**: Document high-level design decisions and system components
12. **Integration**: Update README with quick start and API reference links
13. **Commit & Push**: Commit all inline and external documentation to worktree branch
14. **PR Comment**: Add documentation summary highlighting JSDoc coverage
15. **PR Finalization**: Update PR description, add final labels, move to READY FOR REVIEW
16. **Linear Integration**: Use `mcp__linear-server__create_comment` to add documentation summary, then use `mcp__linear-server__update_issue` to add label 'docs-complete' (status remains 'In Progress' - proceeding to code review)
17. **Return to Original Directory**: `cd "$ORIGINAL_DIR"` to exit worktree context

## Documentation Philosophy: Minimal Viable Documentation (MVD)

### Core Principles
- **Document the "why", not the "what"**: TypeScript already provides the "what"
- **Avoid redundancy**: Don't duplicate information available in types
- **Focus on complexity**: Only document non-obvious logic
- **Keep it alive**: Update docs with code changes, delete dead docs
- **Quality over quantity**: Small set of accurate docs > large outdated docs

### When to Document vs When NOT to Document

**DOCUMENT:**
- Complex business logic that isn't self-evident
- Non-obvious architectural decisions
- Security considerations and constraints
- Performance implications
- API endpoints (auto-generate with decorators)
- Critical user workflows

**SKIP DOCUMENTATION:**
- Self-documenting TypeScript interfaces
- Simple CRUD operations
- Getters/setters without logic
- UI components without complex behavior
- Configuration files
- Type definitions (already in TypeScript)

### TypeScript-First Documentation (Minimal JSDoc)

#### For TypeScript Files - Skip Type Information

**DOCUMENTATION TEMPLATES - For reference only:**
```typescript
// ❌ BAD: Redundant type information in TypeScript
// Example of what NOT to do - TypeScript already provides types
/**
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Session>} Session object
 */
async function authenticate(email: string, password: string): Promise<Session> {}

// ✅ GOOD: Only document the "why" and complex logic
// Example of proper documentation focus
/**
 * Implements rate limiting to prevent brute force attacks.
 * Locks account after 5 failed attempts within 15 minutes.
 */
async function authenticate(email: string, password: string): Promise<Session> {}
```

#### When Complex Logic DOES Need Documentation

**DOCUMENTATION TEMPLATES - For reference only:**
```typescript
// ✅ GOOD: Document complex algorithms
// Example template for documenting complex logic
/**
 * Uses exponential backoff with jitter to prevent thundering herd.
 * Algorithm: delay = random(0, min(cap, base * 2^attempt))
 * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
function calculateRetryDelay(attempt: number): number {
  // Complex implementation here
}

// ❌ BAD: Over-documenting simple TypeScript interfaces
// Example of what to avoid
interface User {
  id: string;      // No need for JSDoc - type is clear
  email: string;   // No need for JSDoc - type is clear
  createdAt: Date; // No need for JSDoc - type is clear
}
```

### Stack-Specific Documentation Strategies

#### Next.js/React Components
- **Skip**: Pure presentational components, Tailwind classes
- **Document**: Complex state management, performance optimizations
- **Auto-generate**: Use TypeScript props for self-documentation

#### NestJS APIs  
- **Use decorators**: @ApiTags, @ApiOperation auto-generate Swagger docs
- **Skip manual docs**: Let decorators + DTOs generate OpenAPI spec
- **Document only**: Complex business rules, rate limits, auth flows

#### Prisma/Database
- **Skip**: Schema documentation (self-evident in .prisma files)
- **Document**: Migration strategies, performance indexes, data relationships

#### Bull/Redis Queues
- **Document**: Job retry strategies, failure handling
- **Skip**: Queue configuration (in code already)

### External Documentation (Only When Essential)

#### API Documentation (Auto-Generated)

**DOCUMENTATION TEMPLATE - For reference only:**
```typescript
// NestJS example - decorators auto-generate docs
// This is a template showing how decorators handle documentation
@ApiOperation({ summary: 'Create user' })
@ApiResponse({ status: 201, type: UserDto })
@Post('users')
createUser(@Body() dto: CreateUserDto) {}
// No manual API docs needed!
```

#### Critical User Workflows (Only if complex)
- Document ONLY workflows that aren't intuitive
- Use diagrams/flowcharts instead of long text
- Link to code rather than duplicating logic

## Quality Criteria for MVD

### Documentation Health Metrics
- **Relevance**: Every doc serves a clear purpose
- **Freshness**: Docs updated with code changes
- **Brevity**: Say more with less
- **Accuracy**: No outdated or incorrect information
- **Discoverability**: Easy to find what you need

### Red Flags (Over-Documentation)
- JSDoc that duplicates TypeScript types
- Multi-paragraph function descriptions
- Documentation for self-evident code
- Extensive docs for internal/private methods
- Tutorial-style docs for simple CRUD operations

## Expected Outputs (Minimal & Focused)

### Developer Documentation (Inline)
- **Minimal JSDoc**: Only for complex/non-obvious logic
- **No Type Duplication**: Let TypeScript handle type documentation
- **Brief Comments**: One-line explanations where needed
- **Reference Links**: Links to design docs/tickets instead of inline essays

### API Documentation (Auto-Generated)
- **NestJS**: OpenAPI/Swagger from decorators
- **GraphQL**: Self-documenting schema
- **No Manual API Docs**: Use tools, not manual writing

### External Documentation (Only if Essential)
- **README**: Quick start + link to auto-generated API docs
- **Complex Workflows**: Diagrams for non-intuitive processes
- **Architecture Decision Records**: Brief "why" documents
- **Skip**: User guides for standard CRUD operations

## Linear Documentation Report Format

After completing the documentation work, add the following structured comment to the Linear ticket:

```markdown
## 📚 Minimal Viable Documentation Summary

### Documentation Status: [COMPLETE/IN_PROGRESS]

### 🎯 Documentation Metrics (MVD Approach)
- **Complex Functions Documented**: X functions with non-obvious logic
- **Skipped Trivial Documentation**: X functions/interfaces left self-documenting
- **Auto-Generated API Docs**: ✅ OpenAPI/Swagger from decorators
- **TypeScript Self-Documentation**: ✅ Types serve as documentation
- **Documentation Debt Avoided**: ~X lines of unnecessary docs NOT written

### 📊 Documentation Efficiency
- **Docs-to-Code Ratio**: X:Y (lower is better)
- **Time Saved**: ~X hours by avoiding over-documentation
- **Maintenance Burden**: MINIMAL - only essential docs to maintain

### ✅ What Was Documented (Essential Only)
- [✅] Complex business logic requiring explanation
- [✅] Non-obvious architectural decisions
- [✅] Security constraints and considerations
- [✅] Performance optimization rationale
- [✅] API endpoints via decorators (auto-generated)

### ❌ What Was Intentionally NOT Documented
- [✅] Self-documenting TypeScript interfaces
- [✅] Simple CRUD operations
- [✅] Trivial getters/setters
- [✅] UI components without complex logic
- [✅] Configuration that's self-evident in code

### 📊 MVD Statistics
- **Docs Added**: X lines (minimal, high-value only)
- **Docs Avoided**: ~X lines of redundant documentation
- **Auto-Generated**: X API endpoints via decorators
- **Self-Documenting**: X TypeScript interfaces/types

### ✨ Key MVD Achievements
- **Zero redundancy** with TypeScript types
- **Auto-generated API docs** via NestJS decorators
- **Focused documentation** only where it adds value
- **Future-proof** - minimal maintenance burden
- **Developer-friendly** - code is self-documenting

### 🎯 Documentation Philosophy Applied
✅ Documented the "why", not the "what"
✅ Avoided duplication of type information
✅ Kept documentation minimal but sufficient
✅ Leveraged tooling over manual documentation
✅ Created living docs that will stay fresh

### 🎯 Next Steps
- Documentation phase complete - proceeding to code review
- Code review will assess documentation quality and completeness
- Security review will follow after code review passes
- Inline documentation ensures code is self-documenting for future developers

**Documentation Completed**: [Date/Time]
**Technical Writer**: Technical Writing Agent (Automated Analysis)
**Documentation Approach**: Balanced inline and external documentation

**Ticket Status**: Remains "In Progress" - proceeding to code review phase
```

## Branch Safety and Commit Process

### Branch Verification:
Before making ANY documentation commits, verify you're on the feature branch:
```bash
# Check current branch
current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

# CRITICAL: Verify NOT on main/master
if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
    echo "ERROR: On main branch! Cannot commit documentation"
    echo "Switch to the feature branch used in implementation phase"
    exit 1
fi

# Verify on a feature branch (common patterns)
if [[ "$current_branch" =~ ^(feature|feat|fix|hotfix|bugfix|docs)/ ]] || \
   [[ "$current_branch" =~ ^[A-Z]+-[0-9]+ ]]; then
    echo "✓ On feature branch: $current_branch"
else
    echo "INFO: Branch name '$current_branch' doesn't follow common patterns"
    echo "Proceeding with documentation on current branch"
fi
```

### Committing Documentation:
After completing all documentation:
```bash
# Stage all modified source files with JSDoc
git add .

# Commit with descriptive message emphasizing inline documentation
git commit -m "docs: add comprehensive JSDoc documentation for [TICKET-ID]

- Add JSDoc comments to all public functions and classes
- Document TypeScript interfaces and types
- Add inline comments for complex algorithms
- Include usage examples in JSDoc blocks
- Create external API docs where needed
- Update README with quick start guide"

# Push to feature branch
git push origin HEAD
```

## Linear Ticket Status Management

**IMPORTANT - Order of Operations:**
1. First: Complete all documentation work
2. Second: Commit documentation to feature branch
3. Third: Add final PR comment with documentation summary
4. Fourth: Add comprehensive documentation report comment to Linear ticket using `mcp__linear-server__create_comment`
5. Fifth: Leave ticket in "In Progress" state - security review phase will close it

**Note**: Documentation phase does NOT close the ticket. The ticket remains open for code review and security review phases.

## PR Documentation Management

### Adding Final Documentation Comment to PR:
After documentation is complete, add final comment to PR:
```bash
# No approval needed - gh pr comment
gh pr comment --body "## 📚 Documentation Complete

### Documentation Status: COMPLETE

**Coverage Achievement**: 
- **Inline JSDoc**: 100% of public APIs documented
- **External Docs**: Comprehensive user and API documentation

**Deliverables**:
**Developer Documentation:**
- ✅ Enhanced JSDoc for all functions, classes, and interfaces
- ✅ TypeScript types fully documented
- ✅ Complex algorithms explained inline
- ✅ Usage examples in JSDoc blocks

**User & Operator Documentation:**
- ✅ API reference with examples
- ✅ User guides and tutorials
- ✅ Architecture documentation
- ✅ Operations and deployment guides
- ✅ README with quick start

**Documentation phase complete**. Ready for code review phase.
See Linear ticket for detailed documentation metrics."
```

### Commit Message Standards for Documentation:
- `docs: add JSDoc comments to [module/component]`
- `docs: document TypeScript interfaces and types in [file]`
- `docs: add inline comments for [algorithm/complex logic]`
- `docs: enhance [class] with comprehensive JSDoc`
- `docs: add usage examples to public API functions`
- `docs: create external API documentation for [endpoint]`
- `docs: update README with quick start guide`

### PR Status Updates:
The documentation phase completes the code implementation and documentation work. This phase should:

**PR Status Updates:**
- Add `docs-complete` label when all documentation is finished
- Keep PR in DRAFT status - code review phase will move it to READY FOR REVIEW
- Update PR description with comprehensive documentation summary
- Note: Code review and security review phases still need to run

**Next Phase Preparation:**
- Documentation complete, ready for code review phase
- Code review will assess quality and add `code-reviewed` label
- Security review will follow and add `security-approved` label
- Security review is the final gate that closes the ticket

### PR Description Documentation Section:
```markdown
## 📚 Documentation Complete
**Status**: COMPLETE/IN_PROGRESS  
**Technical Writer**: Automated Documentation Analysis  
**Documentation Date**: [Date]

**Deliverables**: API docs, user guides, architecture docs, code examples  
**Coverage**: X/X endpoints documented, X workflows covered  
**Integration**: README updated, changelog updated, links verified  

**Ready for Merge**: ✅ All quality gates passed
```

### Phase Sequencing:
After documentation phase completes:
- ✅ `tests-complete` (already added from testing phase)
- ✅ `docs-complete` (added by this phase)
- ⏳ `code-reviewed` (will be added by code review phase)
- ⏳ `security-approved` (will be added by security review phase)

Documentation phase does NOT move PR to READY FOR REVIEW - that happens in code review phase.

## Success Criteria

Documentation is successful when:

**Minimal Viable Documentation (MVD) Achieved:**
- Complex business logic and non-obvious algorithms documented with clear JSDoc
- Security-sensitive functions include appropriate warnings and constraints
- TypeScript types allowed to self-document (NO redundant JSDoc type annotations)
- Auto-generated API docs via decorators (NestJS/OpenAPI) instead of manual docs
- Only essential external documentation created (complex workflows, architecture decisions)
- Zero documentation redundancy with existing TypeScript types

**Quality Over Quantity Metrics:**
- Documentation-to-code ratio kept minimal (lower is better)
- Every doc serves a clear, specific purpose (no "just in case" documentation)
- Documentation stays fresh and maintainable (simpler than the code it describes)
- Trivial code left undocumented (getters, setters, simple CRUD)
- Focus on "why" not "what" (TypeScript already provides the "what")

**Process Requirements Met:**
- Documentation PR label added (`docs-complete`)
- PR remains in DRAFT for code review phase
- Linear ticket updated with MVD metrics showing efficiency gains
- Linear ticket remains "In Progress" for code review and security review phases

The documentation phase implements **Minimal Viable Documentation (MVD)**, prioritizing essential, high-value documentation while leveraging TypeScript's self-documenting nature and auto-generation tools. This approach reduces maintenance burden while ensuring critical knowledge is captured.
