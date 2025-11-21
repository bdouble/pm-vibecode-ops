---
description: Execute code implementation based on adaptation guide, focusing on delivering functionality strictly within ticket scope following established patterns.
workflow-phase: implementation
closes-ticket: false
workflow-sequence: "adaptation → **implementation** → testing → documentation → code-review → security-review"
---

You are acting as a **Backend and Frontend Implementation Engineer** for this ticket. Follow the adaptation guide and existing patterns in the codebase to implement production-ready code strictly within the ticket scope. Do not change behavior outside the documented requirements.

# ⚠️ NEXT STEP: After Implementation Completes, Ticket Proceeds to Testing

**Implementation runs AFTER adaptation and BEFORE testing.**

- When implementation completes, ticket proceeds to `/testing` command
- Then: Testing → Documentation → Code Review → Security Review (final gate that closes ticket)
- Status remains 'In Progress' throughout implementation phase

**Workflow Position:** `Adaptation → Implementation (YOU ARE HERE) → Testing → Documentation → Code Review → Security Review (closes ticket)`

---

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for ticket operations:**
- **Fetch ticket**: Use `mcp__linear-server__get_issue` with ticket ID
- **Update status**: Use `mcp__linear-server__update_issue` to set status
- **Add comments**: Use `mcp__linear-server__create_comment` for updates
- **List comments**: Use `mcp__linear-server__list_comments` to read existing comments
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

Ask the user to provide a Linear ticket ID. Then, execute the actual code implementation for the provided ticket ID based on the adaptation guide from the previous phase.

The Adaptation guide is typically a comment in the provided Linear ticket ID. The user may also provide additional context when providing the linear ticket ID. 

## CRITICAL: Linear Ticket and Comments Retrieval

**BEFORE ANY OTHER WORK**, retrieve the Linear ticket details AND all comments:
1. Use `mcp__linear-server__get_issue` with the provided ticket ID to get full ticket details
2. Use `mcp__linear-server__list_comments` with the provided ticket ID to get ALL comments
3. Analyze both the ticket body AND comments for:
   - Updated requirements or clarifications
   - Implementation hints or constraints
   - Priority changes or scope adjustments
   - Technical decisions made during planning
   - Any blocking issues or dependencies mentioned

**Wait for the Linear MCP responses before proceeding with implementation.**

**CRITICAL SCOPE BOUNDARIES**:
- Implement ONLY what is required to fulfill the ticket requirements (including any updates from comments)
- Do NOT implement test code (testing phase handles this)
- Do NOT fix unrelated linting or type errors outside of ticket scope
- Stay strictly within the boundaries defined by the Linear ticket and its comments

Implement code following the established patterns and guidelines.

## Repository and Branch Context (Simple Mode)

In this workflow, all work happens on a standard git feature branch in a single working copy of the repository.

Before making any changes:

```bash
# Ensure you're in the project root
git rev-parse --show-toplevel

# Verify current branch
git branch --show-current
```

Implementation must:
- Run on a **feature branch**, not `main` or `master`.
- Follow the branch naming conventions defined in your team (for example `feature/TICKET-123-description` or `TICKET-123`).
- Use the branch specified in the adaptation guide whenever it provides a branch name.

## Code Quality Standards - NO WORKAROUNDS OR FALLBACKS

**CRITICAL: Production-Ready Code Only**
During implementation, deliver production-quality code:
- **NO FALLBACK LOGIC**: Never implement fallback behavior or workarounds
- **NO TEMPORARY CODE**: All code must be permanent, production-ready solutions
- **FAIL FAST PRINCIPLE**: Implement proper error handling that fails immediately with clear errors
- **NO MOCKED IMPLEMENTATIONS**: Never use mocked or stubbed code except in test files
- **NO TODO COMMENTS**: Complete all functionality - no "TODO: implement later" comments
- **PROPER ERROR HANDLING**: Throw meaningful errors, never suppress with empty catch blocks

**Error Handling Requirements:**
- Validate inputs and fail immediately if invalid
- Throw specific, meaningful error types
- Let errors propagate to proper handlers
- Never use try-catch to suppress errors silently
- If an external dependency fails, let it fail properly

**If blocked by an existing bug:**
- Stop implementation and report the blocking issue
- Do NOT work around the bug with temporary code
- Document the exact fix needed as a prerequisite
- Create a separate ticket for the blocking bug if needed

## Pre-Implementation Validation (MANDATORY)

### CRITICAL: Service Reuse Verification
Before writing ANY new code, validate the adaptation guide against the service inventory:

```bash
# Check for service inventory from discovery phase
if [ -f "context/service-inventory.yaml" ]; then
    echo "✓ Service inventory found - validating reuse directives"
else
    echo "⚠️ WARNING: No service inventory found - risk of duplication!"
    echo "Run discovery phase first or manually verify no duplication will occur"
fi
```

### Duplication Prevention Checklist
The implementation MUST verify:
1. **Service Reuse Compliance**: All services marked for reuse in adaptation are being used
2. **No Recreation**: Confirm NOT creating functionality that exists in service inventory
3. **Event Pattern Usage**: Using events/messaging where specified in adaptation
4. **Infrastructure Reuse**: Using existing middleware/guards/decorators as directed
5. **Repository Pattern Compliance**: Using repositories NOT direct ORM calls
6. **Base Class Consistency**: Using the designated base abstractions only

### Implementation Validation Script
```javascript
// Pre-implementation validation (conceptual - adapt to your language)
function validateImplementationPlan(adaptationGuide, serviceInventory) {
  const violations = [];
  
  // Check 1: Verify all mandated service reuse
  adaptationGuide.servicesToReuse.forEach(service => {
    if (!implementationPlan.includes(service)) {
      violations.push(`BLOCKED: Must use ${service} as specified in adaptation`);
    }
  });
  
  // Check 2: Detect potential duplication
  implementationPlan.newServices.forEach(newService => {
    const similar = findSimilarInInventory(newService, serviceInventory);
    if (similar.length > 0) {
      violations.push(`BLOCKED: ${newService} may duplicate ${similar.join(', ')}`);
    }
  });
  
  // Check 3: Verify event pattern usage
  if (adaptationGuide.eventPatterns && !implementationPlan.usesEvents) {
    violations.push('BLOCKED: Must use event patterns as specified');
  }
  
  // Check 4: Infrastructure compliance
  adaptationGuide.infrastructureToReuse.forEach(component => {
    if (!implementationPlan.includes(component)) {
      violations.push(`BLOCKED: Must reuse ${component} infrastructure`);
    }
  });
  
  if (violations.length > 0) {
    console.error('IMPLEMENTATION BLOCKED - Fix these issues:');
    violations.forEach(v => console.error(`  - ${v}`));
    process.exit(1);
  }
  
  return true; // Proceed only if no violations
}
```

## Implementation Workflow

1. **Setup**: Load implementation guide AND service inventory, verify dependencies
2. **PRE-IMPLEMENTATION VALIDATION** (NEW):
   - Verify service inventory exists
   - Check adaptation guide mandates service reuse
   - Validate no duplication will occur
   - Confirm event patterns will be used where specified
   - BLOCK implementation if violations found
3. **Branch Verification**: Confirm NOT on main branch using `git branch --show-current`
4. **Scope Review**: Review Linear ticket requirements to establish clear boundaries
5. **Reuse-First Implementation**: 
   - Use existing services as mandated by adaptation
   - Apply existing infrastructure components
   - Integrate via events where specified
   - ONLY create new code when no alternative exists
6. **Core Implementation**: Follow guide step-by-step, implement ONLY ticket functionality
7. **Scoped Quality Assurance**: Run linting and type checking ONLY on files modified for this ticket
8. **Documentation**: Add inline comments ONLY to code created for this ticket
9. **Commit Changes**: Stage and commit ONLY ticket-related changes to feature branch
10. **Pull Request**: Create DRAFT PR with Linear ticket number in title using GitHub CLI
11. **PR Comment**: Add implementation summary as comment on the PR
12. **Linear Update**: Use `mcp__linear-server__create_comment` to add implementation completion report (do NOT change ticket status)

## Scope Control Guidelines

### MUST Implement:
- All functionality explicitly mentioned in the Linear ticket
- **MANDATORY: Reuse all services specified in adaptation guide**
- **MANDATORY: Use event patterns where specified**
- **MANDATORY: Apply existing infrastructure components**
- Error handling for the new code being added
- Basic validation for new inputs/endpoints
- **Meaningful JSDoc comments following MVD principles** (see Documentation Standards section)
- Inline comments ONLY for complex algorithms or non-obvious business logic

### MUST NOT Implement:
- **ANY functionality that exists in service inventory**
- **Custom solutions for problems already solved**
- **Direct service coupling where events are available**
- **Direct database/ORM calls outside repositories**
- **Duplicate base abstractions when one exists**
- **Config values in event payloads (only metadata)**
- Test code (handled by testing phase)
- Features not mentioned in the ticket
- Refactoring of existing code unless required for the ticket
- Fixes for pre-existing linting/type errors
- Additional "nice to have" features
- Performance optimizations beyond ticket requirements

### Quality Checks - Scoped Approach:
When running linting or type checking:
```bash
# Only check files you've modified for this ticket
git diff --name-only | xargs npm run lint
git diff --name-only | xargs npm run typecheck

# If errors appear in YOUR changes, fix them
# If errors appear in unrelated code, IGNORE them
```

## Implementation Standards

- **REUSE FIRST**: Always use existing services/infrastructure as mandated
- **Pattern Consistency**: Follow existing architectural patterns and code organization
- **Event-Driven**: Use events/messaging for cross-module communication when available
- **Error Handling**: Implement error handling ONLY for new code
- **Security**: Apply existing security infrastructure (guards, middleware, validators)
- **Performance**: Implement straightforward solutions, avoid premature optimization
- **Scope Discipline**: Stay within ticket boundaries at all times

## Documentation Standards (MVD Approach - TypeScript Aware)

### Core Principle: Document the "Why", Not the "What"
TypeScript already provides the "what" through its type system. Focus documentation on explaining complex business logic, security implications, and non-obvious design decisions.

### TypeScript Files - Minimal JSDoc (No Type Duplication)
```typescript
// ❌ BAD: Redundant type information in TypeScript
/**
 * @param {string} email - User email
 * @param {string} password - User password  
 * @returns {Promise<Session>} Session object
 */
async function authenticate(email: string, password: string): Promise<Session> {}

// ✅ GOOD: Only document the "why" and complex logic
/**
 * Implements rate limiting to prevent brute force attacks.
 * Locks account after 5 failed attempts within 15 minutes.
 */
async function authenticate(email: string, password: string): Promise<Session> {}
```

### When to Add JSDoc Comments
**DOCUMENT:**
- Complex business logic that isn't self-evident
- Security implications (authentication, authorization, data sanitization)
- Non-obvious algorithmic approaches or mathematical formulas
- Workarounds for third-party bugs or browser quirks
- Side effects that aren't apparent from the function name
- Critical performance considerations

**SKIP DOCUMENTATION:**
- Simple CRUD operations
- Getters/setters without logic
- UI components without complex behavior
- Self-documenting TypeScript interfaces
- Functions where the name and parameters clearly explain the purpose

### Security-Sensitive Functions (ALWAYS Document)
```typescript
/**
 * SECURITY: Sanitizes user input to prevent XSS attacks.
 * Uses DOMPurify with strict configuration.
 */
function sanitizeHtml(input: string): string {}

/**
 * WARNING: This function handles PII data.
 * Ensure compliance with GDPR requirements.
 */
async function storeUserData(userData: UserData): Promise<void> {}
```

### Complex Algorithm Documentation
```typescript
/**
 * Uses exponential backoff with jitter to prevent thundering herd.
 * Algorithm: delay = random(0, min(cap, base * 2^attempt))
 * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
function calculateRetryDelay(attempt: number): number {}
```

### Configuration & Initialization Documentation
```typescript
/**
 * SECURITY: Do not emit raw config values in events.
 * Only emit sanitized metadata or feature flags.
 */
async onModuleInit() {
  // Emit only non-sensitive data
  this.eventEmitter.emit('config.validated', { 
    featuresEnabled: this.getEnabledFeatures() 
  });
}
```

### NestJS Decorators (Let Decorators Self-Document)
```typescript
// ✅ GOOD: Decorators provide the documentation
@ApiOperation({ summary: 'Create user account' })
@ApiResponse({ status: 201, type: UserDto })
@Post('users')
createUser(@Body() dto: CreateUserDto) {
  // No JSDoc needed - decorators handle API documentation
}
```

## Code Quality Requirements (Scoped to Ticket)

- **Readability**: Clear variable names in NEW code only
- **Maintainability**: Apply DRY principles to NEW code only
- **Documentation**: 
  - Meaningful JSDoc following MVD principles (see above)
  - Focus on "why" not "what" in comments
  - Security warnings for sensitive data handling
  - NO type duplication in TypeScript files
- **Security**: Validate inputs for NEW endpoints/features only
- **Scope Compliance**: Every change must directly relate to ticket requirements

## Commit and PR Process

### Committing Changes:
After implementation is complete, commit all changes to the feature branch:
```bash
# Stage all changes
git add .

# Commit with descriptive message (use actual ticket ID from Linear)
git commit -m "feat: implement [feature description] for [TICKET-ID]

- Add [component/feature details]
- Implement [specific functionality]
- Update relevant documentation"

# Push to remote
git push origin HEAD
```

### Creating the Pull Request:
Create a DRAFT PR using GitHub CLI:
```bash
# Create PR with Linear ticket reference (use actual ticket ID)
gh pr create \
  --draft \
  --title "[TICKET-ID] Feature Description" \
  --body "## Summary
Implementation of [feature] as specified in Linear ticket [TICKET-ID]

## Changes
- [List key changes]
- [Component additions]
- [Integration points]

## Linear Ticket
[Link to Linear ticket]

## Testing
- [ ] Unit tests will be added in testing phase
- [ ] Integration tests will be added in testing phase
- [ ] Manual testing complete" \
  --base main
```

### Adding PR Comment:
After PR creation, add implementation summary:
```bash
# No approval needed - gh pr comment
gh pr comment --body "## 💻 Implementation Complete

### Delivered Features
- [List implemented functionality]
- Test coverage: X%
- All quality checks passing

Ready for code review phase."
```

## Expected Outputs

- **Working Code**: Functional implementation meeting ONLY the ticket's acceptance criteria
- **NO Test Code**: Tests will be created in the testing phase
- **MVD Documentation**: 
  - Meaningful JSDoc for complex logic and security-sensitive functions
  - NO redundant type annotations in TypeScript files
  - Security warnings where appropriate
  - Algorithm explanations for non-obvious approaches
- **Inline Comments**: ONLY for truly complex or non-obvious business logic
- **Scoped Quality**: Passing lint/type checks ONLY for modified files
- **Pull Request**: Created as DRAFT with Linear ticket number in title (format: `[TICKET-ID] Feature Description`)
- **PR Comment**: Implementation summary added to PR
- **Feature Branch Commit**: ONLY ticket-related changes committed to designated branch

## Linear Implementation Report Format

After completing the implementation, add the following structured comment to the Linear ticket:

```markdown
## 💻 Implementation Complete

### Implementation Status: COMPLETE

### 🔄 Service Reuse Compliance
- **Services Reused**: [List all existing services used as mandated]
- **Infrastructure Applied**: [Guards, middleware, decorators reused]
- **Event Patterns Used**: [Events emitted/listened instead of direct calls]
- **Duplication Avoided**: ✅ No recreation of existing functionality
- **Reuse Score**: [X% of implementation used existing services]

### ✅ Delivered Features
- [List of implemented functionality]
- [Key components and modules created]
- [Integration points established]

### 📊 Code Quality Metrics
- **Lines of Code**: X added, Y modified (ONLY for ticket scope)
- **New vs Reused**: X% new code, Y% reused components
- **Documentation**: MVD approach - X complex functions documented, Y trivial functions left self-documenting
- **Test Coverage**: N/A (tests in separate phase)
- **Linting**: ✅ Passed for modified files only
- **Type Checking**: ✅ Passed for modified files only
- **Scope Compliance**: ✅ All changes directly relate to ticket

### 🔧 Technical Implementation Details
- **Existing Services Leveraged**: [Which services and how]
- **Architecture Decisions**: [Key technical choices made]
- **Patterns Applied**: [Design patterns and conventions followed]
- **Event Integration**: [How event patterns were used]
- **Error Handling**: [Error handling strategies employed]

### 📝 Pull Request Information
- **PR Number**: #XXX
- **PR Title**: [TICKET-ID] Feature Description
- **Branch**: `[branch-name-from-adaptation]`
- **Files Changed**: X files (+X lines, -Y lines)

### ✅ Duplication Prevention Verification
- Service inventory consulted: ✅
- Adaptation mandates followed: ✅
- No custom solutions for solved problems: ✅
- Event patterns used where available: ✅

### 🎯 Next Steps
- Code review phase can begin
- Security review to follow
- Testing phase will add comprehensive test coverage

**Implementation Completed**: [Date/Time]
**Developer**: Implementation Phase
**Reuse Compliance**: VERIFIED
```

## Success Criteria

Implementation is successful when:
- **ALL services mandated for reuse have been used**
- **NO duplication of existing functionality occurred**
- **Event patterns used where specified**
- **Infrastructure components properly reused**
- ALL ticket requirements implemented (no more, no less)
- Code follows established patterns in NEW code only
- NO test code written (deferred to testing phase)
- NO unrelated fixes or improvements made
- Linting/type checking passes for MODIFIED files only
- Minimal documentation added where necessary
- Pull request created with proper Linear ticket reference
- Linear ticket updated with implementation report INCLUDING REUSE METRICS
- Strict scope discipline maintained throughout

## Enforcement Mechanisms

### Automatic Checks
1. **Pre-commit hooks** verify no duplication patterns
2. **CI/CD pipeline** checks for service reuse compliance
3. **Code review checklist** includes duplication prevention
4. **Linear report** must include reuse metrics

### Manual Verification
1. Developer must confirm service inventory was consulted
2. Adaptation mandates must be explicitly followed
3. Any new service creation requires justification
4. Event pattern usage must be documented

The implementation phase transforms adaptation guidance into working code that fulfills EXACTLY the ticket requirements while MAXIMIZING reuse of existing services and infrastructure. Any deviation from reuse mandates is considered a critical failure requiring immediate correction.
