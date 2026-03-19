# Anti-Patterns Reference

Detailed examples of prohibited patterns in production code.

## Fallback Logic (Silent Failure)

```javascript
// BLOCK - Hides errors
const config = getConfig() || defaultConfig;
const user = await findUser(id) ?? guestUser;

// REQUIRE - Fail fast
const config = getConfig();
if (!config) throw new ConfigurationError('Config not found');
```

## Temporary/Incomplete Code

```javascript
// BLOCK
// TODO: implement proper validation later
// FIXME: this is a hack, refactor
// HACK: workaround for bug in library
```

## Error Suppression

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

## Mocked Services in Production

```javascript
// BLOCK in src/, lib/, app/
const mockService = { send: () => Promise.resolve('ok') };

// ALLOWED only in *.test.*, *.spec.*, __tests__/
```

## Workaround Patterns

```javascript
// BLOCK
if (buggyLibraryBehavior) { applyWorkaround(); }
setTimeout(() => retryBecauseOfRaceCondition(), 100);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

## Permissive Schema Patterns

```typescript
// BLOCK - z.unknown() for structures with known fields
const configSchema = z.record(z.string(), z.unknown()); // VIOLATION
// REQUIRE - typed schema
const configSchema = z.object({
  apiKey: z.string().min(1),
  region: z.enum(['us-east', 'eu-west', 'ap-south']),
  retries: z.number().int().min(0).max(5),
});

// BLOCK - z.string() where valid values are known
const statusSchema = z.string(); // VIOLATION when statuses are a known set
// REQUIRE - z.enum()
const statusSchema = z.enum(['pending', 'running', 'complete', 'failed']);

// BLOCK - everything optional in a known structure
const decisionSchema = z.object({
  action: z.string().optional(),
  reason: z.string().optional(),
  confidence: z.string().optional(), // VIOLATION: should be z.number()
}); // VIOLATION: at least action and reason are required
// REQUIRE - required fields required, proper types
const decisionSchema = z.object({
  action: z.enum(['approve', 'reject', 'escalate']),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

// BLOCK - duplicating schema definitions
const stageInputSchema = z.object({ name: z.string(), type: z.string() }); // copy-paste
// REQUIRE - import from canonical source
import { baseDocumentSchema } from '@/schemas/documents';
const stageInputSchema = baseDocumentSchema.pick({ name: true, type: true });
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
