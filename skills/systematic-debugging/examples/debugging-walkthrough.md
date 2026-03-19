# Debugging Walkthrough: Silent Data Loss

## Symptom
API endpoint POST /api/runs/create-audit accepts documentIds but user-selected documents never appear in the pipeline run.

## Phase 1: Root Cause Investigation (NOT guessing)

### Step 1: Trace the data flow
```bash
# Find where documentIds enters the system
grep -rn "documentIds" src/app/api/runs/create-audit/
# Result: route.ts:15 — accepted from request body

# Find where it should be consumed
grep -rn "documentIds" src/services/pipeline/
# Result: triggerAuditPipelineRun.ts:8 — parameter exists in function signature
```

### Step 2: Read the actual code path
Read route.ts → found: documentIds destructured from body but NOT passed to triggerAuditPipelineRun().

### Step 3: Confirm the gap
```bash
# Check the function call
grep -A5 "triggerAuditPipelineRun" src/app/api/runs/create-audit/route.ts
# Result: triggerAuditPipelineRun({ projectId, name }) — documentIds missing!
```

## Phase 2: Pattern Analysis

This is a **parameter forwarding bug** — a known pattern where:
1. API accepts parameter at boundary
2. Internal function has the parameter in its signature
3. The call site omits it (silent data loss)

## Phase 3: Hypothesis
**Hypothesis:** Adding documentIds to the function call will fix the issue.
**Test:** Add parameter, verify it reaches the pipeline.

## Phase 4: Fix
```typescript
// Before (bug)
await triggerAuditPipelineRun({ projectId, name });

// After (fix)
await triggerAuditPipelineRun({ projectId, name, documentIds });
```

**Verification:**
```bash
grep -A5 "triggerAuditPipelineRun" src/app/api/runs/create-audit/route.ts
# Confirmed: documentIds now included in call
```

## Why This Matters
This bug was missed by implementation, code review, AND testing because:
- No phase traces data flow end-to-end
- Code "compiles and passes tests" but silently drops data
- The P5 (Data Flow Tracing) improvement now catches this class of bug
