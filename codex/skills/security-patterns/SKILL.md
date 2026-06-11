---
name: security-patterns
description: |
  Enforces OWASP Top 10 security patterns during code writing. Use when:
  - Authentication: "authentication", "login", "password", "JWT", "OAuth", "session", "token"
  - Authorization: "validate input", "sanitize", "authorize", "access control", "permissions"
  - Data handling: "database query", "SQL", "user data", "PII", "encrypt", "hash", "webhook"
  - Security topics: "XSS", "CSRF", "injection", "rate limit", "secure cookie", "credentials"
  - Writing: auth/, login, password, token, session, query, .where(, .raw(

  Enforces auth on every protected endpoint, parameterized queries only, secrets from env only,
  input validation, no sensitive data in error responses, security event logging (no PII).
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

## Quick Reference

| Vulnerability | Prevention |
|--------------|------------|
| Broken Access Control | Auth + authz on every endpoint |
| Cryptographic Failures | argon2id/bcrypt, randomBytes for tokens |
| Injection | Parameterized queries only |
| Insecure Design | Rate limiting, account lockout |
| Security Misconfiguration | Helmet headers, secure cookies |
| Vulnerable Components | npm audit, fail CI on critical |
| Authentication Failures | timingSafeEqual for comparisons |
| Data Integrity | Verify webhook signatures |
| Logging Failures | Log events, never log PII/secrets |
| SSRF | URL allowlist, block internal IPs |

## Core Principles

- **Fail secure**: Deny by default, allow explicitly
- **Defense in depth**: Multiple layers of protection
- **Least privilege**: Minimal permissions required
- **Secure defaults**: Safe configuration out of the box

## Encode Recurring Rules as Guards

Recurring security rules — "every mutation handler validates input", "no raw queries", "all webhook handlers verify signatures" — are prime rung-2 guard candidates: a single source-scanning guard test enforces the rule on every future surface, instead of re-flagging it per-surface at review time. When you establish or rely on such a rule, prefer recommending (or shipping) the guard over documenting the rule in prose. See the production-code-standards skill (enforcement ladder) for the guard-test recipe.

See `references/owasp-patterns.md` for detailed code examples for each OWASP Top 10 vulnerability.

---

## How to Use This Skill in Codex

Include this skill's content in your Codex prompt when:
- Writing authentication or authorization code
- Handling user input or database queries
- Working with sensitive data (PII, credentials, tokens)
- Implementing webhooks or external integrations
- Reviewing code for security vulnerabilities

Copy the enforcement checklist into your prompt to ensure all security concerns are addressed.
