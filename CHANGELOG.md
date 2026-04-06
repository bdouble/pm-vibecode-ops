# Changelog

All notable changes to PM Vibe Code Operations will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.0] - 2026-04-06

### Added

#### Epic-Swarm Execute-Ticket Parity (14 Gaps Closed)

Comprehensive overhaul of `/epic-swarm` post-phase processing to match the behavior of `/execute-ticket` and individual workflow commands. Previously, swarm-executed tickets received no Linear comments and no status updates, breaking the `/close-epic` workflow and eliminating the per-ticket audit trail.

**P0 — Critical (user-reported):**
- **Linear comments posted per phase per ticket** — Every phase (adaptation, implementation, testing, documentation, code review, security) now posts a structured `## [Phase Name] Report` comment to the ticket via `create_comment`. Headers match the exact format that `/execute-ticket` and `/close-epic` depend on for resume detection and deferred item extraction.
- **Ticket status updates** — Tickets are updated to "In Progress" at wave start (new Section 3.2.0) and to "Done" after post-merge security review passes (expanded Phase 5.2). Failed security reviews add `security-blocked` label and keep tickets open.

**P1 — High (functionality gaps):**
- **Report validation** — New Section 3.2.4.2 validates required fields per phase before posting to Linear. Auto-retries once with enhanced prompt; pauses ticket for user decision on second failure.
- **AC verification after implementation** — New Section 3.2.4.4 parses acceptance criteria into STRUCTURAL/BEHAVIORAL/REMOVAL categories, generates and runs verification commands, blocks advancement if criteria fail.
- **Deferred items handling** — New Section 3.2.4.6 + standalone Deferred Items section. Agents must classify deferred items as AC-DEFERRED, DISCOVERED, or OUT-OF-SCOPE. Orchestrator fuzzy-matches deferred items against AC and blocks advancement for any AC-DEFERRED items.
- **Implementation artifact verification** — New Section 3.2.4.3 checks `git status` to confirm files actually changed when agent reports DONE. Pauses for user if no changes detected.

**P2 — Medium (quality/fidelity gaps):**
- **Per-phase commits** — Implementation, testing, documentation, and code review each get proper conventional commits in their worktrees (Sections 3.2.4.9 and 3.2.5).
- **Standardized comment format** — `## [Phase Name] Report\n[report]\n---\n*Automated by /epic-swarm — Wave [N]*` with Phase Name mapping table.
- **Agent selection logic** — New implementation-phase agent selection in Section 3.2.1: checks ticket labels for backend/frontend/fullstack, falls back to keyword scan, defaults silently to backend-engineer-agent.
- **Quality labels per phase** — `tests-complete`, `docs-complete`, `code-reviewed` labels added to tickets at appropriate phases (Section 3.2.4.8).
- **Referenced document conformance** — New Section 3.2.4.5 verifies implementation matches prescriptive document specifications (IDs, schemas, field names).
- **Post-dispatch scope verification** — Section 3.2.3 enhanced with scope relevance check comparing changed files against predicted files from adaptation report.

---

## [3.1.1] - 2026-04-06

### Fixed
- **Codex review timeout** — Tripled default from 1500s (25 min) to 4500s (75 min). Codex reviews were being aborted before completion due to insufficient timeout for thorough repo-aware reviews.

---

## [3.1.0] - 2026-04-06

### Changed

#### Epic-Swarm Reliability Overhaul (Post-Mortem Fixes)

Based on the first production run of `/epic-swarm` (PRO-330), addressing all issues from the post-mortem report:

- **Sequential write dispatch (P0)** — Write phases (implementation, testing, documentation) now dispatch agents one at a time with explicit `cd` to each worktree, guaranteeing isolation. Read-only phases (adaptation, code review, security scan) remain parallel. Configurable via `SWARM_PARALLEL_WRITES` (default: `false`).
- **Working directory enforcement (P0)** — Agent prompts now include absolute path instructions at the top: agents must use absolute paths for all file operations and verify they are operating in their assigned worktree. Read-only phase agents also receive an explicit file manifest from `git diff`.
- **Worktree integrity verification (P0)** — New mandatory Section 3.2.3 runs after every agent dispatch. Checks target worktree for expected changes, checks other worktrees for contamination, checks project root for stray files. Stops the wave immediately if cross-contamination is detected.
- **Integration approval gate (P1)** — New Section 4.0 requires explicit user approval before merge-to-main and before push-to-remote. Gated on `SWARM_AUTO_MERGE` config (default: `false`). Presents merge plan with branch/ticket/file counts.
- **Ticket closure approval gate (P1)** — Section 5.2 now requires user approval before closing tickets in Linear after security review passes.
- **Phase-skip policy (P2)** — The orchestrator can no longer skip phases autonomously. Must present skip rationale and wait for user approval. Logged in swarm state as `skipped_by_user`.
- **Blocking baseline tests (P2)** — Section 3.1.3 is now explicitly blocking. Tests must pass before wave execution begins. No background "check later" pattern.
- **Swarm state persistence (P3)** — New State Persistence Protocol with field-level schema and per-ticket phase tracking. State file updated after every significant event (phase start/complete, ticket pause, wave complete, merge, error). Enables reliable resume.
- **Graceful degradation for missing planning metadata (P4)** — When tickets lack parallelization annotations from `/planning`, the orchestrator performs heuristic dependency analysis (scanning descriptions for file paths, ticket references, shared modules) and presents results for user confirmation.
- **Context bundle token budget (P5)** — New strategy for when full verbatim inclusion is impractical. Prescriptive documents (requirements, specs, schemas) are always included in full. Contextual documents may be truncated with pointers. User notified of any truncation.
- **Dual security review** — Phase 3 renamed to "Security Scan (Pre-Merge)" for per-ticket lightweight scan in worktrees. Phase 5 is now "Post-Merge Security Review (Comprehensive)" with preamble explaining cross-ticket integration-level review. Both are required. Comparison table added to spec.
- **New config variable** — `SWARM_PARALLEL_WRITES` (default: `false`) added to configuration reference and initial state JSON.

#### Execute-Ticket Alignment

- **Post-dispatch verification (Step 3.3.1)** — New step after every agent dispatch checks `git status`, verifies changed files match predicted scope from adaptation report, and in worktree mode checks parent repo for stray files.
- **Worktree mode security note** — Step 4 now clarifies that in worktree mode, the security review is the pre-merge scan; the swarm orchestrator handles post-merge review and ticket closure.
- **Phase-skip user approval** — Phase Skip Safety Guide now requires user approval before skipping any phase. Autonomous skipping is prohibited.

---

## [3.0.0] - 2026-03-26

### Added

#### Multi-Agent Swarm Orchestration
- **`/epic-swarm` command** — Orchestrate parallel execution of epic sub-tickets using dependency-aware wave scheduling. Analyzes ticket dependencies, groups independent tickets into waves, isolates each in a git worktree. Orchestrates all workflow phases directly from the main session — dispatches specialized agents in parallel across tickets within each phase (architecture constraint: Claude Code subagents cannot spawn subagents). Phase-synchronized execution: all tickets complete adaptation before implementation begins, ensuring interface contracts propagate correctly. Merges sequentially and runs security review on the integrated codebase.
- **Swarm state persistence** — State file at `.claude/swarm-state/{epic-id}.json` with create/update/resume lifecycle. Interrupted swarms resume from last checkpoint.
- **Worktree safety patterns** — Gitignore verification before worktree creation, clean baseline tests per worktree, automatic cleanup on completion.

#### Cross-Model Code Review (Codex Integration)
- **`/codex-review` command** — Standalone cross-model code review using OpenAI Codex (GPT-5.3-Codex with xhigh reasoning). Codex runs as a full agent with complete repository access — reads files, explores dependencies, traces code paths. Auto-fixes clear P0-P2 findings, reports ambiguous ones with questions, lists P3 for awareness.
- **Codex Review MCP Server** — New `codex-review-server` repo providing three MCP tools: `codex_review_and_fix` (review + auto-fix), `codex_review` (review only), `codex_fix` (fix approved findings). Uses ChatGPT subscription auth via Codex CLI — no API billing.
- **Phase 5.5 in execute-ticket** — Cross-model review integrated between Code Review and Security Review. Gracefully skips if Codex MCP server not installed.
- **Configurable** — Model, reasoning effort, timeout, focus area, and Codex credentials directory all configurable via environment variables with live reload.

#### Security Review Enhancement
- **Attack surface census** — Maps all endpoints, file uploads, webhooks, integrations, background jobs before vulnerability scanning.
- **Secrets archaeology** — Scans git history for leaked credentials using known secret prefixes (AWS, OpenAI, GitHub, Slack, Stripe, SendGrid).
- **Dependency supply chain audit** — Runs package manager audits, checks for install scripts in production deps, verifies lockfile integrity.
- **CI/CD pipeline security** — Checks for unpinned GitHub Actions, `pull_request_target` risks, script injection via event contexts, secrets exposure.
- **STRIDE threat modeling** — Per-component Spoofing/Tampering/Repudiation/Information Disclosure/DoS/Elevation of Privilege assessment.
- **Anti-manipulation clause** — Security agent ignores any in-codebase instructions that attempt to influence the audit.
- **Confidence gating** — Default 8/10 threshold; `--comprehensive` mode lowers to 2/10 for deep scans.
- **New reference docs** — `security-stride-reference.md` (STRIDE methodology and templates) and `security-cicd-reference.md` (GitHub Actions security patterns and detection commands).

#### Skill Triggering Overhaul
- **SessionStart meta-skill injection** — The `using-pm-workflow` skill is now injected at every session start via hook, establishing the "1% rule": if there's even a 1% chance a skill applies, it must be invoked.
- **Description rewrites** — All 11 skill descriptions rewritten to `[what] + [when/triggers]` pattern following Anthropic's skill guide. Descriptions no longer summarize enforcement rules (which caused Claude to shortcut past loading the full skill).
- **Rationalization prevention tables** — Added to 6 enforcement skills (production-code-standards, security-patterns, testing-philosophy, verify-implementation, systematic-debugging, model-aware-behavior). Each maps common excuses to reality counters.

#### Agent Improvements
- **Structured status codes** — All 10 agents now return DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED with structured metadata. Enables deterministic orchestration decisions.
- **Anti-sycophancy protocol** — All agents ban gratitude expressions, require substance over agreement, and verify reviewer suggestions against actual codebase usage before accepting.
- **Two-stage code review** — Code reviewer agent now runs Pass 1 (spec compliance) before Pass 2 (code quality). Pass 1 catches over-building and under-building that quality-only reviews miss. Pass 1 failure blocks Pass 2.

#### Planning Enhancement
- **Dependency annotations** — `/planning` output now includes per-ticket parallelization metadata: parallel group, files touched, depends-on/blocks, shared interfaces, optional model override.
- **No-placeholders rule** — Every plan step must contain actual implementable content. "Add appropriate error handling" is a plan failure.
- **Interface contract generation** — Shared types between tickets get explicit contracts locked after the defining ticket completes.

#### Verification Enhancement
- **Banned hedging language** — verify-implementation skill now bans "should", "probably", "seems to" without fresh command output.
- **Subagent verification protocol** — Never trust subagent self-reports; independently verify with git diff and test execution.
- **Regression test red-green-revert cycle** — Regression tests must demonstrate failure when fix is reverted.

### Changed
- **execute-ticket Phase 5.5** — New cross-model review phase between code review and security review (skippable if Codex MCP not installed)
- **execute-ticket worktree mode** — Detects when running inside a swarm worktree; skips branch creation, PR management, and push (swarm orchestrator handles these)
- **execute-ticket status parsing** — Resume logic now recognizes DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT alongside legacy COMPLETE/ISSUES_FOUND
- **close-epic swarm cleanup** — Deletes swarm state file and removes worktrees for closed tickets
- **Security patterns skill** — Description updated with CI/CD, Docker, IaC triggers; new Infrastructure Security Patterns section
- **Default Codex review timeout** — 4500s (75 min) to accommodate thorough repo-aware reviews

---

## [2.26.0] - 2026-03-25

### Added
- **Parent epic context gathering (Step 3.1.0)** — Execute-ticket now fetches the parent epic before dispatching agents, extracting referenced documents, architectural decisions, and constraints that apply to all sub-tickets. Ensures context authored at the epic level (research briefs, specs, design docs) reaches agents even when not repeated in individual ticket descriptions.
- **Two-level URL discovery chain** — Step A2 now scans the ticket body, parent epic description, AND all local file contents read in Step A1 for URLs. URLs embedded inside referenced research briefs and specs are now detected and fetched, not just URLs in the ticket itself. URLs found in local files inherit the file's role classification as default intent.
- **Prescriptive vs contextual research classification** — Research briefs containing structured content (tables with specific IDs, interface definitions, enumerated items, schema fields) are now classified as "Research/analysis (prescriptive)" with a stronger role label that communicates binding authority to agents. General research without concrete specifications is classified as "Research/analysis (contextual)".
- **Conformance checklist extraction** — When a referenced document is classified as prescriptive, the orchestrator extracts verifiable specification items (named IDs, field definitions, enumerated requirements, specific values) and generates a conformance checklist appended to the agent prompt.
- **Post-implementation conformance verification (Step 3.4.3)** — After implementation, the orchestrator verifies that specific items from prescriptive referenced documents were actually implemented. Uses targeted grep/inspection queries. Divergences and missing items pause execution for user decision.
- **Reference Material Availability table** — Step E now includes a summary table showing which referenced sources were successfully included, which failed to fetch, and why. Agents can make informed decisions about missing context and flag critical gaps in their Deferred Items.
- **Adaptation conformance requirements section** — Adaptation report template and architect-agent output now include a "Referenced Document Conformance Requirements" section that extracts specific verifiable items from prescriptive documents as a concrete implementation checklist.

---

## [2.25.0] - 2026-03-25

### Added
- **Resource gathering for execute-ticket agents** — New Step 3.1.1 automatically detects and fetches resources referenced in ticket descriptions before dispatching agents. Supports local file references (requirements docs, research briefs, design specs, ADRs) and external URLs (GitHub code, API docs, blog tutorials, configuration templates). Local files are read in full with role classification; external URLs are fetched via WebFetch with intent classification, content validation, and user fallback on failure. GitHub URLs are normalized (blob→raw, gist→raw, directory→file listing). All gathered resources are included in agent prompts with role/intent labels and ticket context so agents know how to use each resource.
- **WebFetch added to execute-ticket allowed-tools** — Enables the orchestrator to fetch external URLs referenced in tickets before agent dispatch.

### Fixed
- **Execute-ticket agents no longer create their own branches** — Corrected "Task tool" references to "Agent tool" in execute-ticket command, added explicit prohibition on `isolation: "worktree"` so agents work on the canonical feature branch, and added branch name as a required prompt parameter for agent verification.
- **Stale "Task tool" reference in TECHNICAL_REFERENCE.md** — Platform comparison table now correctly references "Agent tool".
- **Stale context budget description in TECHNICAL_REFERENCE.md** — Updated to reflect context window auto-detection rather than fixed token limit.

---

## [2.24.1] - 2026-03-21

### Fixed
- **Execute-ticket no longer switches branch to main after completion** — Added post-completion branch rule to keep the working directory on the feature branch. The PR is left ready-for-review for human merge decisions.

---

## [2.24.0] - 2026-03-19

### Added
- **Deferred Work Recovery phase** — New Phase 2 in the epic closure workflow (now seven phases) that aggregates, groups, and surfaces all deferred items from sub-ticket phase reports. Agents record deferred work during ticket execution; this phase recovers that data at epic closure so the user can decide what becomes a new ticket vs. what stays deferred. Includes raw audit trail, consolidated grouping by theme, opinionated recommendations (CREATE TICKET / ACCEPT DEFERRAL / MERGE WITH RETROFIT), and overlap detection with retrofit candidates.
- **`--skip-deferred-review` flag** — Skips full deferred work analysis in `/close-epic`, but AC-DEFERRED items (user-approved scope cuts) are always surfaced in the closure report for traceability.
- **`[Deferred]` ticket type** — New ticket prefix and `deferred-recovery` label for Linear tickets created from deferred work recovery, distinct from `[Retrofit]` tickets. Classification sublabels (`ac-deferred`, `discovered`, `out-of-scope`) enable filtering by deferral type.
- **Tiered context budget for epic closure** — Close-epic now auto-detects context window size. 500K+ tokens: full verbatim context, no caps. Under 500K: budget mode with extraction rules in `commands/references/close-epic-budget-legacy.md`. Replaces the fixed ~4,500 token budget.
- **Close-epic budget legacy reference** — New `commands/references/close-epic-budget-legacy.md` with extraction algorithm, truncation priority matrix, and tiered gathering strategy for constrained context windows. Follows the same pattern as `context-budget-legacy.md` for execute-ticket.

### Changed
- **Epic closure workflow expanded to seven phases** — All phase references updated across close-epic command, epic-closure-agent, TECHNICAL_REFERENCE.md, and codex agents. Phase numbering: Late Findings (1) → Deferred Work Recovery (2) → Retrofit (3) → Downstream (4) → Documentation (5) → CLAUDE.md (6) → Closure Summary (7).
- **Epic closure agent output format** — Report now includes Phase 2 deferred recovery section with raw table, consolidated recommendations, overlap check, and summary metrics. Validation requirements updated to enforce deferred recovery completeness.

---

## [2.23.0] - 2026-03-19

### Added
- **OWASP Top 10:2025 alignment** — Updated all security references (skills, agents) from OWASP 2021 to OWASP Top 10:2025. Added two new categories: A03 Software Supply Chain Failures (SBOM, dependency pinning, lockfile integrity) and A10 Mishandling of Exceptional Conditions (fail-safe defaults, centralized error handling). Merged SSRF into A01.
- **OWASP Top 10 for Agentic Applications 2026** — New reference file (`agents/references/security-agentic-owasp-reference.md`) covering all 10 agentic security categories (ASI01-ASI10) with assessment checklists. Security engineer agent and security review command updated to assess agentic patterns when detected.
- **Critical CVE updates** — Added React2Shell (CVE-2025-55182, CVSS 10.0), Next.js CVE-2025-66478 (RCE), NestJS CVE-2025-54782 (RCE), Supabase view RLS bypass, and Prisma operator injection to SaaS security patterns. Added quarterly review cadence header.
- **TypeScript anti-patterns** — Added type safety violations (`any`, `as` assertions, unvalidated `JSON.parse`), async anti-patterns (floating promises, `async void`), production hygiene (`console.log`, magic numbers), and ESLint rule reference table to production-code-standards.
- **Property-based and parameterized testing** — Added fast-check property-based testing templates and Vitest `test.each` parameterized testing patterns to test templates.
- **API contract and accessibility testing gates** — Added Gate #5 (API Contract Verification with supertest/Pact) and Gate #6 (Accessibility Testing with axe-core/jest-axe) plus flaky test detection to QA testing gates reference.
- **UI/frontend verification checklist** — Added accessibility, responsive, and visual regression checklists. Added performance verification (Core Web Vitals, bundle size, N+1 queries) and pre-PR security scan steps.
- **Service lifecycle management** — Added `lifecycle`, `owner`, `api_schema`, `health_check`, `slack_channel` fields to service inventory template with deprecation/sunset guidance.
- **Weighted scoring matrix** — Added weighted evaluation methodology and Architecture Decision Canvas reference to exploration patterns.

### Changed
- **Enriched 6 thin skills** — Expanded security-patterns (350→1,169 words), divergent-exploration (350→1,042), model-aware-behavior (500→1,232), using-pm-workflow (500→1,196), epic-closure-validation (450→1,049), production-code-standards (500→1,095). All now closer to the 1,200-word target with core procedural knowledge in the body.
- **Added /execute-ticket to workflow skill** — The recommended agentic workflow path was missing from using-pm-workflow. Now prominently featured as the RECOMMENDED approach.
- **Expanded root-cause-tracing reference** — Added concrete TypeScript debugging example, 5 Whys technique, git bisect workflow, and diagnostic instrumentation patterns (500→1,297 words).
- **Aligned ADR template with MADR 4.0** — Added YAML front matter, Decision Drivers section, and Confirmation section per the community standard.
- **Documented custom command frontmatter** — Added note in CLAUDE.md that workflow-phase, closes-ticket, workflow-sequence are documentation-only fields ignored by Claude Code.

---

## [2.22.0] - 2026-03-19

### Added
- **Progressive disclosure for 5 bare skills** — Created references/ and examples/ directories with supporting files for `epic-closure-validation`, `security-patterns`, `systematic-debugging`, `mvd-documentation`, and `testing-philosophy`. Each SKILL.md now has an "Additional Resources" section linking to its supporting files.
- **Context isolation for ticket-context-agent** — Added context isolation guardrails ("IGNORE session summaries") and phase guardrails (valid/invalid task lists) matching the pattern used by all other agents. Previously the only agent without these safety rails.
- **Measurable success criteria for discovery command** — Replaced qualitative success criteria with a required outputs checklist and quality gates (reuse mapping thresholds, actionable recommendations, prioritized technical debt).
- **Post-generation validation for generate-service-inventory** — Added bash validation commands to verify YAML validity and check for stale file paths after inventory generation.
- **Agent reference extraction (QA)** — Extracted Gate #0-3 procedures, API discovery phases, and test code examples from `qa-engineer-agent` (899→454 lines, 50% reduction) into `agents/references/qa-testing-gates-reference.md`.
- **Agent reference extraction (Security)** — Extracted OWASP Top 10 detailed patterns and Modern SaaS security guidelines from `security-engineer-agent` (919→480 lines, 48% reduction) into `agents/references/security-owasp-reference.md` and `agents/references/security-saas-patterns.md`.

### Changed
- **Removed XML angle brackets from using-pm-workflow** — Replaced `<EXTREMELY_IMPORTANT>` tags with markdown bold formatting per Anthropic frontmatter spec.
- **Fixed unreferenced supporting files** — `service-reuse` SKILL.md now references its 2 existing files (service-inventory-template.md, inventory-search-session.md). `model-aware-behavior` now references scope-creep-patterns.md.
- **Security agent OWASP section condensed** — Replaced 700+ line inline OWASP section with a 10-row checklist table referencing the extracted reference file. Consolidated duplicate severity classification sections into one.
- **QA agent Gate #0 condensed** — Replaced ~200 line inline gate explanation with concise summary referencing the extracted reference file.

---

## [2.21.0] - 2026-03-19

### Added
- **AC Verification Step (Step 3.4.2)** — After implementation agent reports COMPLETE, orchestrator now runs automated verification commands (grep, glob, file existence checks) against each acceptance criterion before advancing. Catches agents that claim completion while AC remain unfulfilled. Applies to implementation phase only; code review has its own verification via Step 0.
- **Deferred Item Classification** — Deferred Items tables now include a Classification column (AC-DEFERRED, DISCOVERED, OUT-OF-SCOPE). Orchestrator validates deferred items against AC and pauses for user approval if any acceptance criteria were deferred. Agents cannot unilaterally defer AC.
- **AC Deferral Validation (Step 3.6.1a)** — New orchestrator gate runs for all phases, scanning deferred items for matches against acceptance criteria. Fuzzy-matches on key terms to catch improperly classified deferrals.
- **Verification Commands in Code Review** — Step 0 (Requirements Verification) now requires running actual verification commands (grep, glob, file existence) for each AC, not just reading code and citing line numbers. Unverifiable items must be marked UNVERIFIED (not PASS). Reviews cannot be APPROVED with FAIL or UNVERIFIED items.
- **Schema Quality Standards** — `production-code-standards` skill now blocks permissive schema patterns: `z.record(z.unknown())` for known fields, `z.string()` where enums exist, all-optional fields in known structures, and duplicated schema definitions. Requires derivation from canonical source schemas.
- **Data Flow Tracing** — Implementation phase now requires end-to-end data flow verification for new/changed API routes. Parameters accepted at the API boundary must be traced to their final consumer. Silent data loss (accepting but not forwarding parameters) is flagged as a production bug.
- **Component Rewrite Guidance** — Implementation phase now distinguishes destructive changes (code removal) from constructive changes (adding imports, decomposing components). Agents must complete and verify each type separately; reporting COMPLETE after only destructive work is blocked.
- **Agent Self-Assessment Triggers** — `verify-implementation` skill now activates when agents set Status: COMPLETE, Review Status: APPROVED, or Status: PASS. Includes evidence requirements by phase (git diff, grep, test output).

### Changed
- **Deferred Items table format** — All 7 agent report templates updated from 4-column format (Severity | Location | Issue | Reason) to 5-column format (Classification | Severity | Location | Issue | Reason). Classification guide added to each agent.
- **Legacy context budget** — `context-budget-legacy.md` updated to reflect the Classification column in Deferred Items tables (preserved as essential context, never truncated).

---

## [2.20.0] - 2026-03-19

### Added
- **Context window auto-detection** — Orchestrator assesses available context window at startup. Models with 500K+ tokens use full verbatim context (default); models under 500K fall back to legacy budget rules via `commands/references/context-budget-legacy.md`.
- **Context mode reporting** — Startup output now includes a `Context mode:` line so users can see whether agents are receiving full or condensed context, aiding diagnosis of incomplete implementations.
- **Legacy context budget reference file** — `commands/references/context-budget-legacy.md` preserves the original ~2,000 token budget system (pre-v2.19.0) for use with context windows under 500K tokens.

### Changed
- **Removed context budget from execute-ticket** — Eliminated the ~15,000 token context budget system (per-source token caps, extraction algorithm, truncation rules) from `/execute-ticket`. Orchestrator now includes complete, verbatim prior phase reports in every agent prompt instead of condensed extracts. Typical ticket workflows use ~25% of the 1M context window, so budget management was causing agents to miss details and produce incomplete implementations with no upside.
- **Full Context Inclusion Policy** — New policy replaces the old budget system: "There is no context budget. Include everything." Agent prompts now receive full ticket description, all acceptance criteria, all Technical Notes, and complete prior phase reports without summarization.
- **Agent invocation template updated** — Task tool prompt template now specifies "Complete prior phase reports (full text, not summarized)" instead of "Condensed context from prior phases."

---

## [2.19.0] - 2026-03-17

### Added
- **Requirements Verification (Step 0) in code review** — Code reviewer agent now systematically verifies every acceptance criterion and technical note against the implementation before reviewing code quality. Missing implementations are flagged as ❌ MISSING (automatically CHANGES_REQUESTED). Scope reductions from adaptation that weren't reflected in ticket AC are flagged as SCOPE_GAP.
- **Framework & Language Best Practices (Step 1) in code review** — Auto-detects the tech stack from file extensions and imports (React, Next.js, TypeScript, Inngest, Prisma, Zod, etc.) and evaluates the changeset against framework-specific best practices with ERROR/WARNING/INFO severity levels.
- **SOLID/DRY Analysis (Step 2) in code review** — Evaluates Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion, and DRY principles across the changeset. Cross-references new routes against parallel implementations to catch inconsistent error handling. Uses MUST_FIX/SHOULD_FIX/CONSIDER severity levels.
- **Three new report sections** in code review output — Requirements Checklist, Best Practices Assessment, and SOLID/DRY Assessment tables are now mandatory parts of every code review report.

### Changed
- **Context budgets relaxed for 1M context windows** — Total prior-phase context budget increased from ~2,000 to ~15,000 tokens. Every phase now receives full ticket description, acceptance criteria, and Technical Notes (previously truncated to 300 tokens). Individual source budgets increased 5-10x.
- **Full ticket context for all phases** — Previously only the code review phase received full AC. Now every phase (implementation, testing, documentation, code review, security review) receives the complete ticket description, AC, and Technical Notes.
- **Security review gets expanded context** — Security review now receives full ticket context, adaptation architecture decisions, implementation details, and code review security flags instead of a ~400-token summary.
- **Testing gets full implementation context** — QA agent now receives the full implementation report (what was built, edge cases, concerns) instead of just a file list and PR number.
- **Context philosophy inverted** — Changed from "keep orchestrator context minimal" to "provide agents with rich, relevant context." Default is now inclusion over exclusion. Aggressive truncation rules (drop phases at 4+, keep only 2 most recent) replaced with graceful condensation that never drops a phase entirely.

---

## [2.18.0] - 2026-03-07

### Added
- **New skill: `systematic-debugging`** — 4-phase root cause debugging process (investigate → analyze → hypothesize → implement) with a hard 3-fix architectural stop that forces escalation to the user instead of thrashing. Includes inline rationalization prevention table and PM-facing framing explaining why debugging discipline matters for non-engineers. Reference file `root-cause-tracing.md` provides backward tracing technique for deep call stack bugs.
- **Anti-rationalization armor for `verify-implementation`** — Inline rationalization prevention table (9 excuse/reality pairs), "spirit over letter" anti-gaming rule, agent delegation verification pattern requiring independent VCS verification of subagent results, and promoted red-flag phrases from reference file into main SKILL.md for guaranteed context loading.

### Attribution
- The rationalization prevention table, "spirit over letter" principle, agent delegation verification pattern, 4-phase debugging process, 3-fix architectural stop, and root cause tracing technique were adapted from [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent, licensed under MIT.

---

## [2.17.3] - 2026-01-29

### Removed
- **Stop hook**: Removed the Stop hook entirely — prompt-based hooks cannot access the file system (run `git diff`, read files), so the hook's code quality checks were fundamentally impossible and caused `JSON validation failed` errors on every session end. These checks are already handled elsewhere in the workflow (code review, security review phases).

---

## [2.17.2] - 2026-01-29

### Fixed
- **Stop hook JSON response format**: Rewrote Stop hook prompt to require valid JSON responses only (no markdown or extra text), preventing JSON validation errors that blocked session termination
- **SessionStart hook invalid fields**: Removed unsupported `matcher` and `description` fields from SessionStart hook entry — these fields are only valid for `PreToolUse`, `PostToolUse`, and `PermissionRequest` events

---

## [2.17.1] - 2026-01-29

### Fixed
- **Stop hook JSON validation error**: Removed invalid `matcher` and `description` fields from the Stop hook in `hooks/hooks.json`. The `matcher` field is only valid for `PreToolUse`, `PostToolUse`, and `PermissionRequest` events — Stop hooks fire unconditionally and don't support matchers. This caused "JSON validation failed" errors on every turn.

---

## [2.17.0] - 2026-01-28

### Added
- **Feature-to-Epic Mapping artifact** in `/epic-planning` (Step 11): After creating epics, appends a structured mapping table to the PRD file documenting which PRD sections and features belong to each epic, enabling downstream `/planning` to correctly scope tickets
- **Planning phase scope boundaries** in `architect-agent`: Mandatory scope rules, scope violation indicators, and pre-completion checklist items ensure the agent restricts ticket creation to the requested epic(s) only
- **Post-agent validation** in `/planning` command: After the architect-agent returns its report, the orchestrator validates scope compliance (epic scope check, parent ID check, ticket count sanity check, cross-epic distribution check) before creating tickets in Linear

### Changed
- **Planning command now rejects project IDs**: `/planning` no longer accepts `PROJ-*` identifiers; users must provide explicit epic IDs to ensure unambiguous scope
- **PRD filtering enforced** before passing to architect-agent: When a multi-epic PRD is provided alongside a single epic, the orchestrator extracts only the relevant PRD sections using the Feature-to-Epic Mapping (or manual filtering) before invoking the agent
- **Success criteria updated** with scope compliance checks in both the planning command and architect-agent, including verification that all tickets belong to requested epics and PRD was filtered to in-scope sections only

### Fixed
- **Planning command no longer creates tickets across multiple epics** when given a single epic ID with a multi-epic PRD: previously, the agent would create tickets for ALL epics described in the PRD instead of restricting to the one requested

---

## [2.16.0] - 2026-01-24

### Added
- **Context Budget Allocation for Epic Closure**: Explicit token limits (~4500 tokens total) prevent context window overflow when closing large epics
  - Epic description: 200 tokens (first 2 paragraphs)
  - Epic comments: 300 tokens (key decisions only)
  - Per-ticket summaries: 100 tokens each (max 3000 for 30 tickets)
  - Retrofit recommendations: 400 tokens
  - Downstream guidance: 400 tokens
  - CLAUDE.md updates: 200 tokens
- **Late Findings Detection**: New tracking system for issues discovered during epic closure
  - Severity classification: CRITICAL (blocks closure), HIGH (requires user decision), MEDIUM/LOW (proceed with documentation)
  - Late Findings table format in epic closure reports
  - Automatic closure blocking for CRITICAL findings (hardcoded secrets, security vulnerabilities, disabled security checks)
- **Report Validation Layer**: Validates epic-closure-agent output before posting to Linear
  - Required fields check: Status, Retrofit Analysis, Downstream Guidance, CLAUDE.md Updates
  - Retry-once logic for malformed responses
  - User decision prompt for persistent validation failures

### Changed
- **4-Tier Adaptive Scaling**: Replaced single 6-ticket threshold with comprehensive tier system
  - Small (1-6 tickets): Direct context gathering
  - Medium (7-15 tickets): 2-3 parallel batches, standard summarization (100 tokens/ticket)
  - Large (16-30 tickets): 4-6 batches, ultra-condensed summaries (50 tokens/ticket)
  - Very Large (31+ tickets): Phased execution (gather → retrofit → downstream → closure)
- **Truncation Priority Matrix**: Added explicit priority order for context overflow handling
  - PRESERVE: Status indicators, blocking issues, key decisions, retrofit recommendations
  - TRIM: Pattern explanations, testing details, historical context, lessons learned
- **ticket-context-agent Output Constraints**: Enforced token limits for subagent responses
  - Per-ticket summary: MAX 100 tokens (standard) or 50 tokens (ultra-condensed)
  - Batch summary: MAX 150 tokens
  - Structured table output format for efficient parsing
- **epic-closure-agent Late Findings Detection**: Added detection rules and severity classification for issues found during closure analysis

### Improved
- Epic closure now scales to 50+ ticket epics without context overflow
- Better traceability with Late Findings audit trail
- More reliable Linear posting with validation layer
- Consistent patterns with execute-ticket context management

---

## [2.15.0] - 2026-01-24

### Added
- **Deferred Items documentation section** for all agent reports
  - Structured table format for documenting bypassed low-priority issues
  - Includes: Severity, Location (file:line), Issue description, Reason for deferral
  - Preserved during context truncation (treated like Files Changed)
  - Posted to Linear for user traceability and future remediation

### Changed
- **Security agent LOW severity handling**: Now requires documentation in Deferred Items instead of "usually skip"
- **Confidence scoring**: Added 5-6/10 range for Deferred Items (previously undocumented)
- **Context budget extraction**: Updated to preserve Deferred Items tables during truncation
- **Truncation priority**: Now prioritizes Status > Files > Deferred Items > Summary > Details

### Improved
- All 7 ticket-level agents (architect, backend, frontend, QA, security, code-reviewer, technical-writer) now include Deferred Items in their report format
- Execute-ticket command documents Deferred Items handling with phase-specific examples
- Better traceability for issues found but intentionally not addressed during workflow

---

## [2.14.0] - 2026-01-23

### Changed
- **Agentic workflow is now the primary recommendation** - `/execute-ticket` positioned as the default approach for ticket-level work
- Documentation reorganized across all files to lead with agentic workflow
- Manual phase execution (adaptation, implementation, testing, etc.) now documented as "Individual Phases (Advanced)" for special cases
- Benefits messaging updated: 8x faster execution, zero human intervention for passing tickets, consistent quality, full traceability

### Added
- Git branch creation using Linear's `gitBranchName` field for consistent branch naming
- Automatic "In Progress" status update when `/execute-ticket` begins
- Existing branch and PR detection with intelligent resume capability
- Implementation artifact verification before commits
- Draft PR creation with automatic commit after implementation phase
- PR phase comments with progress indicators
- PR labels: `code-reviewed`, `security-approved`, `ready-for-merge`
- Draft-to-ready PR conversion when security review passes with no critical/high issues
- Report validation with auto-retry for malformed agent responses
- Strict context budget enforcement (~2000 tokens per agent invocation)

### Improved
- FAQ expanded with execute-ticket specific questions
- TECHNICAL_REFERENCE.md now includes full `/execute-ticket` command documentation
- PM_GUIDE.md simplified messaging: "one command does everything"
- GET_STARTED.md updated to recommend agentic workflow as starting point

---

## [2.13.0] - 2025-01-23

### Added
- Workflow phase isolation for all ticket-level agents
  - `WORKFLOW POSITION` markers clarify each agent's place in workflow
  - `Context Isolation` sections prevent session context contamination
  - `Phase Guardrails` provide explicit STOP instructions for wrong task types
- Imperative prompt structure in implementation command with `TASK:` header

### Changed
- All 9 ticket-level agents now have consistent phase boundary protections
- Implementation command uses action-oriented language (READ, IMPLEMENT, COMMIT, RETURN)

### Fixed
- Agent phase confusion where agents would act on session summaries instead of explicit tasks
- Context contamination where agents performed wrong-phase work (e.g., security reviews during implementation)

---

## [2.12.1] - 2026-01-23

### Added
- New `/execute-ticket` command for automated ticket workflow orchestration:
  - Executes all 6 ticket-level phases (adaptation → implementation → testing → documentation → codereview → security-review) automatically
  - Auto-detects resume state by parsing Linear comments for phase report headers
  - Pauses only for blocking issues requiring user decision
  - Supports blocking conditions per phase: BLOCKED status, compile errors, Gate failures, CHANGES_REQUESTED, CRITICAL/HIGH severity
  - Generates execution summary with metrics on completion
  - Closes ticket via security-review phase when all phases pass

### Improved
- Enhanced `/execute-ticket` orchestrator with robustness improvements:
  - Added report validation layer to catch malformed agent responses
  - Added context budget guidelines (~2000 tokens) to prevent overflow
  - Added 3-tier agent selection fallback with user prompts when unclear
  - Clarified testing gate terminology (Gate #0 for existing tests vs Gates #1-3 for new tests)
  - Added resume safety check to verify status within phase reports, not just headers
  - Expanded error handling section with recovery procedures
  - Added phase skip safety guide showing which phases are safe to skip

### Changed
- Updated README.md, QUICK_REFERENCE.md, and CLAUDE.md to document new `/execute-ticket` command

---

## [2.11.0] - 2026-01-11

### Added
- Codex agents directory with 10 agent persona templates for OpenAI Codex CLI:
  - architect-agent, backend-engineer-agent, frontend-engineer-agent
  - qa-engineer-agent, code-reviewer-agent, technical-writer-agent
  - security-engineer-agent, design-reviewer-agent, epic-closure-agent
  - ticket-context-agent
- Codex skills directory with 10 quality enforcement skills adapted for Codex:
  - production-code-standards, service-reuse, testing-philosophy
  - mvd-documentation, security-patterns, model-aware-behavior
  - using-pm-workflow, verify-implementation, divergent-exploration
  - epic-closure-validation
- `codex/AGENTS.md` - comprehensive agent usage guide for Codex
- `codex/SKILLS_REFERENCE.md` - skills by workflow phase mapping
- `codex/HOOKS_GUIDE.md` - manual alternatives to Claude Code hooks

### Changed
- Updated `codex/README.md` with new Codex Skills and Codex Agents sections

---

## [2.10.0] - 2025-01-11

### Added
- New reference files for progressive disclosure:
  - `skills/verify-implementation/examples/evidence-formats.md` - Evidence format templates
  - `skills/verify-implementation/references/speculation-red-flags.md` - Hedging language catalog
  - `skills/testing-philosophy/references/test-priority-guidelines.md` - Test prioritization guide
  - `skills/service-reuse/examples/inventory-search-session.md` - Complete search walkthrough
- Cross-references between related skills (production-code-standards, testing-philosophy, verify-implementation, service-reuse)
- Enhanced trigger phrases for better skill auto-activation:
  - Anti-workaround detection: "make it work", "quick fix", "temporary solution", "hack"
  - CI/pipeline triggers: "CI failing", "pipeline broken", "build red"
  - Deployment triggers: "ship it", "LGTM", "merge it", "deploy this"
  - DRY/reuse triggers: "avoid duplication", "DRY", "existing pattern"
  - Refactor triggers: "refactor", "redesign", "rearchitect", "migrate"

### Changed
- Restructured `verify-implementation` skill for progressive disclosure (1029 to 514 words in SKILL.md)
- Expanded `verification-checklist.md` with detailed checklists moved from SKILL.md
- Standardized all code blocks to TypeScript in `service-reuse` skill
- Updated imperative form: "Cannot write" to "Do not write" in testing-philosophy
- Extended file type support: added `.py`, `.go` patterns to relevant skills
- Extended directory patterns: added `domain/`, `shared/` to monitored paths

### Fixed
- Skills now properly follow progressive disclosure pattern (lean SKILL.md + detailed references)

---

## [2.9.0] - 2025-01-11

### Changed
- Improved all 10 skills based on plugin-dev:skill-reviewer methodology review
- Removed tangential "Word Substitutions" section from model-aware-behavior skill
- Removed duplicate "When Blocked" section from production-code-standards references
- Fixed second-person language violations in epic-closure-validation and service-reuse skills
- Converted first-person verification checklist to imperative form in model-aware-behavior

### Added
- Added `/close-epic` (Phase 11) to using-pm-workflow workflow overview and decision tree
- Added ADR template reference pointer to mvd-documentation skill
- Added verification checklist reference pointer to verify-implementation skill
- Created `references/scope-creep-patterns.md` for model-aware-behavior skill with anti-patterns and examples

---

## [2.8.0] - 2026-01-11

### Added
- **ticket-context-agent**: New agent for gathering and summarizing ticket context from Linear when processing large epics
- **Scalable Context Gathering**: `/close-epic` now spawns parallel `ticket-context-agent` instances for epics with 7+ tickets, preventing context exhaustion
- **Retrofit Ticket Creation**: `/close-epic` now automatically creates detailed Linear tickets for each retrofit recommendation with full specifications (context, implementation guidance, acceptance criteria)

### Changed
- **close-epic.md**: Added `mcp__linear-server__create_issue` to allowed-tools for retrofit ticket creation
- **close-epic.md**: Added threshold-based context gathering strategy (≤6 tickets: direct, 7+: parallel agents)
- **epic-closure-agent.md**: Retrofit recommendations now output ticket-ready specifications with full detail
- Updated agent count from 9 to 10 across documentation (AGENTS.md, CLAUDE.md)
- Updated TECHNICAL_REFERENCE.md with new `/close-epic` features and Ticket Context Agent section

---

## [2.7.3] - 2026-01-09

### Changed
- **hooks.json**: Removed aggressive `Write|Edit` PostToolUse hook that was blocking legitimate work
- Production code standards validation now occurs at session end (Stop hook) instead of every file write
- Stop hook provides consolidated end-of-session summary with code review notes for operator review
- Code review notes only check production paths (`src/`, `lib/`, `app/`, `services/`, `modules/`, `controllers/`)
- Explicitly skips: `scripts/`, `tests/`, `__tests__/`, `*.test.*`, `*.spec.*`, config files, documentation

### Fixed
- Hooks no longer block utility scripts, one-off tools, or non-production code
- Reduced false positives from overzealous workaround detection during active development

---

## [2.7.2] - 2026-01-07

### Fixed
- **epic-planning.md**: Added `mcp__linear-server__list_comments` to allowed-tools and explicit instructions to fetch both ticket body AND comments when loading discovery tickets
- **planning.md**: Added `mcp__linear-server__list_comments` to allowed-tools and comprehensive instructions to fetch both epic description AND comments throughout the workflow

### Changed
- All Linear-interacting commands now explicitly require fetching both issue body/description AND comments
- Comments often contain critical context like phase reports, discovery findings, and previous analysis
- Audit confirmed: 9/11 commands fully compliant, 2/11 not applicable (discovery creates tickets, generate-service-inventory scans codebase)

---

## [2.7.1] - 2026-01-06

### Fixed
- **AGENTS.md**: Completely rewritten - was containing coding style guidelines instead of agent documentation
- **README.md**: Fixed command count from "10 commands" to "11 commands"
- **TECHNICAL_REFERENCE.md**: Fixed skill count from "9 skills" to "10 skills" in platform comparison table
- **SKILLS.md**: Fixed filename casing (`skill.md` → `SKILL.md`) and phase breakdown accuracy
- **FAQ.md**: Fixed phase counts from "9 phases" and "10 phases" to "11 phases"
- **session-start.sh**: Added missing `epic-closure-validation` skill to the 10-skill list

### Changed
- Documentation consistency scrub ensuring all files accurately reflect: 9 agents, 10 skills, 11 commands

---

## [2.7.0] - 2026-01-06

### Added
- New `references/` directories for skills: verify-implementation, service-reuse, mvd-documentation
- New `examples/` directories for skills: production-code-standards, testing-philosophy, divergent-exploration
- Enhanced skill descriptions with specific user trigger phrases for better activation
- Distinct agent colors by category (green=implementation, cyan=review, blue=planning, yellow=quality, magenta=closure)

### Changed
- Renamed `security_review` to `security-review` for kebab-case consistency
- Renamed `generate_service_inventory` to `generate-service-inventory` for kebab-case consistency
- Updated 21+ documentation files with new command names
- Renamed `skills/epic-closure-validation/skill.md` to `SKILL.md` for consistency

### Fixed
- Plugin validation now passes with no naming inconsistencies

---

## [2.6.0] - 2026-01-06

### Added

**Epic Closure Command and Agent**

Introduced `/close-epic` command for formally closing completed epics with comprehensive analysis:

- **New Command**: `/close-epic <epic-id> [--skip-retrofit] [--skip-downstream]`
  - Six-phase closure workflow: Completion verification, retrofit analysis, downstream impact, documentation audit, CLAUDE.md updates, closure summary
  - Validates ALL sub-tickets are Done/Cancelled before allowing closure (blocking gate)
  - Extracts patterns worth propagating backward to existing code (retrofit analysis)
  - Propagates guidance to dependent epics (downstream impact)
  - Audits documentation coverage and proposes CLAUDE.md updates
  - Generates comprehensive closure report with lessons learned

- **New Agent**: `epic-closure-agent` (model: opus, color: gold)
  - Specialized for analyzing completed work and extracting actionable learnings
  - Follows orchestrator-agent pattern (no direct Linear access)
  - Skills: production-code-standards, verify-implementation, epic-closure-validation

- **New Skill**: `epic-closure-validation` (skill #10)
  - Auto-activates when closing epics
  - Blocks closure if any sub-ticket is incomplete
  - Validates no workarounds shipped and business value delivered

- **New Hook**: PostToolUse hook for `mcp__linear-server__update_issue`
  - Validates epic closure prerequisites when marking epics as Done
  - Prevents premature epic closure

**Workflow Enhancement**

- Added epic-level completion phase to workflow (phase 11)
- `/security-review` closes tickets, `/close-epic` closes epics
- Clear separation: ticket closure vs. epic closure

---

## [2.5.2] - 2026-01-06

### Changed

**Documentation Phase Auto-Converts Draft PRs**

Updated `/documentation` command to automatically convert draft PRs to "ready for review" without asking for user confirmation:

- Added new "Auto-Convert Draft PR to Ready for Review" section with bash commands
- Updated workflow step 15 to "PR State Change (AUTO)" with "DO NOT ask user, just do it"
- Updated "PR Status Updates" section to specify "AUTOMATIC DRAFT CONVERSION"
- Updated Success Criteria to reflect automatic PR state change

Documentation phase now moves PR from draft to ready for review when complete.

---

## [2.5.1] - 2026-01-06

### Changed

**Code Review Auto-Converts Draft PRs**

Updated `/codereview` command to automatically convert draft PRs to "ready for review" without asking for user confirmation:

- Added new "Auto-Convert Draft PR to Ready for Review" section with explicit automatic behavior
- Updated workflow step 16 to "PR State Change (AUTO)" with "DO NOT ask user, just do it"
- Updated "Moving PR from Draft to Ready for Review" section to reinforce automatic conversion
- Updated "PR Status Management" to specify "AUTOMATIC DRAFT CONVERSION"

Code review requires PRs to be ready for review, so this conversion is automatic and expected as part of the workflow.

---

## [2.5.0] - 2026-01-06

### Changed

**Orchestrator-Centric Pattern for Linear MCP Integration**

Implemented a major architectural change where commands handle ALL Linear I/O while agents operate as pure workers:

- **6 ticket-level commands updated** (adaptation, implementation, testing, documentation, codereview, security-review):
  - Fetch ticket details and comments BEFORE spawning agents
  - Embed ALL context into agent prompts
  - Write reports to Linear AFTER agents complete

- **8 agents converted to pure worker pattern**:
  - Removed Linear MCP tools from all agents
  - Added "Input: Context Provided by Orchestrator" section
  - Added "Output: Structured Report Required" section with standardized report format
  - Agents modified: architect, backend-engineer, frontend-engineer, qa-engineer, code-reviewer, technical-writer, security-engineer, design-reviewer

- **CLAUDE.md updated** with orchestrator-agent pattern documentation

### Removed

- Removed Linear MCP tools from all 8 agent definitions
- Removed unused `list_comments` from planning commands (epic-planning, planning retained tools for ticket CREATION only)

---

## [2.4.4] - 2026-01-06

### Fixed

**Security Review Command Shell Substitution Error**

Fixed error where `/security-review` command failed with "Command contains $() command substitution" due to Claude Code's security model blocking shell substitution patterns.

- Removed complex `$()` command substitution patterns from shell commands
- Replaced dynamic default branch detection with simple `origin/HEAD` reference
- Git automatically resolves `origin/HEAD` to the default branch
- Simplified from 4 complex shell commands to 3 simple git commands

---

## [2.4.3] - 2026-01-06

### Changed

**Conditional Linear MCP Integration**

Made Linear MCP integration conditional on ticket ID to preserve agent utility outside the workflow:

- **All 8 agents** updated with conditional ticket handling:
  - Linear MCP first/last actions now only mandatory **when a ticket ID is provided**
  - Added fallback: "If NO ticket ID is provided: You may work without Linear integration"
  - Tools remain documented and available for optional use
  - Agents can now be invoked for general work without requiring Linear tickets

- **Agents modified**: architect, backend-engineer, frontend-engineer, qa-engineer, code-reviewer, technical-writer, security-engineer, design-reviewer

---

## [2.4.2] - 2026-01-06

### Added

**Comprehensive Linear MCP Integration for Agents and Commands**

Fixed critical issue where agents were not using Linear MCP tools to read tickets before work or update tickets after completion. Agents were looking for shell scripts/APIs instead of understanding MCP tool invocation.

- **All 8 agents** now have standardized "🔗 CRITICAL: Linear MCP Integration" section including:
  - Clear explanation that these are MCP tools, NOT shell commands or APIs
  - Table of available Linear MCP tools with descriptions
  - **MANDATORY First Action**: Read ticket and comments before any work
  - **MANDATORY Last Action**: Add completion summary comment before finishing
  - Explicit reminder to invoke tools directly

- **All 6 ticket-level commands** now have three-step orchestration:
  - **Step 1: Pre-Agent Context Gathering** - Orchestrator reads ticket/comments BEFORE invoking agent
  - **Step 2: Agent Invocation** - Pass ticket context to agent in prompt
  - **Step 3: Post-Agent Verification** - Verify agent added completion comment

- **Commands updated**: adaptation, implementation, testing, documentation, codereview, security-review

---

## [2.4.1] - 2026-01-05

### Fixed

**Linear MCP Tool Integration**

Fixed issues with agents not properly using Linear MCP tools. Agents were looking for shell scripts/commands instead of invoking MCP tools directly.

- **Agent frontmatter updated** (8 agents): Added missing Linear MCP tools to `tools:` field
  - `architect-agent`: Added `mcp__linear-server__get_issue`, `mcp__linear-server__list_comments`, `mcp__linear-server__list_issues`
  - All other agents: Added `mcp__linear-server__list_comments`
  - `design-reviewer-agent`: Added full Linear MCP tool set

- **Command syntax fixes**:
  - `epic-planning.md`: Removed non-existent milestone MCP functions, switched to label-based phase tracking
  - `planning.md`: Removed milestone functions, fixed JavaScript pseudocode to proper MCP tool instructions
  - `discovery.md`, `security-review.md`: Changed shell-like comments to markdown format
  - `epic-planning.md`: Added explicit "Using Linear MCP" section with proper tool invocation examples

---

## [2.4.0] - 2026-01-05

### Changed

**Improved Skill Trigger Specificity**

Updated all 9 skill descriptions with more explicit activation triggers based on Claude Code best practices research. Skills now use structured format with categorized triggers:

- **Skills updated**: `production-code-standards`, `service-reuse`, `testing-philosophy`, `mvd-documentation`, `security-patterns`, `model-aware-behavior`, `using-pm-workflow`, `verify-implementation`, `divergent-exploration`

- **New description format**:
  - Lead with purpose (what skill enforces)
  - Explicit "ACTIVATE when:" section with categorized triggers
  - User phrases, file patterns, tool usage, and context cues
  - Clear "ENFORCES/BLOCKS/REQUIRES" summary

**Mandatory Agent Invocation in Commands**

Added explicit mandatory language to all 8 workflow commands requiring agent invocation via Task tool:

- **Commands updated**: `discovery`, `planning`, `adaptation`, `implementation`, `testing`, `documentation`, `codereview`, `security-review`

- **New section added** (after frontmatter): "MANDATORY: Agent Invocation Required"
  - Bold statement: "You MUST use the Task tool to invoke the [agent-name]"
  - Numbered steps for required process
  - Clear prohibition: "DO NOT attempt to perform [work] directly"

- **Agent mapping**:
  - `discovery`, `planning`, `adaptation` → `architect-agent`
  - `implementation` → `backend-engineer-agent` / `frontend-engineer-agent`
  - `testing` → `qa-engineer-agent`
  - `documentation` → `technical-writer-agent`
  - `codereview` → `code-reviewer-agent`
  - `security-review` → `security-engineer-agent`

---

## [2.3.2] - 2026-01-05

### Fixed

**Security Review Git Reference Bug**

Fixed `origin/HEAD` reference error in `/security-review` command that occurred in repositories where `origin/HEAD` symbolic reference is not configured (e.g., locally initialized repos with manually added remotes).

- **Commands updated**:
  - `commands/security-review.md`: Dynamic default branch detection with fallback chain
  - `codex/prompts/security-review.md`: Same fix for platform-agnostic version

- **Fix details**:
  - Uses `git symbolic-ref` first (fastest when available)
  - Falls back to `git remote show origin` (works on any repo)
  - Final fallback to `main` if detection fails
  - Added graceful error handling with fallback to `HEAD~5` for diff/log commands

---

## [2.3.1] - 2026-01-05

### Fixed

**Discovery Reference Standardization**

Updated commands and documentation to consistently reference Linear discovery tickets as the primary workflow:

- **Commands updated**:
  - `/epic-planning`: Clarified discovery argument accepts ticket ID (e.g., `DISC-001`) or markdown file path
  - `/planning`: Updated `--discovery` flag description and examples to show ticket IDs as primary
  - `/adaptation`: Updated argument hint and examples to use discovery ticket IDs

- **Documentation updated**:
  - PM_GUIDE.md: Fixed 3 references to use discovery ticket IDs instead of markdown files
  - QUICK_REFERENCE.md: Updated example commands to use `DISC-001` format
  - FAQ.md: Fixed 2 example references
  - TECHNICAL_REFERENCE.md: Updated usage syntax and examples for epic-planning and planning

The `/discovery` command creates a Linear ticket as its artifact, so downstream commands should reference that ticket ID by default. Markdown file paths remain supported as an alternative.

---

## [2.3.0] - 2026-01-02

### Changed

**Agent Quality Improvements**

- Added `color` field to all 7 agents for visual identification in UI:
  - architect-agent → blue, backend-engineer → green, frontend-engineer → purple
  - code-reviewer → yellow, qa-engineer → cyan, security-engineer → red, technical-writer → teal
- Added `service-reuse` skill to code-reviewer-agent
- Added `production-code-standards` skill to technical-writer-agent
- Fixed naming inconsistency: "security-master agent" → "security-engineer-agent" in example blocks
- Added pre-completion checklists to backend-engineer, frontend-engineer, and technical-writer agents

**Command Description Optimization**

- Shortened verbose command descriptions for better display:
  - codereview.md: 165 → 96 characters
  - adaptation.md: 198 → 85 characters

**Skill Trigger Improvements**

- Broadened trigger phrases in 4 skills for better auto-activation:
  - `using-pm-workflow`: Added "what command is next", "where am I in the workflow", "project setup", etc.
  - `security-patterns`: Added "encryption", "XSS", "CSRF", "SQL injection", "JWT tokens", etc.
  - `model-aware-behavior`: Added "understanding the codebase", "scope creep", "before implementing", etc.
  - `divergent-exploration`: Added "brainstorming", "trade-offs analysis", "pros and cons", etc.
- Added inline examples to model-aware-behavior and using-pm-workflow skills

**Hooks Refactoring**

- Changed PreToolUse → PostToolUse hook (validates after file changes, reduces noise)
- Added `description` field to all hook configurations for better discoverability
- Made Stop hook conditional (only reminds about Linear when workflow commands were used)

---

## [2.2.0] - 2026-01-02

### Changed

**Skill Descriptions Improved**

All 9 skills have been updated with improved descriptions following plugin-dev best practices:

- Descriptions now lead with purpose, not activation conditions
- Use third-person voice consistently ("This skill enforces..." not "Activate when...")
- Include specific trigger phrases in quotes for better auto-activation
- Reduced verbosity (under 70 words each)
- Removed redundant "Activation context" sections that duplicated frontmatter

Skills updated:
- `production-code-standards` - Enforces production-grade code quality
- `service-reuse` - Prevents code duplication
- `testing-philosophy` - Enforces accuracy-first testing
- `mvd-documentation` - Enforces minimal viable documentation
- `security-patterns` - Applies OWASP Top 10 patterns
- `model-aware-behavior` - Optimizes Claude Code behavior
- `using-pm-workflow` - Guides workflow phase navigation
- `verification-before-completion` - Requires verification before task completion
- `divergent-exploration` - Encourages exploring alternatives

**Agent Model Selection**

- `code-reviewer-agent`: Changed from `sonnet` to `opus` model for deeper code quality analysis

### Added

**Enhanced Hooks**

Added two new prompt-based hooks to `hooks/hooks.json`:

- **PreToolUse hook** (Write|Edit matcher): Reminds to follow production code standards before writing code
- **Stop hook**: Reminds users to update Linear ticket status when session involved implementation work

**Marketplace Metadata**

Enhanced `.claude-plugin/marketplace.json` for better discoverability:

- Added `tags`: pm, workflow, linear, planning, security, code-review, documentation, testing, epic-planning, tdd
- Added `featuredCommand`: discovery
- Added `highlights` describing key features:
  - Complete PM-to-production workflow with 10 structured phases
  - Linear integration for seamless ticket management
  - Security review as final quality gate
  - 9 auto-activating quality enforcement skills

---

## [2.1.0] - 2026-01-02

### Added

**Plugin-Based Installation**

This release introduces simplified plugin-based installation for Claude Code users:

- **Marketplace installation**: Add marketplace and install plugin (see README)
- Automatically installs all commands, agents, skills, and hooks
- No manual file copying or directory setup required

### Changed

**Documentation Overhaul**

Updated all documentation to reflect the new plugin installation method:

- README.md: New installation section with plugin commands
- docs/INSTALLATION.md: Completely rewritten for plugin-first approach
- docs/SETUP_GUIDE.md: Simplified setup instructions
- GET_STARTED.md: Updated prerequisites and checklists
- PM_GUIDE.md: Updated prerequisites section
- FAQ.md: Updated installation Q&A
- TECHNICAL_REFERENCE.md: Updated platform comparison table
- docs/TROUBLESHOOTING.md: Updated troubleshooting for plugin-based installation
- QUICK_REFERENCE.md: Version bump to 2.1.0

### Removed

**Legacy Installation Instructions**

- Removed manual `mkdir ~/.claude/commands` instructions
- Removed `cp commands/*.md ~/.claude/commands/` steps
- Removed manual agent and skill copying instructions
- Removed global vs. local installation complexity for Claude Code users

### Migration Guide

If upgrading from 2.0.0:

1. **No action required for existing installations** - Your current setup continues to work
2. **For new installations**: Install from marketplace instead of manual copying (see README)
3. **To switch to plugin**: You can optionally remove manual installations and use the plugin instead:
   ```bash
   rm -rf ~/.claude/commands/*.md ~/.claude/agents/*.md ~/.claude/skills/*
   /plugin marketplace add bdouble/pm-vibecode-ops
   /plugin install pm-vibecode-ops@pm-vibecode-ops
   ```

---

## [2.0.0] - 2026-01-02

### Breaking Changes

**Repository Structure Refactoring**

This release restructures the repository to follow Claude Code plugin conventions:

- **Removed `commands-worktrees/` directory** - Worktree mode has been deprecated. The workflow now uses standard git branches only. All worktree-related documentation has been removed.
- **Moved components from `claude/` to root level**:
  - `claude/commands/` → `commands/`
  - `claude/agents/` → `agents/`
  - `claude/skills/` → `skills/`
- **Agent files renamed from snake_case to kebab-case**:
  - `architect_agent.md` → `architect-agent.md`
  - `backend_engineer_agent.md` → `backend-engineer-agent.md`
  - `code_reviewer_agent.md` → `code-reviewer-agent.md`
  - `design_reviewer_agent.md` → `design-reviewer-agent.md`
  - `frontend_engineer_agent.md` → `frontend-engineer-agent.md`
  - `qa_engineer_agent.md` → `qa-engineer-agent.md`
  - `security_engineer_agent.md` → `security-engineer-agent.md`
  - `technical_writer_agent.md` → `technical-writer-agent.md`

### Added

**Plugin Architecture**

- Added `.claude-plugin/plugin.json` manifest file for Claude Code plugin system
- Added `hooks/hooks.json` for event-triggered automation
- Added `scripts/session-start.sh` for session initialization with workflow context
- Added `marketplace.json` for plugin marketplace configuration

**Three New Skills (9 total)**

- **using-pm-workflow** - Guides users through workflow phases correctly, ensures proper command sequencing
- **verify-implementation** - Requires verification of work before marking tasks complete
- **divergent-exploration** - Encourages exploring alternative approaches before converging on a solution

**Enhanced Agent Definitions**

- All agents now include `model` field for recommended model selection
- All agents now include `skills` field listing required skills for the agent role
- Optimized agent descriptions for better activation triggers

**Enhanced Command Definitions**

- All commands now include "Required Skills" sections documenting which skills activate
- Improved command descriptions for better discoverability

### Changed

**Documentation Updates**

- Updated all documentation to reflect new directory structure
- Removed all worktree mode references and documentation
- Updated version badges to 2.0.0
- Updated repository structure diagrams
- Simplified platform comparison (removed worktree mode column)

**Skills Refactoring**

- Refactored all 6 existing skills with optimized descriptions
- Skills now follow Claude Code plugin skill conventions

### Removed

- `commands-worktrees/` directory and all worktree mode commands
- `docs/WORKTREE_GUIDE.md`
- `docs/WORKTREE_MIGRATION_GUIDE.md`
- All worktree-related sections from documentation files

### Migration Guide

If upgrading from 1.x:

1. **Update installation paths**: Change `claude/commands/` to `commands/`, etc.
2. **Update agent references**: Use kebab-case names (e.g., `architect-agent` not `architect_agent`)
3. **Remove worktree commands**: If you were using worktree mode, switch to standard branch workflow
4. **Re-install skills**: Skills directory structure has changed

---

## [1.1.1] - 2025-11-26

### Fixed

**Workflow Timing Documentation**

- Corrected project-level command timing guidance across README.md, QUICK_REFERENCE.md, and TECHNICAL_REFERENCE.md
- Previously stated these commands run "once per project" which was incorrect
- Now accurately documents recurring usage:
  - `/generate-service-inventory` - Run after major codebase updates
  - `/discovery` - Run before each epic planning phase
  - `/epic-planning` - Run for each new feature, PRD, or major initiative
  - `/planning` - Run for each new epic
- Aligns with existing correct guidance in PM_GUIDE.md and GLOSSARY.md

### Added

**Model-Aware Behavior Skill**

- New `model-aware-behavior` auto-activated skill based on Anthropic's [Opus 4.5 migration guidance](https://github.com/anthropics/claude-code/tree/main/plugins/claude-opus-4-5-migration/skills/claude-opus-4-5-migration)
- Enforces code exploration before proposing changes (addresses Opus 4.5's conservative exploration tendency)
- Scope control to prevent over-engineering (addresses Opus 4.5's tendency to create extra abstractions)
- Word substitutions for thinking sensitivity when extended thinking is disabled
- Parallel tool execution optimization

**Model Recommendations Documentation**

- Added "Model Recommendations" section to README.md with phase-by-phase guidance
- Opus 4.5 recommended as primary model for deep reasoning capabilities
- Explicit warning against Haiku 4.5 (cannot maintain context across complex operations)
- Cross-referenced in GET_STARTED.md for new user visibility

**Code Exploration Requirements**

- Added code exploration sections to `adaptation.md` and `implementation.md` commands
- Reinforces "read before proposing" behavior across workflow phases

---

## [1.1.0] - 2025-11-26

### Added

**Auto-Activated Quality Enforcement Skills**

Introduced 5 new skills that automatically activate during development to enforce standards and prevent issues before they occur. Skills shift enforcement LEFT—catching problems during creation rather than at review phases.

**New Skills:**

- **production-code-standards** - Blocks workarounds, temporary solutions, fallback logic hiding errors, TODO/FIXME/HACK comments, mocked services in production code, and silent error suppression. Activates when writing code in src/, lib/, app/ directories.

- **service-reuse** - Enforces checking service inventory before creating new services, utilities, or helpers. Prevents code duplication by mandating reuse of existing authentication, validation, and data access patterns.

- **testing-philosophy** - Requires fixing existing broken tests BEFORE writing new tests. Enforces accuracy-first testing: accurate tests that run > high coverage with broken tests.

- **mvd-documentation** - Enforces Minimal Viable Documentation standards. Documents the "why" not the "what"—TypeScript already shows the "what". Requires documentation for security-sensitive code.

- **security-patterns** - Enforces OWASP Top 10 patterns during development. Covers: broken access control, cryptographic failures, injection, insecure design, misconfiguration, vulnerable components, authentication failures, data integrity, logging failures, and SSRF.

**New Documentation:**

- `SKILLS.md` - Comprehensive guide explaining skills vs commands vs agents, installation instructions, and how to create custom skills

**Skill Design:**

- All skills follow skill-creator best practices with concise frontmatter triggers
- Workflow overviews at the start of each skill for clear enforcement steps
- BLOCK/REQUIRE labeling for prohibited vs required patterns
- Code examples demonstrating correct and incorrect approaches

### Benefits

**For Developers:**
- Proactive issue prevention during coding (not just at review time)
- Clear guidance on prohibited patterns with working alternatives
- Consistent enforcement of production-ready standards
- Security patterns applied automatically when writing sensitive code

**For Code Quality:**
- Reduced code review cycles (fewer issues to catch)
- Consistent application of OWASP security standards
- Enforced service reuse preventing duplicate implementations
- Test accuracy prioritized over coverage metrics

**Workflow Integration:**
```
Traditional:
  /implementation → code with issues → /codereview catches issues → fix

With Skills:
  /implementation → skill prevents issues → /codereview (fewer issues)
```

## [1.0.3] - 2025-11-22

### Changed

**Major Installation Documentation Overhaul**
- Updated all installation and setup documentation to reference official sources
- Removed outdated manual API key setup instructions across all platforms
- Aligned documentation with official installation guides for better accuracy

**Claude Code Installation (docs/SETUP_GUIDE.md, docs/INSTALLATION.md)**
- Removed manual ANTHROPIC_API_KEY setup (authentication now automatic via OAuth)
- Added official installation guide reference: https://code.claude.com/docs/en/setup
- Updated to native installation methods (Homebrew, install scripts, NPM as alternative)
- Clarified authentication options (Console, App, Enterprise platforms)
- Updated troubleshooting sections for OAuth-based authentication

**OpenAI Codex Installation (docs/SETUP_GUIDE.md, docs/INSTALLATION.md, FAQ.md, codex/README.md)**
- Removed incorrect OPENAI_API_KEY environment variable setup
- Updated installation command to official: `npm i -g @openai/codex`
- Added official documentation links: https://developers.openai.com/codex/cli
- Clarified authentication requires ChatGPT Plus/Pro/Business/Edu/Enterprise subscription
- Added verification and first-run authentication steps

**Linear MCP Setup (docs/MCP_SETUP.md, docs/INSTALLATION.md, docs/TROUBLESHOOTING.md, GLOSSARY.md)**
- **Critical correction**: Linear MCP uses OAuth 2.1 authentication, not API keys
- Replaced API key setup with official OAuth browser flow
- Updated to official remote server: https://mcp.linear.app/mcp
- Removed LINEAR_API_KEY environment variable requirements
- Changed installation to remote transport method
- Updated server name from `linear` to `linear-server`
- Simplified setup process (no npm install or env vars needed)
- Added official documentation: https://linear.app/docs/mcp

**Sequential Thinking MCP (docs/MCP_SETUP.md)**
- Added prominent link to official Anthropic documentation
- Added Docker installation method (previously missing)
- Enhanced installation section with clearer structure (NPX vs Docker)
- Added Docker configuration examples for Claude Desktop
- Improved manual configuration with labeled sections
- Official documentation: https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking

**Playwright MCP (docs/MCP_SETUP.md)**
- Updated to official Microsoft package: `@playwright/mcp`
- Added official documentation: https://github.com/microsoft/playwright-mcp
- Added Node.js 18+ requirement (official prerequisite)
- Removed non-standard `--isolated` flag (not in official docs)
- Added VS Code CLI installation method (`code --add-mcp`)
- Added Cursor IDE installation instructions
- Documented official command-line options (`--browser`, `--caps`, `--allowed-hosts`, `--cdp-endpoint`)
- Added multi-browser support documentation (Chrome, Firefox, WebKit, Edge)

**Perplexity MCP (docs/MCP_SETUP.md, GLOSSARY.md, FAQ.md, docs/INSTALLATION.md)**
- Added official documentation: https://docs.perplexity.ai/guides/mcp-server
- Documented all four Perplexity tools (search, ask, research, reason)
- Added one-click installation method for Cursor/VS Code
- Updated Quick Reference table with complete capabilities
- Confirmed `@perplexity-ai/mcp-server` package and PERPLEXITY_API_KEY requirement

### Fixed

**Troubleshooting Documentation (docs/TROUBLESHOOTING.md)**
- Removed ANTHROPIC_API_KEY from diagnostic commands
- Updated to show only MCP-specific environment variables
- Rewrote Linear MCP troubleshooting for OAuth authentication
- Added OAuth auth cache clearing instructions

**Glossary Updates (GLOSSARY.md)**
- Updated API Key definition to clarify Linear uses OAuth, not API keys
- Changed examples from ANTHROPIC_API_KEY to LINEAR_API_KEY
- Added official documentation links for all MCP servers

### Benefits

**For Users:**
- Accurate installation instructions matching official sources
- Simpler setup processes (OAuth vs manual API keys where applicable)
- Direct access to official documentation for troubleshooting
- Clear authentication requirements for each platform
- Consistent documentation style across all platforms

**For Maintainability:**
- Single source of truth (official documentation)
- Reduced custom/undocumented configuration
- Better alignment with platform updates
- Clear separation between platforms requiring API keys vs OAuth

**Authentication Summary:**
- Claude Code: OAuth via Console/App/Enterprise (no manual API key)
- OpenAI Codex: ChatGPT subscription (automatic authentication)
- Linear MCP: OAuth 2.1 (no manual API key)
- Perplexity MCP: Requires PERPLEXITY_API_KEY
- Sequential Thinking MCP: None (runs locally)
- Playwright MCP: None (runs locally)

## [1.0.2] - 2025-11-22

### Changed

**Major Documentation Restructure (Minto Pyramid Principle)**
- Refactored all documentation to follow Minto Pyramid Principle: answer first, supporting points, details via links
- Clear separation of concerns across documentation files
- Improved navigation for different user personas (non-technical PMs vs. technical users)

**README.md: Transformed to Value-Oriented Overview**
- Reduced from 1,091 lines to 207 lines (-81% reduction)
- Now focuses on value proposition and orientation rather than technical details
- Follows Minto Pyramid structure: what/why → who/benefits → how (high-level) → links
- Clear "Realistic Expectations" section for appropriate use cases
- Removed redundant installation and command details (moved to dedicated files)

### Added

**TECHNICAL_REFERENCE.md: New Complete Technical Documentation**
- 800+ lines of comprehensive technical reference
- Complete command documentation for all 10 workflow commands
- Detailed agent specifications for all 8 specialized agents
- Git worktree architecture and lifecycle documentation
- Platform comparison table (Claude Code Simple/Worktree/Codex)
- Repository structure and best practices
- Extracted from old README for users needing detailed technical information

**docs/INSTALLATION.md: New Comprehensive Installation Guide**
- 400+ lines covering all platforms and modes
- Prerequisites checklist with links
- Step-by-step Claude Code installation (Simple and Worktree modes)
- OpenAI Codex installation instructions
- Global vs. local installation guidance
- Verification procedures
- MCP configuration overview with links
- Platform-specific notes (macOS, Linux, Windows/WSL)
- Troubleshooting common installation issues
- Advanced configuration (multiple projects, mode switching)

### Improved

**GET_STARTED.md: Updated Navigation**
- Updated documentation map to reference new TECHNICAL_REFERENCE.md
- Added INSTALLATION.md to setup & configuration section
- Updated quick reference table with new file locations
- All links verified and updated to new structure

**Documentation Organization**
- Clear audience segmentation: non-technical PMs → README/PM_GUIDE, technical users → TECHNICAL_REFERENCE
- Eliminated redundancy across files (no duplicate content)
- Better navigation paths based on user goals
- Consistent cross-referencing between related documents

### Technical Details

**Statistics:**
- README.md: -884 net lines (1,091 → 207)
- TECHNICAL_REFERENCE.md: +800 lines (new)
- docs/INSTALLATION.md: +400 lines (new)
- GET_STARTED.md: +24 insertions, -24 deletions (link updates)
- Total: +1,365 insertions, -1,009 deletions (+356 net across better-organized files)

**Benefits:**
- 81% reduction in README length improves first-time user experience
- Clear separation of concerns reduces cognitive load
- Minto Pyramid structure delivers value proposition immediately
- Technical users find detailed reference without PM-focused narrative
- Installation completely separated from conceptual understanding
- Better SEO and discoverability through focused document purposes

## [1.0.1] - 2025-11-21

### Added

**Role Personas for All Commands**
- Added explicit role definitions to all Claude commands (Simple Mode and Worktree Mode)
- Each command now starts with clear persona context (e.g., "You are acting as the **Architect**...")
- Improves AI understanding of expectations and responsibilities for each workflow phase
- Personas include: Architect, Implementation Engineer, QA Engineer, Technical Writer, Senior Code Reviewer, Security Engineer, Technical Planning Architect, Product-Focused Epic Planner

**Context Window Best Practices Documentation**
- Added prominent guidance across all 9 documentation files emphasizing fresh context windows
- Non-technical guidance in PM_GUIDE.md and GET_STARTED.md for Product Managers
- Technical guidance in README.md, EXAMPLES.md, and FAQ.md with workflow examples
- Platform-specific guidance in codex/README.md and both Claude command directories
- Key benefits: Prevents context overflow, avoids cross-phase pollution, ensures optimal performance
- Updated examples to show session resets between workflow phases

**New Documentation Files**
- `codex/README.md` - Comprehensive 195-line usage guide for OpenAI Codex users
- Platform-agnostic prompt usage patterns and best practices

### Changed

**Codex Prompts Streamlined (607 lines removed)**
- Removed complex worktree-specific bash scripts from all codex prompts
- Simplified to "Simple Mode" with standard git branch workflows
- Reduced prompt length by 15-20% for better focus and performance
- Clarified Linear MCP tool usage patterns with explicit `mcp__linear-server__*` references
- All prompts now include role personas for consistency with Claude commands
- Improved alignment with OpenAI Codex best practices (shorter, clearer, action-oriented)

**Files affected:**
- `codex/prompts/adaptation.md` - Removed 162 lines of worktree management code
- `codex/prompts/implementation.md` - Removed 132 lines
- `codex/prompts/generate-service-inventory.md` - Removed 116 lines
- `codex/prompts/security-review.md` - Removed 112 lines
- `codex/prompts/testing.md` - Removed 86 lines
- `codex/prompts/codereview.md` - Removed 75 lines
- `codex/prompts/documentation.md` - Removed 52 lines
- All codex prompts now include "Repository and Branch Context (Simple Mode)" sections

### Improved

**Documentation Consistency**
- All commands across both modes (Simple and Worktree) now have identical role personas
- Consistent messaging about context window management across all documentation
- Better platform comparison and guidance in README.md
- Enhanced SETUP_GUIDE.md with context window best practices

**Code Quality**
- Removed AGENTS.md from repository (internal artifact, now gitignored)
- CLAUDE.md already gitignored (internal configuration)
- Cleaner repository focused on workflow methodology

### Technical Details

**Statistics:**
- 9 documentation files updated with context window guidance (+189 lines)
- 18 Claude command files updated with role personas (+36 lines total)
- 9 Codex prompt files streamlined (-607 lines, +9 lines personas = -598 net)
- 2 new documentation files created (codex/README.md, AGENTS.md removed)
- Net change: +227 insertions, -616 deletions across both commits

**Benefits:**
- Improved AI context and role clarity (15-20% better according to prompt engineering research)
- Reduced complexity in codex prompts for better cross-platform compatibility
- Enhanced user guidance preventing common context window issues
- Maintained all quality gates, security standards, and workflow integrity

## [1.0.0] - 2025-11-21

### Initial Public Release

PM Vibe Code Operations is a complete workflow system enabling Product Managers to orchestrate AI coding agents for production-quality software development.

### Core Workflow Commands

**Project-Level Commands:**
- `/generate-service-inventory` - Catalog existing services to prevent duplication
- `/discovery` - Analyze codebase patterns and architecture
- `/epic-planning` - Transform PRDs into business-focused epics with duplicate prevention
- `/planning` - Technical decomposition of epics into actionable tickets

**Ticket-Level Commands:**
- `/adaptation` - Create implementation guides with service reuse analysis
- `/implementation` - AI-powered code generation following adaptation guides
- `/testing` - QA agent builds comprehensive test suites (90%+ coverage target)
- `/documentation` - Technical writer agent generates API docs and guides
- `/codereview` - Automated code quality and pattern compliance review
- `/security-review` - OWASP Top 10 vulnerability assessment (final gate, closes tickets)

### Workflow Mode

- Standard git branches, one ticket at a time
  - Commands in `commands/`
  - Best for most users

### Specialized Agents

Eight expert agents with 2025 best practices:
- **Architect Agent** - System architecture, discovery, and technical planning
- **Backend Engineer Agent** - Server-side implementation with security focus
- **Frontend Engineer Agent** - UI implementation with accessibility compliance
- **QA Engineer Agent** - Test strategy and implementation with coverage thresholds
- **Code Reviewer Agent** - Code quality assessment with explicit approval criteria
- **Security Engineer Agent** - OWASP 2021 vulnerability assessment and threat modeling
- **Technical Writer Agent** - Documentation generation
- **Design Reviewer Agent** - UI/UX validation

All agents include:
- Structured deliverable formats
- Pre-completion checklists
- Production-ready code standards (no workarounds)

### Documentation

**For Non-Technical PMs:**
- `PM_GUIDE.md` - Complete workflow guide with realistic expectations
- `GET_STARTED.md` - Navigation and quick start guide
- `EXAMPLES.md` - Illustrative scenarios demonstrating the workflow
- `FAQ.md` - 50+ questions answered including setup guidance
- `GLOSSARY.md` - Technical terms explained for PMs
- `QUICK_REFERENCE.md` - One-page printable cheat sheet

**Setup & Configuration:**
- `docs/SETUP_GUIDE.md` - Complete beginner installation (terminal basics to workflow)
- `docs/MCP_SETUP.md` - MCP server configuration (Linear, Perplexity, Sequential Thinking)
- `docs/TROUBLESHOOTING.md` - Quick-reference problem solving

**Technical Reference:**
- `README.md` - Complete technical reference with workflow diagrams
- `TECHNICAL_REFERENCE.md` - Detailed command and agent documentation
- `CONTRIBUTING.md` - Contribution guidelines

### Platform Support

- `commands/`, `agents/`, `skills/` - Claude Code optimized components
- `codex/` - Platform-agnostic prompts (OpenAI Codex compatible)

### Quality Standards

- Production-ready code requirements (no TODOs, no workarounds, no fallbacks)
- 90%+ test coverage targets with prioritized testing guidance
- OWASP Top 10 2021 security compliance
- Severity classification for security findings
- Pre-flight checks on critical commands

### Integrations

**Required:**
- Linear MCP - Ticket management and workflow tracking

**Recommended:**
- Perplexity MCP - Web research during discovery
- Sequential Thinking MCP - Enhanced reasoning for complex problems

**Optional:**
- Playwright MCP - Browser automation for E2E testing
- GitHub CLI - PR management

### Security

- Security review as final quality gate before ticket closure
- OWASP Top 10 2021 vulnerability assessment
- CVE database checking for framework vulnerabilities
- Clear severity classification (Critical/High/Medium/Low)
- Automated security fix implementation

---

## Future Releases

This changelog will be updated with each new release. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.

---

[2.17.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.17.2
[2.17.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.17.1
[2.17.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.17.0
[2.16.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.16.0
[2.15.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.15.0
[2.14.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.14.0
[2.13.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.13.0
[3.0.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v3.0.0
[2.26.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.26.0
[2.25.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.25.0
[2.24.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.24.1
[2.24.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.24.0
[2.23.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.23.0
[2.22.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.22.0
[2.21.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.21.0
[2.20.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.20.0
[2.19.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.19.0
[2.18.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.18.0
[2.17.3]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.17.3
[2.12.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.12.1
[2.11.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.11.0
[2.10.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.10.0
[2.9.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.9.0
[2.8.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.8.0
[2.7.3]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.7.3
[2.7.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.7.2
[2.7.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.7.1
[2.7.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.7.0
[2.6.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.6.0
[2.5.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.5.2
[2.5.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.5.1
[2.5.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.5.0
[2.4.4]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.4
[2.4.3]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.3
[2.4.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.2
[2.4.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.1
[2.4.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.4.0
[2.3.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.3.2
[2.3.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.3.1
[3.2.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v3.2.0
[3.1.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v3.1.1
[3.1.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v3.1.0
[2.3.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.3.0
[2.2.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.2.0
[2.1.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.1.0
[2.0.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v2.0.0
[1.1.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.1.1
[1.1.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.1.0
[1.0.3]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.0.3
[1.0.2]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.0.2
[1.0.1]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.0.1
[1.0.0]: https://github.com/bdouble/pm-vibecode-ops/releases/tag/v1.0.0
