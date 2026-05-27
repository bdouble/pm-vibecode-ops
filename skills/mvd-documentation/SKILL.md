---
name: mvd-documentation
description: Use when about to add a code comment, JSDoc block, inline explanation, or README section — especially when tempted to restate what the code does in prose rather than explaining why. Also use when documenting complex business logic, security-sensitive code, PII handling, or external API integrations, or when user says "document this", "add comments", "write JSDoc", or "explain this code".
---

# Minimal Viable Documentation

Document the "why", not the "what" - TypeScript already shows the "what".

<!-- @protected reason="foundational principle from v4.5; SkillOpt §3.6 protects slow-state content from automated rewrites — removing the analog cost SpreadsheetBench 22pts" -->
**Violating the letter of this skill is violating the spirit of this skill.** "Documenting why" by restating the function signature in slightly different prose, or adding a comment that explains the line directly below it, is the same violation as a JSDoc type duplicate. Spirit over letter, always.

### Slow/Meta Update Log
<!-- Append one bullet per audit pass capturing what stayed true across iterations. Initially empty. -->
<!-- @end-protected -->

## Decision Matrix

| Code Type | Document? | What to Document |
|-----------|-----------|------------------|
| Simple CRUD | No | Self-documenting |
| Complex business logic | Yes | Algorithm rationale, edge cases |
| Security-sensitive | **REQUIRED** | Security implications, access control |
| PII handling | **REQUIRED** | Data protection requirements |
| External API integration | Yes | API quirks, rate limits |
| Type definitions | No | Types are documentation |

## Core Patterns

### Document WHY, Not WHAT
```typescript
// BLOCK - Duplicates TypeScript
/** @param userId - The user ID */
async function updateUserEmail(userId: string, email: string)

// REQUIRE - Adds value
/**
 * Email changes trigger verification because:
 * - Previous email loses access immediately (security)
 * - New email must be verified within 24h
 */
async function updateUserEmail(userId: string, email: string)
```

### No Type Duplication
```typescript
// BLOCK
/** @param {string} id - The ID @returns {Promise<Result>} */

// REQUIRE - Document behavior, not types
/**
 * WARNING: Amount is in cents (1000 = $10.00)
 * @throws {PaymentDeclinedError} Card declined
 */
```

### Security Code REQUIRES Docs
```typescript
/**
 * WARNING: Handles PII - User's SSN
 * @security
 * - Never log the value
 * - Must be encrypted at rest
 * - Access requires audit logging
 */
async function verifySocialSecurityNumber(ssn: string)
```

### Complex Logic Gets Comments
```typescript
/**
 * Uses 30/360 day convention because:
 * - Industry standard for subscriptions
 * - Consistent with Stripe's method
 */
function calculateProRatedRefund(amount, daysUsed, totalDays)
```

### Trivial Code: No Docs
```typescript
// BLOCK - Over-documented
/** Gets the user by ID @param id - The user's ID */
async function getUserById(id: string)

// REQUIRE - Self-documenting, no JSDoc needed
async function getUserById(id: string)
```

## Prohibited Patterns

```typescript
// BLOCK - Placeholders
/** TODO: Add documentation */
/** TBD: Will document later */

// BLOCK - Incomplete
/** @param data - Registration data @returns - (missing) */

// BLOCK - Untested examples
/** @example // This might work, haven't tested */

// BLOCK - Workaround docs
/** Note: setTimeout here due to race condition */
```

## README (Only When Needed)

```markdown
# Project Name
One-line description.

## Quick Start
< 5 commands to run.

## Configuration
Non-obvious settings only.
```

**Do NOT create:** badges, lengthy install instructions, docs for obvious features.

## API Docs: Prefer Auto-Generation

```typescript
@ApiOperation({ summary: 'Create user with email verification' })
@ApiResponse({ status: 201, description: 'User created' })
@Post()
async createUser(@Body() data: CreateUserDto)
```

## Enforcement Workflow

1. **CHECK**: Is documentation actually needed?
2. **VERIFY**: Does it explain "why", not "what"?
3. **ENSURE**: Security-sensitive code has warnings
4. **AVOID**: Type duplication in TypeScript
5. **COMPLETE**: No placeholders (TODO, TBD)

**Best documentation = code that doesn't need documentation.**

## Red Flags — STOP

When you notice ANY of these in your own thinking or writing, you are about to add documentation noise. Stop and ask: does this explain WHY, or does it duplicate WHAT?

- `/** @param userId - The user ID */` (duplicating types)
- `/** Gets the user by ID */` on a function named `getUserById`
- `/** TODO: document this later */`
- `/** TBD */` / `/** @example // haven't tested */`
- `// This function takes X and returns Y` (compiler shows this)
- Adding JSDoc to private helpers Claude can read in 2 seconds
- A README with badges, install instructions, and obvious feature lists
- `// Note: setTimeout here due to race condition` (documenting a workaround — fix the workaround instead)
- "More documentation is better, so I'll add some"

**All of these mean: delete the comment, OR replace it with WHY this code makes the choice it makes** (security implications, business rules, non-obvious constraints, regulatory requirements).

## Rationalizations — STOP

If you think any of these, you are about to add documentation noise.

| Excuse | Reality |
|--------|---------|
| "More documentation is better" | No. Wrong documentation is worse than none. Stale docs actively mislead. |
| "Future devs will need to know what this does" | TypeScript shows what. Names show purpose. Only document non-obvious WHY. |
| "I'll add JSDoc to every public function" | Public functions with good names need no JSDoc. Document only non-obvious decisions and security/PII constraints. |
| "I'll add TODO comments where docs are incomplete" | TODO docs are placeholder noise. Either document fully now or not at all. |
| "The README needs badges and an install section" | Most READMEs need a one-line description, quickstart, and config notes. Nothing else. |
| "I should document the workaround so future devs understand" | Document the workaround? No — fix the workaround. Code that needs a workaround comment fails `production-code-standards`. |
| "I'll write JSDoc that restates the type signature for clarity" | TypeScript IS the documentation for types. Restating creates two sources of truth, one of which will drift. |

## Architecture Decisions

For significant architectural decisions affecting multiple files, use an ADR.
See `references/adr-template.md` for template and examples.

## Additional Resources

- **`references/adr-template.md`** — Architecture Decision Record template
- **`examples/adr-example.md`** — Complete ADR example showing the decision record format in practice

## Related Skills
- **production-code-standards**: TODO/FIXME/HACK comments are banned in code AND in documentation
- **verify-implementation**: Documentation claims about behavior must match verifiable code behavior
- **no-silent-deferrals**: `/** TODO: document later */` is a silent deferral
- **security-patterns**: Security-sensitive and PII-handling code REQUIRES documentation of the security implications
