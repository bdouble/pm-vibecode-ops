# OWASP Top 10:2025 Security Assessment Reference

Detailed vulnerability patterns, code examples, and assessment checklists for each OWASP Top 10:2025 category. This file is the authoritative reference for the Security Engineer Agent's OWASP assessments.

> **Note**: This references OWASP Top 10:2025. Always verify against https://owasp.org/Top10/ for any updates.

---

## A01:2025 Broken Access Control

Now includes SSRF prevention (previously standalone A10:2021).

```javascript
// CRITICAL: Verify authentication on every protected endpoint
if (!req.user || !isValidToken(req.user.token)) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// CRITICAL: Implement proper authorization checks
const hasAccess = await checkResourceAccess(req.user, resource);
if (!hasAccess) {
  return res.status(403).json({ error: 'Forbidden' });
}

// CRITICAL: Validate token expiration and refresh
if (isTokenExpired(token)) {
  if (!canRefresh(token)) {
    return res.status(401).json({ error: 'Session expired' });
  }
  token = await refreshToken(token);
}
```

### SSRF Prevention (merged from A10:2021)

```javascript
// URL validation and allowlisting
const allowedDomains = ['api.trusted.com', 'cdn.myservice.com'];
const url = new URL(userProvidedUrl);
if (!allowedDomains.includes(url.hostname)) {
  throw new Error('Invalid URL domain');
}

// Prevent internal network access
if (isInternalIP(url.hostname)) {
  throw new Error('Internal network access forbidden');
}
```

**Assessment Checklist:**
- [ ] Authentication enforcement on all endpoints
- [ ] Role-based access control (RBAC) implementation
- [ ] Indirect object reference protection
- [ ] Privilege escalation prevention
- [ ] Secure session management
- [ ] CORS configuration validation
- [ ] URL allowlisting for outbound requests
- [ ] Internal network access prevention (SSRF)
- [ ] DNS rebinding protection

---

## A02:2025 Security Misconfiguration

Moved up from A05:2021 to reflect increased prevalence.

```javascript
// Security headers configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{random}'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      geolocation: ["'none'"],
      camera: ["'none'"],
      microphone: ["'none'"],
    },
  },
}));
```

**Assessment Checklist:**
- [ ] Security headers configured (CSP, HSTS, X-Content-Type-Options)
- [ ] Debug mode disabled in production
- [ ] Default credentials changed
- [ ] Directory listing disabled
- [ ] Error pages do not expose stack traces
- [ ] Unnecessary features and services disabled
- [ ] Permissions policy restricts browser APIs

---

## A03:2025 Software Supply Chain Failures

Expanded scope from A06:2021 "Vulnerable and Outdated Components" to cover the full software supply chain.

```bash
# REQUIRED: Dependency audit in CI pipeline
npm audit --audit-level=high
npx snyk test
npx @socketsecurity/cli scan

# REQUIRED: Use npm ci for reproducible, locked builds
npm ci --prefer-offline  # Use ci not install in production

# REQUIRED: Lockfile integrity verification
# CI should fail if package-lock.json is out of sync
npm ci  # Fails automatically if lockfile does not match package.json
```

```javascript
// REQUIRED: Pin exact versions in production
// package.json — no ranges for production dependencies
{
  "dependencies": {
    "express": "4.21.2",      // Exact, not "^4.21.2"
    "@nestjs/core": "10.4.15" // Exact, not "~10.4.15"
  }
}

// REQUIRED: Subresource Integrity for CDN assets
// <script src="https://cdn.example.com/lib.js"
//   integrity="sha384-abc123..."
//   crossorigin="anonymous"></script>
```

```bash
# REQUIRED: Generate SBOM for release tracking
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# REQUIRED: Typosquatting prevention before adding dependencies
# 1. Verify official npm page: https://www.npmjs.com/package/<name>
# 2. Confirm GitHub repo matches expected organization
# 3. Check download counts — suspiciously low is a red flag
# 4. Compare package name letter-by-letter with official docs
```

**Assessment Checklist:**
- [ ] Dependency vulnerability scanning (`npm audit`, `snyk test`)
- [ ] Lockfile integrity verification (CI uses `npm ci`)
- [ ] Exact version pinning for production dependencies
- [ ] License compliance verification
- [ ] Known vulnerability database checks (CVE, NVD)
- [ ] SBOM generation for releases
- [ ] Typosquatting review for new dependencies
- [ ] Artifact provenance verification
- [ ] CI pipeline fails on critical/high vulnerabilities

---

## A04:2025 Cryptographic Failures

Moved from A02:2021 to reflect updated risk ranking.

```javascript
// REQUIRED: Strong password hashing with salt
const hashedPassword = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
});

// REQUIRED: Cryptographically secure randomness
const token = crypto.randomBytes(32).toString('base64url');

// REQUIRED: Proper encryption for sensitive data
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  data
);
```

**Assessment Checklist:**
- [ ] Strong hashing algorithms (Argon2, bcrypt >= 12 rounds, scrypt)
- [ ] No hardcoded secrets or keys
- [ ] Secure random generation (crypto, not Math.random)
- [ ] TLS/HTTPS enforcement
- [ ] Encrypted data at rest and in transit
- [ ] Proper key management and rotation

---

## A05:2025 Injection Vulnerabilities

Moved from A03:2021 to reflect updated risk ranking.

```javascript
// CRITICAL: Use parameterized queries
const user = await db.query(
  'SELECT * FROM users WHERE email = $1 AND active = $2',
  [email, true]
);

// CRITICAL: Comprehensive input validation
const validator = z.object({
  email: z.string().email().max(255),
  username: z.string().regex(/^[a-zA-Z0-9_-]+$/).min(3).max(30),
  age: z.number().int().min(13).max(120),
  url: z.string().url().startsWith('https://'),
  file: z.instanceof(File).refine(
    (file) => file.size <= 5 * 1024 * 1024,
    'File must be less than 5MB'
  ),
});

// CRITICAL: Context-aware output encoding
const safeHtml = DOMPurify.sanitize(userContent, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
  ALLOWED_ATTR: []
});
```

**Assessment Checklist:**
- [ ] SQL injection prevention (parameterized queries)
- [ ] NoSQL injection protection
- [ ] Command injection prevention
- [ ] XSS protection (input sanitization, output encoding)
- [ ] XXE prevention in XML processing
- [ ] LDAP/OS command injection protection
- [ ] Path traversal prevention
- [ ] Template injection protection

---

## A06:2025 Insecure Design

Moved from A04:2021 to reflect updated risk ranking.

**Assessment Areas:**
- Threat modeling documentation
- Security requirements definition
- Secure design patterns usage
- Defense in depth implementation
- Fail-safe defaults
- Principle of least privilege

---

## A07:2025 Authentication Failures

```javascript
// Multi-factor authentication
const mfaValid = await verifyTOTP(user.secret, token);
if (!mfaValid) {
  return res.status(401).json({ error: 'Invalid MFA token' });
}

// Account lockout mechanism
if (failedAttempts >= 5) {
  await lockAccount(userId, 30 * 60 * 1000); // 30 minutes
  return res.status(429).json({ error: 'Account locked' });
}

// Secure password requirements
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  checkBreachedPasswords: true,
};
```

---

## A08:2025 Software and Data Integrity Failures

**Assessment Areas:**
- Code signing and integrity verification
- CI/CD pipeline security
- Secure deserialization practices
- Auto-update security
- Subresource integrity (SRI) for CDN assets

---

## A09:2025 Logging and Alerting Failures

Renamed from "Security Logging and Monitoring Failures" to emphasize alerting requirements.

```javascript
// Comprehensive security logging
logger.security({
  event: 'authentication_failure',
  userId: attemptedUserId,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: Date.now(),
  details: { reason: 'invalid_password' }
});

// Alerting for suspicious activity
if (isSuspiciousActivity(req)) {
  await alertSecurityTeam({
    type: 'potential_attack',
    details: extractRequestContext(req)
  });
}
```

**Assessment Checklist:**
- [ ] Security events are logged with sufficient detail
- [ ] Alerting configured for suspicious activity patterns
- [ ] Audit trails for sensitive operations
- [ ] No sensitive data (passwords, tokens, PII) in logs
- [ ] Log integrity protection (append-only, centralized)

---

## A10:2025 Mishandling of Exceptional Conditions

New category in OWASP Top 10:2025. Covers failures to properly handle errors, edge cases, and exceptional states that can lead to security vulnerabilities.

```javascript
// CRITICAL: Fail-safe defaults — deny access on error
function checkAccess(user, resource) {
  try {
    return evaluatePolicy(user, resource);
  } catch (error) {
    logger.error('Access check failed', { userId: user.id, error: error.message });
    return false;  // DENY on failure — fail-safe
  }
}

// ANTI-PATTERN: Fail-open on error
function checkAccess(user, resource) {
  try {
    return evaluatePolicy(user, resource);
  } catch (error) {
    return true;  // GRANTS ACCESS on failure — fail-open!
  }
}
```

```javascript
// CRITICAL: Centralized error handler — consistent, safe responses
function errorHandler(error, req, res, next) {
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
    return res.status(400).json({ error: 'Invalid input', requestId });
  }
  if (error instanceof AuthenticationError) {
    return res.status(401).json({ error: 'Unauthorized', requestId });
  }
  return res.status(500).json({ error: 'Internal error', requestId });
}

// ANTI-PATTERN: Leaking error details to client
app.get('/api/data', async (req, res) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });  // Leaks internals!
  }
});
```

```javascript
// CRITICAL: Resource cleanup with try/finally
async function processFile(path) {
  const handle = await fs.promises.open(path, 'r');
  try {
    const content = await handle.readFile('utf-8');
    return await processContent(content);
  } finally {
    await handle.close();  // Always close, even on error
  }
}

// CRITICAL: Unhandled promise rejection handling
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);  // Graceful shutdown — do not silently continue
});
```

**Assessment Checklist:**
- [ ] Fail-safe defaults on all security-critical error paths
- [ ] Centralized error handling with safe responses
- [ ] No stack traces or internal details exposed to clients
- [ ] NULL/undefined guards on security-critical paths
- [ ] Resource cleanup (connections, file handles) via try/finally
- [ ] Unhandled promise rejection handler configured
- [ ] No silent error swallowing (catch blocks that return null without logging)
- [ ] Graceful degradation with appropriate error reporting

---

## Generic Security Anti-Patterns to Detect

### Configuration & Secret Management Anti-Patterns
```javascript
// ANTI-PATTERN: Broadcasting sensitive configuration
eventBus.emit('config.loaded', fullConfig); // May contain secrets

// PATTERN: Emit only safe metadata
eventBus.emit('config.loaded', {
  features: extractFeatureFlags(fullConfig),
  version: CONFIG_VERSION
});

// ANTI-PATTERN: Throwing on optional configuration
get optionalSecret() {
  if (!this._secret) throw new Error('Not configured');
  return this._secret;
}

// PATTERN: Graceful optional handling
get optionalSecret() {
  return this._secret || null;
}
```

### External Service Security Patterns
```javascript
// ANTI-PATTERN: Assuming webhook signature format
const [version, signature] = header.split(','); // Assumes comma

// PATTERN: Flexible signature parsing
function parseSignature(header) {
  // Handle multiple common formats
  const separators = ['=', ',', ' '];
  for (const sep of separators) {
    if (header.includes(sep)) {
      return header.split(sep);
    }
  }
}

// ANTI-PATTERN: No replay protection
async function handleWebhook(id, payload) {
  // Process immediately
}

// PATTERN: Idempotency tracking
const processed = new Set();
async function handleWebhook(id, payload) {
  if (processed.has(id)) return; // Prevent replay
  processed.add(id);
  // Process
}
```

### Data Flow Security Patterns
```javascript
// ANTI-PATTERN: Raw error logging
logger.error('Operation failed', error); // May leak sensitive data

// PATTERN: Sanitized error logging
logger.error('Operation failed', sanitizeError(error));

function sanitizeError(error) {
  return {
    message: error.message,
    code: error.code,
    type: error.constructor.name
    // Explicitly exclude: stack, context, data
  };
}
```

### Module Dependency Security
```javascript
// ANTI-PATTERN: Implicit global dependency
class Service {
  constructor() {
    // Assumes ConfigModule is globally available
    this.config = getGlobalConfig();
  }
}

// PATTERN: Explicit dependency injection
class Service {
  constructor(private config: ConfigService) {
    // Explicitly injected
  }
}
```
