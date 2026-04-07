---
description: Orchestrate all ticket workflow phases (adaptation → implementation → testing → documentation → codereview → codex-review → security-review) automatically
allowed-tools: Task, Read, Grep, Glob, Bash, Bash(gh:*), Bash(git:*), WebFetch, mcp__linear-server__get_issue, mcp__linear-server__list_comments, mcp__linear-server__create_comment, mcp__linear-server__update_issue, mcp__linear-server__search_issues, mcp__codex-review-server__codex_review_and_fix, mcp__codex-review-server__codex_review, mcp__codex-review-server__codex_fix
argument-hint: <ticket-id>
---

# Agentic Ticket Execution Orchestrator

Execute all 6 ticket-level workflow phases automatically for the specified ticket. Pauses only for blocking issues that require user decision.

## Input

- `$ARGUMENTS` - Linear ticket ID (e.g., `PRJ-123`)

## Phase Sequence

| Phase | Agent | Blocking Conditions |
|-------|-------|---------------------|
| 1. adaptation | architect-agent | Status: BLOCKED |
| 2. implementation | backend-engineer-agent OR frontend-engineer-agent | Compile errors, duplication detected |
| 3. testing | qa-engineer-agent | Gate #0 fail (existing tests broken) OR Gates #1-3 fail (new test issues) |
| 4. documentation | technical-writer-agent | Status: BLOCKED |
| 5. codereview | code-reviewer-agent | Status: CHANGES_REQUESTED |
| 5.5 codex-review | *(MCP tool, no agent)* | Rate limit (deferred, not blocking) |
| 6. security-review | security-engineer-agent | CRITICAL/HIGH severity findings |

**Note:** Only `security-review` closes the ticket when no critical/high issues are found.

---

## Step 1: Validate Ticket

Fetch the ticket from Linear and validate it exists:

```
Use mcp__linear-server__get_issue to fetch ticket: $ARGUMENTS
```

**Validation checks:**
- Ticket exists
- Ticket is not already Done or Cancelled
- Ticket has an assigned agent type (check labels for `backend`, `frontend`, or description metadata)

If validation fails, report the error and stop.

### Step 1.2.5: Detect Worktree Mode

Check if this session is running inside a git worktree (e.g., spawned by `/epic-swarm`):

```bash
# Detect worktree mode
git_common_dir=$(git rev-parse --git-common-dir 2>/dev/null)
git_dir=$(git rev-parse --git-dir 2>/dev/null)
if [ "$git_common_dir" != "$git_dir" ]; then
  WORKTREE_MODE=true
else
  WORKTREE_MODE=false
fi
```

**When `WORKTREE_MODE=true`:**
- The swarm orchestrator has already created the worktree and branch
- **SKIP** Step 1.3 (branch creation) — the branch already exists
- **SKIP** PR creation in post-implementation steps — the swarm handles merge to the epic branch and creates a single epic PR
- **SKIP** `git push` after each phase — the swarm handles pushing the epic branch during integration
- **DO** post all phase reports to Linear (the ticket's comment thread is the coordination record)
- **DO** return structured status codes to the orchestrator (DONE / BLOCKED / etc.)
- **NOTE:** The swarm merges ticket branches to an epic branch (`epic/[epic-id]`), not to main. The default branch is only updated when the epic PR is reviewed and merged by a human.

### Step 1.3: Create Feature Branch

**Skip this step if `WORKTREE_MODE=true`.**

Before any phase execution, ensure we're on the correct feature branch:

1. **Get branch name from Linear ticket metadata:**
   - Linear's `gitBranchName` field provides the per-ticket branch name
   - Example: `brian/con-98-migrate-inbox-processor`

2. **Check current branch:**
   ```bash
   current=$(git branch --show-current)
   ```

3. **If on main/master, create or checkout feature branch:**
   ```bash
   git fetch origin

   # Check if branch exists
   if git branch -a | grep -q "remotes/origin/[branch-name]"; then
     # Branch exists remotely - checkout and pull
     git checkout [branch-name]
     git pull origin [branch-name]
   else
     # Create new branch from main
     git checkout -b [branch-name] origin/main
     git push -u origin [branch-name]
   fi
   ```

4. **Store branch name for later phases** (used for PR creation, PR comments)

**If branch operations fail:** Report error to user with options to fix manually or abort.

### Step 1.4: Update Ticket Status to In Progress

After branch setup, update Linear status:

```
Use mcp__linear-server__update_issue:
- issue_id: [ticket-id]
- state: "In Progress"
```

Skip if already "In Progress" or later state.

---

## Step 2: Detect Resume State

Fetch all comments on the ticket to determine which phases are already complete:

```
Use mcp__linear-server__list_comments for ticket: $ARGUMENTS
```

**Parse comments for these phase report headers:**

| Header Pattern | Phase Complete |
|----------------|----------------|
| `## Adaptation Report` | adaptation |
| `## Implementation Report` | implementation |
| `## Testing Report` (containing `Gate #0`) | testing |
| `## Documentation Report` | documentation |
| `## Code Review Report` | codereview |
| `## Cross-Model Review Report` | codex-review |
| `## Security Review Report` | security-review |

**Resume Logic:**
- If no reports found → Start from adaptation
- If some reports found → Check status within each report:
  - Header present AND `Status: DONE`, `Status: DONE_WITH_CONCERNS`, or `Status: COMPLETE` → Phase done, skip to next
  - Header present AND `Status: BLOCKED`, `Status: NEEDS_CONTEXT`, or `ISSUES_FOUND` → Phase needs re-run from this point
  - Header present but no clear status → Treat as incomplete, re-run phase
- If all reports found with completed statuses (`DONE`, `DONE_WITH_CONCERNS`, or `COMPLETE`) → Ticket already complete, report status and stop

**Important:** Do not rely solely on header presence. A phase report may exist from a previous blocked run that needs to be re-executed.

**Report to user (including context mode):**

Assess your available context window and select context mode:
- **500K+ tokens** → Full context mode (default — complete verbatim reports, no budget)
- **Under 500K tokens** → Budget mode (read and apply `commands/references/context-budget-legacy.md`)

```
Ticket: [ticket-id] - [ticket-title]
Status: [current-status]
Context mode: [Full context (1M window) | Budget mode (Xk window — see context-budget-legacy.md)]
Completed phases: [list of complete phases]
Starting from: [next-phase]
```

The context mode line tells the user whether agents will receive full verbatim reports or condensed extracts. This is important for diagnosing incomplete implementations — if budget mode is active and results are poor, the user may need to upgrade to a model with a larger context window.

### Step 2.1: Detect Existing Branch and PR

If resuming from a later phase, detect existing Git state:

1. **Check for existing branch:**
   ```bash
   # Look for branch matching ticket ID pattern
   git branch -a | grep -i "[ticket-id]"
   ```

2. **Check for existing PR:**
   ```bash
   gh pr list --head [branch-name] --json number,isDraft,state
   ```

3. **Store in workflow state:**
   - `branchName`: Detected or from Linear metadata
   - `prNumber`: If PR exists
   - `prDraft`: Whether PR is still draft

---

## Step 3: Execute Phases Sequentially

For each remaining phase, execute the following loop:

### Phase Execution Pattern

For each phase that needs to run:

#### 3.1 Gather Context

**From ticket (FULL — do not truncate):**
- Title and full description
- Full acceptance criteria (verbatim)
- Full Technical Notes section (verbatim)
- Labels (for agent type selection)
- Parent epic (if any)

**From prior phase reports (extract substantive sections):**
- Adaptation: Implementation approach, technical decisions, file targets, trade-off reasoning, constraints, deferred/descoped items
- Implementation: Files changed, patterns used, edge cases noted, concerns flagged, integration points
- Testing: Gate results, coverage summary, skipped areas, failure details
- Documentation: Docs created, API changes documented
- Code Review: Issues found, recommendations, requirements checklist results

**Keep context focused** - include:
- Status from each prior phase
- Key decisions/changes made and **why**
- Files affected
- Any warnings, concerns, or risks raised
- Deferred Items tables (full)

**RULE: Always include full, verbatim prior phase reports.** Do NOT summarize, condense, or extract. Agents perform better with complete context than with curated excerpts — curation risks dropping details that downstream phases need.

#### 3.1.0 Gather Parent Epic Context

If the ticket has a parent issue (epic), fetch it to capture context that applies to all sub-tickets:

1. **Check for parent epic:** From the ticket fetched in Step 1, check for `parentId` or parent reference.

2. **If parent exists, fetch the parent epic** using `mcp__linear-server__get_issue` with the parent ID.

3. **Extract key sections** from the epic description:
   - **Key References:** File paths (local docs, research briefs, specs) and URLs referenced in the epic
   - **Architecture/design decisions** that apply broadly to all sub-tickets
   - **Scope boundaries and constraints** that inform implementation approach

4. **Include parent epic references in downstream steps:**
   - Local file paths from the epic description are added to Step 3.1.1's scanning scope (read alongside ticket-referenced files)
   - URLs from the epic description are included in Step A2's scanning scope
   - Architectural decisions and constraints are passed to the agent prompt

5. **Present parent epic context** to the agent with the label:
   ```
   ## Parent Epic Context
   **Epic:** [epic-id] - [epic-title]
   **Applies to:** All tickets in this epic

   ### Referenced Documents (from epic)
   [file paths and URLs extracted from epic description]

   ### Architectural Decisions
   [design decisions, constraints, scope boundaries from epic]
   ```

**Do NOT include** the full epic description verbatim (it may contain scope for other tickets). Extract only: referenced documents, architectural decisions, and constraints that apply broadly.

**Skip this step** if the ticket has no parent issue.

---

#### 3.1.1 Gather Referenced Resources

Before dispatching the agent, scan the ticket description, acceptance criteria, and Technical Notes for **local file paths** and **URLs** that point to resources the agent needs. Tickets often reference requirements documents, research briefs, design specs, and other detailed context — this material represents significant upfront work and MUST be included in the agent prompt when present.

This step has two tracks: **local files** (Step A1) and **external URLs** (Steps A2–E). Run both tracks, then combine results for the agent prompt.

**Important:** The scanning scope for both tracks includes content from Step 3.1.0 (parent epic) when available. File paths and URLs discovered in the parent epic description are included alongside those found in the ticket itself.

---

**Step A1: Detect and read local file references**

Scan the ticket body for local file paths. Common patterns:
- Explicit paths: `docs/requirements/inbox-migration.md`, `./research/auth-analysis.md`, `context/brief.md`
- Markdown links to local files: `[requirements doc](docs/requirements/inbox-migration.md)`
- References like "see `filename.md`", "per the brief in `path/to/file`", "requirements in `docs/...`"
- Relative paths from the project root (most common in tickets)

**For each detected file path:**

1. **Resolve the path** relative to the project root (working directory). If the path is ambiguous, use `Glob` to find likely matches.

2. **Verify the file exists** using `Read`. If the file does not exist:
   ```
   ⚠️ REFERENCED FILE NOT FOUND

   Path: [path as referenced in ticket]
   Searched: [resolved absolute path]

   This file was referenced in the ticket but does not exist.

   Options:
   1. Provide the correct path
   2. Continue without this file
   ```
   Wait for user response.

3. **If the file exists:** Read its full contents. Classify the file's role based on surrounding ticket text:

   | Role | Ticket phrasing signals | How to present to agent |
   |------|------------------------|------------------------|
   | **Requirements/spec** | "requirements in", "spec at", "acceptance criteria from", "per the PRD" | `Requirements document — implementation must satisfy these requirements` |
   | **Research/analysis (prescriptive)** | "research brief", "analysis in" + file contains tables with specific IDs, interface definitions, enumerated items, schema fields, or concrete values | `Research brief (prescriptive) — contains specific technical specifications (template IDs, schema definitions, layout types, interface fields, etc.) that MUST be implemented as specified, not merely used as background. Cross-check your implementation against the specific items in this brief.` |
   | **Research/analysis (contextual)** | "for context", "background research", "findings from", "investigation at" + file provides general analysis without concrete specification items | `Research context — provides background that informs approach but does not prescribe specific implementation details` |
   | **Design/architecture** | "design doc", "architecture in", "ADR at", "technical design" | `Design document — follow the architectural decisions described here` |
   | **Example/template** | "template at", "example in", "use the pattern from" | `Template/example — use as a starting point or structural reference` |
   | **Context/background** | "for background", "context in", "FYI see" | `Background context — informs approach but is not directly prescriptive` |

   **Prescriptive vs Contextual research:** When a referenced research document contains structured content — tables with specific IDs, interface definitions, enumerated requirement lists, schema fields, or concrete values — classify it as **prescriptive**. The stronger role label ensures agents treat the brief's specific items as binding, not advisory.

   If role is unclear, default to `Requirements document` — it's better to over-weight a referenced document than under-weight it.

4. **No file count limit** — include all referenced local files. These are authored project artifacts; they exist because they're relevant.

5. **Extract conformance checklist from prescriptive documents:** When a document is classified as **Requirements/spec** or **Research/analysis (prescriptive)**, scan its content for verifiable specification items:
   - Named items (template IDs, enum values, field names)
   - Interface or schema definitions (field names, types, required vs optional)
   - Enumerated lists of must-have features or required components
   - Specific values (dimensions, sizes, patterns, CSS properties)

   Generate a conformance checklist and include it after the document's content in the agent prompt:

   ```markdown
   ## Research Brief Conformance Checklist

   The following specific items from [file path] MUST be verified in your implementation:

   - [ ] [Category]: [item1, item2, item3, ...]
   - [ ] [Category]: [item1, item2, item3, ...]
   - [ ] [Category]: [specific requirement or value]
   ```

   This checklist will be used in Step 3.4.3 to verify implementation conformance.

---

**Step A2: Detect URLs**

Scan the combined text of:
1. The ticket body (title, description, acceptance criteria, Technical Notes)
2. The parent epic description (if gathered in Step 3.1.0)
3. ALL local file contents read in Step A1

This ensures URLs embedded in referenced research briefs, specs, and requirements documents are also discovered and fetched — not just URLs in the ticket itself. URLs found in local files should inherit the local file's role classification as a default intent (e.g., a URL inside a "Research brief" file defaults to "Technical reference — follow the approach described here" unless surrounding text suggests otherwise).

- Match URLs (`https://...`) across all sources listed above
- Ignore Linear internal links (`linear.app/...`) and GitHub PR/issue links already handled by `gh` CLI (e.g., `github.com/org/repo/pull/...`, `github.com/org/repo/issues/...`)
- Ignore image URLs (`.png`, `.jpg`, `.gif`, `.svg`, `.webp`)

**Step B2: Classify and determine intent**

For each detected URL, read the surrounding text in the ticket to determine how the resource is referenced. Classify each URL:

| Intent | Ticket phrasing signals | How to present to agent |
|--------|------------------------|------------------------|
| **Copy/adapt code** | "copy from", "use as reference", "implement similar to", "port from", "based on" | `Reference code — copy and adapt as needed` |
| **Follow approach** | "follow this pattern", "see how they handle", "approach described in", "tutorial at" | `Technical reference — follow the approach described here` |
| **API/SDK docs** | "see docs at", "API reference", "documentation for", "refer to" | `API documentation — use for correct interface usage` |
| **Configuration/prompt** | "use this prompt", "copy this config", "template at" | `Direct source material — use verbatim or near-verbatim` |
| **General context** | No specific action language, or "for background", "FYI" | `Background context — informs approach but is not directly used` |

If intent is unclear, default to `Technical reference`.

**Step C2: Normalize GitHub URLs**

GitHub blob pages return heavy HTML when fetched directly. Normalize before fetching:

| GitHub URL pattern | Normalization |
|-------------------|---------------|
| `github.com/[owner]/[repo]/blob/[branch]/[path]` | Convert to `raw.githubusercontent.com/[owner]/[repo]/[branch]/[path]` |
| `gist.github.com/[user]/[id]` | Append `/raw` → `gist.github.com/[user]/[id]/raw` |
| `github.com/[owner]/[repo]/tree/[branch]/[path]` | Use `gh api repos/[owner]/[repo]/contents/[path]?ref=[branch]` to list files, then fetch each relevant file via raw URL |
| `github.com/[owner]/[repo]` (repo root) | Use `gh api repos/[owner]/[repo]/git/trees/[default-branch]?recursive=1` to get file tree, report to user, and ask which files to fetch |

For directory and repo-root URLs, after retrieving the file listing:
```
📂 GITHUB DIRECTORY REFERENCED

URL: [url]
Repository: [owner]/[repo]
Path: [path or root]

Files found:
[file tree listing, filtered to code files]

The ticket references this directory. Which files should I fetch for the agent?

Options:
1. Fetch all files (if ≤ 10 code files)
2. Select specific files: [list files by number]
3. Skip — agent doesn't need these files
```
Wait for user response before continuing.

**Step D2: Fetch content**

For each URL (normalized if GitHub):

1. **Fetch using `WebFetch`** (or `gh api` for GitHub directory listings per Step C2).

2. **Validate the response:**
   - **Usable content** — contains code blocks, technical prose, API specs, or configuration. Proceed.
   - **Login/paywall** — response contains login forms, "subscribe to read", or access denied messaging. Treat as fetch failure.
   - **Mostly navigation/boilerplate** — response is dominated by site chrome with little substantive content. Report to user:
     ```
     ⚠️ LOW-QUALITY FETCH

     URL: [url]
     The fetched content appears to be mostly site navigation/boilerplate
     with limited useful content.

     Preview (first 500 chars of substantive content):
     [preview]

     Options:
     1. Include anyway — agent may still find useful content
     2. Provide the content manually (paste it)
     3. Provide an alternative URL
     4. Skip this URL
     ```
     Wait for user response.

3. **If fetch fails** (403, timeout, DNS error, etc.):
   ```
   ⚠️ URL FETCH FAILED

   URL: [url]
   Error: [error message]

   This URL was referenced in the ticket but could not be fetched.

   Options:
   1. Continue without this content (agent will not have it)
   2. Provide the content manually (paste it)
   3. Provide an alternative URL
   ```
   Wait for user response before continuing.

**Step E: Include gathered resources in the agent prompt (Step 3.3)**

Structure all gathered resources — local files and external content — with role/intent labels so the agent knows how to use each resource. **Local files come first** (they are authored project artifacts and typically carry more authority than external references).

```markdown
## Referenced Project Documents

### [file path]
**Role:** [role label from Step A1 — e.g., "Requirements document — implementation must satisfy these requirements"]
**Ticket context:** "[surrounding sentence from ticket that references this file]"

[full file contents]

### [file path]
**Role:** [role label]
**Ticket context:** "[surrounding sentence]"

[full file contents]

## Referenced External Content

### [URL]
**Intent:** [intent label from Step B2 — e.g., "Reference code — copy and adapt as needed"]
**Ticket context:** "[surrounding sentence from ticket that references this URL]"

[fetched content]
```

Omit the `## Referenced Project Documents` section if no local files were detected. Omit `## Referenced External Content` if no URLs were detected.

**After all resources are gathered, add a Reference Material Availability summary** so the agent (and the user reviewing the report) understands what context the agent actually has access to:

```markdown
## Reference Material Availability

| Source | Type | Status |
|--------|------|--------|
| [local file path] | Local file ([role label]) | ✅ Included in full |
| [URL] | URL ([intent label]) | ✅ Included |
| [URL] | URL ([intent label]) | ❌ Fetch failed ([reason]) |
| [URL] | URL ([intent label]) | ⚠️ Low-quality fetch (included with caveats) |

**Note:** For references marked ❌, rely on training knowledge for this content. If a referenced URL was critical to the ticket's requirements, flag this in your Deferred Items table as `DISCOVERED: Referenced URL unavailable — [URL] — [what it was expected to provide]`.
```

This transparency lets the agent make informed decisions about what context it does and doesn't have, and surfaces gaps in the execution summary.

**Limits:**
- **Local files:** No limit — include all referenced project documents in full.
- **External URLs:** Fetch a maximum of 5 URLs per phase. If more are detected, report the list to user and ask which to prioritize.
- Skip URLs already fetched in a prior phase — reuse the cached content and intent classification.
- For GitHub directory fetches, count each individual file fetched toward the limit (not the directory URL itself).

#### 3.2 Select Agent

| Phase | Agent Selection |
|-------|-----------------|
| adaptation | `architect-agent` |
| implementation | See agent selection logic below |
| testing | `qa-engineer-agent` |
| documentation | `technical-writer-agent` |
| codereview | `code-reviewer-agent` |
| codex-review | *(no agent — direct MCP tool calls, see Phase 5.5 below)* |
| security-review | `security-engineer-agent` |

**Implementation Phase Agent Selection (with fallback):**

1. **Primary (from ticket metadata):**
   - Check labels for: `backend`, `frontend`, `fullstack`, or `agent-type:*`
   - If found: Use corresponding agent

2. **Fallback (if no label found):**
   - Scan ticket description for keywords:
     - `API`, `REST`, `database`, `server`, `endpoint`, `backend` → `backend-engineer-agent`
     - `UI`, `React`, `Vue`, `component`, `page`, `frontend`, `CSS` → `frontend-engineer-agent`
   - If both categories present → default to `backend-engineer-agent`

3. **If still unclear:**
   ```
   ⚠️ AGENT SELECTION REQUIRED

   Ticket [ticket-id] lacks agent type metadata.
   Keywords found in description: [list keywords]

   Recommended agent: [agent-name]

   Options:
   1. Proceed with [agent-name] (recommended)
   2. Use backend-engineer-agent
   3. Use frontend-engineer-agent

   Which agent should handle implementation?
   ```
   Wait for user response before continuing.

#### 3.3 Invoke Agent via Agent Tool

Use the Agent tool to spawn the appropriate agent. **Do NOT use `isolation: "worktree"`** — agents must work on the current feature branch created in Step 1.3.

```
Agent tool parameters:
- subagent_type: [agent-name from selection above]
- description: "[Phase] for [ticket-id]"
- prompt: Include ALL of the following:
  1. Ticket details (title, full description, all acceptance criteria, all Technical Notes — verbatim)
  2. Complete prior phase reports (full text, not summarized)
  3. Specific phase instructions
  4. Expected output format (structured report)
  5. Current branch name (so agent can verify it is on the correct branch)
  6. Referenced project documents and external content from Step 3.1.1 (formatted per Step E)
```

**Critical:** Agents do NOT have Linear access. Include ALL necessary context in the prompt.

#### 3.3.1 Post-Dispatch Verification

After every agent returns, verify that file changes are as expected:

1. **Check for file changes:**
   ```bash
   git status --short
   ```

2. **Verify changed files match ticket scope:**
   Compare the list of changed files against the ticket's predicted files (from the adaptation report's "Target Files" section). If files outside the predicted scope were modified:
   - This is not necessarily wrong (agents may discover needed changes)
   - But flag it for awareness:
     ```
     Agent modified files outside predicted scope:
     Predicted: [list from adaptation]
     Actual: [list from git status]
     Additional: [files not in predicted list]
     ```
   - Continue unless files look clearly wrong (e.g., test files in an implementation phase, config files not mentioned in the ticket)

3. **In WORKTREE_MODE:** Also verify no files were modified in the parent repo or other worktrees:
   ```bash
   # Check parent repo for stray files
   parent_dir=$(git rev-parse --git-common-dir | sed 's|/\.git.*||')
   cd "$parent_dir"
   git status --short
   ```
   If unexpected changes found in the parent repo, report to the user before proceeding.

#### 3.4 Parse Agent Report

Agent must return a structured report. Parse for:

**Required fields:**
- `Status:` - DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED (accept legacy COMPLETE / ISSUES_FOUND for compatibility)
- `Summary:` - Brief description of work done
- `Files Changed:` or `Files Reviewed:` - List of affected files

**Phase-specific fields:**

| Phase | Additional Fields to Parse |
|-------|---------------------------|
| testing | Gate #0-3 results (PASS/FAIL) |
| codereview | Review Status: APPROVED/CHANGES_REQUESTED |
| security-review | Severity levels of findings |

#### 3.4.1 Validate Report Structure (Enhanced)

Before posting to Linear, validate the agent report contains required fields:

**Required fields by phase:**

| Phase | Required Fields |
|-------|-----------------|
| adaptation | `Status:`, `Summary:`, `Target Files` or `Files to Modify` |
| implementation | `Status:`, `Summary:`, `Files Changed:` |
| testing | `Status:`, `Gate #0`, `Gate #1`, `Gate #2`, `Gate #3` results |
| documentation | `Status:`, `Summary:`, `Documentation Updated` or `Docs Created` |
| codereview | Always: `Review Status:`, `Requirements Checklist`, `Files Reviewed:`. If `Pass 1 Result: PASS`, also require `Best Practices Assessment` and `SOLID/DRY Assessment`. |
| security-review | `Status:`, `Security Checklist` or findings list |

**Validation algorithm:**
```
For each required field for current phase:
  1. Check field header exists in report (case-insensitive)
  2. Check field has non-empty content after the header

If ANY required field is missing or empty:
  - DO NOT post to Linear
  - Log: "Report validation failed: missing [field-name]"
  - Auto-retry phase ONCE with enhanced prompt requesting the missing fields
  - If retry also fails validation: PAUSE for user decision
    Options: [Retry] [Review Raw Output] [Skip Phase] [Abort]
```

**Codereview conditional validation:**
- If report contains `Pass 1 Result: FAIL`, treat "Pass 2 skipped" as valid and do NOT require Pass 2 sections.
- If report contains `Pass 1 Result: PASS` (or does not specify Pass 1), require both `Best Practices Assessment` and `SOLID/DRY Assessment`.

**IMPORTANT:** Auto-retry happens automatically before pausing. This preserves full automation in most cases.

#### 3.4.2 Verify Acceptance Criteria Completion (Implementation Phase Only)

After the implementation agent reports `DONE`, `DONE_WITH_CONCERNS`, or legacy `COMPLETE`, verify key acceptance criteria with automated checks **before** posting the report to Linear or advancing to the next phase.

**Step 1: Parse AC into verification targets**

Extract each acceptance criterion from the ticket and classify it:
- **STRUCTURAL AC** (imports, exports, file creation, pattern removal) → can verify with grep/glob
- **BEHAVIORAL AC** (data flows, error handling, parameter forwarding) → verify by tracing source code
- **REMOVAL AC** (no legacy code, no banned patterns) → verify with grep expecting zero matches

**Step 2: Generate and run verification commands**

For each STRUCTURAL and REMOVAL AC, generate a verification command:

```
Example verification commands:

AC: "All renderers import from schema files"
  → grep -rn "import.*from.*schema" [renderer-dir] | wc -l
  → expect: count >= [number of renderers]

AC: "Zero legacy fallback keys remain"
  → grep -rn "rec\.legacyKey\|rec\.oldName" [renderer-dir]
  → expect: zero matches

AC: "QuotaIndicator extracted to shared location"
  → test -f [expected-shared-file-path] && echo "EXISTS" || echo "MISSING"
  → expect: EXISTS

AC: "checkpointDecision has a typed schema"
  → grep "z\.enum\|z\.literal\|z\.number" [schema-file]
  → expect: non-trivial type constraints (not all z.string().optional())
```

For each BEHAVIORAL AC, trace the data flow:
```
AC: "documentIds forwarded to pipeline trigger"
  → Read the route handler, find where documentIds is accepted
  → Trace to the function call that should receive it
  → Confirm the parameter appears in the function's arguments
```

**Step 3: Compare results against agent claims**

```
IF any AC fails verification:
  - DO NOT post the report to Linear
  - DO NOT advance to the next phase
  - Report to user with specific evidence:

    ⚠️ AC VERIFICATION FAILED

    The implementation agent reported COMPLETE, but the following
    acceptance criteria could not be verified:

    | AC | Agent Claim | Verification Result |
    |----|-------------|---------------------|
    | [AC text] | [what agent reported] | [actual grep/check output] |

    Options:
    1. Send verification failures back to implementation agent for correction
    2. Review manually and override
    3. Abort execution

  - Wait for user decision before continuing

IF all AC pass verification:
  - Proceed to posting report and next phase
  - Include verification results in the Linear comment (append to agent report)
```

**Note:** This step applies to the implementation phase only. Code review has its own AC verification via Step 0 with verification commands. Security review focuses on vulnerability assessment rather than AC completion.

#### 3.4.3 Verify Referenced Document Conformance (Implementation Phase, When Prescriptive Documents Exist)

If Step 3.1.1 gathered any documents classified as **Requirements/spec** or **Research/analysis (prescriptive)** and a conformance checklist was generated, verify that the implementation matches the specific items from those documents.

**Step 1: Extract verifiable specifications from the conformance checklist**

For each checklist item, identify the specification type:
- **Named items** (IDs, enum values, field names) → verify presence in target files
- **Specific values** (dimensions, patterns, properties) → verify correct values
- **Enumerated lists** (required features, fields, components) → verify completeness

**Step 2: Generate and run verification queries**

For each specification item, generate a targeted check:
```
Named item "[item-name]" expected in [target-file]
  → grep -rn '"[item-name]"\|[item-name]' [target-file-or-directory]
  → expect: at least one match

Interface field "[field-name]" expected
  → grep -rn '[field-name]' [target-file]
  → expect: field defined with correct type

Enumerated requirement "[requirement]"
  → verify via grep, file existence check, or source code inspection
  → expect: implemented as specified
```

**Step 3: Report results**

```
IF all specifications match:
  - Proceed silently to next step
  - Include brief confirmation in Linear comment:
    "✅ Referenced document conformance: [X/X] specifications verified"

IF divergences or missing items exist:
  - DO NOT advance to next phase
  - Report to user:

    ⚠️ REFERENCED DOCUMENT CONFORMANCE CHECK

    Document: [file path]
    Role: [role classification]

    | Specification | Expected | Found | Status |
    |---------------|----------|-------|--------|
    | [item] | [expected value] | [actual value] | ✅ / ⚠️ DIVERGED / ❌ MISSING |

    [X] items match, [Y] items diverged, [Z] items missing

    Options:
    1. Send back to implementation agent for correction
    2. Accept divergences (document reasons in Linear)
    3. Review manually

  - Wait for user decision before continuing
```

**Scope:** This step runs only when prescriptive referenced documents were provided in Step 3.1.1. It does NOT replace Step 3.4.2 (AC verification) — it supplements it by checking specifications that live in referenced documents rather than in the ticket's acceptance criteria.

#### 3.5 Check for Blocking Conditions

| Phase | Blocking Condition | Action |
|-------|-------------------|--------|
| adaptation | Status: BLOCKED | Pause, show blockers to user |
| implementation | Status: BLOCKED OR compile errors mentioned | Pause, show issues to user |
| testing | Any Gate FAIL (especially Gate #0) | Pause, show failed gates to user |
| documentation | Status: BLOCKED | Pause, show blockers to user |
| codereview | Review Status: CHANGES_REQUESTED | Pause, show requested changes to user |
| security-review | CRITICAL or HIGH severity findings | Pause, show security issues to user |

**When blocked:**
```
⚠️ BLOCKING ISSUE DETECTED

Phase: [phase-name]
Ticket: [ticket-id]

[Extracted blocking details from agent report]

Options:
1. Fix the issues and re-run this phase
2. Skip this phase and continue (not recommended for security)
3. Stop execution

What would you like to do?
```

Wait for user response before continuing.

**Phase Skip Safety Guide:**

| Phase | Skip Safety | Rationale |
|-------|-------------|-----------|
| adaptation | ⚠️ Risky | Implementation may lack proper planning, leading to rework |
| implementation | ❌ NEVER | Cannot proceed without code; skipping breaks entire workflow |
| testing | ❌ NEVER | Quality gate - untested code should not proceed to production |
| documentation | ✅ Safe | Can be added post-merge; lowest risk to skip |
| codereview | ⚠️ Risky | Technical debt accumulates; issues harder to fix later |
| security-review | ❌ NEVER | Final quality gate - security issues must be resolved |

**Recommendation:** Only skip `documentation` if blocked. For all other phases, fix the blocking issue and re-run.

**Phase skip requires user approval.** If a phase appears unnecessary (e.g., implementation agent already created docs), present the rationale and wait for user confirmation before skipping. Do NOT skip autonomously.

#### 3.6 Post Report to Linear

After successful phase completion (non-blocking), post the agent's report as a comment:

```
Use mcp__linear-server__create_comment:
- issue_id: [ticket-id]
- body: [Full agent report with phase header]
```

**Comment format:**
```markdown
## [Phase] Report

[Agent's full structured report]

---
*Automated by /execute-ticket*
```

#### 3.6.0 Verify Implementation Artifacts (Implementation Phase Only)

After implementation agent returns, before posting report:

1. **Check for file changes:**
   ```bash
   changes=$(git status --porcelain | wc -l)
   ```

2. **Validate changes exist:**
   ```
   IF changes == 0 AND report.Status is one of ["DONE", "DONE_WITH_CONCERNS", "COMPLETE"]:
     - Log warning: "Implementation reported completion but no file changes detected"
     - Check for unstaged changes: git diff --name-only
     - If still no changes: PAUSE for user decision
       Options: [Retry Implementation] [Review Manually] [Mark as No-Op and Continue]
   ```

3. **If changes exist:** Proceed to posting report and PR creation

#### 3.6.1a Validate No AC Deferrals (All Phases)

Before advancing to the next phase, scan the agent's Deferred Items table for any items that match acceptance criteria:

1. **Extract** all items from the agent's Deferred Items table
2. **For each item**, check if it matches an acceptance criterion:
   - Fuzzy match on key terms: file names, function names, component names, patterns mentioned in AC
   - Check if the deferred item's description overlaps with any AC text
3. **If a match is found:**
   - Reclassify the item as `AC-DEFERRED` (see Deferred Items Handling section)
   - DO NOT advance to the next phase
   - Report to user:
     ```
     ⚠️ ACCEPTANCE CRITERION DEFERRED

     The agent deferred an item that matches an acceptance criterion:

     AC: "[acceptance criterion text]"
     Deferred Item: "[item description]"
     Agent Reason: "[agent's stated reason for deferral]"
     Severity: [agent-assigned severity]

     Options:
     1. Accept deferral and continue (AC will not be fulfilled)
     2. Send back to agent for implementation
     3. Modify AC to reflect reduced scope
     ```
   - Wait for user decision

4. **If no matches found:** Proceed to next step normally

**This validation runs for ALL phases**, not just implementation. Code review and testing agents can also improperly defer items that match AC.

#### 3.6.1 Commit and Create Draft PR (Implementation Phase Only)

After posting implementation report to Linear:

**Worktree mode behavior:**
- `WORKTREE_MODE=false` (normal run): execute all steps below
- `WORKTREE_MODE=true` (spawned by `/epic-swarm`): execute steps 1-2 only (local commit), skip push/PR steps 3-5

1. **Stage all changes:**
   ```bash
   git add -A
   ```

2. **Create commit with conventional message:**
   ```bash
   git commit -m "feat([ticket-id]): [ticket-title]

   [First sentence of implementation summary]

   Linear: [ticket-id]
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

3. **Push to remote:**
   ```bash
   git push origin [branch-name]
   ```

4. **Create draft PR:**
   ```bash
   gh pr create --draft \
     --title "[ticket-id]: [ticket-title]" \
     --body "## Summary
   [Implementation summary from agent report]

   ## Changes
   [Files changed list from agent report]

   ## Linear Ticket
   https://linear.app/[workspace]/issue/[ticket-id]

   ## Workflow Phases
   - [x] Implementation
   - [ ] Testing
   - [ ] Documentation
   - [ ] Code Review
   - [ ] Security Review

   ---
   *Generated by /execute-ticket workflow*"
   ```

5. **Capture PR number for subsequent phases:**
   ```bash
   pr_number=$(gh pr view --json number -q '.number')
   ```
   Store `pr_number` for use in phases 3-6.

#### 3.6.2 Add PR Phase Comment (Testing, Documentation, CodeReview, Security Phases)

After posting phase report to Linear, add condensed summary to PR:

**Skip when `WORKTREE_MODE=true` or no `pr_number` is available.**

```bash
gh pr comment [pr-number] --body "## [emoji] [Phase Name] Complete

[2-3 bullet point summary from agent report]

Full report: Linear ticket [ticket-id]"
```

**Emoji mapping by phase:**
- Testing: 🧪
- Documentation: 📚
- Code Review: 📋
- Security Review: 🛡️

#### 3.6.3 Add PR Labels (CodeReview and Security Phases)

**Skip when `WORKTREE_MODE=true` or no `pr_number` is available.**

After code review phase (if status is APPROVED):
```bash
gh pr edit [pr-number] --add-label "code-reviewed"
```

After security review phase (if no CRITICAL/HIGH findings):
```bash
gh pr edit [pr-number] --add-label "security-approved"
```

#### 3.7 Continue to Next Phase

If not blocked, proceed to the next phase in sequence.

---

## Step 3.8: Phase 5.5 — Cross-Model Review (Codex)

**This phase runs between codereview and security-review.** It is handled directly by the orchestrator using MCP tool calls, not via an agent.

### Prerequisites Check

Before running this phase, check if the Codex MCP server is available:
- Attempt to call `mcp__codex-review-server__codex_review` with a minimal probe
- **If NOT available:** Skip this phase entirely. Post a note to Linear: "Cross-model review skipped — Codex MCP server not configured. Install from: https://github.com/bdouble/codex-review-server"
- **If available:** Proceed with the review

### Execution

Follow the `/codex-review` command workflow (see `commands/codex-review.md`):

1. **Gather context:** Collect ticket description, AC, and implementation summary from prior phases
2. **Call `codex_review_and_fix`:** Pass project directory, base branch, and ticket context. Codex runs as a full agent with repo access — reviews changes, auto-fixes clear P0-P2 findings, reports ambiguous ones with questions, lists P3 for awareness.
3. **Present results to user:** Show auto-fixed items, items needing decision, and P3 awareness items
4. **Second pass (if needed):** For approved "needs decision" items, call `codex_fix` with user guidance
5. **Commit fixes:** Single commit for all fixes. Push only when `WORKTREE_MODE=false`.
6. **Post report to Linear:** Cross-Model Review Report as ticket comment

### Rate Limit Handling

If the Codex MCP tool returns a rate limit error:
1. Retry once after 60 seconds
2. If still limited: mark as `codex-review-pending`, post note to Linear
3. **Continue to security-review** — Codex review is valuable but NOT a hard gate
4. User can run `/codex-review $ARGUMENTS` independently later

### Context for Security Review

The Cross-Model Review Report becomes part of the context passed to the security-review agent. Include it in the security review agent prompt alongside all other phase reports.

---

## Step 4: Handle Security Review Completion

**Worktree mode note:** When `WORKTREE_MODE=true`, this security review is the pre-merge per-ticket scan. The swarm orchestrator runs a separate comprehensive post-merge security review (epic-swarm Phase 5) after integration. Do NOT close the ticket here when in worktree mode — the swarm orchestrator handles ticket closure after post-merge security review passes.

When security-review phase completes:

### 4.1 If No CRITICAL/HIGH Findings (PASS):

1. **Update ticket status to Done:**
   ```
   Use mcp__linear-server__update_issue:
   - issue_id: [ticket-id]
   - state: "Done"
   ```

2. **Finalize PR:**

   **Skip PR finalization when `WORKTREE_MODE=true` or no `pr_number` is available.**

   a. Convert draft to ready for review:
   ```bash
   gh pr ready [pr-number]
   ```

   b. Add final label:
   ```bash
   gh pr edit [pr-number] --add-label "ready-for-merge"
   ```

   c. Update PR body to mark all phases complete:
   ```bash
   # Get current PR body, update checkboxes, write back
   gh pr edit [pr-number] --body "[updated body with all checkboxes checked]"
   ```

### 4.2 If CRITICAL/HIGH Findings (BLOCKED):

- Keep ticket status as "In Progress"
- Do NOT convert PR to ready
- Add label to PR (skip when `WORKTREE_MODE=true` or no `pr_number`):
  ```bash
  gh pr edit [pr-number] --add-label "security-blocked"
  ```
- PAUSE for user decision (standard blocking behavior)

---

## Step 5: Generate Execution Summary

After all phases complete (or on blocking halt), provide summary:

```markdown
## Execution Summary

**Ticket:** [ticket-id] - [title]
**Final Status:** [COMPLETE | BLOCKED at phase]

### Phase Results

| Phase | Status | Key Outcome |
|-------|--------|-------------|
| adaptation | ✅ Complete | [Brief summary] |
| implementation | ✅ Complete | [Files changed count] |
| testing | ✅ Complete | [Coverage %] |
| documentation | ✅ Complete | [Docs created] |
| codereview | ✅ Complete | [APPROVED] |
| codex-review | ✅ Complete / ⚠️ Skipped | [N findings, M auto-fixed] / [reason: server unavailable, rate limit, or error] |
| security-review | ✅ Complete | [No critical issues] |

**If codex-review was skipped or failed**, include a clear note:
```
⚠️ Cross-model Codex review was not completed for this ticket.
Reason: [server not configured / rate limit reached / authentication expired / error details]
Action: Run `/codex-review [ticket-id]` to perform cross-model review independently.
```

### Metrics
- Total phases completed: [X/7]
- Blocking issues encountered: [count]
- Time from start: [timestamp]

### Next Steps
[If complete: PR ready for merge]
[If blocked: Required actions to unblock]
```

**CRITICAL — Post-Completion Branch Rule:**
- **Do NOT switch branches after execution completes.** The working directory MUST remain on the feature branch so the user can review the completed work.
- **Do NOT merge the feature branch to main.** The PR is marked ready-for-review for human merge decisions.
- This workflow handles its own completion. Do not run any additional branch cleanup, merge, or finalization steps beyond what is specified above.

---

## Error Handling

### Linear API Errors
- Retry up to 3 times with 2-second delays between attempts
- If still failing after retries:
  - Save any pending report content locally (display to user)
  - Pause execution with message: "Linear API unavailable. Report content preserved above."
  - Options: (1) Retry now, (2) Continue without posting (not recommended), (3) Abort

### Agent Timeout
- If Agent tool doesn't return within 10 minutes, consider agent stuck
- Report to user: "Agent [name] appears unresponsive for phase [phase]"
- Options: (1) Wait longer, (2) Retry phase with fresh agent, (3) Abort

### Malformed Agent Response
- If agent returns but report fails validation (see 3.4.1):
  - Display raw agent output to user
  - Do NOT post to Linear
  - Options: (1) Retry phase, (2) Manually extract and post, (3) Skip phase (with warning)

### Invalid Ticket State
- If ticket is closed/cancelled mid-execution, stop immediately
- Report: "Ticket [id] state changed to [state] externally. Execution halted."
- Do not attempt to reopen or modify ticket state

### Re-running a Completed Phase
If user needs to re-run a phase that shows as complete:
1. Locate the existing phase report comment in Linear
2. Edit the comment to rename header (e.g., `## Adaptation Report` → `## Adaptation Report (superseded)`)
3. Re-run `/execute-ticket [ticket-id]` - it will now detect phase as incomplete
4. New report will be posted as a fresh comment

**Note:** Alternatively, manually delete the phase report comment, but renaming preserves history.

---

## Context Management Principles

**Include ALL context — never summarize or truncate:**
- Each phase agent gets a fresh 1M token context window — use it fully
- Include the **complete, verbatim** prior phase reports in every agent prompt
- The cost of under-providing context is high: wrong decisions, missed requirements, incomplete implementations, rework
- The cost of over-providing context is near zero — typical ticket workflows use ~25% of the 1M token context window
- Orchestrator tracks: ticket ID, current phase, blocking status, branch/PR info

**CRITICAL: Do NOT summarize, condense, or extract from prior reports:**
- Pass each prior phase report **in full** — do not cherry-pick sections
- Prior phase reasoning (the "why") is as important as outcomes (the "what")
- Edge cases, concerns, and risks noted by earlier agents must propagate forward verbatim
- Deferred Items tables must always propagate in full
- When in doubt, include more — the agent will filter what it needs

**What each phase needs from prior reports (included via full report, not extraction):**

Every phase receives the **full ticket description, acceptance criteria, and Technical Notes**, plus **complete prior phase reports**. The list below highlights what each phase relies on most — this is NOT an extraction guide; include the full reports and the agent will use what it needs:

```
From Adaptation Report → Implementation:
- Target files and rationale for each
- Technical approach with trade-off reasoning
- Integration points and dependencies
- Service reuse mandates (specific services to use, not just "reuse existing")
- Constraints and risks identified
- Deferred/descoped items with reasoning

From Implementation Report → Testing:
- Files changed with brief description of what each does
- New endpoints/functions and their behavior
- Edge cases the implementer noted or flagged as risky
- Integration points and external dependencies
- Any concerns or known limitations
- Patterns used (needed to test pattern compliance)

From Testing Report → Documentation:
- API coverage and tested scenarios
- Test scenarios (inform docs examples)
- Coverage gaps (inform docs about untested areas)

From Testing Report → Code Review:
- Gate results with failure details (not just PASS/FAIL)
- Coverage gaps and skipped areas

From Documentation Report → Code Review:
- API docs location
- Any doc gaps noted

From All Prior Reports → Code Review:
- Full verbatim Acceptance Criteria (from ticket)
- Full verbatim Technical Notes (from ticket)
- Adaptation scope decisions (deferred/descoped items with original AC)

From All Prior Reports → Security Review:
- Full verbatim ticket description, AC, and Technical Notes
- Adaptation decisions (architecture, trust boundaries, data flow)
- Implementation details (what was built, auth/authz patterns, data handling)
- Code review security concerns flagged
- Code review findings (especially error handling, validation gaps)
```

## Full Context Inclusion Policy

**Default (1M context): There is no context budget. Include everything.**

With 1M token context windows, typical ticket workflows use ~25% of available context. The primary risk is **under-providing context** — which leads to wrong decisions, missed requirements, and incomplete implementations. There is no meaningful risk of over-providing context.

**For each phase agent prompt, include:**

1. **Full ticket description, acceptance criteria, and Technical Notes** — verbatim, never summarized
2. **Complete prior phase reports** — copy each report in full from Linear comments, do not extract or condense
3. **Git context** — branch, PR number, files changed

**Do NOT:**
- Summarize or condense prior phase reports
- Extract "key points" from reports — include the full report
- Apply token budgets or caps to any context source
- Truncate any section for length

**Why this matters:** Agents that receive condensed summaries miss details that lead to incomplete implementations, skipped acceptance criteria, and wrong architectural decisions. Agents that receive full reports self-filter to what they need and produce more complete work.

### Context window auto-detection

At the start of execution, assess your available context window:

- **500K+ tokens (default):** Follow the full-context policy above. Include complete, verbatim prior phase reports in every agent prompt.
- **Under 500K tokens:** Read and apply the budget rules in `commands/references/context-budget-legacy.md`. These rules cap total prior-phase context at ~15,000 tokens using an extraction algorithm that preserves essential context (AC, Technical Notes, Deferred Items, Files Changed) while condensing older reports first.

The threshold is 500K because security review — the final phase — receives 5 prior reports plus full ticket context. On a 250K window, full verbatim inclusion of all reports could exhaust context before the agent finishes its analysis.

---

## Deferred Items Handling

When agents bypass issues (correct behavior for low-priority items), they MUST document them in a Deferred Items table for user traceability:

| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| [AC-DEFERRED/DISCOVERED/OUT-OF-SCOPE] | [CRITICAL/HIGH/MEDIUM/LOW/INFO] | [file:line] | [Brief description] | [Why deferred] |

### Deferred Item Classifications

| Classification | Description | Requires User Approval? |
|---------------|-------------|------------------------|
| AC-DEFERRED | An explicit acceptance criterion the agent chose not to implement | **YES — ALWAYS** |
| DISCOVERED | A new issue found during the phase, not in the original AC | NO — agent discretion |
| OUT-OF-SCOPE | Work that belongs to a different ticket | NO — agent discretion |

### Orchestrator Validation Rule

Before posting a completed report (`DONE`, `DONE_WITH_CONCERNS`, or legacy `COMPLETE`), the orchestrator MUST:
1. Extract all acceptance criteria from the ticket
2. Check each deferred item against the AC list (fuzzy match on key terms)
3. If ANY deferred item matches an AC → reclassify as `AC-DEFERRED`
4. If ANY `AC-DEFERRED` items exist → **PAUSE for user decision** (see Step 3.6.1a)

**Agents MUST NOT unilaterally defer acceptance criteria.** Deferring discovered issues is expected and encouraged. Deferring AC requires explicit user approval.

**Rules for Deferred Items:**
1. ANY issue found but not addressed MUST appear in this table
2. Classification must be set (agents should classify; orchestrator validates and reclassifies if needed)
3. Location must include file:line for traceability
4. Reason must explain the bypass decision (e.g., "Defense-in-depth, not exploitable")
5. Table is always included in full when passing context to downstream phases
6. Orchestrator posts full table to Linear (not summarized)

**When to defer (examples by phase):**
- **Security**: LOW severity findings, confidence <7/10, defense-in-depth measures
- **Code Review**: Style nits, minor optimizations, non-blocking pattern deviations
- **Testing**: Coverage gaps in low-risk areas, trivial code not tested
- **Implementation**: Tech debt noted but out of scope, refactoring opportunities
- **Documentation**: Doc gaps noted but low priority
- **Adaptation**: Alternative approaches considered but rejected, accepted risks

**Example Deferred Items table:**
```markdown
### Deferred Items
| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| DISCOVERED | LOW | auth.ts:45 | Missing rate limit on admin login | Defense-in-depth, admin-only endpoint |
| DISCOVERED | INFO | user.service.ts:120 | Could add input sanitization | Low risk, trusted internal call |
| OUT-OF-SCOPE | LOW | api.controller.ts:88 | Consider adding request logging | Enhancement, not security critical |
```

**Example of orchestrator catching an AC deferral:**
```
Agent deferred: "QuotaIndicator extraction to shared location" as DISCOVERED/LOW
Orchestrator matches against AC: "QuotaIndicator, SelectedFileList extracted to shared locations"
→ Reclassified as AC-DEFERRED → PAUSE for user decision
```

---

## Example Execution

```
User: /execute-ticket PRJ-123

Orchestrator:
Fetching ticket PRJ-123...
✓ Ticket found: "Add user profile endpoint"
✓ Status: In Progress
✓ Agent type: backend (from labels)

Checking for prior progress...
✓ No existing phase reports found
Starting from: adaptation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1/6: Adaptation
Spawning architect-agent...
[Agent works autonomously]
✓ Adaptation complete - Report posted to Linear

Phase 2/6: Implementation
Spawning backend-engineer-agent...
[Agent works autonomously]
✓ Implementation complete - 4 files changed

Phase 3/6: Testing
Spawning qa-engineer-agent...
[Agent works autonomously]
✓ All gates passed - 87% coverage

Phase 4/6: Documentation
Spawning technical-writer-agent...
[Agent works autonomously]
✓ API docs updated

Phase 5/6: Code Review
Spawning code-reviewer-agent...
[Agent works autonomously]
✓ Review: APPROVED

Phase 6/6: Security Review
Spawning security-engineer-agent...
[Agent works autonomously]
✓ No critical/high severity issues

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ EXECUTION COMPLETE

Ticket PRJ-123 marked as Done
PR #45 marked ready for review

[Full summary displayed]
```

---

## Resume Example

```
User: /execute-ticket PRJ-123

Orchestrator:
Fetching ticket PRJ-123...
✓ Ticket found: "Add user profile endpoint"

Checking for prior progress...
Found completed phases:
  ✓ Adaptation Report (completed 2h ago)
  ✓ Implementation Report (completed 1h ago)

Resuming from: testing

Phase 3/6: Testing
Spawning qa-engineer-agent...
[Continues from testing phase]
```
