---
name: security-patterns
description: Enforces OWASP security patterns during development. Activates when writing: (1) authentication/authorization code, (2) login/session management, (3) API endpoints with user data, (4) database queries, (5) input validation/handling, (6) file uploads, (7) external API calls, (8) password handling, (9) token generation, (10) error responses. Covers OWASP Top 10: broken access control, crypto failures, injection, insecure design, misconfiguration, vulnerable components, auth failures, data integrity, logging failures, SSRF.
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

## OWASP Top 10 Prevention

### 1. Broken Access Control
```typescript
// REQUIRE: Auth + authz on every protected endpoint
@UseGuards(AuthGuard)
@Get(':id')
async getUser(@Param('id') id: string, @CurrentUser() user: User) {
  if (user.id !== id && !user.hasRole('admin')) {
    throw new ForbiddenException('Access denied');
  }
  return this.userService.findById(id);
}

// BLOCK: Endpoint without auth
@Get(':id')
async getUser(@Param('id') id: string) {
  return this.userService.findById(id); // Anyone can access!
}
```

### 2. Cryptographic Failures
```typescript
// REQUIRE: Strong hashing (argon2id, bcrypt)
import { hash } from 'argon2';
await hash(password, { type: argon2id, memoryCost: 65536 });

// REQUIRE: Cryptographically secure tokens
import { randomBytes } from 'crypto';
const token = randomBytes(32).toString('base64url');

// BLOCK
Math.random().toString(36);  // Predictable!
md5(password);               // Broken!
sha1(password);              // Weak!
```

### 3. Injection
```typescript
// REQUIRE: Parameterized queries ALWAYS
await prisma.user.findFirst({ where: { email } });
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// BLOCK: String concatenation
`SELECT * FROM users WHERE email = '${email}'`;  // SQL INJECTION!
```

### 4. Insecure Design
```typescript
// REQUIRE: Rate limiting + account lockout
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5/min
@Post('login')
async login(@Body() credentials: LoginDto) {
  const attempts = await this.getFailedAttempts(credentials.email);
  if (attempts >= 5) throw new TooManyAttemptsError('Locked 15 min');
}
```

### 5. Security Misconfiguration
```typescript
// REQUIRE: Secure headers
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// REQUIRE: Secure cookies
{ httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600000 }

// REQUIRE: Generic error responses
res.status(500).json({ error: 'Internal error', requestId: req.id });

// BLOCK: Exposing internals
res.status(500).json({ error: err.stack });  // Leaks info!
```

### 6. Vulnerable Components
```bash
# REQUIRE: Regular vulnerability checks
npm audit
npx snyk test
# CI/CD should fail on critical vulnerabilities
```

### 7. Authentication Failures
```typescript
// REQUIRE: Constant-time comparison for secrets
import { timingSafeEqual } from 'crypto';
function verifyToken(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// BLOCK: Direct comparison (timing attack vulnerable)
if (token === expectedToken) { }
```

### 8. Data Integrity
```typescript
// REQUIRE: Verify webhook signatures
function verifyWebhook(payload: string, signature: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// BLOCK: Trusting unverified external data
app.post('/webhook', (req, res) => {
  processPayment(req.body);  // No verification!
});
```

### 9. Logging & Monitoring
```typescript
// REQUIRE: Log security events
logger.warn('Login failed', { email, ip: req.ip, timestamp: new Date() });
logger.info('Login successful', { userId: user.id, ip: req.ip });

// BLOCK: Logging sensitive data
logger.info('Login', { email, password });  // NEVER passwords!
logger.info('Payment', { cardNumber });     // NEVER card numbers!
```

### 10. SSRF Prevention
```typescript
// REQUIRE: URL allowlist + internal IP blocking
const ALLOWED_HOSTS = ['api.stripe.com', 'api.sendgrid.com'];

async function fetchExternal(url: string) {
  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.includes(parsed.host)) throw new Error('Not allowed');
  if (isPrivateIP(parsed.hostname)) throw new Error('Internal blocked');
  return fetch(url);
}

// BLOCK: Fetching arbitrary URLs
const data = await fetch(req.query.url);  // SSRF!
```

## Input Validation

```typescript
// REQUIRE: Validate at system boundaries
class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(100) password: string;
  @IsString() @MaxLength(50) @Matches(/^[a-zA-Z\s]+$/) name: string;
}

// REQUIRE: Sanitize output (XSS prevention)
import { escape } from 'lodash';
const safe = escape(userContent);  // Escapes < > & " '
```

**This skill applies to: passwords, tokens, user data, external APIs, database queries, file uploads.**
