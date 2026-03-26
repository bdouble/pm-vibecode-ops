# STRIDE Threat Model Reference

Practical threat modeling reference for the Security Engineer Agent. Use this to systematically assess threats against components identified during security review.

> **Methodology**: STRIDE was developed at Microsoft to categorize security threats. Each letter represents a threat type mapped to a security property it violates. Apply STRIDE per-component (auth service, API endpoint, data store, background job) rather than per-system.

---

## Quick Reference

| Threat | Violated Property | One-Line Check |
|--------|-------------------|----------------|
| **S**poofing | Authentication | Can an attacker pretend to be someone else? |
| **T**ampering | Integrity | Can an attacker modify data they should not? |
| **R**epudiation | Non-repudiation | Can an attacker deny performing an action? |
| **I**nformation Disclosure | Confidentiality | Can an attacker access data they should not see? |
| **D**enial of Service | Availability | Can an attacker degrade or kill the service? |
| **E**levation of Privilege | Authorization | Can an attacker gain higher permissions? |

---

## S - Spoofing

**What it is:** An attacker assumes the identity of another user, service, or component.

### What to Check

- **Authentication mechanisms**: Are credentials validated on every request, not just at login?
- **Token handling**: Are JWTs verified with proper signature checks, expiration, and audience claims?
- **Service-to-service auth**: Do internal services authenticate each other, or does any caller get trusted?
- **Session management**: Can session tokens be predicted, replayed, or stolen?
- **Certificate validation**: Is TLS certificate pinning or validation enforced for external calls?

### Common Vulnerabilities

```
# Missing auth middleware on new endpoints
router.get('/api/admin/users', getUserList);          // BAD: no auth
router.get('/api/admin/users', requireAuth, getUserList); // GOOD

# JWT without signature verification
jwt.decode(token);           // BAD: decodes without verifying
jwt.verify(token, secret);   // GOOD: verifies signature

# Trusting X-Forwarded-For without proxy validation
const userIP = req.headers['x-forwarded-for'];  // BAD: spoofable
const userIP = req.connection.remoteAddress;     // Better behind trusted proxy

# Hardcoded API keys in service-to-service calls
fetch(url, { headers: { 'X-API-Key': 'static-key-123' } });  // BAD
```

### Mitigations

- [ ] Multi-factor authentication for sensitive operations
- [ ] Short-lived tokens with refresh rotation
- [ ] Mutual TLS (mTLS) for service-to-service communication
- [ ] Rate limiting on authentication endpoints
- [ ] Account lockout after repeated failures
- [ ] Session invalidation on password change

### Detection Commands

```bash
# Find endpoints missing auth middleware
grep -rn "router\.\(get\|post\|put\|delete\|patch\)" --include="*.ts" --include="*.js" | grep -v "auth\|Auth\|middleware\|protect\|guard"

# Find raw JWT decode without verify
grep -rn "jwt\.decode\|jwtDecode" --include="*.ts" --include="*.js"

# Find hardcoded API keys or tokens
grep -rn "api.key\|apiKey\|API_KEY\|Bearer " --include="*.ts" --include="*.js" | grep -v "process\.env\|config\.\|\.env"
```

---

## T - Tampering

**What it is:** An attacker modifies data in transit, at rest, or in processing.

### What to Check

- **Input validation**: Are all user inputs validated and sanitized before processing?
- **Request integrity**: Can request bodies, headers, or query params be modified in transit?
- **Database writes**: Are write operations protected by authorization checks?
- **File uploads**: Are uploaded files validated for type, size, and content?
- **Configuration**: Can environment variables or config files be modified at runtime?

### Common Vulnerabilities

```
# Mass assignment - accepting raw request body into model
const user = await User.create(req.body);  // BAD: attacker can set role=admin
const user = await User.create({           // GOOD: explicit fields
  name: req.body.name,
  email: req.body.email,
});

# Missing input validation
app.post('/transfer', (req, res) => {
  transferFunds(req.body.from, req.body.to, req.body.amount);  // BAD
});

# Unsigned cookies
res.cookie('role', 'user');         // BAD: client can change to 'admin'
res.cookie('role', 'user', { signed: true, httpOnly: true }); // GOOD

# SQL injection via string concatenation
db.query(`SELECT * FROM users WHERE id = ${userId}`);           // BAD
db.query('SELECT * FROM users WHERE id = $1', [userId]);        // GOOD
```

### Mitigations

- [ ] Schema validation on all API inputs (zod, joi, JSON Schema)
- [ ] Parameterized queries for all database operations
- [ ] Allowlist fields for mass assignment protection
- [ ] HMAC or digital signatures on sensitive data
- [ ] Content-Type validation on file uploads (check magic bytes, not just extension)
- [ ] Immutable audit fields (createdBy, updatedAt managed server-side)
- [ ] CSP headers to prevent script injection

### Detection Commands

```bash
# Find potential mass assignment
grep -rn "\.create(req\.body)\|\.update(req\.body)\|Object\.assign.*req\.body" --include="*.ts" --include="*.js"

# Find string concatenation in queries
grep -rn "query(\`.*\${\|query(\".*\" +" --include="*.ts" --include="*.js"

# Find missing input validation on route handlers
grep -rn "req\.body\.\|req\.query\.\|req\.params\." --include="*.ts" --include="*.js" | grep -v "valid\|sanitiz\|schema\|parse\|zod\|joi"

# Find unsafe cookie settings
grep -rn "\.cookie(" --include="*.ts" --include="*.js" | grep -v "httpOnly\|secure\|signed"
```

---

## R - Repudiation

**What it is:** An attacker performs an action and there is no way to prove they did it.

### What to Check

- **Audit logging**: Are security-relevant actions logged with who, what, when, where?
- **Log integrity**: Can logs be tampered with or deleted by the actors being logged?
- **Transaction records**: Are financial or state-changing operations recorded immutably?
- **Authentication events**: Are logins, logouts, failures, and privilege changes logged?
- **Log completeness**: Do logs capture enough context to reconstruct what happened?

### Common Vulnerabilities

```
# Action without audit trail
async function deleteUser(userId) {
  await db.users.delete(userId);  // BAD: no record of who deleted or when
}

# Logging without actor identity
logger.info('User updated');              // BAD: who updated what?
logger.info('User updated', {             // GOOD: full context
  actor: req.user.id,
  target: userId,
  changes: diff,
  ip: req.ip,
  timestamp: new Date().toISOString(),
});

# Mutable logs (application writes to local file it can also delete)
fs.appendFileSync('/var/log/app.log', entry);  // BAD: app can delete this file

# Missing failure logging
try {
  await authenticate(credentials);
} catch (e) {
  return res.status(401).send();  // BAD: failed auth attempt not logged
}
```

### Mitigations

- [ ] Structured audit logging for all state-changing operations
- [ ] Include actor ID, target, action, timestamp, source IP in every audit entry
- [ ] Ship logs to immutable external store (CloudWatch, Datadog, SIEM)
- [ ] Log authentication successes AND failures
- [ ] Log authorization failures (access denied events)
- [ ] Separate audit logs from application logs
- [ ] Tamper-evident logging (append-only, signed entries)

### Detection Commands

```bash
# Find state-changing operations without logging
grep -rn "\.delete\|\.update\|\.create\|\.destroy\|\.remove" --include="*.ts" --include="*.js" | grep -v "log\|audit\|logger\|event"

# Check for logging that lacks actor context
grep -rn "logger\.\(info\|warn\|error\)" --include="*.ts" --include="*.js" | grep -v "user\|actor\|userId\|req\."

# Find catch blocks that swallow errors silently
grep -rn -A2 "catch" --include="*.ts" --include="*.js" | grep -v "log\|throw\|console\|report"
```

---

## I - Information Disclosure

**What it is:** An attacker gains access to data they are not authorized to see.

### What to Check

- **Error messages**: Do error responses reveal stack traces, internal paths, or DB schema?
- **API responses**: Are responses filtered to include only authorized fields?
- **Logs**: Do logs contain PII, credentials, or tokens?
- **Source exposure**: Are source maps, .env files, or config files accessible?
- **Headers**: Do response headers reveal server software, versions, or internal topology?
- **Timing attacks**: Do operations leak information through response time differences?

### Common Vulnerabilities

```
# Verbose error messages in production
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack });  // BAD: leaks internals
});
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal server error' });  // GOOD
});

# Returning full database objects
app.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);  // BAD: includes password hash, internal flags, etc.
});

# Logging sensitive data
logger.info('Login attempt', { email, password });  // BAD
logger.info('Login attempt', { email });             // GOOD

# Exposed server headers
// Response: X-Powered-By: Express, Server: nginx/1.19.0  // BAD
app.disable('x-powered-by');  // GOOD
```

### Mitigations

- [ ] Generic error messages in production (no stack traces, no SQL errors)
- [ ] Response DTOs or serializers that explicitly include only allowed fields
- [ ] Scrub PII and secrets from all log output
- [ ] Remove server version headers (X-Powered-By, Server)
- [ ] Disable source maps in production
- [ ] Block access to dotfiles and config files (.env, .git, etc.)
- [ ] Constant-time comparison for secrets (prevent timing attacks)

### Detection Commands

```bash
# Find error handlers that expose internals
grep -rn "err\.stack\|err\.message\|error\.stack" --include="*.ts" --include="*.js" | grep -i "res\.\|response\."

# Find responses returning raw DB objects
grep -rn "res\.json(.*find\|res\.send(.*find" --include="*.ts" --include="*.js"

# Find sensitive data in logs
grep -rn "log.*password\|log.*secret\|log.*token\|log.*apiKey" --include="*.ts" --include="*.js" -i

# Find exposed server info headers
grep -rn "x-powered-by\|server:" --include="*.ts" --include="*.js" --include="*.yaml" --include="*.yml" -i

# Check for source maps in build output
find . -name "*.map" -path "*/dist/*" -o -name "*.map" -path "*/build/*"
```

---

## D - Denial of Service

**What it is:** An attacker degrades or prevents legitimate use of the service.

### What to Check

- **Rate limiting**: Are public endpoints rate-limited?
- **Resource limits**: Are file uploads, query sizes, and payload sizes bounded?
- **Algorithmic complexity**: Can user input trigger expensive operations (regex, sorting, recursion)?
- **Connection handling**: Are connection pools, timeouts, and backpressure configured?
- **Queue flooding**: Can an attacker fill job queues with junk work?
- **Storage exhaustion**: Can an attacker fill disk with logs, uploads, or temp files?

### Common Vulnerabilities

```
# No rate limiting on public endpoint
app.post('/api/login', handleLogin);              // BAD: brute-forceable
app.post('/api/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), handleLogin); // GOOD

# Unbounded file upload
app.post('/upload', upload.single('file'));        // BAD: no size limit
app.post('/upload', upload.single('file', { limits: { fileSize: 5 * 1024 * 1024 } })); // GOOD: 5MB

# ReDoS-vulnerable regex
const emailRegex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z]{2,4})+$/;  // BAD
// Use a well-tested library like validator.js instead

# No query timeout
const results = await db.query(userProvidedQuery);  // BAD: could run forever
const results = await db.query(query, { timeout: 5000 });  // GOOD: 5s timeout

# Unbounded pagination
app.get('/api/items', async (req, res) => {
  const items = await Item.find().skip(req.query.offset).limit(req.query.limit); // BAD: limit=999999
});
```

### Mitigations

- [ ] Rate limiting on all public-facing endpoints
- [ ] Request payload size limits (body-parser, multer config)
- [ ] Query timeouts on all database operations
- [ ] Pagination caps (max page size enforced server-side)
- [ ] Connection pool limits and idle timeouts
- [ ] Regex complexity analysis (avoid nested quantifiers)
- [ ] Job queue concurrency limits and dead letter queues
- [ ] Disk usage monitoring and alerts

### Detection Commands

```bash
# Find endpoints without rate limiting
grep -rn "router\.\(get\|post\|put\|delete\)" --include="*.ts" --include="*.js" | grep -v "rateLimit\|rate_limit\|throttle"

# Find unbounded queries (no limit)
grep -rn "\.find(\|\.findMany(\|\.select(" --include="*.ts" --include="*.js" | grep -v "limit\|take\|first\|pageSize"

# Find potentially vulnerable regex patterns
grep -rn "new RegExp\|/.*[+*].*[+*]" --include="*.ts" --include="*.js"

# Find missing body size limits
grep -rn "bodyParser\|express\.json\|express\.urlencoded" --include="*.ts" --include="*.js" | grep -v "limit"

# Find upload handlers without size constraints
grep -rn "multer\|upload\.\(single\|array\|fields\)" --include="*.ts" --include="*.js" | grep -v "limits\|fileSize\|maxSize"
```

---

## E - Elevation of Privilege

**What it is:** An attacker gains access to capabilities beyond what they are authorized for.

### What to Check

- **Authorization checks**: Is authorization verified on every operation, not just UI visibility?
- **Role management**: Can users modify their own roles or permissions?
- **IDOR**: Can users access other users' resources by changing IDs in requests?
- **Admin endpoints**: Are admin functions protected by role checks, not just URL obscurity?
- **Dependency injection**: Can user input influence which code paths execute?
- **Default permissions**: Are new resources created with least-privilege defaults?

### Common Vulnerabilities

```
# Client-side-only authorization
// Frontend hides admin button, but API has no check
if (user.role === 'admin') { showAdminPanel(); }  // BAD: security by obscurity

# IDOR - no ownership check
app.get('/api/orders/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);  // BAD: any user can view any order
  res.json(order);
});
app.get('/api/orders/:id', async (req, res) => {
  const order = await Order.findOne({                  // GOOD: ownership check
    _id: req.params.id,
    userId: req.user.id,
  });
  res.json(order);
});

# Role escalation via mass assignment
app.put('/api/profile', async (req, res) => {
  await User.update(req.user.id, req.body);  // BAD: can set { role: 'admin' }
});

# Path traversal
app.get('/files/:name', (req, res) => {
  res.sendFile('/uploads/' + req.params.name);  // BAD: ../../etc/passwd
});
```

### Mitigations

- [ ] Server-side authorization on every endpoint (never rely on UI hiding alone)
- [ ] Ownership checks on all resource access (filter by user ID)
- [ ] Role/permission allowlists for field updates (never accept role from client)
- [ ] Path traversal prevention (resolve and validate file paths)
- [ ] Principle of least privilege for default roles and service accounts
- [ ] Separate admin API surface with additional auth requirements
- [ ] Regular privilege audits (who has access to what)

### Detection Commands

```bash
# Find routes potentially missing authorization
grep -rn "findById\|findOne\|findUnique" --include="*.ts" --include="*.js" | grep "req\.params\." | grep -v "req\.user\|userId\|ownerId\|createdBy"

# Find admin routes without role checks
grep -rn "/admin\|/internal" --include="*.ts" --include="*.js" | grep -v "role\|isAdmin\|requireAdmin\|authorize"

# Find path traversal risks
grep -rn "sendFile\|readFile\|createReadStream" --include="*.ts" --include="*.js" | grep "req\.params\|req\.query\|req\.body"

# Find potential role escalation via unprotected updates
grep -rn "\.update(.*req\.body\|\.patch(.*req\.body" --include="*.ts" --include="*.js"
```

---

## Threat Matrix Template

Use this matrix to systematically assess each component against all six threat types. Fill in risk level (H/M/L/N/A) and notes.

```
| Component              | S (Spoof) | T (Tamper) | R (Repud) | I (Info)  | D (DoS)   | E (EoP)   |
|------------------------|-----------|------------|-----------|-----------|------------|------------|
| Auth Service           |           |            |           |           |            |            |
| User API               |           |            |           |           |            |            |
| Admin API              |           |            |           |           |            |            |
| Public API             |           |            |           |           |            |            |
| Database               |           |            |           |           |            |            |
| File Storage           |           |            |           |           |            |            |
| Background Jobs        |           |            |           |           |            |            |
| Message Queue          |           |            |           |           |            |            |
| External Integrations  |           |            |           |           |            |            |
| CDN / Static Assets    |           |            |           |           |            |            |
```

**Risk Levels:**
- **H** (High): Exploitable with significant impact. Requires immediate mitigation.
- **M** (Medium): Exploitable with moderate impact or high impact but low likelihood.
- **L** (Low): Minimal risk but worth documenting.
- **N/A**: Threat type does not apply to this component.

---

## Common Patterns for Web Applications

### Authentication Flows

| Flow Step | Primary Threats | What to Check |
|-----------|----------------|---------------|
| Login form | S, D, I | Brute force protection, credential stuffing, timing leaks |
| Token issuance | S, T | Token signing, expiration, audience validation |
| Token storage | I, T | httpOnly cookies, no localStorage for tokens |
| Token refresh | S, E | Refresh token rotation, revocation on logout |
| Password reset | S, I | Rate limiting, token expiration, no user enumeration |
| OAuth callback | S, T | State parameter validation, PKCE for SPAs |
| Session logout | R, S | Server-side session invalidation, token blocklist |

### API Endpoints

| Endpoint Type | Primary Threats | What to Check |
|---------------|----------------|---------------|
| Public read | I, D | Rate limiting, response filtering, pagination caps |
| Authenticated read | I, E | Ownership checks, field-level access control |
| Create/write | T, E, R | Input validation, authorization, audit logging |
| Delete | T, R, E | Soft delete, ownership verification, audit trail |
| File upload | T, D | Size limits, type validation, malware scanning |
| Search | I, D | Query injection, result filtering, timeout limits |
| Webhook receiver | S, T | Signature verification, replay protection |

### Data Stores

| Store Type | Primary Threats | What to Check |
|------------|----------------|---------------|
| Primary database | T, I, E | Query parameterization, encryption at rest, access controls |
| Cache (Redis) | I, T | Authentication required, no sensitive data without TTL |
| Object storage (S3) | I, E | Bucket policies, signed URLs, public access blocks |
| Search index | I | Data filtered before indexing, access control on queries |
| Session store | S, T | Encryption, secure flags, expiration |

### Background Jobs

| Job Type | Primary Threats | What to Check |
|----------|----------------|---------------|
| Email sending | S, R, D | Sender verification, rate limits, bounce handling |
| Data processing | T, I | Input validation, output sanitization, least privilege |
| Scheduled tasks | E, R | Authentication for trigger, audit logging, idempotency |
| Queue consumers | D, T | Dead letter queues, message validation, concurrency limits |
| Cron jobs | E, R | Restricted execution environment, audit trail |

---

## Usage in Security Reviews

1. **Identify components** from the codebase under review (services, APIs, data stores, jobs)
2. **Fill in the threat matrix** for each component
3. **Prioritize**: Focus on H and M risks first
4. **Cross-reference with OWASP**: Map STRIDE findings to OWASP categories for standardized reporting
5. **Document mitigations**: For each identified threat, note existing controls and gaps

**STRIDE to OWASP Mapping:**
| STRIDE | OWASP Category |
|--------|----------------|
| Spoofing | A07 Authentication Failures |
| Tampering | A03 Injection, A08 Data Integrity Failures |
| Repudiation | A09 Security Logging and Monitoring Failures |
| Information Disclosure | A01 Broken Access Control, A02 Cryptographic Failures |
| Denial of Service | (Not directly in OWASP Top 10; assess independently) |
| Elevation of Privilege | A01 Broken Access Control |
