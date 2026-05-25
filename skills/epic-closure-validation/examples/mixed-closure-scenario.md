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

**Follow-up discipline analysis:**

- Candidate: "JWT token validation pattern from AUTH-101 should be applied to 3 existing endpoints"
  - Boundary question: A typed validateJWT() helper was installed in AUTH-101 that all new code uses. The 3 existing endpoints predate the helper.
  - Impact bar: "Without this, JWT signature checks remain bypassable on /v1/admin/* routes for any authenticated user with a forged token, violating the auth-token-required security control."
  - Decision: File ONE propagation ticket (not 3) with the 3 endpoints as a checklist. Bar clears.

- Candidate: "Error handling pattern from AUTH-103 should be propagated to user-service module"
  - Boundary question: No enforcement point installed; pattern is convention.
  - Impact bar: "Without this, error messages in user-service are inconsistent with auth-service" — generic "consistency" rationale.
  - Decision: Fails the impact bar (consistency alone is disqualifying). Move to closure-log.

**Filed:** 1 follow-up ticket (JWT propagation, P1, 3 endpoints checklist).
**Closure-log:** "Error handling consistency across user-service — considered as adjacent improvement; below the bar because no current named-impact concern. What would change to re-evaluate: a regression or incident traced to error-message inconsistency."

## What Would BLOCK This Closure

If AUTH-103 (session migration) were cancelled instead, closure would be blocked because:
- Users on legacy sessions would lose access
- Core business value (seamless auth transition) would be incomplete
- A replacement ticket would be required before closure

If the agent had filed both candidates as tickets (failing to apply the boundary question and impact bar), the closure would still proceed — but the validation would flag the second ticket as "missing impact-bar sentence" or "generic 'for' content" and re-dispatch the agent to move it to the closure-log.
