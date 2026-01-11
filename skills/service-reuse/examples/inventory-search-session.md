# Example: Service Inventory Search Session

A complete example of how to search for existing functionality before creating new code.

## Scenario

User request: "Create an email notification service for order confirmations"

## Step 1: Search Service Inventory

```bash
# Check for service inventory file
cat context/service-inventory.yaml 2>/dev/null || cat SERVICE_INVENTORY.md 2>/dev/null
```

**Found in inventory:**
```yaml
services:
  email:
    location: src/services/email/email.service.ts
    capabilities: [sendEmail, sendTemplated, queueEmail]
    templates: [welcome, passwordReset, orderConfirmation]
```

## Step 2: Verify Existing Capability

```bash
# Read the existing service
cat src/services/email/email.service.ts
```

**Discovery:**
- `EmailService.sendTemplated()` already exists
- `orderConfirmation` template already exists
- Service already handles queuing and retry logic

## Step 3: Document Decision

### Reuse Decision: Email Notification

- **Found**: `src/services/email/email.service.ts`
- **Capability**: `sendTemplated('orderConfirmation', data)`
- **Decision**: REUSE existing service
- **New code needed**: None - just call existing method

## Step 4: Implementation (Reuse Path)

```typescript
// In OrderService - using existing EmailService
@Injectable()
export class OrderService {
  constructor(private emailService: EmailService) {}

  async completeOrder(order: Order): Promise<void> {
    // ... order processing logic ...

    // Reuse existing email service - NO new service created
    await this.emailService.sendTemplated('orderConfirmation', {
      to: order.customer.email,
      orderId: order.id,
      items: order.items,
      total: order.total
    });
  }
}
```

## Alternative: When New Service IS Needed

If search found nothing:

```bash
# Search results
grep -ri "sms\|text.*message\|twilio" src/
# Result: No SMS functionality found

grep -ri "sms" context/service-inventory.yaml
# Result: No matches
```

### New Service Decision: SMS Notifications

- **Searched**: service-inventory.yaml, src/services/, src/utils/
- **Result**: No SMS functionality exists
- **Justification**: New Twilio integration required for SMS
- **Action**: Create new service following existing patterns

```typescript
// NEW service - justified because nothing exists
@Injectable()
export class SmsService {
  // Follow exact patterns from EmailService
  async sendTemplated(template: SmsTemplate, data: SmsData): Promise<void> {
    // Implementation
  }
}
```

**Remember**: Update service-inventory.yaml after creating new services!
