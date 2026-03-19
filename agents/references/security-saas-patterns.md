# Modern SaaS Tech Stack Security Guidelines

Detailed security patterns, vulnerability checks, and implementation guidance for common SaaS technology stacks. This file is the authoritative reference for the Security Engineer Agent's tech-stack-specific assessments.

---

## Next.js 14+ App Router Security

### Critical Vulnerability CVE-2025-29927 (CVSS 9.1)
Middleware bypass via `x-middleware-subrequest` header.

- **Immediate Action**: Update to Next.js 14.2.25+ or 15.2.3+
- **Validation**: Check for middleware bypass attempts in authentication/authorization
- **Key Patterns**: Never trust `x-middleware-subrequest` header, implement defense-in-depth beyond middleware

### Server Actions Security
```javascript
// Validate origin for CSRF protection
if (request.headers.get('origin') !== process.env.NEXT_PUBLIC_URL) {
  throw new Error('Invalid origin');
}
// Actions are POST-only and encrypted with build-specific keys
```

### Common Issues
- `dangerouslySetInnerHTML` without DOMPurify sanitization
- Missing CSRF tokens in forms
- Client-side authentication checks (must be server-side)
- Exposed API routes without authentication middleware

---

## NestJS Security Patterns

### JWT & Authentication
```typescript
// Use strong secrets from environment
jwtSecret: process.env.JWT_SECRET, // Never hardcode
expiresIn: '15m', // Short expiration with refresh tokens

// Implement guards on all protected routes
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
```

### Common Vulnerabilities
- Missing rate limiting on auth endpoints (use express-rate-limit)
- Weak password hashing (use bcrypt rounds >= 12 or Argon2)
- Exposed Prisma queries without validation
- Missing input validation (use class-validator DTOs)
- Debug mode or verbose errors in production

---

## Supabase & PostgreSQL Security

### Row Level Security (RLS)
```sql
-- CRITICAL: Always enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Use auth.uid() not user_metadata for authorization
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Never use raw_user_meta_data for security decisions
```

### Key Vulnerabilities
- Missing RLS policies (data exposed via API)
- Using `user_metadata` instead of `app_metadata` for authorization
- Service keys exposed in client code
- Missing indexes on RLS policy columns (performance DoS)
- Direct database access without parameterized queries

---

## React & TanStack Query Security

### XSS Prevention
```tsx
// Safe by default in React JSX
<div>{userInput}</div>

// DANGEROUS - requires sanitization
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />

// URL validation for javascript: protocol
const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
```

### Common Issues
- TanStack Query cache poisoning via unvalidated responses
- Missing CSRF tokens in mutations
- Storing sensitive data in React Query cache
- Client-side authorization decisions

---

## Prisma & Database Security

### Query Security
```typescript
// ALWAYS use parameterized queries
await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;

// NEVER string concatenation
// BAD: prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`)

// Validate all inputs before queries
const validated = schema.parse(userInput);
await prisma.user.findFirst({ where: validated });
```

---

## Dependency & Supply Chain Security

### 2024-2025 Threats
- Typosquatting attacks on npm packages
- Compromised popular packages (check npm audit weekly)
- Prototype pollution in JavaScript libraries
- Memory leaks in Next.js middleware

### Validation Process
```bash
# Regular security audits
npm audit --audit-level=moderate
npx snyk test
npx @socketsecurity/cli scan

# Lock file integrity
npm ci --prefer-offline # Use ci not install in production
```
