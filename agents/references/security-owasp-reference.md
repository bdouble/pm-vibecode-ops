# OWASP Top 10 2021 Security Assessment Reference

Detailed vulnerability patterns, code examples, and assessment checklists for each OWASP Top 10 category. This file is the authoritative reference for the Security Engineer Agent's OWASP assessments.

> **Note**: This references OWASP Top 10 2021, the current version as of 2025. Always verify against https://owasp.org/Top10/ for any updates.

---

## 1. Broken Access Control

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

**Assessment Checklist:**
- [ ] Authentication enforcement on all endpoints
- [ ] Role-based access control (RBAC) implementation
- [ ] Indirect object reference protection
- [ ] Privilege escalation prevention
- [ ] Secure session management
- [ ] CORS configuration validation

---

## 2. Cryptographic Failures

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

## 3. Injection Vulnerabilities

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

## 4. Insecure Design

**Assessment Areas:**
- Threat modeling documentation
- Security requirements definition
- Secure design patterns usage
- Defense in depth implementation
- Fail-safe defaults
- Principle of least privilege

---

## 5. Security Misconfiguration

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

---

## 6. Vulnerable and Outdated Components

**Assessment Process:**
- Dependency vulnerability scanning (`npm audit`, `snyk test`)
- License compliance verification
- Component version analysis
- Known vulnerability database checks (CVE, NVD)
- Supply chain security validation

---

## 7. Identification and Authentication Failures

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

## 8. Software and Data Integrity Failures

**Assessment Areas:**
- Code signing and integrity verification
- CI/CD pipeline security
- Secure deserialization practices
- Auto-update security
- Subresource integrity (SRI) for CDN assets

---

## 9. Security Logging and Monitoring Failures

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

---

## 10. Server-Side Request Forgery (SSRF)

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
