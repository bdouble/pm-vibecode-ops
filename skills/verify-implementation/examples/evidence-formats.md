# Evidence Formats for Implementation Verification

Examples of proper evidence formats to demonstrate work is complete.

## Test Output Evidence

### Passing Test Suite

```
$ npm test

 PASS  src/services/order.service.spec.ts
  OrderService
    createOrder
      ✓ creates order with valid items (45 ms)
      ✓ applies discount codes correctly (23 ms)
      ✓ calculates tax based on region (18 ms)
      ✓ rejects order with empty cart (8 ms)
      ✓ validates stock availability (67 ms)
    completeOrder
      ✓ sends confirmation email (34 ms)
      ✓ updates inventory counts (29 ms)
      ✓ creates audit log entry (12 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        2.847 s
```

### Test Coverage Report

```
$ npm run test:coverage

--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   87.23 |    78.45 |   91.67 |   86.89 |
 order.service.ts   |   94.12 |    88.89 |  100.00 |   93.75 |
 order.validator.ts |   85.71 |    75.00 |   83.33 |   85.71 |
 order.mapper.ts    |   78.57 |    66.67 |   87.50 |   78.57 |
--------------------|---------|----------|---------|---------|
```

## Build Output Evidence

### Successful TypeScript Build

```
$ npm run build

> project@1.0.0 build
> tsc --noEmit && next build

✓ Compiled successfully
✓ No TypeScript errors
✓ Linting passed
✓ Type checking passed

   Creating an optimized production build...
   Compiled successfully

   Route (app)                              Size     First Load JS
   ┌ ○ /                                    5.2 kB        89.4 kB
   ├ ○ /orders                              3.1 kB        87.3 kB
   └ ○ /orders/[id]                         4.7 kB        88.9 kB

   ✓ Build completed in 12.4s
```

### Clean Lint Output

```
$ npm run lint

> project@1.0.0 lint
> eslint . --ext .ts,.tsx

✓ No ESLint warnings or errors
```

## Bug Fix Verification

### Before/After Demonstration

**Bug**: Order total not including shipping cost

**Before (failing test):**
```
$ npm test -- --grep "calculates total with shipping"

 FAIL  src/services/order.service.spec.ts
  OrderService
    ✕ calculates total with shipping (15 ms)

    Expected: 115.99
    Received: 100.99

Test Suites: 1 failed, 1 total
```

**After (passing test):**
```
$ npm test -- --grep "calculates total with shipping"

 PASS  src/services/order.service.spec.ts
  OrderService
    ✓ calculates total with shipping (12 ms)

Test Suites: 1 passed, 1 total
```

### Regression Test Suite

```
$ npm test -- --testPathPattern="order"

 PASS  src/services/order.service.spec.ts (8 tests)
 PASS  src/services/order.validator.spec.ts (5 tests)
 PASS  src/controllers/order.controller.spec.ts (12 tests)

Test Suites: 3 passed, 3 total
Tests:       25 passed, 25 total
Time:        4.231 s

✓ All existing tests still pass (no regressions)
```

## API Verification Evidence

### Endpoint Response Verification

```bash
$ curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"sku": "ABC123", "quantity": 2}]}'

{
  "id": "ord_abc123",
  "status": "created",
  "items": [
    {
      "sku": "ABC123",
      "quantity": 2,
      "price": 29.99,
      "total": 59.98
    }
  ],
  "subtotal": 59.98,
  "tax": 5.40,
  "shipping": 9.99,
  "total": 75.37,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Error Handling Verification

```bash
$ curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": []}'

HTTP/1.1 400 Bad Request
{
  "error": "VALIDATION_ERROR",
  "message": "Order must contain at least one item",
  "code": "ORDER_EMPTY_CART"
}
```

## Database Migration Evidence

### Successful Migration

```
$ npm run migrate

Running migrations...

  ✓ 20240115_001_add_shipping_cost_column.ts
  ✓ 20240115_002_create_shipping_rates_table.ts

Migrations completed: 2
Database schema is up to date.
```

### Migration Rollback Test

```
$ npm run migrate:down

Rolling back last migration...

  ↓ 20240115_002_create_shipping_rates_table.ts

Rollback completed successfully.
Database restored to previous state.
```

## Evidence Checklist

Before marking implementation complete, verify you have:

- [ ] **Test output** showing all tests pass
- [ ] **Build output** showing zero errors
- [ ] **Lint output** showing zero warnings
- [ ] **Coverage report** meeting minimum thresholds
- [ ] **API verification** showing expected responses
- [ ] **Error case verification** showing proper error handling
- [ ] **Regression confirmation** showing no existing tests broken

**Do not mark complete without concrete evidence. Screenshots and terminal output are your proof.**
