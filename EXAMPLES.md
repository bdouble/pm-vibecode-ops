# Example Scenarios: PM Vibe Code in Action

## About These Examples

These are **illustrative scenarios** designed to demonstrate how the workflow operates in practice. They represent realistic use cases and outcomes based on the workflow's capabilities, but are not documentation of specific production deployments.

**What these examples show:**
- How commands flow from discovery to deployment
- Realistic timelines and outcomes
- Common patterns and lessons learned
- Metrics you can expect to achieve

**Use these to:**
- Understand how each workflow phase connects
- Set realistic expectations for your first features
- Learn from documented patterns and anti-patterns

---

This document contains illustrative scenarios demonstrating how Product Managers can use this workflow to ship production features. Each example includes the PRD, workflow execution, metrics, and lessons learned.

## Table of Contents

1. [Example 1: Export to CSV Feature](#example-1-export-to-csv-feature)
2. [Example 2: User Profile Customization](#example-2-user-profile-customization)
3. [Example 3: Real-Time Notifications System](#example-3-real-time-notifications-system)
4. [Example 4: Multi-Tenant Dashboard](#example-4-multi-tenant-dashboard)
5. [Metrics Summary](#metrics-summary)

---

## Example 1: Export to CSV Feature

### Context

**Company**: B2B SaaS analytics platform (Series A startup)
**PM Background**: Non-technical PM with MBA, 2 years experience
**Challenge**: Losing deals because competitors offer data export. Sales team ranks this as #1 feature request.

### The PRD

```markdown
# CSV Export Functionality - PRD

## Problem Statement

Analytics users need to export dashboard data to perform custom analysis
in Excel/Google Sheets. Currently, they screenshot dashboards or manually
copy data. This is a top sales blocker—we lost 5 deals in Q4 worth $120K ARR.

## User Personas

**Primary**: Data Analysts at enterprise customers
- Need: Export 1000-5000 rows for custom analysis
- Frequency: Weekly exports
- Pain: Manual data entry from screenshots takes 2+ hours weekly

**Secondary**: Executives creating board presentations
- Need: Clean data exports for presentations
- Frequency: Monthly
- Pain: Can't verify data accuracy when manually transcribed

## Success Criteria

**User Metrics**:
- 30% of power users export data weekly within 30 days of launch
- Average export size: 2500 rows
- Export completion rate >95% (handle errors gracefully)

**Business Metrics**:
- Unblock $120K in blocked deals
- Reduce churn risk for 3 at-risk accounts
- Close feature gap with competitors (Tableau, Looker)

**Technical Metrics**:
- Export generation time <5 seconds for 5000 rows
- Server memory usage <100MB per export
- Support concurrent exports (10+ users simultaneously)

## User Stories

### Story 1: Basic Export
As a data analyst, I want to export dashboard data to CSV
so that I can perform custom analysis in Excel.

**Acceptance Criteria**:
- Export button visible on all dashboard views
- CSV includes all visible columns with proper headers
- File downloads with descriptive name: dashboard-{name}-{date}.csv
- Exports respect current filters and date ranges
- Loading indicator shows progress for exports >1000 rows

### Story 2: Large Dataset Handling
As a power user, I want to export datasets up to 10,000 rows
so that I can analyze complete data sets.

**Acceptance Criteria**:
- Exports up to 10,000 rows (pagination UX for larger datasets)
- Progress indicator shows % completion
- Cancellable for long-running exports
- Error message if dataset exceeds 10,000 rows with workaround suggestion

### Story 3: Error Handling
As a user, I want clear error messages if export fails
so that I know what went wrong and how to fix it.

**Acceptance Criteria**:
- Network errors: "Connection lost. Please try again."
- Size errors: "Dataset too large. Please add filters to reduce data."
- Permission errors: "Insufficient permissions. Contact administrator."
- All errors log to analytics for debugging

## Business Context

**Market Position**:
- Competitors: Tableau, Looker, Metabase all offer CSV export
- Differentiation: We're faster and cheaper, but missing table stakes features

**Revenue Impact**:
- $120K ARR blocked (5 deals)
- $45K ARR at risk (3 accounts considering churn)
- Sales cycle impact: +2 weeks average due to this objection

**Strategic Importance**: HIGH
- Closes feature gap with competitors
- Unblocks sales pipeline
- Reduces churn risk

## Scope

**In Scope for V1**:
- Export visible dashboard data to CSV
- Support for up to 10,000 rows
- Proper error handling and progress indicators
- File naming with dashboard name and date

**Out of Scope** (Future Versions):
- Export to Excel (.xlsx) format
- Scheduled/automated exports
- Export to Google Sheets directly
- Custom column selection

## Non-Functional Requirements

**Performance**:
- Generate CSV for 5000 rows in <5 seconds
- Support 10+ concurrent exports
- Memory usage <100MB per export

**Security**:
- Respect existing data permissions (users only export data they can view)
- Audit log for all exports (who, what, when)
- No data leakage across tenants (multi-tenant security)

**Compatibility**:
- CSV format compatible with Excel, Google Sheets, Numbers
- UTF-8 encoding for international characters
- Proper escaping of special characters

**Accessibility**:
- Export button keyboard accessible
- Screen reader announces export progress
- Error messages screen reader compatible
```

### Workflow Execution

**Note:** In all examples below, each command was run in a fresh Claude Code session. After completing each step, the PM closed Claude Code and opened a new session for the next command. This prevented context overflow and ensured optimal performance.

#### Step 1: Service Inventory (5 minutes)

**Session 1:**
```bash
# Open Claude Code
claude

# Run service inventory
/generate_service_inventory ./src services-inventory.md

# Review output, then close Claude Code
```

**Findings**:
- ✅ Existing `ReportService` handles data fetching
- ✅ Existing `AuthorizationService` for permission checks
- ✅ Existing `AuditLogService` for tracking exports
- ❌ No CSV formatting utility (need to create)

**PM Decision**: Good news—70% of the functionality exists. We only need to add CSV formatting and wire it up.

#### Step 2: Discovery (10 minutes)

**Session 2 (fresh context):**
```bash
# Open new Claude Code session
claude

# Run discovery
/discovery csv-export-prd.md Analytics ./src "reporting, data export"

# Review findings, then close Claude Code
```

**Discovery Findings** (from Linear ticket):
- Tech stack: Node.js, Express, PostgreSQL, React
- Existing pattern: ReportService returns JSON, frontend formats
- Similar feature: PDF export (can follow same architectural pattern)
- Potential reuse: Use same permission checking as PDF export
- Performance note: Queries are already optimized with proper indexes

**PM Review**: AI understands our architecture. PDF export pattern is perfect template.

#### Step 3: Epic Planning (15 minutes)

```bash
/epic-planning csv-export-prd.md DISC-001 "market-leader" "sales-blocker"
```

**AI Proposed Epics**:

1. **CSV Export Core Functionality**
   - Business Value: Unblock $120K in sales pipeline
   - Success Metric: 30% weekly usage by power users
   - Estimated: 2 sprints

2. **Large Dataset Handling & Performance**
   - Business Value: Support enterprise customers with big datasets
   - Success Metric: 95% completion rate for exports up to 10K rows
   - Estimated: 1 sprint

3. **Error Handling & User Feedback**
   - Business Value: Reduce support tickets, improve UX
   - Success Metric: <5 support tickets per 1000 exports
   - Estimated: 1 sprint

**PM Approval**:
- ✅ Approve Epic 1 (Priority 1 - must have)
- ✅ Approve Epic 2 (Priority 1 - enterprise requirement)
- ✅ Approve Epic 3 (Priority 2 - can ship without if needed)

**Decision**: Ship Epics 1 & 2 first. Epic 3 can follow in next sprint if timeline is tight.

#### Step 4: Technical Planning (20 minutes)

```bash
/planning EPIC-001,EPIC-002 --discovery DISC-001
```

**AI Generated Sub-Tickets**:

**Epic 1: Core Functionality** (8 tickets)
- TASK-101: Create CSV formatter utility service
- TASK-102: Extend ReportService with CSV export method
- TASK-103: Add export API endpoint (/api/reports/:id/export)
- TASK-104: Create export button UI component
- TASK-105: Integrate frontend with export API
- TASK-106: Add permission checks using AuthorizationService
- TASK-107: Implement audit logging with AuditLogService
- TASK-108: Add export progress indicator UI

**Epic 2: Large Datasets** (4 tickets)
- TASK-201: Implement chunked CSV generation for large datasets
- TASK-202: Add cancellation support for long exports
- TASK-203: Create progress websocket for real-time updates
- TASK-204: Add pagination UX for >10K row datasets

**PM Review**:
- ✅ All acceptance criteria covered
- ✅ Reusing existing services (Authorization, AuditLog)
- ✅ Following PDF export architecture pattern
- ✅ Dependencies make sense (core before large datasets)

**Approval**: Looks good. Proceed with implementation.

#### Step 5-8: Implementation, Testing, Review (AI Executes)

**Timeline**:
- Implementation: 3 days (AI running autonomously)
- Testing: 1 day (automated test generation)
- Code Review: Passed first try
- Security Review: No critical issues

**Interesting Notes**:
- AI reused 70% of PDF export code structure
- Automatically added proper CSV escaping (prevented injection vulnerabilities)
- Generated 47 test cases (including edge cases PM didn't think of)
- Performance tested with 50K rows (exceeded requirements)

#### Step 9: Production Deployment

**Shipped**: 4 days from PRD to production

**What Was Delivered**:
- CSV export on all dashboards
- Support for 10,000 row exports
- Progress indicators and cancellation
- Comprehensive error handling
- Audit logging
- 94% test coverage
- No security vulnerabilities

### Results

#### Metrics (30 Days Post-Launch)

**User Adoption**:
- ✅ 38% of power users exporting weekly (target: 30%)
- ✅ 2,847 average rows exported (target: 2,500)
- ✅ 97.3% completion rate (target: 95%)

**Business Impact**:
- ✅ $120K pipeline unblocked (all 5 deals closed)
- ✅ 3 at-risk accounts renewed (prevented $45K churn)
- ✅ Sales cycle reduced by 1.5 weeks on average
- 🎉 **$165K ARR impact in first 30 days**

**Technical Performance**:
- ✅ 3.2s average export time for 5K rows (target: <5s)
- ✅ 78MB average memory per export (target: <100MB)
- ✅ Supported 24 concurrent exports (target: 10+)

**Quality**:
- 0 production bugs in first 30 days
- 2 support tickets (both user education, not bugs)
- 0 security issues
- 94% test coverage maintained

### Lessons Learned

**What Worked Well**:
1. **Service Inventory First**: Discovering 70% of code already existed saved days
2. **Following Existing Patterns**: PDF export pattern made implementation smooth
3. **Clear Success Metrics**: Made validation objective and fast
4. **Trust the Process**: AI caught edge cases PM didn't consider

**Surprises**:
1. **AI Performance**: Generated more comprehensive tests than manual QA would have
2. **Speed**: 4 days vs. estimated 2-3 weeks with manual development
3. **Quality**: Zero production bugs was unexpected for first release
4. **Reuse**: 70% code reuse rate exceeded expectations

**What Could Be Better**:
1. **Earlier Sales Involvement**: Could have prioritized this 6 months earlier
2. **Monitoring**: Should have added more detailed performance monitoring from day 1
3. **Documentation**: User docs could have been more comprehensive initially

### PM Takeaways

**For Non-Technical PMs**:
- You don't need to understand CSV formatting logic to ship this feature
- Focus on user value and business metrics—AI handles implementation
- Service inventory is worth its weight in gold
- Trust but verify: Review outputs, don't micromanage implementation

**ROI Calculation**:
- **PM Time Investment**: 4 hours total (PRD writing, reviews, approvals)
- **Development Time**: 4 days (vs 2-3 weeks manual)
- **Business Value**: $165K ARR in 30 days
- **Time to Value**: 4 days vs. 3 weeks (87% faster)

---

## Example 2: User Profile Customization

### Context

**Company**: B2C social platform (bootstrapped startup)
**PM Background**: Technical PM (former developer)
**Challenge**: Low user engagement. 40% of users never complete their profile.

### The PRD (Abbreviated)

```markdown
# User Profile Customization - PRD

## Problem Statement
Only 23% of users complete their profile within 7 days of signup.
Research shows profile completion correlates with 3x higher retention.

## Success Criteria
- 70% of users complete profile within 7 days
- Average profile completeness score >85%
- Engagement metrics improve 25%

## Key Features
1. Profile photo upload with crop/resize
2. Bio editor with rich text
3. Custom profile URL (vanity URL)
4. Social links integration
5. Profile preview before publishing
```

### Workflow Execution (Summary)

**Service Inventory**: Found existing image upload service (used for posts)

**Discovery**: Identified user management patterns, auth patterns

**Epic Planning**: Created 3 epics
- Epic 1: Profile Photo & Basic Info
- Epic 2: Rich Profile Content
- Epic 3: Social Integration

**Technical Planning**: 12 sub-tickets across 3 epics

**Implementation**: 6 days (AI + reviews)

### Results (60 Days)

**User Metrics**:
- ✅ 73% profile completion within 7 days (target: 70%)
- ✅ 88% average completeness score (target: 85%)
- ✅ 31% engagement improvement (target: 25%)

**Quality**:
- 2 minor bugs (UI edge cases on mobile)
- Fixed within 24 hours
- 91% test coverage

**Business Impact**:
- Retention improved 18% (statistically significant)
- User-generated content up 42%
- Session duration up 28%

### PM Insights

**What was Different**:
- Technical PM tried to specify implementation details initially
- Learned to step back and let AI choose technical approach
- AI chose better image processing library than PM would have

**Key Learning**: Even technical PMs should focus on "what" not "how"

---

## Example 3: Real-Time Notifications System

### Context

**Company**: Project management SaaS (Series B)
**PM Background**: Non-technical PM from consulting
**Challenge**: Users miss important updates. Email notifications are ignored.

### The PRD (Abbreviated)

```markdown
# Real-Time Notifications System - PRD

## Problem
Users miss critical project updates because email notifications are delayed
and often ignored. This leads to missed deadlines and poor coordination.

## Solution
In-app real-time notifications with smart prioritization.

## Success Criteria
- 80% of notifications viewed within 5 minutes
- 50% reduction in missed deadlines
- 90% user satisfaction with notification system

## Features
1. Real-time notification center
2. Desktop notifications (opt-in)
3. Notification prioritization (urgent/normal/low)
4. Notification preferences per project
5. Read/unread tracking
```

### Workflow Execution (Summary)

**Service Inventory**: No existing real-time infrastructure (major gap)

**Discovery**: Identified event-driven architecture already in use

**Epic Planning**: 4 epics created
- Epic 1: Real-Time Infrastructure (WebSocket server)
- Epic 2: Notification Center UI
- Epic 3: Notification Preferences
- Epic 4: Desktop Notifications

**Interesting Decision**: PM approved Epic 1 even though it was pure infrastructure (no user-facing value yet), because AI explained it was prerequisite.

**Implementation**: 10 days total (infrastructure was complex)

### Results (90 Days)

**User Metrics**:
- ✅ 84% notifications viewed within 5 minutes (target: 80%)
- ✅ 52% reduction in missed deadlines (target: 50%)
- ✅ 92% user satisfaction (target: 90%)

**Technical**:
- Scaled to 10,000 concurrent WebSocket connections
- 99.7% uptime for notification service
- Average notification latency: 380ms

**Business Impact**:
- Customer satisfaction (CSAT) improved 15 points
- Support tickets for "missed updates" down 68%
- Feature became competitive differentiator

### PM Insights

**Biggest Challenge**: Approving "pure infrastructure" epic without immediate user value

**How Overcome**: AI explained:
- Why WebSocket infrastructure was needed
- Estimated 4 days for infrastructure
- Showed user-facing value would come in Epic 2

**Learning**: Sometimes you need to trust AI on technical prerequisites even when they're not user-facing.

---

## Example 4: Multi-Tenant Dashboard

### Context

**Company**: Healthcare SaaS platform (Series A)
**PM Background**: Domain expert (former hospital administrator)
**Challenge**: Onboarding new hospital clients takes 2-3 weeks of custom configuration.

### The PRD (Abbreviated)

```markdown
# Multi-Tenant Configuration Dashboard - PRD

## Problem
IT admins at hospitals spend 2-3 weeks configuring our system for their
organization. This delays time-to-value and strains our implementation team.

## Solution
Self-service configuration dashboard for IT admins.

## Success Criteria
- Reduce onboarding time to 2 days
- 95% of configurations self-service (no support needed)
- Zero security incidents from tenant isolation

## Key Features
1. Organization settings management
2. User role configuration
3. Department/unit hierarchy setup
4. Integration configurations (HL7, FHIR)
5. Security & compliance settings
```

### Workflow Execution (Summary)

**Service Inventory**: Found existing multi-tenant infrastructure but no admin UI

**Discovery**: Identified strict HIPAA compliance requirements, existing security patterns

**Epic Planning**: 5 epics
- Epic 1: Organization Settings UI
- Epic 2: Role Management
- Epic 3: Department Hierarchy
- Epic 4: Integration Configuration
- Epic 5: Security & Audit Logs

**Critical**: Security review found 2 potential tenant isolation bugs *before* production

**Implementation**: 12 days (security was complex)

### Results (180 Days)

**Business Metrics**:
- ✅ Onboarding time reduced to 1.8 days (target: 2 days)
- ✅ 97% self-service rate (target: 95%)
- ✅ Zero security incidents (target: zero)

**Operational Impact**:
- Implementation team capacity increased 4x
- Customer satisfaction during onboarding: 9.2/10
- Support tickets during onboarding down 82%

**Revenue Impact**:
- Can now onboard 4 clients simultaneously (was 1)
- Sales cycle shortened by 11 days
- Implementation team now focuses on expansion, not setup

### PM Insights

**Domain Expertise Value**: PM's healthcare background was critical for writing requirements

**What AI Added**: Security patterns PM wouldn't have known about (HIPAA-specific)

**Key Learning**: Domain expertise + AI technical expertise = powerful combination

**Security**: Having AI find tenant isolation bugs pre-production likely prevented catastrophic security breach

---

## Metrics Summary

### Aggregate Results Across All Examples

**Speed**:
- Average time from PRD to production: **7.75 days**
- Traditional development estimate: **3-4 weeks**
- **Speed improvement: 75% faster**

**Quality**:
- Average test coverage: **92%**
- Production bugs in first 30 days: **0.5 per feature** (2 total across 4 features)
- Security vulnerabilities found pre-production: **2** (both fixed before launch)
- **Security vulnerabilities in production: 0**

**Business Impact**:
- Total ARR impact (first 90 days): **$450K+**
- Customer satisfaction improvement: **+18 points average**
- Support ticket reduction: **-56% average**

**Team Efficiency**:
- PM time per feature: **6 hours average** (PRD writing + reviews)
- Engineering time: **6.5 days average**
- Traditional engineering estimate: **20-25 days**
- **Efficiency gain: 70%+**

**Service Reuse**:
- Average reuse rate: **68%**
- New code vs. integrated code ratio: **1:2.1**
- Lines of code per feature: **40% less than traditional development**

### ROI Analysis

**Example 1 (CSV Export)**:
- PM Time: 4 hours
- Dev Time: 4 days
- ARR Impact: $165K
- **ROI: $41K per dev day**

**Example 2 (User Profiles)**:
- PM Time: 6 hours
- Dev Time: 6 days
- Retention Impact: 18%
- **ROI: Reduced churn by estimated $200K ARR annually**

**Example 3 (Notifications)**:
- PM Time: 8 hours
- Dev Time: 10 days
- CSAT Improvement: +15 points
- **ROI: $150K saved in support costs + competitive advantage**

**Example 4 (Multi-Tenant)**:
- PM Time: 7 hours
- Dev Time: 12 days
- Operational Impact: 4x capacity increase
- **ROI: $400K+ in additional ARR capacity annually**

---

## Common Patterns Across Examples

### Success Factors

1. **Clear Success Metrics**: Every example had measurable, objective success criteria
2. **Service Inventory First**: All examples found 60-75% code reuse opportunities
3. **Discovery Matters**: Understanding existing patterns prevented architectural mismatches
4. **Trust Security Review**: 2 critical issues caught pre-production across 4 features
5. **PM Focus on Value**: PMs who focused on "what" shipped faster than those who specified "how"

### Failure Modes Avoided

**Avoided by Process**:
- ❌ Rebuilding existing functionality (service inventory caught this)
- ❌ Architectural inconsistency (discovery phase prevented)
- ❌ Security vulnerabilities (security review caught 2 critical issues)
- ❌ Missing edge cases (AI testing found cases PMs didn't think of)
- ❌ Poor performance (AI performance testing exceeded requirements)

**PM Mistakes Prevented**:
- Technical PMs trying to specify implementation (learned to focus on outcomes)
- Non-technical PMs being intimidated by complexity (process guided them)
- Skipping quality gates for speed (all examples ran full workflow)

---

## Lessons for Your First Feature

Based on these examples, here's what to expect for your first feature:

**Week 1: Likely Slower**
- Learning the workflow takes time
- Writing first AI-friendly PRD is hard
- Reviews take longer as you learn what to look for

**Week 2-4: Rapid Improvement**
- Second feature will be 2x faster
- You'll develop PRD templates
- Reviews become pattern recognition

**Month 2+: At Full Speed**
- 70%+ faster than traditional development
- Higher quality than manual development
- Predictable timelines and outcomes

**First Feature Recommendations**:
1. Choose a small, well-defined feature (like CSV export)
2. Over-communicate success criteria
3. Don't skip discovery or service inventory
4. Trust the security review process
5. Measure everything (you'll want the data later)

---

## Contributing Your Own Example

Have you used this workflow successfully? We'd love to add your case study!

**What to Include**:
1. Company context (anonymized is fine)
2. PM background (technical/non-technical)
3. Problem statement and PRD summary
4. Workflow execution summary
5. Results and metrics
6. Key learnings

**Submit via**: GitHub PR with your example added to this file

---

## Questions?

See [FAQ.md](FAQ.md) for common questions or open an issue on GitHub.
