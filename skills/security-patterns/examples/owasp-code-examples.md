# OWASP Security Pattern Code Examples

## A01: Broken Access Control

```typescript
// BLOCK — Missing authorization check
app.get('/api/users/:id', async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(user); // Anyone can access any user!
});

// REQUIRE — Authorization verified
app.get('/api/users/:id', authMiddleware, async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    throw new ForbiddenError('Cannot access other users');
  }
  const user = await userService.findById(req.params.id);
  res.json(user);
});
```

## A02: Cryptographic Failures

```typescript
// BLOCK — Sensitive data in logs
logger.info('User login', { email, password }); // Password logged!

// REQUIRE — Sensitive fields excluded
logger.info('User login', { email, timestamp: new Date() });
```

## A03: Injection

```typescript
// BLOCK — String interpolation in queries
const result = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);

// REQUIRE — Parameterized queries
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

## A07: Authentication Failures

```typescript
// BLOCK — No rate limiting on auth
app.post('/api/login', async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

// REQUIRE — Rate limiting on sensitive endpoints
app.post('/api/login', rateLimiter({ max: 5, window: '15m' }), async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});
```

## A09: Logging Failures

```typescript
// BLOCK — No security event logging
async function deleteUser(userId: string) {
  await userRepository.delete(userId);
}

// REQUIRE — Security events logged
async function deleteUser(userId: string, performedBy: string) {
  securityLogger.warn('User deletion', { targetUser: userId, performedBy, timestamp: new Date() });
  await userRepository.delete(userId);
}
```
