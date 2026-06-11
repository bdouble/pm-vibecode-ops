---
name: security-patterns
description: Use when about to write authentication, authorization, user input handling, database queries, secret management, session/token code, webhook handlers, file uploads, or CI/CD configuration. Also use when tempted to string-concatenate SQL, skip input validation, hardcode a credential, return raw database errors, trust third-party data, or log PII. Applies to OWASP Top 10 and agentic AI (@anthropic-ai/sdk, openai, langchain, @modelcontextprotocol, autogen, crewai imports).
---

# Security Patterns

Shift security left - prevent vulnerabilities while writing code, not at review time.

<!-- @protected reason="foundational principle from v4.5; SkillOpt §3.6 protects slow-state content from automated rewrites — removing the analog cost SpreadsheetBench 22pts" -->
**Violating the letter of this skill is violating the spirit of this skill.** Using a slightly different injection sink, naming the secret variable differently, or skipping authorization on the "internal" route — all violate the spirit. Defense applies at every boundary, every time, regardless of how the code is dressed up. Spirit over letter, always.

### Slow/Meta Update Log
<!-- Append one bullet per audit pass capturing what stayed true across iterations. Initially empty. -->
<!-- @end-protected -->

## Enforcement Checklist

When writing security-relevant code:

1. **AUTH**: Every protected endpoint has authentication
2. **AUTHZ**: Every data access has authorization check
3. **INPUT**: All external input is validated
4. **QUERIES**: All database queries are parameterized
5. **SECRETS**: All secrets from env, never hardcoded
6. **ERRORS**: No sensitive data in responses
7. **LOGGING**: Security events logged, PII excluded

## Quick Reference (OWASP Top 10:2025)

| # | Vulnerability | Prevention |
|---|--------------|------------|
| A01 | Broken Access Control | Auth + authz on every endpoint, URL allowlist for SSRF |
| A02 | Security Misconfiguration | Helmet headers, secure cookies, generic errors |
| A03 | Software Supply Chain Failures | npm ci, lockfile integrity, SBOM, typosquatting checks |
| A04 | Cryptographic Failures | argon2id/bcrypt, randomBytes for tokens |
| A05 | Injection | Parameterized queries only |
| A06 | Insecure Design | Rate limiting, account lockout, threat modeling |
| A07 | Authentication Failures | timingSafeEqual for comparisons |
| A08 | Software/Data Integrity Failures | Verify webhook signatures, SRI for CDN |
| A09 | Logging and Alerting Failures | Log events, alert on anomalies, never log PII |
| A10 | Mishandling of Exceptional Conditions | Fail-safe defaults, centralized error handling, resource cleanup |

## Security-First Development Workflow

Follow this procedure when writing any code that handles authentication, authorization, user data, or external input:

### Step 1: Identify Trust Boundaries

Before writing code, map where data crosses trust boundaries:
- External input entry points (HTTP requests, webhooks, file uploads, CLI arguments)
- Internal service boundaries (service-to-service calls, message queues)
- Data storage boundaries (database reads/writes, cache access, file system)
- Third-party integration points (API calls, OAuth flows, CDN resources)

### Step 2: Classify Data Sensitivity

For each data element the code handles:
- **PII** (names, emails, addresses) — encrypt at rest, mask in logs, restrict access
- **Credentials** (passwords, tokens, API keys) — never store plaintext, rotate regularly
- **Financial** (payment info, balances) — additional audit logging, strict access control
- **Public** (product descriptions, documentation) — standard handling sufficient

### Step 3: Apply Defense at Every Layer

Write security controls at each trust boundary, not just at the perimeter:
1. Validate and sanitize input at the entry point
2. Check authorization before every data access operation
3. Use parameterized queries for all database operations
4. Sanitize output before rendering (HTML encoding, JSON escaping)
5. Log the security-relevant event with context but without PII

### Step 4: Verify Before Committing

Run through the enforcement checklist above. Grep the changed files for security review triggers (see below). Confirm no secrets, no raw queries, no missing auth checks.

### Step 5: Encode Recurring Rules as Guards

Recurring security rules — "every mutation handler validates input", "no raw queries", "all webhook handlers verify signatures" — are prime rung-2 guard candidates: a single source-scanning guard test enforces the rule on every future surface, instead of re-flagging it per-surface at review time. When you establish or rely on such a rule, prefer recommending (or shipping) the guard over documenting the rule in prose. See `production-code-standards` → `references/enforcement-ladder.md` for the ~200-line guard-test recipe.

## Common Vulnerability Patterns

These inline examples cover the three most critical vulnerability categories. See `references/owasp-patterns.md` for the complete catalog.

### Broken Access Control (A01)

The most common vulnerability. Always verify the requesting user owns the resource:

```typescript
// WRONG: No ownership check — any authenticated user can access any record
app.get('/api/records/:id', authenticate, async (req, res) => {
  const record = await db.records.findById(req.params.id);
  res.json(record);
});

// RIGHT: Verify resource belongs to requesting user
app.get('/api/records/:id', authenticate, async (req, res) => {
  const record = await db.records.findOne({
    id: req.params.id,
    userId: req.user.id,  // ownership check
  });
  if (!record) throw new NotFoundError();
  res.json(record);
});
```

### Injection (A05)

Never interpolate user input into queries. Use parameterized queries exclusively:

```typescript
// WRONG: SQL injection via string interpolation
const users = await db.query(
  `SELECT * FROM users WHERE name = '${req.query.name}'`
);

// RIGHT: Parameterized query
const users = await db.query(
  'SELECT * FROM users WHERE name = $1',
  [req.query.name]
);
```

### Supply Chain (A03)

Verify integrity of external resources and dependencies:

```typescript
// WRONG: Trusting CDN content without integrity check
<script src="https://cdn.example.com/lib.js"></script>

// RIGHT: Subresource integrity verification
<script src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxAh..."
  crossorigin="anonymous"></script>
```

### Webhook Signature Verification (A08)

Always verify webhook payloads come from the expected sender:

```typescript
// WRONG: Trusting webhook payload without verification
app.post('/webhook', (req, res) => {
  processEvent(req.body);  // unverified source
});

// RIGHT: Verify signature before processing
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new UnauthorizedError('Invalid webhook signature');
  }
  processEvent(req.body);
});
```

## Security Review Triggers

The following code patterns indicate elevated security risk. When any appear in changed files, activate deeper security review — read surrounding context, check for missing controls, and verify the enforcement checklist:

### Immediate Red Flags

| Pattern | Risk | Required Action |
|---------|------|-----------------|
| `.raw(` or `.rawQuery(` | SQL injection | Confirm parameterization, no string interpolation |
| `eval(`, `Function(`, `new Function` | Code injection | Reject unless exceptional justification documented |
| `req.params` or `req.query` in template literals | Injection | Replace with parameterized query or validated input |
| `dangerouslySetInnerHTML` | XSS | Confirm input is sanitized with DOMPurify or equivalent |
| `child_process.exec` with user input | Command injection | Use `execFile` with argument array instead |

### Secrets and Credentials

| Pattern | Risk | Required Action |
|---------|------|-----------------|
| Hardcoded strings resembling keys/tokens | Credential exposure | Move to environment variables |
| `password`, `secret`, `apiKey` in source | Credential exposure | Verify loaded from env, never logged |
| `.env` file committed | Credential exposure | Add to `.gitignore`, rotate exposed secrets |
| `console.log` with auth-related variables | PII/credential leak | Remove or replace with structured logger excluding sensitive fields |

### Authorization Gaps

| Pattern | Risk | Required Action |
|---------|------|-----------------|
| Route handler without auth middleware | Broken access control | Add authentication unless intentionally public |
| Data query without user/tenant scoping | IDOR vulnerability | Add ownership or tenant filter to query |
| Admin endpoint without role check | Privilege escalation | Add role-based authorization middleware |
| File upload without type/size validation | Resource exhaustion, malware | Add MIME type allowlist and size limit |

## Core Principles

- **Fail secure**: Deny by default, allow explicitly
- **Defense in depth**: Multiple layers of protection
- **Least privilege**: Minimal permissions required
- **Secure defaults**: Safe configuration out of the box

## Infrastructure Security

For CI/CD, container, secrets-detection, and dependency security patterns, see `references/infrastructure-security.md`. Apply these when reviewing `.github/workflows/`, `Dockerfile`, package manifests, or scanning for committed secrets.

## Red Flags — STOP

When you notice ANY of these in your own thinking or writing, you are about to introduce a vulnerability. Stop and apply the relevant security pattern.

- `` `${userInput}` `` interpolated into SQL, shell command, or HTML
- `req.params.id` or `req.query.x` passed to a database query without an ownership filter
- Hardcoded API key, token, password, or secret in source
- `console.log` printing auth headers, tokens, or user PII
- Route handler without authentication middleware
- Admin or privileged endpoint without role/permission check
- `dangerouslySetInnerHTML` with anything that touched user input
- `child_process.exec` with a string built from request data
- `eval()` / `new Function()` on anything that touched user input
- Trusting a webhook payload without signature verification
- `==` (instead of `crypto.timingSafeEqual`) for comparing secrets/tokens
- Pinning a third-party Action by `@latest` or `@v3` instead of SHA
- `.env` file added to a `COPY` directive in a Dockerfile

**All of these mean: stop and apply the corresponding OWASP pattern** before continuing.

## Rationalizations -- STOP

If you think any of these, you are about to introduce a vulnerability.

| Excuse | Reality |
|--------|---------|
| "This is an internal-only endpoint" | Internal endpoints get exposed. Secure everything. |
| "We'll add auth later" | Later means never. Auth is not optional. |
| "This is just a prototype" | Prototypes become production. Security from day one. |
| "The input is already validated upstream" | Validate at every boundary. Never trust callers. |
| "This SQL is safe because the input comes from our code" | All SQL must be parameterized. No exceptions. |
| "Only admins use this feature" | Admin privilege escalation is a top attack vector. |
| "The secret is only in the test" | Test secrets leak to CI logs, git history, and screenshots. |

See `references/owasp-patterns.md` for detailed code examples for each OWASP Top 10:2025 vulnerability.

## Agentic Security Awareness

When writing or reviewing code that involves AI agents, LLM orchestration, MCP servers, or tool-calling patterns, apply these additional security checks:

- **Agent tool permissions**: Enforce least privilege for each tool — scope permissions to the current task, prefer read-only defaults, and require explicit grants for write/delete operations
- **Agent context input validation**: Validate and sanitize all data flowing into agent context, including RAG retrieval results, memory store content, external tool outputs, and user-provided documents
- **Human-in-the-loop for high-impact actions**: Require explicit human confirmation before agent actions that mutate production data, deploy code, escalate privileges, or access sensitive resources
- **Sandbox isolation for code execution**: Execute agent-generated code in sandboxed environments with strict resource limits (CPU, memory, network egress) and no access to production credentials
- **Audit logging of agent activity**: Log all agent tool invocations, decisions, and delegation events with enough context for forensic analysis and behavioral drift detection

For the complete agentic security assessment framework, see `agents/references/security-agentic-owasp-reference.md`.

## Additional Resources

- **`references/owasp-patterns.md`** — Comprehensive OWASP Top 10 vulnerability patterns with prevention strategies
- **`references/infrastructure-security.md`** — CI/CD, container, secrets, and dependency security patterns
- **`examples/owasp-code-examples.md`** — Before/after code examples for common OWASP vulnerabilities
- **`agents/references/security-agentic-owasp-reference.md`** — OWASP Top 10 for Agentic Applications 2026 assessment framework

## Related Skills
- **production-code-standards**: Many security vulnerabilities (any, unvalidated JSON.parse, console.log) overlap with production code prohibitions
- **verify-implementation**: Security claims ("auth check is in place") require evidence, not assertion
- **no-silent-deferrals**: "I'll add auth later" is the deferral pattern this skill exists to prevent
