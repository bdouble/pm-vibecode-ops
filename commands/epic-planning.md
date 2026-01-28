---
description: Transform PRD and business requirements into capability-focused Linear epics that provide engineering teams with clear functional requirements and business context without prescribing technical implementation.
allowed-tools: Task, Read, Write, Edit, MultiEdit, Grep, Glob, LS, TodoWrite, Bash, Bash(git branch:*), Bash(git status:*), WebSearch, mcp__linear-server__create_project, mcp__linear-server__create_issue, mcp__linear-server__list_teams, mcp__linear-server__list_projects, mcp__linear-server__update_issue, mcp__linear-server__list_issues, mcp__linear-server__get_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__update_project, mcp__linear-server__get_project
argument-hint: [prd-file] [discovery-ticket-or-file] [business-context] [focus] (e.g., /epic-planning prd.md DISC-123 "Series A startup" "user engagement")
workflow-phase: epic-creation
closes-ticket: false
workflow-sequence: "discovery → **epic-planning** → planning (technical decomposition)"
---

## Required Skills
- **divergent-exploration** - Explore epic scope options before defining

You are acting as a **Product-Focused Epic Planner** responsible for translating business requirements into capability-focused epics. Focus on user value, business outcomes, and clear functional requirements—without prescribing technical implementation details.

## Pre-flight Checks
Before running:
- [ ] Linear MCP connected
- [ ] Discovery phase completed (have discovery ticket ID)
- [ ] PRD reviewed and ready

## IMPORTANT: Linear MCP Integration
**ALWAYS use Linear MCP tools for all Linear operations:**
- **List teams**: Use `mcp__linear-server__list_teams` to identify target team
- **List projects**: Use `mcp__linear-server__list_projects` to check for existing projects
- **Create project**: Use `mcp__linear-server__create_project` for new initiatives
- **Get project**: Use `mcp__linear-server__get_project` to retrieve project details
- **Update project**: Use `mcp__linear-server__update_project` to update project description
- **List issues**: Use `mcp__linear-server__list_issues` with `type:epic` filter to check for duplicates
- **Get issue**: Use `mcp__linear-server__get_issue` to retrieve epic details
- **List comments**: Use `mcp__linear-server__list_comments` to retrieve all comments on an issue (CRITICAL: always fetch comments alongside issue details)
- **Create issue**: Use `mcp__linear-server__create_issue` to create new epics
- **Update issue**: Use `mcp__linear-server__update_issue` to set dependencies and labels
- **Create comment**: Use `mcp__linear-server__create_comment` for supplementary details
- **DO NOT**: Use GitHub CLI or direct Linear API calls - only use MCP tools

Transform the Product Requirements Document at **$1** into comprehensive Linear epics.

**CRITICAL**: This command implements strict duplicate prevention with multiple safeguards:
- Pre-flight checks query ALL existing epics before any creation
- Each capability gets cross-referenced against existing work
- User approval required BEFORE creating any epics
- Atomic creation with immediate tracking prevents partial states
- Unique labels ensure idempotency if process is interrupted
- The process will STOP if existing epics are found unless you explicitly decide how to handle them

**IMPORTANT**: Track these IDs throughout the process:
- Existing Epic IDs (from Step 0)
- Project ID (from Step 4)
- New Epic IDs (from Step 6)

Follow these steps to create business-focused epics that provide clarity without prescribing implementation:

## Step 0: Pre-Flight Duplicate Prevention Check (MANDATORY)

**THIS STEP IS BLOCKING - Do not proceed without completing all checks**

### 0.1 Initialize State Tracking
Use TodoWrite to create a tracking checklist:
```
- [ ] Query existing epics in all projects
- [ ] Document found epics in manifest
- [ ] Analyze PRD for capabilities
- [ ] Cross-reference capabilities with existing epics
- [ ] Get user decision on handling strategy
- [ ] Create epic: [name] (for each planned epic)
```

### 0.2 Query ALL Existing Epics
Use `mcp__linear-server__list_issues` with comprehensive filters:
```
filter: "type:epic"
limit: 250
```

### 0.3 Create Existing Epic Manifest
Document ALL found epics in a structured format:
```
## Existing Epic Manifest
| Epic ID | Title | Project | Key Capabilities | Status |
|---------|-------|---------|------------------|--------|
| [id]    | [title] | [project] | [capabilities] | [status] |
```

### 0.4 Decision Point: Handle Existing Epics
**STOP HERE if any existing epics found**. Ask user:
```
Found [N] existing epics in Linear. How should I proceed?
a) Skip duplicate capabilities (recommended if epics cover same functionality)
b) Update existing epics (merge new requirements into existing)
c) Delete and recreate all (full reset - use with caution)
d) Abort operation (cancel epic planning)

Please choose (a/b/c/d):
```

**DO NOT PROCEED without explicit user choice**

### 0.5 Query Related Projects
If user chooses to proceed (options a or b), also check for related projects:
```
mcp__linear-server__list_projects
```
Document any projects that might contain related work.

## Step 1: Setup Linear Environment

1. Use `mcp__linear-server__list_teams` to identify the target team
2. Use `mcp__linear-server__list_projects` to check for existing related projects
3. Use `mcp__linear-server__list_issues` with filter `type:epic` to avoid duplicates

## Step 2: Analyze PRD for Business Context

Read the PRD at **$1** and extract:
- **Market Problem**: What specific gap are we addressing?
- **User Personas**: Who are the users and their jobs-to-be-done?
- **Business Metrics**: What KPIs will improve (with targets)?
- **Success Criteria**: How do we measure success?
- **Revenue Impact**: Direct/indirect revenue or cost savings

If discovery provided at **${2:-"none"}** (Linear ticket ID like `DISC-123` or `LIN-456`, OR a markdown file path), incorporate technical landscape context.

**CRITICAL: When loading a Linear ticket as discovery source:**
1. Use `mcp__linear-server__get_issue` to fetch the ticket body/description
2. Use `mcp__linear-server__list_comments` to fetch ALL comments on the ticket
3. Review BOTH the description AND comments for complete context (discovery findings, technical analysis, patterns, etc. are often documented in comments)

## Step 3: Decompose into MECE Capabilities with Duplicate Prevention

Break down requirements into Mutually Exclusive, Collectively Exhaustive epics:

### 3.1 Initial Capability Identification
1. Identify 4-8 distinct user capabilities from the PRD
2. Ensure each epic:
   - Describes WHAT users can do (not HOW)
   - Has quantified business value
   - Can be delivered independently
   - Has clear acceptance criteria

### 3.2 Cross-Reference with Existing Epic Manifest
For EACH identified capability:
1. Compare against existing epic manifest from Step 0
2. Search for similar titles/capabilities using fuzzy matching:
   ```
   filter: "type:epic AND (title~'[keyword1]' OR title~'[keyword2]')"
   ```
3. Calculate similarity score based on:
   - Title overlap (>50% similar words)
   - Capability description overlap
   - Business value alignment

### 3.3 Create Execution Plan
Document your decision for EVERY capability:
```
## Epic Creation Execution Plan
| Capability | Similar Existing Epic | Action | Rationale |
|------------|----------------------|--------|-----------|
| [name]     | [ID or "none"]       | CREATE/SKIP/UPDATE | [specific reason] |
```

**REQUIRED ACTIONS**:
- CREATE: Only if no similar epic exists (similarity < 30%)
- SKIP: If epic already exists with >70% similarity
- UPDATE: If epic exists with 30-70% similarity (merge requirements)

### 3.4 Get User Approval for Execution Plan
**STOP HERE - Present execution plan to user**:
```
## Proposed Epic Plan
- Creating [N] new epics
- Skipping [M] duplicates
- Updating [O] existing epics

[Show execution plan table]

Proceed with this plan? (yes/no):
```

**DO NOT CREATE ANY EPICS without user approval**

### 3.5 Validate MECE Coverage
After approval, verify:
- Complete PRD coverage (no gaps)
- No overlaps between CREATE items
- Clear differentiation from SKIP items

## Step 4: Create Linear Project Structure (if 4+ epics)

If 4+ capabilities identified:

**Use MCP tool:** `mcp__linear-server__create_project` to create the project.

**Required parameters:**
- `title`: Initiative name from PRD
- `description`: Initial business case summary from PRD
- `teamId`: Team ID from Step 1
- `status`: "planned"

**SAVE THE PROJECT ID** returned for use in next steps.

**Phase Organization:**
Use labels to organize epics by phase instead of milestones:
- `phase-1` - Core Value: Foundational capabilities (weeks 1-4)
- `phase-2` - Enhanced Experience: Advanced features (weeks 5-8)
- `phase-3` - Market Leadership: Differentiated capabilities (weeks 9-12)

Document target dates in the project description.

## Step 5: Initialize Creation Tracker

Before creating any epics, set up tracking:

### 5.1 Initialize Epic Creation Manifest
Create a tracker for all epics to be created:
```
## Epic Creation Tracker
| Capability | Status | Epic ID | Error |
|------------|--------|---------|-------|
| [name 1]   | PENDING | - | - |
| [name 2]   | PENDING | - | - |
```

### 5.2 Update TodoWrite with Epic Creation Tasks
For each epic marked as CREATE in the execution plan:
```
- [ ] Create epic: [capability name]
```

## Step 6: Create Each Epic in Linear (Atomic with Tracking)

For each capability marked as CREATE in the execution plan:

### 6.1 Pre-Creation Duplicate Check
Before EACH epic creation:
1. Check the creation tracker - skip if already created
2. Query for last-minute duplicates:
   ```
   filter: "title:'[exact or similar title]' AND type:epic"
   ```
3. If duplicate found after plan approval:
   - STOP creation
   - Mark as FAILED in tracker with reason
   - Ask user how to proceed

### 6.2 Create Epic
Use `mcp__linear-server__create_issue` with:

```markdown
Title: [Clear User Capability]
Example: "Enable real-time shipment tracking"

Description:
## 🎯 User Story
AS A [persona]
I WANT TO [accomplish goal]
SO THAT [achieve outcome]

## 💼 Business Value
- User Impact: [# users affected, engagement improvement]
- Revenue Impact: [Direct revenue, retention, cost savings]
- Strategic Value: [Market positioning, competitive advantage]

## 📊 Success Criteria
Quantitative:
- [ ] [Specific metric with target, e.g., "Reduce support tickets by 30%"]
- [ ] [Usage metric, e.g., "70% adoption in week 1"]
- [ ] [Performance metric, e.g., "Page load <3 seconds"]

Qualitative:
- [ ] [User satisfaction, e.g., "NPS +10 points"]
- [ ] [Market perception improvements]

## 🔄 User Workflow
1. Entry Point: How users discover this capability
2. Core Flow: Step-by-step user journey (WHAT, not HOW)
3. Success State: What users achieve when complete
4. Failure Handling: Graceful edge case handling

## 📋 Acceptance Scenarios
GIVEN [context]
WHEN [action]
THEN [expected result]

[Add 3-5 comprehensive scenarios covering happy path and edge cases]

## 🏗️ Technical Context (from discovery if available)
- Existing Services: [What can be leveraged]
- Data Requirements: [What data is needed]
- Integration Points: [External systems involved]
- Constraints: [Scale, performance, compliance needs]

## 🚫 Out of Scope
- [Features explicitly not included]
- [Optimizations for later]
- [Advanced capabilities for future phases]
```

Set parameters:
- teamId: "[from Step 1]"
- projectId: "[from Step 4 - REQUIRED if project created]"
- priority: 0-3 (0=urgent, 1=high, 2=normal, 3=low)
- estimate: 1-21 (fibonacci: 1,2,3,5,8,13,21)
- labels: ["epic", "phase-1" or "phase-2" or "phase-3", "capability", "capability-[slug]"]

**IMPORTANT**: Add a unique `capability-[slug]` label for idempotency

### 6.3 Immediate Tracking Update
IMMEDIATELY after each epic creation:
1. Update creation tracker:
   ```
   | [capability] | CREATED | [returned-id] | - |
   ```
2. Update TodoWrite:
   ```
   - [x] Create epic: [capability name]
   ```
3. If creation fails:
   ```
   | [capability] | FAILED | - | [error message] |
   ```

### 6.4 Verify No Duplicates
After EACH epic creation, verify no duplicates were created:
```
filter: "title:'[created title]' AND type:epic"
```
If count > 1, trigger rollback procedure (Step 9)

## Step 7: Link Epic Dependencies

After creating all epics successfully:
1. Review creation tracker - ensure all marked as CREATED
2. Use `mcp__linear-server__update_issue` to:
   - Set blockedByIds for epics with dependencies
   - Link related epics with relatedIssueIds

## Step 8: Document Planning Summary

**CRITICAL: APPEND report to project description - do NOT overwrite**

1. **Get existing project description:**
   ```
   mcp__linear-server__get_project
   projectId: "[project-id from Step 4]"
   ```
   Save the current description content.

2. **APPEND planning report to description:**
   ```
   mcp__linear-server__update_project
   id: "[project-id]"
   description: "[EXISTING DESCRIPTION]

   ---

   ## 📊 Epic Planning Report

   ### Coverage Analysis
   - ✅ 100% of PRD requirements mapped to epics
   - ✅ [X] epics created across [Y] phases

   ### Epic Portfolio
   | Epic ID | Title | Business Value | Phase |
   |---------|-------|---------------|-------|
   | [id] | [title] | [value] | Phase [1/2/3] |

   ### Risk Analysis
   [Key risks and mitigation strategies]

   ### Success Metrics
   [Aggregated business metrics from all epics]

   Epic Planning Completed: [timestamp]
   Source PRD: $1"
   ```

   **DO NOT** replace existing content - concatenate with separator.

3. **Add supplementary details as comments** (NOT in description):
   Use `mcp__linear-server__create_comment`:
   ```
   issueId: "[project-id]"  # Projects can receive comments via their ID
   body: "[Technical landscape analysis, persona impacts, etc.]"
   ```
   Keep comments for supplementary details that would clutter the main description.

## Step 9: Duplicate Detection & Recovery (If Issues Found)

**TRIGGER THIS STEP if any duplicates detected during or after creation**

### 9.1 Document Duplicate Pairs
If duplicates are found at any point:
```
## Duplicate Detection Report
| Epic A (ID) | Epic B (ID) | Similarity | Detection Point |
|-------------|-------------|------------|-----------------|
| [id-a]      | [id-b]      | [title/capability] | [when found] |
```

### 9.2 Recovery Options
Present options to user:
```
Duplicates detected! Choose recovery strategy:
a) Merge: Update older epic with newer content
b) Delete: Remove newer duplicate
c) Differentiate: Update titles/descriptions to clarify differences
d) Keep Both: Add cross-references and explain distinction

Choice (a/b/c/d):
```

### 9.3 Execute Recovery
Based on user choice:
- **Merge**: Use `mcp__linear-server__update_issue` on older epic
- **Delete**: Mark newer epic as cancelled with explanation
- **Differentiate**: Update both epics with clarifying information
- **Keep Both**: Add comments explaining the distinction

### 9.4 Prevent Future Duplicates
1. Add "duplicate-of:[ID]" label if keeping for reference
2. Update capability-[slug] labels to be more specific
3. Document the resolution in project comments

## Step 10: Validate Complete Coverage

Run final checks:
1. **Verify all epics created:**
   ```
   mcp__linear-server__list_issues
   filter: "project:[project-id] AND type:epic"
   ```

2. **Verify project description contains report:**
   ```
   mcp__linear-server__get_project
   projectId: "[project-id]"
   ```
   Confirm description includes BOTH original content AND appended report.

3. **Validate coverage:**
   - Every PRD requirement has corresponding epic
   - All epics have phase labels assigned
   - No duplicate or overlapping capabilities

## Step 11: Append Feature-to-Epic Mapping to PRD (CRITICAL FOR DOWNSTREAM COMMANDS)

**This step enables the `/planning` command to correctly scope its work to individual epics.**

After all epics are created and validated, append a Feature-to-Epic Mapping table to the PRD file:

1. **Read the current PRD file** at **$1** using the `Read` tool
2. **Build the mapping table** from the epics created in Step 6
3. **Append the mapping section** to the PRD using the `Edit` or `Write` tool

**Append this section to the end of the PRD file:**

```markdown

---

## Feature-to-Epic Mapping
<!-- Auto-generated by /epic-planning — DO NOT EDIT MANUALLY -->
<!-- This mapping enables /planning to correctly scope tickets to individual epics -->

| Epic ID | Epic Title | PRD Sections | Key Features | Phase |
|---------|-----------|--------------|--------------|-------|
| [ID]    | [Title]   | [Section numbers/names from PRD] | [Feature list] | [Phase N] |
| [ID]    | [Title]   | [Section numbers/names from PRD] | [Feature list] | [Phase N] |

### Epic Scope Definitions
<!-- For each epic, list exactly which PRD requirements belong to it -->

**[EPIC-ID]: [Epic Title]**
- PRD sections: [list specific section numbers or headings]
- Features included: [bullet list of features]
- Features explicitly excluded: [what belongs to OTHER epics]

**[EPIC-ID]: [Epic Title]**
- PRD sections: [list specific section numbers or headings]
- Features included: [bullet list of features]
- Features explicitly excluded: [what belongs to OTHER epics]

[Repeat for each epic]

### Usage
When running `/planning [EPIC-ID]`, refer to this mapping to determine which PRD sections are in scope for that epic. Only the sections listed for that epic should be used for ticket creation.

Epic Planning Completed: [timestamp]
Total Epics Created: [count]
```

**IMPORTANT:**
- Be specific about PRD section numbers/headings so the mapping is unambiguous
- The "Features explicitly excluded" field prevents scope creep during planning
- This mapping is the CONTRACT between epic-planning and planning phases
- If the PRD doesn't have clear section numbers, use descriptive headings

## Success Criteria

Epic planning succeeds when:
- ✅ **NO DUPLICATE EPICS CREATED** (primary success metric)
- ✅ All existing epics identified and documented before creation
- ✅ Execution plan approved by user before any creation
- ✅ Each epic has unique capability-[slug] label for idempotency
- ✅ Creation tracker shows 100% success or handled failures
- ✅ All epics describe user capabilities (not technical tasks)
- ✅ Business value is quantified for each epic
- ✅ 100% of PRD requirements mapped to epics
- ✅ Epics are MECE (no gaps or overlaps)
- ✅ Each epic has clear acceptance scenarios
- ✅ Dependencies properly linked in Linear
- ✅ Project documentation is comprehensive
- ✅ Engineering has clarity on WHAT to build and WHY

## Critical Failure Conditions

Epic planning FAILS if:
- ❌ Any duplicate epic is created without user approval
- ❌ Existing epics are ignored or overwritten
- ❌ Creation proceeds without checking existing epics
- ❌ Execution plan is not approved before creation
- ❌ Creation tracker is not maintained

## Epic Sizing Guidelines

- **Small (1-2 sprints)**: Single workflow, 1-2 developers
- **Medium (2-3 sprints)**: Multiple workflows, 2-3 developers
- **Large (3-4 sprints)**: Major capability, 3-5 developers
- **XL (4-6 sprints)**: Consider breaking down further

Adjust for complexity factors:
- +20% for significant technical debt
- +10% per external integration
- +30% for compliance requirements
- +20% for real-time features

## Example Epic Patterns

### E-Commerce
- Browse & Discovery → User finds products efficiently
- Purchase Journey → User completes purchase confidently
- Order Management → User controls order lifecycle

### SaaS Platform
- Onboarding → User achieves first value quickly
- Core Workflow → User accomplishes primary job efficiently
- Administration → Admins manage platform effectively

### Marketplace
- Supply Side → Sellers manage inventory profitably
- Demand Side → Buyers find value easily
- Trust & Safety → All parties transact confidently

## Handoff to Technical Planning

After completing epic planning:
1. Engineering reviews epics for technical feasibility
2. Design creates user experience flows
3. Product validates with key customers
4. Technical planning (`/planning` command) decomposes epics into implementation tickets

The epic-planning phase transforms business requirements into clearly articulated user capabilities with precise technical context, giving engineering teams both business clarity and technical precision needed for informed implementation decisions.