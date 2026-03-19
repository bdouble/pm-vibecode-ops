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

## TypeScript-Specific Anti-Patterns

### Type Safety Violations

#### `any` Type Usage

```typescript
// BLOCK - Disables type checking entirely
function processData(input: any): any {
  return input.someProperty.nested.value;
}

// REQUIRE - Use unknown with type narrowing
function processData(input: unknown): string {
  if (typeof input === 'object' && input !== null && 'someProperty' in input) {
    const data = input as { someProperty: { nested: { value: string } } };
    return data.someProperty.nested.value;
  }
  throw new ValidationError('Invalid input structure');
}
```

#### Excessive `as` Assertions

```typescript
// BLOCK - Casting without validation bypasses type safety
const user = JSON.parse(rawData) as User;
const config = response.data as AppConfig;

// REQUIRE - Use type guards or schema validation
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
});

function isUser(data: unknown): data is User {
  return userSchema.safeParse(data).success;
}

const parsed = JSON.parse(rawData);
if (!isUser(parsed)) throw new ValidationError('Invalid user data');
```

#### Unvalidated `JSON.parse()`

```typescript
// BLOCK - No validation after parsing
const settings = JSON.parse(rawJson);
applySettings(settings.theme, settings.locale);

// REQUIRE - Parse then validate with schema
import { z } from 'zod';

const settingsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  locale: z.string().min(2).max(5),
});

const settings = settingsSchema.parse(JSON.parse(rawJson));
applySettings(settings.theme, settings.locale);
```

### Async Anti-Patterns

#### Floating Promises

```typescript
// BLOCK - Promise result ignored, errors silently swallowed
function handleRequest(req: Request) {
  auditLog.recordAccess(req.userId); // async but not awaited
  return { status: 'ok' };
}

// REQUIRE - Await or explicitly mark as fire-and-forget
async function handleRequest(req: Request) {
  await auditLog.recordAccess(req.userId);
  return { status: 'ok' };
}

// If intentionally fire-and-forget, use void operator
function handleRequest(req: Request) {
  void auditLog.recordAccess(req.userId).catch(err =>
    logger.error('Audit log failed', { error: err })
  );
  return { status: 'ok' };
}
```

#### `async void` Functions

```typescript
// BLOCK - Errors cannot be caught by caller
button.addEventListener('click', async () => {
  await saveData(); // If this throws, no one catches it
});

// REQUIRE - Wrap in error boundary
button.addEventListener('click', () => {
  saveData().catch(err => {
    logger.error('Save failed', { error: err });
    showErrorToast('Failed to save data');
  });
});
```

#### Unhandled Promise Rejections

```typescript
// BLOCK - No error handling on promise chain
fetchUserProfile(userId)
  .then(profile => updateUI(profile));

// REQUIRE - Handle errors explicitly
fetchUserProfile(userId)
  .then(profile => updateUI(profile))
  .catch(err => {
    logger.error('Failed to fetch profile', { userId, error: err });
    showErrorState();
  });
```

### Production Hygiene

#### `console.log` in Production Code

```typescript
// BLOCK in src/, lib/, app/
console.log('Processing order:', orderId);
console.error('Payment failed', error);

// REQUIRE - Use structured logger
import { logger } from '@/infrastructure/logger';

logger.info('Processing order', { orderId });
logger.error('Payment failed', { orderId, error: err.message, stack: err.stack });
```

#### Magic Numbers and Strings

```typescript
// BLOCK - Unexplained literal values
if (retryCount > 3) throw new Error('Too many retries');
await sleep(5000);
if (user.role === 'admin') grantAccess();

// REQUIRE - Named constants with clear intent
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5_000;
const ADMIN_ROLE = 'admin' as const;

if (retryCount > MAX_RETRY_ATTEMPTS) throw new RetryExhaustedError(MAX_RETRY_ATTEMPTS);
await sleep(RETRY_DELAY_MS);
if (user.role === ADMIN_ROLE) grantAccess();
```

### ESLint Rule Reference

| Anti-Pattern | ESLint Rule |
|-------------|-------------|
| `any` type | `@typescript-eslint/no-explicit-any` |
| Floating promises | `@typescript-eslint/no-floating-promises` |
| console.log | `no-console` |
| Unused vars | `@typescript-eslint/no-unused-vars` |
| Non-null assertions | `@typescript-eslint/no-non-null-assertion` |
