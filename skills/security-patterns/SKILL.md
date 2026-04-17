---
name: security-patterns
description: Use when about to write authentication, authorization, user input handling, database queries, secret management, session/token code, webhook handlers, file uploads, or CI/CD configuration. Also use when tempted to string-concatenate SQL, skip input validation, hardcode a credential, return raw database errors, trust third-party data, or log PII. Applies to OWASP Top 10 and agentic AI (@anthropic-ai/sdk, openai, langchain, @modelcontextprotocol, autogen, crewai imports).
---

# Security Patterns

Shift security left - prevent vulnerabilities while writing code, not at review time.

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

## Infrastructure Security Patterns

### Secrets Detection

Known secret prefixes to scan for (in code AND git history):
- `AKIA` — AWS access key IDs
- `sk-` — OpenAI, Stripe secret keys
- `ghp_`, `gho_`, `github_pat_` — GitHub tokens
- `xoxb-`, `xoxp-`, `xapp-` — Slack tokens
- `SG.` — SendGrid API keys
- `sk_live_`, `pk_live_` — Stripe live keys

### CI/CD Security

When reviewing `.github/workflows/` or CI configuration:
- All third-party actions MUST be pinned to SHA, not tag
- `pull_request_target` trigger requires extra scrutiny (fork PRs get write access)
- `${{ github.event.* }}` in `run:` steps is script injection — use environment variables instead
- Secrets should be scoped to the steps that need them, not the entire job

### Container Security

When reviewing Dockerfiles:
- MUST include a `USER` directive (don't run as root)
- Secrets MUST NOT appear as `ARG` or `ENV` in build
- `.env` files MUST NOT be `COPY`ed into images
- Use multi-stage builds to exclude build-time dependencies from production images

### Dependency Security

When reviewing package manifests:
- Lockfile MUST exist AND be tracked by git
- Production dependencies with install scripts are a supply chain risk — verify they are necessary
- Pin exact versions for production dependencies

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
- **`examples/owasp-code-examples.md`** — Before/after code examples for common OWASP vulnerabilities
- **`agents/references/security-agentic-owasp-reference.md`** — OWASP Top 10 for Agentic Applications 2026 assessment framework
