# Test Templates and Examples

Practical templates demonstrating the testing philosophy: accuracy first, coverage second.

## Well-Structured Test File Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { NotificationService } from '../notifications/notification.service';
import { PaymentError, ValidationError } from './payment.errors';

describe('PaymentService', () => {
  // Declare dependencies
  let service: PaymentService;
  let mockRepository: ReturnType<typeof vi.mocked<PaymentRepository>>;
  let mockNotifications: ReturnType<typeof vi.mocked<NotificationService>>;

  // Fresh mocks for each test - prevents state leakage
  beforeEach(() => {
    mockRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
    } as any;

    mockNotifications = {
      sendReceipt: vi.fn(),
    } as any;

    service = new PaymentService(mockRepository, mockNotifications);
  });

  // Group by method, then by scenario
  describe('processPayment', () => {
    describe('with valid payment', () => {
      it('should save transaction and return transaction ID', async () => {
        // Arrange - set up test data and mock responses
        const paymentData = {
          amount: 100.00,
          currency: 'USD',
          customerId: 'cust_123',
        };
        mockRepository.save.mockResolvedValue({ id: 'txn_abc123' });

        // Act - call the method under test
        const result = await service.processPayment(paymentData);

        // Assert - verify outcomes
        expect(result.transactionId).toBe('txn_abc123');
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 100.00,
            currency: 'USD',
          })
        );
      });

      it('should send receipt notification after successful payment', async () => {
        // Arrange
        mockRepository.save.mockResolvedValue({ id: 'txn_abc123' });

        // Act
        await service.processPayment({ amount: 50, currency: 'USD', customerId: 'cust_123' });

        // Assert
        expect(mockNotifications.sendReceipt).toHaveBeenCalledWith(
          'cust_123',
          expect.objectContaining({ transactionId: 'txn_abc123' })
        );
      });
    });

    describe('with invalid payment', () => {
      it('should throw ValidationError for negative amount', async () => {
        // Arrange
        const invalidPayment = { amount: -50, currency: 'USD', customerId: 'cust_123' };

        // Act & Assert
        await expect(service.processPayment(invalidPayment))
          .rejects.toThrow(ValidationError);

        // Verify no side effects occurred
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('should throw ValidationError for zero amount', async () => {
        await expect(service.processPayment({ amount: 0, currency: 'USD', customerId: 'cust_123' }))
          .rejects.toThrow('Amount must be positive');
      });
    });
  });
});
```

---

## Unit Test: Complex Business Logic

Testing a discount calculation engine with multiple rules:

```typescript
describe('DiscountEngine', () => {
  describe('calculateDiscount', () => {
    // Test each rule independently
    it('should apply 10% loyalty discount for customers with 5+ orders', () => {
      const customer = { orderCount: 5, tier: 'standard' };
      const cart = { subtotal: 100 };

      const discount = calculateDiscount(customer, cart);

      expect(discount.loyaltyDiscount).toBe(10); // 10% of 100
      expect(discount.reason).toContain('loyalty');
    });

    it('should apply 15% VIP discount for premium tier customers', () => {
      const customer = { orderCount: 1, tier: 'premium' };
      const cart = { subtotal: 200 };

      const discount = calculateDiscount(customer, cart);

      expect(discount.tierDiscount).toBe(30); // 15% of 200
    });

    // Test rule combinations
    it('should stack loyalty and tier discounts', () => {
      const customer = { orderCount: 10, tier: 'premium' };
      const cart = { subtotal: 100 };

      const discount = calculateDiscount(customer, cart);

      expect(discount.total).toBe(25); // 10% loyalty + 15% tier
    });

    // Test edge cases
    it('should cap total discount at 30%', () => {
      const customer = { orderCount: 100, tier: 'premium', hasCoupon: true };
      const cart = { subtotal: 100 };

      const discount = calculateDiscount(customer, cart);

      expect(discount.total).toBe(30); // Capped, not 35%
      expect(discount.cappedAt).toBe(30);
    });

    // Test boundary conditions
    it('should not apply loyalty discount for exactly 4 orders', () => {
      const customer = { orderCount: 4, tier: 'standard' };
      const cart = { subtotal: 100 };

      const discount = calculateDiscount(customer, cart);

      expect(discount.loyaltyDiscount).toBe(0);
    });
  });
});
```

---

## Integration Test: Service Interaction

Testing how services work together with a real (test) database:

```typescript
describe('OrderService Integration', () => {
  let orderService: OrderService;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await TestDatabase.create();
    orderService = new OrderService(testDb.getConnection());
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  beforeEach(async () => {
    await testDb.truncateAll();
  });

  it('should create order with inventory deduction', async () => {
    // Arrange - seed test data
    await testDb.seed('products', [
      { id: 'prod_1', name: 'Widget', inventory: 10 }
    ]);
    await testDb.seed('customers', [
      { id: 'cust_1', email: 'test@example.com' }
    ]);

    // Act
    const order = await orderService.createOrder({
      customerId: 'cust_1',
      items: [{ productId: 'prod_1', quantity: 3 }],
    });

    // Assert - verify order created
    expect(order.id).toBeDefined();
    expect(order.status).toBe('pending');

    // Assert - verify inventory updated
    const product = await testDb.query('products', { id: 'prod_1' });
    expect(product.inventory).toBe(7); // 10 - 3
  });

  it('should reject order when inventory insufficient', async () => {
    await testDb.seed('products', [
      { id: 'prod_1', name: 'Widget', inventory: 2 }
    ]);

    await expect(orderService.createOrder({
      customerId: 'cust_1',
      items: [{ productId: 'prod_1', quantity: 5 }],
    })).rejects.toThrow('Insufficient inventory');

    // Verify no partial changes
    const product = await testDb.query('products', { id: 'prod_1' });
    expect(product.inventory).toBe(2); // Unchanged
  });
});
```

---

## Anti-Patterns to Avoid

### WRONG: Testing Implementation Details

```typescript
// BAD - Tests internal method calls, not behavior
it('should call validateInput before processing', async () => {
  const spy = vi.spyOn(service, 'validateInput');
  await service.process(data);
  expect(spy).toHaveBeenCalled(); // Who cares? Test the outcome!
});

// GOOD - Tests observable behavior
it('should reject invalid input', async () => {
  await expect(service.process(invalidData)).rejects.toThrow(ValidationError);
});
```

### WRONG: Testing Framework/Library Code

```typescript
// BAD - Testing that Express routing works
it('should route GET /users to getUsers handler', () => {
  // This tests Express, not your code
});

// GOOD - Testing your handler logic
it('should return user list with pagination', async () => {
  const result = await usersHandler.getUsers({ page: 1, limit: 10 });
  expect(result.users).toHaveLength(10);
  expect(result.hasMore).toBe(true);
});
```

### WRONG: Assuming API Shapes

```typescript
// BAD - Assumed method name that doesn't exist
it('should send welcome email', async () => {
  await userService.sendWelcomeEmail(user); // Method doesn't exist!
});

// GOOD - Verified via reading actual implementation first
it('should send welcome email', async () => {
  // Verified: emailService has sendEmail(type, recipient, data)
  await userService.onUserCreated(user);
  expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
    EmailType.USER_WELCOME, // Verified enum value
    user.email,
    expect.any(Object)
  );
});
```

---

## Summary

| Principle | Application |
|-----------|-------------|
| Fix first | Run existing tests before writing new ones |
| Verify API | Read implementation before mocking |
| Test behavior | Not implementation details |
| Arrange-Act-Assert | Clear structure in every test |
| Fresh state | Reset mocks in beforeEach |
| Edge cases | Boundaries, nulls, errors |
| Skip trivial | Getters, pass-throughs, config |

---

## Property-Based Testing with fast-check

Property-based testing verifies that properties hold for ALL possible inputs, not just hand-picked examples. Instead of testing `calculateDiscount(100) === 10`, you assert invariants like "discount should never exceed the original price" and let the framework generate thousands of random inputs to find counterexamples.

```typescript
import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { calculateDiscount, applyDiscount } from './discount.service';

describe('DiscountService - Property-Based Tests', () => {
  it('should never produce a negative discount', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100_000, noNaN: true }),
        fc.integer({ min: 0, max: 100 }),
        (price, discountPercent) => {
          const discount = calculateDiscount(price, discountPercent);
          expect(discount).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  it('should never produce a discount exceeding the original price', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100_000, noNaN: true }),
        fc.integer({ min: 0, max: 100 }),
        (price, discountPercent) => {
          const discount = calculateDiscount(price, discountPercent);
          expect(discount).toBeLessThanOrEqual(price);
        }
      )
    );
  });

  it('should be idempotent when applying the same discount twice', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100_000, noNaN: true }),
        fc.integer({ min: 0, max: 100 }),
        (price, discountPercent) => {
          const once = applyDiscount(price, discountPercent);
          const twice = applyDiscount(once, 0); // No additional discount
          expect(twice).toBe(once);
        }
      )
    );
  });

  it('should maintain ordering: higher discount percent means lower final price', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 100_000, noNaN: true }),
        fc.integer({ min: 0, max: 49 }),
        (price, lowerPercent) => {
          const higherPercent = lowerPercent + 1;
          const priceWithLower = applyDiscount(price, lowerPercent);
          const priceWithHigher = applyDiscount(price, higherPercent);
          expect(priceWithHigher).toBeLessThanOrEqual(priceWithLower);
        }
      )
    );
  });
});
```

**When to use property-based tests:**
- Financial calculations (amounts, percentages, rounding)
- Data transformations (encode/decode roundtrips)
- Sorting and filtering (output should maintain invariants)
- Validation logic (valid inputs accepted, invalid rejected)

---

## Parameterized Testing with test.each

Use `test.each` to run the same test logic against multiple inputs. This eliminates copy-paste test duplication and makes boundary values explicit.

### Array Format

```typescript
import { describe, it, expect } from 'vitest';
import { validateEmail } from './validators/email.validator';

describe('validateEmail', () => {
  it.each([
    ['user@example.com', true],
    ['admin@company.co.uk', true],
    ['name+tag@domain.org', true],
    ['user.name@sub.domain.com', true],
    ['', false],
    ['not-an-email', false],
    ['@missing-local.com', false],
    ['missing-domain@', false],
    ['spaces in@email.com', false],
    ['double@@at.com', false],
  ])('validateEmail("%s") should return %s', (email, expected) => {
    expect(validateEmail(email)).toBe(expected);
  });
});
```

### Tagged Template Literal Format

```typescript
import { describe, it, expect } from 'vitest';
import { classifyAge } from './age-classifier';

describe('classifyAge', () => {
  it.each`
    age    | expected
    ${-1}  | ${'invalid'}
    ${0}   | ${'infant'}
    ${1}   | ${'infant'}
    ${2}   | ${'toddler'}
    ${5}   | ${'child'}
    ${12}  | ${'child'}
    ${13}  | ${'teenager'}
    ${17}  | ${'teenager'}
    ${18}  | ${'adult'}
    ${64}  | ${'adult'}
    ${65}  | ${'senior'}
    ${150} | ${'invalid'}
  `('classifyAge($age) should return "$expected"', ({ age, expected }) => {
    expect(classifyAge(age)).toBe(expected);
  });
});
```

**When to use parameterized tests:**
- Boundary value analysis (off-by-one, min/max, thresholds)
- Input validation (valid and invalid cases)
- Status or category classification
- Format conversion (currency, dates, units)
