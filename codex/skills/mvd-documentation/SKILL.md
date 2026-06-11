---
name: mvd-documentation
description: |
  Enforces minimal, decision-focused documentation (WHY not WHAT). Use when:
  - Adding documentation: "add comments", "document this", "write JSDoc", "create README", "add docs"
  - Explaining code: "explain this code", "what does this do", "documentation phase"
  - Asking about docs: "should I document this", "how should I comment this"
  - Adding: /**, //, README.md, CHANGELOG.md, API documentation

  Blocks type duplication in JSDoc (@param {string}), over-documenting trivial code, TODO/TBD
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

## Convention Documentation: Status Tags and Pruning

Conventions and rules written into project memory (AGENTS.md/CLAUDE.md, convention docs) follow the same "why, not what" economics — and one more rule: **every documented convention carries an inline status tag.**

- `[enforced: <artifact path>]` — a structural guard exists (lint rule, guard test, drift test, ratchet). The prose should be a **one-line pointer**: "X is enforced by `tests/guards/x.test.ts` — see that file for details." An enforced rule needs near-zero prose forever; the guard's error message does the teaching.
- `[prose-only]` — no guard exists. Requires one line on why the rule can't be structurally enforced (genuinely operational judgment).

**The pruning rule:** when a guard ships for a previously documented rule, retire the paragraph to the one-line `[enforced:]` pointer in the same change. Project memory is append-only by default and decays — every retired paragraph is context-window cost saved in every future session.

**The discipline-debt metric:** the `[prose-only]` count is countable and trendable — report it at each epic closure and trend it in entropy audits. See the production-code-standards skill (enforcement ladder) for the guard recipes behind the tags.

## Architecture Decisions

For significant architectural decisions affecting multiple files, use an ADR.
See `references/adr-template.md` for template and examples.

---

## How to Use This Skill in Codex

Include this skill's content in your Codex prompt when:
- Writing documentation or comments for code
- Reviewing documentation for appropriate level of detail
- Deciding whether code needs documentation
- Creating README files or API documentation

Copy the decision matrix and core patterns to enforce the "document why, not what" principle.
