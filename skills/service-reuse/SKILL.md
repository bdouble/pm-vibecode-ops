---
name: service-reuse
description: |
  This skill should be used when preventing code duplication by requiring inventory check before creation. Activate when:
  - User says: "create new", "add a service", "build a helper", "write a utility", "new class"
  - User says: "implement middleware", "add validator", "create repository", "new module"
  - User says: "implement a shared component", "add shared function", "create common utility"
  - User says: "avoid duplication", "don't duplicate", "DRY", "reuse pattern", "existing pattern", "already exists"
  - About to create: *Service.ts, *Helper.ts, *Util.ts, *Middleware.ts, *Repository.ts, *Factory.ts
  - Writing new: export class, export function in services/, utils/, common/, shared/

  Requires searching service-inventory.yaml AND grepping codebase for existing implementations BEFORE
  writing any new service, utility, helper, or shared code. Document "found X" or "searched, not found".
---

# Service Reuse Enforcement

Before creating ANYTHING new, check existing inventory first.

## Enforcement Workflow

1. **STOP** before creating any new service/utility/helper
2. **SEARCH** inventory files and codebase (see checks below)
3. **DOCUMENT** findings: "Found X" or "Searched X, Y, Z - nothing found"
4. **REUSE** if similar exists, **JUSTIFY** if creating new
5. **UPDATE** service inventory after creating new components

## Pre-Creation Checks

### Search Inventory Files
```bash
# Find service inventories
ls -la **/service-inventory.yaml **/SERVICE_INVENTORY.md 2>/dev/null

# Search existing implementations
grep -r "class.*Service" src/
grep -r "export function" src/utils/
```

### Search for Similar Functionality
```bash
# Example: Before creating email validator
grep -ri "validate.*email\|email.*valid" src/

# Example: Before creating auth middleware
grep -ri "auth.*middleware\|middleware.*auth" src/
```

### Document Decision
```markdown
# If exists - REUSE
## Reuse: Email Validation
- **Found**: src/utils/validators/email.validator.ts
- **Import**: `import { validateEmail } from '@/utils/validators'`

# If not exists - JUSTIFY
## New: SMS Service
- **Searched**: service-inventory.yaml, src/services/, src/utils/
- **Result**: No SMS functionality found
- **Justification**: New Twilio integration required
```

## Prohibited Patterns

### Never Recreate Auth
```typescript
// BLOCK - Custom auth logic
class MyAuthService { validateToken(token) { } }

// REQUIRE - Use existing
import { AuthService } from '@/modules/auth';
```

### Never Recreate Validators
```typescript
// BLOCK - Duplicate validator
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+$/.test(email);

// REQUIRE - Use existing
import { validators } from '@/utils/validators';
```

### Never Recreate Base Classes
```typescript
// BLOCK - Duplicate base abstraction
class AbstractRepository { }  // One already exists!

// REQUIRE - Extend existing
class MyRepository extends BaseRepository<MyEntity> { }
```

### Use Events Over Direct Coupling
```typescript
// BLOCK - Direct service coupling
await this.emailService.sendConfirmation(data);
await this.inventoryService.decrementStock(data);

// REQUIRE - Event-driven
this.eventBus.emit('order.created', { order });
```

## Service Inventory Format

```yaml
# service-inventory.yaml
services:
  authentication:
    location: src/modules/auth/auth.service.ts
    capabilities: [validateToken, refreshToken, generateToken]
    mandate: ALL auth operations use this

  validation:
    location: src/utils/validators/
    capabilities: [email, phone, password, UUID]
    mandate: ALL validation uses existing validators

infrastructure:
  base_repository: src/common/repositories/base.repository.ts
  middleware:
    auth: src/common/middleware/auth.middleware.ts
    logging: src/common/middleware/logging.middleware.ts

events:
  order.created: Triggers email, inventory update
  user.registered: Triggers welcome email, analytics
```

## When New IS Justified

Create new only when:
1. **Thoroughly searched** - Nothing similar exists
2. **New integration** - External service not yet integrated
3. **New domain** - Entirely new business area

Even then:
- Follow existing patterns exactly
- Extend existing base classes
- Use existing middleware/guards
- Add to service inventory when complete
- Emit events, don't couple directly

**When the service inventory cannot be found, ask the user for its location. Never assume creation is needed.**

## Related Skills
- **production-code-standards**: Quality standards for any new services created
- **divergent-exploration**: Explore alternatives before deciding to create new services
