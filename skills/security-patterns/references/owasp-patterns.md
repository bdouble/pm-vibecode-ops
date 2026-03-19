# OWASP Top 10:2025 Prevention Patterns

Detailed code patterns for preventing each OWASP Top 10:2025 vulnerability.

## A01:2025 Broken Access Control

Includes SSRF prevention (previously standalone A10:2021, now merged into Access Control).

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

### SSRF Prevention (merged from A10:2021)

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

## A02:2025 Security Misconfiguration

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

## A03:2025 Software Supply Chain Failures

Expanded scope from A06:2021 "Vulnerable Components" to cover the full software supply chain.

```bash
# REQUIRE: Use npm ci (not npm install) for reproducible builds
npm ci

# REQUIRE: Regular vulnerability checks in CI
npm audit --audit-level=high
npx snyk test

# REQUIRE: Lockfile integrity verification
# CI/CD should fail if lockfile is out of sync with package.json
npm ci --ignore-scripts  # Install deps without running scripts first
npm audit               # Then audit

# REQUIRE: Pin exact dependency versions in production
# package.json — avoid ranges in production apps
"dependencies": {
  "express": "4.21.2",    // Exact version, not "^4.21.2"
  "prisma": "6.4.1"       // Exact version, not "~6.4.1"
}
```

```typescript
// REQUIRE: SBOM awareness — know what you ship
// Generate a Software Bill of Materials for every release
// package.json script:
// "sbom": "npx @cyclonedx/cyclonedx-npm --output-file sbom.json"

// REQUIRE: Typosquatting prevention — verify package names
// Before adding a new dependency, check:
// 1. Official npm page: https://www.npmjs.com/package/<name>
// 2. GitHub repository link matches expected org
// 3. Download count is reasonable (not suspiciously low)
// 4. Package name matches the official docs exactly

// BLOCK: Installing unverified packages
// npm install expresss        // Typosquatted "express"
// npm install lodash-utils    // Fake package mimicking lodash

// REQUIRE: Artifact signing concepts — verify published packages
// Use npm provenance when publishing
// "scripts": { "publish": "npm publish --provenance" }

// REQUIRE: Audit in CI pipeline
// .github/workflows/security.yml:
// - name: Security Audit
//   run: |
//     npm ci
//     npm audit --audit-level=high
//     npx snyk test
//   # Fail the build on critical/high vulnerabilities
```

## A04:2025 Cryptographic Failures

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

## A05:2025 Injection

```typescript
// REQUIRE: Parameterized queries ALWAYS
await prisma.user.findFirst({ where: { email } });
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// BLOCK: String concatenation
`SELECT * FROM users WHERE email = '${email}'`;  // SQL INJECTION!
```

## A06:2025 Insecure Design

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

## A07:2025 Authentication Failures

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

## A08:2025 Software and Data Integrity Failures

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

## A09:2025 Logging and Alerting Failures

```typescript
// REQUIRE: Log security events
logger.warn('Login failed', { email, ip: req.ip, timestamp: new Date() });
logger.info('Login successful', { userId: user.id, ip: req.ip });

// REQUIRE: Alert on suspicious activity patterns
if (failedLoginCount > threshold) {
  alertSecurityTeam({ type: 'brute_force_attempt', ip: req.ip });
}

// BLOCK: Logging sensitive data
logger.info('Login', { email, password });  // NEVER passwords!
logger.info('Payment', { cardNumber });     // NEVER card numbers!
```

## A10:2025 Mishandling of Exceptional Conditions

New category in OWASP Top 10:2025. Covers failures to properly handle errors, edge cases, and exceptional states.

```typescript
// REQUIRE: Fail-safe defaults — deny by default on error
function checkAccess(user: User, resource: Resource): boolean {
  try {
    return evaluatePolicy(user, resource);
  } catch (error) {
    logger.error('Access check failed', { userId: user.id, error: error.message });
    return false;  // DENY on failure — fail-safe
  }
}

// BLOCK: Fail-open on error
function checkAccess(user: User, resource: Resource): boolean {
  try {
    return evaluatePolicy(user, resource);
  } catch (error) {
    return true;  // GRANTS ACCESS on failure — fail-open!
  }
}
```

```typescript
// REQUIRE: Centralized error handling — consistent, safe responses
class AppErrorHandler {
  handle(error: Error, req: Request, res: Response): void {
    const requestId = crypto.randomUUID();

    // Log full details internally
    logger.error('Unhandled error', {
      requestId,
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });

    // Return safe response to client — never expose internals
    if (error instanceof ValidationError) {
      res.status(400).json({ error: 'Invalid input', requestId });
    } else if (error instanceof AuthenticationError) {
      res.status(401).json({ error: 'Unauthorized', requestId });
    } else {
      res.status(500).json({ error: 'Internal error', requestId });
    }
  }
}

// BLOCK: Ad-hoc error handling that leaks details
app.get('/api/data', async (req, res) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });  // Leaks internals!
  }
});
```

```typescript
// REQUIRE: NULL/undefined handling — never trust optional values
function getDiscount(user: User | null): number {
  if (!user) return 0;  // Explicit null handling
  if (!user.subscription) return 0;  // Explicit undefined handling
  return user.subscription.discountPercent ?? 0;  // Nullish coalescing
}

// BLOCK: Unguarded property access
function getDiscount(user: User): number {
  return user.subscription.discountPercent;  // TypeError if null/undefined!
}
```

```typescript
// REQUIRE: Resource cleanup with try/finally
async function processFile(path: string): Promise<void> {
  const handle = await fs.open(path, 'r');
  try {
    const content = await handle.readFile('utf-8');
    await processContent(content);
  } finally {
    await handle.close();  // Always close, even on error
  }
}

// REQUIRE: Database connection cleanup
async function executeQuery<T>(query: () => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    return await query();
  } finally {
    connection.release();  // Always release back to pool
  }
}
```

```typescript
// REQUIRE: Unhandled promise rejection handling
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  // Graceful shutdown — do not silently continue
  process.exit(1);
});

// REQUIRE: Explicit promise error handling
async function fetchUserData(userId: string): Promise<UserData> {
  const [profile, preferences] = await Promise.all([
    fetchProfile(userId).catch((err) => {
      logger.error('Profile fetch failed', { userId, error: err.message });
      throw new ServiceError('Failed to load user profile');
    }),
    fetchPreferences(userId).catch((err) => {
      logger.error('Preferences fetch failed', { userId, error: err.message });
      throw new ServiceError('Failed to load user preferences');
    }),
  ]);
  return { profile, preferences };
}

// BLOCK: Swallowing errors silently
async function fetchUserData(userId: string): Promise<UserData | null> {
  try {
    return await fetchFromApi(userId);
  } catch {
    return null;  // Silent failure — caller has no idea something went wrong
  }
}
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
