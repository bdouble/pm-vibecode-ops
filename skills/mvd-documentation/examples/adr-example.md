# Example: Architecture Decision Record

## ADR-001: Use Event-Driven Pattern for Cross-Module Communication

### Status
Accepted

### Context
The audit pipeline needs to notify multiple downstream consumers (email service, analytics, billing) when a pipeline run completes. Direct service coupling creates tight dependencies and makes it difficult to add new consumers.

### Decision
Use an event-driven pattern with EventEmitter for cross-module communication instead of direct service-to-service calls.

### Consequences

**Positive:**
- New consumers can subscribe without modifying the pipeline
- Services remain independently deployable
- Failure in one consumer doesn't block others

**Negative:**
- Harder to trace data flow (events are indirect)
- Need to ensure event payload schemas are documented
- Must monitor for unhandled events

### Alternatives Considered

1. **Direct service calls** — Rejected: tight coupling, single point of failure
2. **Message queue (RabbitMQ/SQS)** — Rejected: over-engineering for current scale
3. **Event-driven with EventEmitter** — Selected: right balance of decoupling and simplicity
