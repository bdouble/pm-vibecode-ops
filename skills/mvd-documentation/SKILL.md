---
name: mvd-documentation
description: |
  Enforces minimal, decision-focused documentation (WHY not WHAT). ACTIVATE when:
  - User says: "add comments", "document this", "write JSDoc", "create README", "add docs"
  - User says: "explain this code", "what does this do", "documentation phase"
  - User asks: "should I document this", "how should I comment this"
  - Adding: /**, //, README.md, CHANGELOG.md, API documentation

  BLOCKS: Type duplication in JSDoc (@param {string}), over-documenting trivial code, TODO/TBD
  placeholders. TypeScript types ARE documentation. Document business logic rationale, not syntax.
---

# Minimal Viable Documentation

Document the "why", not the "what" - TypeScript already shows the "what".

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
