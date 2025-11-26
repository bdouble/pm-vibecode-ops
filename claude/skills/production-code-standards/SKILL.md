---
name: production-code-standards
description: Enforces production-ready code standards. Activates when: (1) writing or modifying code in src/, lib/, app/ directories, (2) implementing features or fixing bugs, (3) creating services, controllers, or repositories, (4) reviewing pull requests or code changes. Blocks: workarounds, temporary solutions, fallback logic hiding errors, TODO/FIXME/HACK comments, mocked services in production code, and silent error suppression. Does NOT apply to test files (*.test.*, *.spec.*, __tests__/).
---

# Production Code Standards

All production code must be permanent, complete, and production-grade.

## Enforcement Workflow

1. **Before writing**: Plan the complete, permanent solution
2. **While writing**: Check against prohibited patterns below
3. **When blocked**: STOP, document, create ticket - never workaround
4. **Before committing**: Verify no prohibited patterns exist

## Prohibited Patterns

### Fallback Logic (Silent Failure)
```javascript
// BLOCK - Hides errors
const config = getConfig() || defaultConfig;
const user = await findUser(id) ?? guestUser;

// REQUIRE - Fail fast
const config = getConfig();
if (!config) throw new ConfigurationError('Config not found');
```

### Temporary/Incomplete Code
```javascript
// BLOCK
// TODO: implement proper validation later
// FIXME: this is a hack, refactor
// HACK: workaround for bug in library
```

### Error Suppression
```javascript
// BLOCK
try { riskyOperation(); } catch (e) { /* ignore */ }
try { riskyOperation(); } catch (e) { return null; }

// REQUIRE - Log and propagate
try {
  riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw new OperationError('Failed', { cause: error });
}
```

### Mocked Services in Production
```javascript
// BLOCK in src/, lib/, app/
const mockService = { send: () => Promise.resolve('ok') };

// ALLOWED only in *.test.*, *.spec.*, __tests__/
```

### Workaround Patterns
```javascript
// BLOCK
if (buggyLibraryBehavior) { applyWorkaround(); }
setTimeout(() => retryBecauseOfRaceCondition(), 100);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

## Required Patterns

### Fail-Fast Validation
```javascript
function processPayment(amount, currency) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }
  // Continue with valid inputs only
}
```

### Typed Errors
```javascript
class PaymentError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
  }
}
throw new PaymentError('Declined', 'CARD_DECLINED', { reason });
```

### Error Propagation (Let Errors Bubble)
```javascript
async function createOrder(data) {
  const user = await userService.findById(data.userId); // May throw
  const payment = await paymentService.charge(data.amount); // May throw
  return orderRepository.create({ user, payment }); // May throw
}
// Global error handler catches - don't suppress here
```

### Repository Pattern
```javascript
// REQUIRE - Data access through repositories
class UserService {
  constructor(private userRepository: UserRepository) {}
  async findUser(id: string) {
    return this.userRepository.findById(id);
  }
}

// BLOCK - Direct ORM access in services
return prisma.user.findUnique({ where: { id } }); // VIOLATION
```

## When Blocked

If proper implementation is blocked by external issues:

1. **STOP** - Do not create a workaround
2. **DOCUMENT** - State what's blocking
3. **CREATE TICKET** - File ticket for the blocker
4. **WAIT** - Blocker must be fixed first

```javascript
// WRONG
const auth = useBasicAuth(); // "temporary" workaround

// RIGHT
throw new Error('Cannot proceed: Auth library bug #123 must be fixed first');
// Create ticket: "Fix auth library - blocks FEATURE-456"
```

**If you cannot implement without a workaround, do not implement. Communicate the blocker clearly.**
