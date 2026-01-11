# Test Priority Guidelines

Reference for prioritizing what to test based on risk and value.

## High Priority (Must Test)

### Complex Business Logic
- Financial calculations (pricing, discounts, taxes)
- State machines and workflow transitions
- Permission and authorization checks
- Data transformations with business rules

### Security-Sensitive Code
- Authentication flows
- Input validation and sanitization
- API authorization checks
- Session management

### Critical User Paths
- Checkout/payment flows
- User registration and login
- Data export/import
- Core CRUD operations on primary entities

### Error-Prone Areas
- Edge cases in date/time handling
- Currency and number formatting
- File uploads and processing
- External API integrations

## Medium Priority (Should Test)

- Standard CRUD operations
- Form validation
- Navigation and routing
- Data fetching and caching
- UI state management

## Low Priority (Test If Time Permits)

- Simple getters/setters
- Pass-through functions
- Configuration loading
- Static content rendering
- Third-party library wrappers

## Skip Testing

- Type definitions only
- Constants and enums
- Pure UI styling (visual regression tools instead)
- Framework boilerplate
- Generated code

## Risk-Based Prioritization Matrix

| Factor | Weight | Questions to Ask |
|--------|--------|------------------|
| User Impact | High | What happens if this fails in production? |
| Change Frequency | Medium | How often does this code change? |
| Complexity | Medium | How many code paths exist? |
| Dependencies | Low | Does this have many external dependencies? |

**Prioritize tests that protect against high-impact failures in frequently-changing, complex code.**
