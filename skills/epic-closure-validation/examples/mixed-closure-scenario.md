# Example: Mixed Done/Cancelled Epic Closure

## Scenario

Epic: "User Authentication Overhaul" (EPIC-42)
- AUTH-101: Implement JWT auth → Done
- AUTH-102: Add refresh token rotation → Done
- AUTH-103: Migrate legacy sessions → Done
- AUTH-104: Add biometric login → Cancelled (descoped — mobile app not ready)
- AUTH-105: Add SSO integration → Cancelled (deferred to Q3 epic)

## Assessment

**Core business value:** JWT auth with refresh tokens and session migration — DELIVERED.

**Cancelled items:** Both are enhancement features, not core auth functionality.
- AUTH-104 was descoped due to external dependency (mobile app)
- AUTH-105 was intentionally deferred to a future epic

**Decision:** Proceed with closure. Core authentication overhaul is complete. Cancelled items have clear rationale and don't undermine the epic's primary goal.

**Retrofit recommendations:**
- JWT token validation pattern from AUTH-101 should be applied to 3 existing endpoints
- Error handling pattern from AUTH-103 should be propagated to user-service module

## What Would BLOCK This Closure

If AUTH-103 (session migration) were cancelled instead, closure would be blocked because:
- Users on legacy sessions would lose access
- Core business value (seamless auth transition) would be incomplete
- A replacement ticket would be required before closure
