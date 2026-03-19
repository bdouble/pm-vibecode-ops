# Modern SaaS Tech Stack Security Guidelines

Last reviewed: 2026-03-19 | Review cadence: Quarterly

Detailed security patterns, vulnerability checks, and implementation guidance for common SaaS technology stacks. This file is the authoritative reference for the Security Engineer Agent's tech-stack-specific assessments.

---

## Next.js 14+ App Router Security

### Critical Vulnerability CVE-2025-29927 (CVSS 9.1)
Middleware bypass via `x-middleware-subrequest` header.

- **Immediate Action**: Update to Next.js 14.2.25+ or 15.2.3+
- **Validation**: Check for middleware bypass attempts in authentication/authorization
- **Key Patterns**: Never trust `x-middleware-subrequest` header, implement defense-in-depth beyond middleware

### Critical Vulnerability CVE-2025-66478 (RCE with Public Exploit)
Remote code execution vulnerability in Next.js with publicly available exploit code.

- **Immediate Action**: Update to the latest Next.js version immediately
- **Validation**: Review server-side rendering paths for injection vectors
- **Key Patterns**: Keep Next.js on latest patch version, monitor GitHub security advisories

### CVE-2025-55183 / CVE-2025-55184 (App Router)
Source code exposure and denial-of-service vulnerabilities in the App Router.

- **CVE-2025-55183**: Source code exposure — server-side code can leak to the client through App Router edge cases
- **CVE-2025-55184**: Denial of service — crafted requests can exhaust server resources via App Router
- **Immediate Action**: Update to patched Next.js versions
- **Validation**: Audit App Router routes for source code leakage, test with malformed requests

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

## React Server Components Security

### Critical Vulnerability React2Shell / CVE-2025-55182 (CVSS 10.0)
Remote code execution in React Server Components. Unsanitized user input passed as server component props can achieve arbitrary code execution on the server.

- **Immediate Action**: Update React to patched versions
- **Validation**: Audit all server component props for user-controlled input
- **Key Patterns**:
  - Never pass unsanitized user input to server components
  - Validate and sanitize all server component props at the boundary
  - Use Content-Security-Policy headers to limit execution scope
  - Treat server components as a trust boundary — all data crossing it must be validated

```javascript
// CRITICAL: Validate all server component props
// ANTI-PATTERN: Passing raw user input to server component
async function UserProfile({ userId }) {
  // userId comes directly from URL params — must validate
  const data = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);  // RCE + SQLi!
}

// PATTERN: Validate and sanitize at the boundary
import { z } from 'zod';

const UserIdSchema = z.string().uuid();

async function UserProfile({ userId }) {
  const validatedId = UserIdSchema.parse(userId);  // Throws on invalid input
  const data = await prisma.user.findUnique({ where: { id: validatedId } });
  return <ProfileView user={data} />;
}
```

---

## NestJS Security Patterns

### Critical Vulnerability CVE-2025-54782 (RCE in @nestjs/devtools-integration)
Remote code execution via the `@nestjs/devtools-integration` package.

- **Immediate Action**: Remove `@nestjs/devtools-integration` from production deployments
- **Validation**: Verify devtools packages are devDependencies only, not included in production builds
- **Key Patterns**:
  - Use `@nestjs/devtools-integration` only in development
  - Ensure it is listed under `devDependencies`, never `dependencies`
  - Verify production Docker images do not include devtools packages

```typescript
// ANTI-PATTERN: Devtools in production
// package.json
{
  "dependencies": {
    "@nestjs/devtools-integration": "^0.1.6"  // VULNERABLE in production!
  }
}

// PATTERN: Devtools in development only
// package.json
{
  "devDependencies": {
    "@nestjs/devtools-integration": "^0.1.6"  // Dev only
  }
}

// PATTERN: Conditional registration
@Module({
  imports: [
    ...(process.env.NODE_ENV === 'development'
      ? [DevtoolsModule.register({ http: true })]
      : []),
  ],
})
export class AppModule {}
```

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

### Views Bypass RLS by Default
Views execute with the permissions of the view owner, not the calling user, which means RLS policies are bypassed.

```sql
-- ANTI-PATTERN: View bypasses RLS silently
CREATE VIEW user_profiles AS
  SELECT * FROM users;  -- Bypasses RLS! Returns ALL rows.

-- PATTERN: Use security_invoker (PostgreSQL 15+)
CREATE VIEW user_profiles
  WITH (security_invoker = true) AS
  SELECT * FROM users;  -- Now respects RLS of the calling user
```

### RLS Performance: Missing Indexes
Missing indexes on columns used in RLS policy expressions can cause severe performance degradation, effectively creating a denial-of-service vulnerability.

```sql
-- RLS policy that filters by org_id
CREATE POLICY "Users see own org data" ON documents
  FOR SELECT USING (org_id = auth.jwt()->>'org_id');

-- REQUIRED: Index the column used in the RLS policy
CREATE INDEX idx_documents_org_id ON documents (org_id);

-- Without this index, every query scans the entire table
-- before applying the RLS filter — O(n) instead of O(log n)
```

### Key Vulnerabilities
- Missing RLS policies (data exposed via API)
- Using `user_metadata` instead of `app_metadata` for authorization
- Service keys exposed in client code
- Missing indexes on RLS policy columns (performance DoS)
- Direct database access without parameterized queries
- Views bypassing RLS without `security_invoker = true`

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

### Operator Injection in findMany/findFirst
Prisma's `findMany` and `findFirst` accept string-based query operators that can be injected if filter inputs are not validated.

```typescript
// ANTI-PATTERN: Passing unsanitized user input directly to Prisma filters
app.get('/users', async (req, res) => {
  // Attacker can send: ?filter={"email":{"contains":"@"},"role":{"equals":"admin"}}
  const filter = JSON.parse(req.query.filter);
  const users = await prisma.user.findMany({ where: filter });  // Operator injection!
  res.json(users);
});

// PATTERN: Validate and constrain filter inputs
import { z } from 'zod';

const UserFilterSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(100).optional(),
});

app.get('/users', async (req, res) => {
  const filter = UserFilterSchema.parse(req.query);
  const users = await prisma.user.findMany({
    where: {
      ...(filter.email && { email: filter.email }),
      ...(filter.name && { name: { contains: filter.name } }),
    },
  });
  res.json(users);
});
```

---

## Dependency & Supply Chain Security

### 2024-2026 Threats
- Typosquatting attacks on npm packages
- Compromised popular packages (check npm audit weekly)
- Prototype pollution in JavaScript libraries
- Memory leaks in Next.js middleware
- React Server Components RCE (CVE-2025-55182)
- NestJS devtools RCE in production (CVE-2025-54782)

### Validation Process
```bash
# Regular security audits
npm audit --audit-level=moderate
npx snyk test
npx @socketsecurity/cli scan

# Lock file integrity
npm ci --prefer-offline # Use ci not install in production
```
