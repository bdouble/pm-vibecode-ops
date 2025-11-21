---
description: Generate or update service inventory files for frontend and backend to track reusable components and prevent duplication.
workflow-phase: project-setup
closes-ticket: false
workflow-sequence: "**service-inventory** → discovery → epic-planning → planning"
---

# Service Inventory Generation Command

You are acting as the **architect and platform engineer** for this project. Your goal is to scan the codebase and maintain accurate service inventory files that other phases (discovery, planning, implementation, security review) can rely on to avoid duplication and enforce reuse.

Ask the user which parts of the system to target:
- Frontend only
- Backend only
- Both frontend and backend (default)

Also confirm whether to:
- Incrementally **update** existing inventories (default), or
- Fully **regenerate** them from scratch when they are stale or incorrect.

Generate or update comprehensive service inventory files (`service-inventory.yaml`) for tracking existing services, utilities, middleware, and patterns to prevent code duplication.

## Purpose

This command scans the codebase to catalog all reusable components, creating an inventory that other commands (code review, security review, implementation) can reference to:
- Prevent recreation of existing services
- Enforce service reuse
- Track infrastructure patterns
- Document available utilities
- **Track test infrastructure and fixtures**
- **Document testing patterns and best practices**

## Inventory Structure

### Backend Service Inventory (`backend/service-inventory.yaml`)
```yaml
services:
  authentication:
    location: src/auth/auth.service.ts
    type: singleton
    dependencies: [prisma, jwt, bcrypt]
    methods: [login, logout, validateToken, refreshToken]
    description: Handles user authentication and session management

  email:
    location: src/email/email.service.ts
    type: singleton
    dependencies: [sendgrid, templates]
    methods: [sendWelcome, sendPasswordReset, sendNotification]
    description: Email sending service with template support

utilities:
  validation:
    location: src/common/validation.ts
    exports: [emailValidator, phoneValidator, urlValidator, passwordStrength]

  formatters:
    location: src/common/formatters.ts
    exports: [formatCurrency, formatDate, formatPhoneNumber]

  crypto:
    location: src/common/crypto.ts
    exports: [hashPassword, verifyPassword, generateToken, encryptData]

middleware:
  auth:
    location: src/middleware/auth.middleware.ts
    type: guard
    applies_to: [protected_routes]

  rateLimit:
    location: src/middleware/rate-limit.middleware.ts
    type: interceptor
    config: {window: 15min, max: 100}

  validation:
    location: src/middleware/validation.middleware.ts
    type: pipe
    validation_library: class-validator

decorators:
  Roles:
    location: src/decorators/roles.decorator.ts
    usage: "@Roles('admin', 'user')"

  Public:
    location: src/decorators/public.decorator.ts
    usage: "@Public()"

patterns:
  repository:
    base_class: src/common/base.repository.ts
    implementations: [UserRepository, PostRepository]

  dto:
    base_class: src/common/base.dto.ts
    validation: class-validator

  events:
    emitter: src/events/event-emitter.ts
    patterns: [UserCreated, PostPublished]

infrastructure:
  database:
    orm: prisma
    location: src/prisma/prisma.service.ts

  cache:
    provider: redis
    location: src/cache/cache.service.ts

  queue:
    provider: bull
    location: src/queue/queue.service.ts
```

### Test Infrastructure Section (Backend)

```yaml
testing:
  framework: Jest
  reference: src/common/tests/CLAUDE.md

  # Core Test Utilities
  core_utilities:
    test-helpers:
      location: src/common/tests/utils/test-helpers.ts
      description: Centralized mock factories for common dependencies
      exports:
        - createMockEventEmitter()
        - createMockConfigService(overrides?)
        - createMockSecurityEventService()
        - createMockExpressRequest(overrides?)
        - createMockUserRepository()
        - createMockEntityRepository()
        - createBaseTestingModule(provider, deps)
        - cleanupTestModule(moduleRef)
      features: [type-safe mocks, consistent setup, reduced duplication]

    test-isolation:
      location: src/common/tests/utils/test-isolation.ts
      description: Complete test isolation to prevent cascading failures
      exports:
        - isolateTest(moduleRef)
        - cleanupTestState()
        - createIsolatedTestModule(config)
        - resetRateLimitStorage()
        - createCleanMock<T>(impl?)
        - createMockDatabaseService()
        - cleanupTestModule(module)
        - setupTestIsolation()
        - globalTestCleanup()
      features: [prevents cascading failures, connection pool management, rate limit cleanup]
      critical: true

  # Entity Test Data
  fixtures:
    repository-test-utils:
      location: src/common/tests/repository-test-utils.ts
      description: TestFixtureFactory for generating test entity data
      exports:
        - TestFixtureFactory.createUser(overrides?)
        - TestFixtureFactory.createEntity(overrides?)
        - TestFixtureFactory.createSession(overrides?)
      pattern: "Factory pattern for consistent test data"
      features: [type-safe, customizable, realistic defaults]
      critical: true
      notes: "ALWAYS use factory - never hardcode test data"

  # Module-Specific Test Utilities
  module_testing:
    module-testing-utils:
      location: src/common/tests/[module]-testing-utils.ts
      description: Module-specific testing utilities
      exports:
        - createTestingModuleFor[Module](config)
        - createMockRepository()
        - createMockService()
      features: [module-specific mocks, error simulation]

  # Standard Test Patterns
  patterns:
    standard_unit_test:
      description: "Standard unit test with isolation"
      template: |
        import { createMockConfigService, cleanupTestModule } from '@/common/tests/utils/test-helpers';

        describe('MyService', () => {
          let moduleRef: TestingModule;

          beforeEach(async () => {
            moduleRef = await Test.createTestingModule({
              providers: [MyService, { provide: ConfigService, useValue: createMockConfigService() }],
            }).compile();
          });

          afterEach(async () => {
            await cleanupTestModule(moduleRef);
          });
        });

  # Critical Rules
  rules:
    - "NEVER create test data at module level - always use TestFixtureFactory"
    - "ALWAYS use isolateTest() or cleanupTestModule() in afterEach"
    - "ALWAYS declare moduleRef with let, not const"
    - "USE test-helpers.ts for all common mocks"
    - "USE test-isolation.ts for all cleanup logic"

  # Test Infrastructure Benefits
  benefits:
    - "✅ Eliminates duplicate mock code across test files"
    - "✅ Prevents cascading test failures through proper isolation"
    - "✅ Type-safe with full TypeScript support"
    - "✅ Standardized patterns across entire backend"
```

### Frontend Service Inventory (`frontend/service-inventory.yaml`)
```yaml
services:
  api:
    location: src/services/api.service.ts
    methods: [get, post, put, delete, patch]
    interceptors: [auth, error, retry]

  auth:
    location: src/services/auth.service.ts
    methods: [login, logout, getUser, refreshToken]
    storage: [localStorage, sessionStorage]

  notification:
    location: src/services/notification.service.ts
    methods: [success, error, warning, info]
    provider: react-toastify

hooks:
  useAuth:
    location: src/hooks/useAuth.ts
    returns: {user, login, logout, isAuthenticated}

  useApi:
    location: src/hooks/useApi.ts
    features: [loading, error, data, refetch]

  useForm:
    location: src/hooks/useForm.ts
    validation: zod
    features: [validation, submission, reset]

components:
  forms:
    location: src/components/forms/
    available: [Input, Select, Checkbox, DatePicker, FileUpload]

  layout:
    location: src/components/layout/
    available: [Header, Footer, Sidebar, Layout]

  common:
    location: src/components/common/
    available: [Button, Modal, Card, Table, Spinner]

utilities:
  validation:
    location: src/utils/validation.ts
    exports: [emailValidator, phoneValidator, passwordStrength]

  formatting:
    location: src/utils/formatting.ts
    exports: [formatCurrency, formatDate, formatRelativeTime]

  storage:
    location: src/utils/storage.ts
    exports: [getItem, setItem, removeItem, clear]

state_management:
  provider: zustand
  stores:
    auth:
      location: src/store/auth.store.ts
      state: [user, token, isAuthenticated]

    app:
      location: src/store/app.store.ts
      state: [theme, language, settings]

routing:
  provider: react-router
  guards:
    PrivateRoute:
      location: src/components/guards/PrivateRoute.tsx
      checks: [authentication, roles]

    PublicRoute:
      location: src/components/guards/PublicRoute.tsx
      redirects_if: authenticated

styles:
  system: tailwindcss
  themes:
    location: src/styles/themes/
    available: [light, dark]
  components:
    location: src/styles/components/
```

### Test Infrastructure Section (Frontend)

```yaml
testing:
  unit: Vitest
  e2e: Playwright
  component: Vitest + React Testing Library
  reference: tests/CLAUDE.md

  # Core Test Utilities
  core_utilities:
    test-isolation:
      location: tests/utils/test-isolation.ts
      description: Complete frontend test isolation utilities
      exports:
        - setupTestIsolation()
        - createIsolatedQueryClient()
        - clearReactQueryCache(client?)
        - createCleanTestEnvironment()
      features: [React Query cache isolation, localStorage cleanup, event listener cleanup]
      critical: true
      cleanups: [DOM/component state, React Query cache, localStorage, window events, fetch mocks, vi mocks]

    render-with-providers:
      location: tests/utils/renderWithProviders.tsx
      description: Complete provider wrapper for testing
      exports:
        - renderWithProviders(ui, options)
        - renderAsUser(ui, options)
        - renderAsAdmin(ui, options)
        - renderHookAsUser(callback, options)
        - renderHookAsAdmin(callback, options)
      providers: [SessionProvider, QueryClientProvider, ThemeProvider]
      features: [auto-flush promises, user interactions, flexible session injection]
      critical: true

  # Authentication Testing
  auth_testing:
    auth-test-helpers:
      location: tests/utils/auth-test-helpers.ts
      description: Authentication testing utilities and mock sessions
      exports:
        - createMockAuthSession(options)
        - setupAuthMocks()
        - mockAuthenticatedUser(mockedUseSession, type, options)
        - MOCK_AUTH_SESSIONS
        - MOCK_USE_SESSION_RETURNS
      features: [session mocking, type-safe sessions, quick setup helpers]
      critical: true

  # Router Testing
  router_testing:
    router-test-helpers:
      location: tests/utils/router-test-helpers.ts
      description: Router mocking utilities
      exports:
        - createMockRouter(overrides?)
        - mockUseRouter(router?)
        - mockUsePathname(pathname)
        - mockUseSearchParams(params)
        - setupRouterMocks(options)
        - extractSearchParams(urlOrQuery)
        - assertRouterPushedWithParams(mockRouter, params)
      features: [isolated mocks, complete router coverage, type-safe]
      critical: true

  # Mock Factories
  fixtures:
    mock-factories:
      location: tests/utils/mockFactories.ts
      description: Factory functions for generating test entity data
      exports:
        - createMockUser(overrides?)
        - createMockEntity(overrides?)
        - createMockSession(overrides?)
      pattern: "Factory pattern for consistent frontend test data"
      features: [type-safe, customizable, realistic defaults]
      critical: true

  # Standard Test Patterns
  patterns:
    standard_component_test:
      description: "Standard component test with isolation"
      template: |
        import { setupTestIsolation, createIsolatedQueryClient } from '@/tests/utils/test-isolation';
        import { renderWithProviders } from '@/tests/utils/renderWithProviders';

        describe('MyComponent', () => {
          setupTestIsolation();

          it('renders correctly', () => {
            const queryClient = createIsolatedQueryClient();
            renderWithProviders(<MyComponent />, { queryClient });
            expect(screen.getByText('Expected Text')).toBeInTheDocument();
          });
        });

  # Critical Rules
  rules:
    - "ALWAYS use setupTestIsolation() at describe level"
    - "ALWAYS use createIsolatedQueryClient() for React Query tests"
    - "USE renderWithProviders() not bare render()"
    - "USE mockUseRouter() for router-dependent components"
    - "NEVER share QueryClient or mocks between tests"
```

## Generation Modes

### Update Mode (Default - Preserves Customizations)
- Reads existing inventory if present
- Adds new services not already cataloged
- Preserves manual descriptions and documentation
- Marks removed services as deprecated
- Maintains custom metadata

### Regenerate Mode (Full Overwrite)
- Creates fresh inventory from scratch
- Useful after major refactoring
- Removes stale entries
- Resets all documentation

## Generation Workflow

### Smart Update Process
```bash
MODE="${2:-update}"
TARGET="${1:-both}"

# Function to update or regenerate inventory
update_inventory() {
  local dir=$1
  local inventory_file="$dir/service-inventory.yaml"

  if [ "$MODE" = "update" ] && [ -f "$inventory_file" ]; then
    echo "=== Updating existing $dir inventory ==="

    # Backup existing inventory
    cp "$inventory_file" "$inventory_file.backup"

    # Load existing inventory to preserve customizations
    EXISTING_INVENTORY=$(cat "$inventory_file")

    # Track what's in the current inventory
    EXISTING_SERVICES=$(grep "^  [a-zA-Z]" "$inventory_file" | sed 's/://g' | tr -d ' ')

  else
    echo "=== Regenerating $dir inventory from scratch ==="
    EXISTING_INVENTORY=""
    EXISTING_SERVICES=""
  fi

  # Scan for new services
  scan_and_update "$dir"
}

# Function to scan and merge findings
scan_and_update() {
  local dir=$1
  local temp_file="/tmp/new-services-$$.yaml"

  echo "Scanning for services in $dir..."

  # Find all service files
  find "$dir/src" -name "*.service.ts" -o -name "*.service.js" 2>/dev/null | while read file; do
    SERVICE_NAME=$(basename "$file" | sed 's/\..*//')

    # Check if service already exists in inventory
    if echo "$EXISTING_SERVICES" | grep -q "$SERVICE_NAME"; then
      echo "  ✓ Found existing: $SERVICE_NAME (preserving documentation)"
    else
      echo "  + New service discovered: $SERVICE_NAME"
      # Add to new services list
      echo "$SERVICE_NAME:$file" >> "$temp_file"
    fi
  done

  # Merge new services with existing inventory
  merge_inventories "$dir" "$temp_file"
}

# Function to merge inventories intelligently
merge_inventories() {
  local dir=$1
  local new_services=$2
  local inventory_file="$dir/service-inventory.yaml"

  if [ "$MODE" = "update" ] && [ -f "$inventory_file" ]; then
    echo "Merging new services into existing inventory..."

    # Append new services to appropriate sections
    while IFS=: read -r name path; do
      cat >> "$inventory_file.tmp" << EOF

  ${name}:
    location: ${path}
    type: singleton  # Review and update type as needed
    description: "NEW - Needs documentation"
    added_date: $(date +%Y-%m-%d)
EOF
    done < "$new_services"

    # Check for removed services (mark as deprecated)
    echo "Checking for deprecated services..."
    # Implementation for deprecation marking

  else
    # Full regeneration
    generate_fresh_inventory "$dir"
  fi
}

# Function for fresh generation
generate_fresh_inventory() {
  local dir=$1
  cat > "$dir/service-inventory.yaml" << 'EOF'
# Service Inventory - Generated $(date)
# Mode: ${MODE}
# This file tracks all reusable services and components
# Used by review commands to prevent code duplication

metadata:
  generated_date: $(date +%Y-%m-%d)
  last_updated: $(date +%Y-%m-%d)
  mode: ${MODE}
  version: 1.0
  total_services: 0
  total_repositories: 0
  total_test_utilities: 0
  total_test_patterns: 0
  total_mock_factories: 0

services:
  [generated content]
EOF

  # Count test utilities
  TEST_UTILS_COUNT=$(find "$dir/src/common/tests/utils" -name "*.ts" ! -name "*.spec.ts" ! -name "*.test.ts" 2>/dev/null | wc -l)
  TEST_PATTERNS_COUNT=$(grep -c "patterns:" "$dir/service-inventory.yaml" 2>/dev/null || echo 0)
  MOCK_FACTORIES_COUNT=$(grep -c "Factory" "$dir/service-inventory.yaml" 2>/dev/null || echo 0)

  # Update metadata
  sed -i '' "s/total_test_utilities: .*/total_test_utilities: $TEST_UTILS_COUNT/" "$dir/service-inventory.yaml"
  sed -i '' "s/total_test_patterns: .*/total_test_patterns: $TEST_PATTERNS_COUNT/" "$dir/service-inventory.yaml"
  sed -i '' "s/total_mock_factories: .*/total_mock_factories: $MOCK_FACTORIES_COUNT/" "$dir/service-inventory.yaml"
}
```

### Backend Inventory Update
```bash
echo "=== Processing Backend Service Inventory ==="

if [ "$MODE" = "update" ] && [ -f "backend/service-inventory.yaml" ]; then
  echo "Mode: UPDATE - Preserving existing documentation"

  # Parse existing inventory
  EXISTING=$(yq eval '.services' backend/service-inventory.yaml)

  # Find new services
  echo "Scanning for new services..."
  find backend/src -name "*.service.ts" -o -name "*.service.js" | while read file; do
    SERVICE_NAME=$(basename "$file" .service.ts | sed 's/.service$//')

    # Check if already in inventory
    if ! echo "$EXISTING" | grep -q "$SERVICE_NAME"; then
      echo "  + New service: $SERVICE_NAME at $file"
      # Add to inventory with NEW tag
    fi
  done

  # Mark removed services
  echo "Checking for removed services..."
  # Compare existing inventory with current file system

else
  echo "Mode: REGENERATE - Creating fresh inventory"
  # Full regeneration logic
fi
```

### Frontend Inventory Generation
```bash
echo "=== Generating Frontend Service Inventory ==="

# Find all service files
echo "Scanning for services..."
find frontend/src -name "*.service.ts" -o -name "*.service.js" | while read file; do
  echo "  - Processing: $file"
done

# Find all hooks
echo "Scanning for hooks..."
find frontend/src -path "*/hooks/*" -name "use*.ts" -o -name "use*.js" | while read file; do
  echo "  - Processing: $file"
done

# Find all components
echo "Scanning for reusable components..."
find frontend/src/components -name "*.tsx" -o -name "*.jsx" | while read file; do
  echo "  - Processing: $file"
done

# Generate YAML output
cat > frontend/service-inventory.yaml << 'EOF'
# Service Inventory - Generated $(date)
# This file tracks all reusable services and components
# Used by review commands to prevent code duplication

services:
  [generated content]
EOF
```

### Test Infrastructure Scanning (Conceptual)

You do not need to implement the full Bash scripts above. Instead, conceptually:
- Scan `backend/src/common/tests` and `frontend/tests` for shared test utilities and fixtures.
- Record their locations, exported helpers, and any test documentation files into the `testing` sections of the inventories.
- Treat these as **first-class reusable services** for QA, just like runtime services for implementation.

## Usage by Other Commands

### Code Review Command
```bash
# Load inventories at start of review
if [ -f "backend/service-inventory.yaml" ]; then
  BACKEND_SERVICES=$(cat backend/service-inventory.yaml)
fi

# Check for duplication
if grep -q "EmailService" new-implementation.ts; then
  echo "WARNING: EmailService already exists in inventory"
  echo "Location: $(grep -A 2 "email:" backend/service-inventory.yaml)"
fi
```

### Implementation Command
```bash
# Before creating new service
echo "Checking service inventory for existing solutions..."
grep -i "$SERVICE_NAME" */service-inventory.yaml

if [ $? -eq 0 ]; then
  echo "Found existing service - reuse instead of recreating"
fi
```

## Update vs Regeneration Decision Guide

### When to Use Update Mode (Default)
- Adding new services/components
- Regular maintenance updates
- After implementing new features
- Preserving manual documentation
- Keeping deprecated service history

### When to Use Regenerate Mode
- After major refactoring
- When inventory is corrupted
- Starting fresh documentation
- Removing all deprecated entries
- Major architectural changes

## Example Usage

### Regular Update (Preserves Documentation)
```bash
# Update both inventories, preserving customizations
/generate_service_inventory both update

# Update only backend inventory
/generate_service_inventory backend update
```

### Full Regeneration (Fresh Start)
```bash
# Regenerate both inventories from scratch
/generate_service_inventory both regenerate

# Regenerate only frontend inventory
/generate_service_inventory frontend regenerate
```

### Handling Manual Customizations

The update mode preserves:
```yaml
services:
  authentication:
    location: src/auth/auth.service.ts
    type: singleton
    description: "Handles OAuth2, JWT, and session management"  # Preserved
    custom_notes: "Refactored in Sprint 23"  # Preserved
    security_level: high  # Preserved
    methods: [login, logout, validateToken]  # Auto-updated if changed
```

New services are added with markers:
```yaml
  newPaymentService:
    location: src/payment/payment.service.ts
    type: singleton
    description: "NEW - Needs documentation"  # Flag for review
    added_date: 2024-12-19  # Automatic
    methods: [processPayment, refund]  # Auto-detected
```

Deprecated services are marked but not removed:
```yaml
  oldEmailService:
    location: src/email/old-email.service.ts  # File no longer exists
    deprecated: true  # Automatically marked
    deprecated_date: 2024-12-19
    replacement: emailService  # Manual annotation preserved
    description: "Legacy email service - migrated to new service"
```

## Update Triggers

The service inventory should be updated:

**Existing Triggers:**
1. **Automatically** - During discovery phase (`/discovery` command)
2. **After new services** - Run `update` mode after adding services
3. **Weekly maintenance** - Scheduled update to catch changes
4. **Before code review** - Ensure inventory is current

**New Test Infrastructure Triggers:**
5. **After adding test utilities** - When creating new test helpers or mocks
6. **After test refactoring** - When consolidating test patterns
7. **After testing improvements** - When completing testing infrastructure improvements
8. **Quarterly test review** - Ensure all test utilities are documented

## Conflict Resolution

When conflicts arise during updates:
1. **Backup created** - `service-inventory.yaml.backup`
2. **Manual review** - Conflicts marked with `CONFLICT:` prefix
3. **Merge tool** - Use `diff` to compare backup vs new
4. **Rollback option** - Restore from backup if needed

## Success Criteria

Inventory generation is successful when:
- All services, utilities, and patterns are cataloged
- File locations are accurate and current
- Method signatures are documented
- Dependencies are tracked
- Custom documentation is preserved (update mode)
- Deprecated services are properly marked
- Both frontend and backend inventories exist
- Files are in valid YAML format

This command ensures that all reusable components are documented and discoverable, preventing code duplication while preserving valuable documentation and customizations.
