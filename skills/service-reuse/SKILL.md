---
name: service-reuse
description: Use when about to write `class NewService`, `export function`, new middleware, new repository, new factory, or new utility — before the first keystroke of a new abstraction. Also use when unsure whether an auth, validation, pagination, logging, or repository pattern already exists in the codebase, or when user says "create new", "add a service", "new class", "DRY", or "reuse".
---

# Service Reuse Enforcement

Before creating ANYTHING new, check existing inventory first.

**Violating the letter of this skill is violating the spirit of this skill.** Searching with one keyword and concluding "nothing exists", creating a parallel utility with slightly different naming, or "extending the inventory after the fact" instead of before — all violate the spirit. The default is reuse; new code is the exception. Spirit over letter, always.

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

## Red Flags — STOP

When you notice ANY of these in your own thinking or writing, you are about to duplicate functionality that may already exist. Stop and search first.

- `class New[Anything]Service` / `export function` before any inventory or grep check
- "I'll just write a quick helper for…"
- "This needs a [validator/auth/middleware/repository]" without checking if one exists
- "I haven't seen one, so I'll create it" (you haven't *looked*)
- "It's simpler to write a new one than learn the existing one"
- "The existing one doesn't quite fit, I'll make a parallel one"
- "Different module = different service" (often false)
- Creating a utility used only once

**All of these mean: search the inventory and grep the codebase first.** Document what you searched, what you found, and your reuse decision before creating anything new.

## Rationalizations — STOP

If you think any of these, you are about to duplicate functionality that already exists.

| Excuse | Reality |
|--------|---------|
| "I searched and didn't find anything similar" | Search again with multiple synonyms. Auth/authenticate/login/session, validator/validate/check/sanitize, etc. Function names rarely match the search term you tried first. |
| "The existing service doesn't quite fit my needs" | Extend it. Pass parameters. Compose. Forking creates two things to maintain. |
| "It's simpler to write a new one" | Simpler now, expensive forever. New code = new bugs, new tests, new maintenance. |
| "This is a different use case" | Different inputs are not different services. Different *behavior* might be — verify before duplicating. |
| "I didn't see it in the inventory" | The inventory may be stale. Grep the codebase before concluding. |
| "It's a one-off helper, I won't add it to the inventory" | One-offs become two-offs. If it's worth writing, it's worth inventorying. |
| "I'll inline this logic instead of extracting a function" | If it appears once, fine. If you're about to copy-paste it elsewhere, extract and reuse. |

## Additional Resources

- **`references/service-inventory-template.md`** — Complete service inventory YAML template with categories, capabilities, and mandate fields
- **`examples/inventory-search-session.md`** — Walkthrough of a real inventory search and reuse decision

## Related Skills
- **production-code-standards**: Quality standards for any new services created
- **divergent-exploration**: "Extend existing service" must be a candidate option in any architecture exploration
- **no-silent-deferrals**: "I'll add this to the inventory later" is a silent deferral
