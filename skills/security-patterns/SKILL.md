---
name: security-patterns
description: |
  This skill enforces OWASP Top 10 security patterns during code writing. Activate when "implementing
  authentication", "handling passwords", "writing API endpoints", "validating input", "handling user
  data", "creating database queries", "managing sessions", "encryption", "XSS prevention", "CSRF
  protection", "authorization check", "access control", "SQL injection", "storing credentials",
  "OAuth integration", "JWT tokens", "rate limiting", "secure cookies", or "webhook validation".
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

See `references/owasp-patterns.md` for detailed code examples for each OWASP Top 10 vulnerability.
