# Example: Mixed Done/Cancelled Epic Closure

## Scenario

Epic: "User Authentication Overhaul" (EPIC-42)
- PRO-101: Implement JWT auth → Done
- PRO-102: Add refresh token rotation → Done
- PRO-103: Migrate legacy sessions → Done
- PRO-104: Add biometric login → Cancelled (descoped — mobile app not ready)
- PRO-105: Add SSO integration → Cancelled (deferred to Q3 epic)

## Assessment

**Core business value:** JWT auth with refresh tokens and session migration — DELIVERED.

**Cancelled items:** Both are enhancement features, not core auth functionality.
- PRO-104 was descoped due to external dependency (mobile app)
- PRO-105 was intentionally deferred to a future epic

**Decision:** Proceed with closure. Core authentication overhaul is complete. Cancelled items have clear rationale and don't undermine the epic's primary goal.

**Retrofit recommendations:**
- JWT token validation pattern from PRO-101 should be applied to 3 existing endpoints
- Error handling pattern from PRO-103 should be propagated to user-service module

## What Would BLOCK This Closure

If PRO-103 (session migration) were cancelled instead, closure would be blocked because:
- Users on legacy sessions would lose access
- Core business value (seamless auth transition) would be incomplete
- A replacement ticket would be required before closure
