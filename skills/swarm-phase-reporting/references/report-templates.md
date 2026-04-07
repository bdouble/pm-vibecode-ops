# Phase Report Templates

These templates define the MINIMUM structure for each phase report. Reports may include additional sections as appropriate, but must not omit the sections marked REQUIRED.

## Tool Call

Every report is posted via:
```
mcp__linear-server__create_comment:
  - issue_id: [ticket-id]
  - body: [formatted report]
```

---

## Adaptation Report

```markdown
## Adaptation Report

**Status:** [DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT]

### Summary                                    <!-- REQUIRED -->
[1-3 sentences: what was analyzed, key findings]

### Key Architecture Decisions                 <!-- REQUIRED -->
[Each decision with reasoning — "X instead of Y because Z"]

### Target Files                               <!-- REQUIRED -->
**New Files:**
- [path] — [purpose]

**Modified Files:**
- [path] — [what changes]

### API Surface                                <!-- if applicable -->
| Route | Method | Purpose | Auth |

### Patterns to Reuse                          <!-- REQUIRED -->
- [existing pattern/service]: [how it will be used]

### Deferred Items                             <!-- REQUIRED (even if empty) -->
| Classification | Severity | Location | Issue | Reason |

---
*Automated by /epic-swarm — Wave [N]*
```

---

## Implementation Report

```markdown
## Implementation Report

**Status:** [DONE / DONE_WITH_CONCERNS / BLOCKED]

### Summary                                    <!-- REQUIRED -->
[What was built, key integration points]

### Files Changed                              <!-- REQUIRED -->
**New Files ([count]):**
- [path] — [purpose and key contents]

**Modified Files ([count]):**
- [path] — [what was changed and why]

### Key Decisions                              <!-- REQUIRED -->
1. [Decision]: [reasoning]

### Quality Gates                              <!-- REQUIRED -->
- TypeScript: [0 errors / N errors]
- Lint: [0 issues / N issues]
- Tests: [N passed, M failed]

### Deferred Items                             <!-- REQUIRED -->
| Classification | Severity | Location | Issue | Reason |

---
*Automated by /epic-swarm — Wave [N]*
```

---

## Testing Report

```markdown
## Testing Report

**Status:** [COMPLETE / ISSUES_FOUND / BLOCKED]

### Gate Results                               <!-- REQUIRED — all 4 gates -->

| Gate | Result | Details |
|------|--------|---------|
| Gate #0: Existing Tests | [PASS/FAIL] | [count] tests passing, [count] regressions |
| Gate #1: [Domain] Tests | [PASS/FAIL] | [count] tests ([breakdown]) |
| Gate #2: [Domain] Tests | [PASS/FAIL] | [count] tests ([breakdown]) |
| Gate #3: [Domain] Tests | [PASS/FAIL] | [count] tests ([breakdown]) |

**Total new tests:** [count]
**Total passing:** [count] ([count] test files)

### Coverage Summary                           <!-- REQUIRED -->
- [Layer]: [what was tested, key scenarios covered]

### Files Created                              <!-- REQUIRED -->
- [test file path] ([count] tests)

### Deferred Items                             <!-- REQUIRED -->
| Classification | Severity | Location | Issue | Reason |

---
*Automated by /epic-swarm — Wave [N]*
```

---

## Documentation Report

```markdown
## Documentation Report

**Status:** [COMPLETE / BLOCKED]

### Summary                                    <!-- REQUIRED -->
[What was documented, approach taken]

### Documentation Updated                      <!-- REQUIRED -->
- [file path] — [what was added/changed]

### Deferred Items                             <!-- REQUIRED -->
| Classification | Severity | Location | Issue | Reason |

---
*Automated by /epic-swarm — Wave [N]*
```

---

## Code Review Report

```markdown
## Code Review Report

**Review Status:** [APPROVED / CHANGES_REQUESTED / BLOCKED]

### Requirements Checklist                     <!-- REQUIRED -->
| AC / Requirement | Status | Evidence |
|-----------------|--------|----------|
| [criterion] | [PASS/FAIL/PARTIAL] | [file:line or grep evidence] |

### Files Reviewed                             <!-- REQUIRED -->
- [file path] — [key observations]

### Best Practices Assessment                  <!-- REQUIRED if Pass 1: PASS -->
| Category | Finding | Severity | Location |

### SOLID/DRY Assessment                       <!-- REQUIRED if Pass 1: PASS -->
| Principle | Finding | Severity | Location |

### Quality Metrics                            <!-- REQUIRED -->
- Requirements Coverage: [X/Y AC verified]
- Best Practices: [summary]
- SOLID/DRY: [summary]

### Deferred Items                             <!-- REQUIRED -->
| Classification | Severity | Location | Issue | Reason |

---
*Automated by /epic-swarm — Wave [N]*
```

---

## Cross-Model Review Report (Codex)

```markdown
## Cross-Model Review Report

**Model**: [model] | **Date**: [date]

### Summary                                    <!-- REQUIRED -->
- **Total findings**: N (P0: X, P1: Y, P2: Z, P3: W)
- **Auto-fixed**: N
- **Fixed after review**: N
- **Dismissed**: N
- **Deferred**: N

### Auto-Fixed Items                           <!-- REQUIRED if any -->
| Priority | File | Change | Reasoning |

### Human-Decided Items                        <!-- REQUIRED if any -->
| Priority | File | Decision | Reasoning |

### For Awareness (P3)                         <!-- include all -->
| Description | File | Why Low Priority |

### Deferred Items                             <!-- REQUIRED -->
| Classification | Severity | Location | Issue | Reason |

---
*Automated by /epic-swarm — Wave [N]*
```

---

## Security Scan Report (Pre-Merge)

```markdown
## Security Scan Report (Pre-Merge)

**Status:** [PASS / BLOCKED]

### OWASP Top 10 Assessment                    <!-- REQUIRED -->
[Per-category assessment]

### Security Checklist                         <!-- REQUIRED -->
- [x/] [specific check with evidence]

### Findings                                   <!-- REQUIRED -->
| Severity | Count | Details |

### Deferred Items                             <!-- REQUIRED -->
| Classification | Severity | Location | Issue | Reason |

---
*Automated by /epic-swarm — Wave [N]*
```

---

## Security Review Report (Post-Merge)

```markdown
## Security Review Report

**Status:** [PASS / BLOCKED]

### OWASP Top 10 Assessment                    <!-- REQUIRED -->
[Per-category assessment — focus on cross-ticket interactions]

### Security Checklist                         <!-- REQUIRED -->
- [x/] [specific check with evidence]

### Findings                                   <!-- REQUIRED -->
| Severity | Count | Details |

### Remediation Summary                        <!-- REQUIRED if findings exist -->
| Priority | Issue | Status | Commit |

### Deferred Items                             <!-- REQUIRED -->
| Classification | Severity | Location | Issue | Reason |

### Recommendation                             <!-- REQUIRED -->
[APPROVE / BLOCK with reasoning]

---
*Automated by /epic-swarm — Post-Merge Security Review*
```
