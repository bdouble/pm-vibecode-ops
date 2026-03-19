# OWASP Top 10 for Agentic Applications 2026
Last reviewed: 2026-03-19 | Review cadence: Quarterly
Source: OWASP GenAI Security Project - Agentic Security Initiative (genai.owasp.org)
License: CC BY-SA 4.0

This reference provides an assessment framework for reviewing agentic applications against the OWASP Top 10 for Agentic Applications. Use it when the target codebase contains AI agents, LLM-powered automation, MCP servers, multi-agent orchestration, or tool-calling patterns.

---

## ASI01: Agent Goal Hijack

**Description**: Attackers manipulate agent objectives through prompt injection, deceptive tool outputs, malicious artifacts, forged agent-to-agent messages, or poisoned external data. Agents cannot reliably distinguish legitimate instructions from attacker-controlled content, allowing adversaries to redirect agent behavior toward unintended goals.

**Common Vulnerabilities**:
- System prompts modifiable by user input or tool outputs
- No separation between instruction and data channels
- Agent accepts goal-changing directives from external data sources (RAG, web content, tool responses)
- Missing detection for goal drift across multi-turn interactions

**Key Prevention Patterns**:
- Treat all natural-language inputs as untrusted data
- Enforce least privilege for agent tools — agents should only access tools required for the current task
- Require human approval for goal-changing actions (scope expansion, new tool access, elevated permissions)
- Define and lock agent system prompts — prevent runtime modification
- Sanitize all connected data sources before injection into agent context
- Maintain comprehensive logging and monitoring of agent objectives over time

**Assessment Checklist**:
- [ ] System prompts are immutable and not influenced by user input or tool output
- [ ] Prompt injection safeguards exist on all input channels (user messages, tool responses, RAG content)
- [ ] Goal-drift detection monitors agent behavior across turns
- [ ] Human-in-the-loop gates exist for actions that change agent scope or objectives
- [ ] Agent cannot be instructed to ignore safety constraints via injected content

---

## ASI02: Tool Misuse and Exploitation

**Description**: Agents misuse legitimate tools due to prompt injection, misalignment, or unsafe delegation. This leads to data exfiltration, tool output manipulation, or workflow hijacking. Includes over-privileged tool access, unvalidated input forwarding to tools, loop amplification (DoS via repeated API calls), and tool name typosquatting.

**Common Vulnerabilities**:
- Tools granted broad permissions beyond what the task requires
- No input validation between agent reasoning and tool invocation
- Missing rate limits or budget caps on tool calls
- Tool schemas or names not verified against a trusted registry

**Key Prevention Patterns**:
- Least Agency and Least Privilege: define per-tool permission profiles scoped to the current task
- Require action-level authentication and human approval for destructive actions (delete, write, deploy)
- Enforce execution sandboxes and egress controls for tool environments
- Implement policy enforcement middleware ("Intent Gate") between agent decisions and tool execution
- Apply adaptive tool budgeting — cap total calls, cost, and rate per session
- Use just-in-time ephemeral credentials rather than persistent tool access tokens
- Validate tool identity semantically — verify tool name, description, and schema against a trusted manifest

**Assessment Checklist**:
- [ ] Each tool has a defined permission scope (read-only, write, admin) enforced at runtime
- [ ] Destructive tool actions require explicit human approval or elevated authentication
- [ ] Tool execution occurs in sandboxed environments with network egress controls
- [ ] Rate limits and budget caps prevent loop amplification and runaway costs
- [ ] Tool names and schemas are validated against a pinned, trusted registry

---

## ASI03: Identity and Privilege Abuse

**Description**: Exploits dynamic trust and delegation to escalate access. Includes un-scoped privilege inheritance (child agent inherits parent permissions), memory-based privilege retention (agent retains elevated access after task completes), cross-agent trust exploitation (confused deputy), TOCTOU attacks in agent workflows, and synthetic identity injection.

**Common Vulnerabilities**:
- Child agents inherit the full permission set of the parent
- Elevated permissions persist beyond the task that required them
- Agents trust other agents without verifying identity or authorization scope
- No per-action authorization — a single authentication grants blanket access

**Key Prevention Patterns**:
- Task-scoped, time-bound permissions with per-agent identities
- Isolate agent identities and contexts — no shared credential pools
- Mandate per-action authorization checks, not just per-session
- Require human-in-the-loop for any privilege escalation
- Bind permissions to a tuple of subject, resource, purpose, and duration

**Assessment Checklist**:
- [ ] Each agent operates under its own identity with scoped credentials
- [ ] Permissions are time-bound and expire when the task completes
- [ ] Privilege inheritance is explicitly scoped — child agents receive only required permissions
- [ ] Delegation chains are auditable and cannot be extended without authorization
- [ ] Per-action authorization is enforced, not just per-session authentication

---

## ASI04: Agentic Supply Chain Vulnerabilities

**Description**: Malicious or compromised third-party agents, tools, plugins, MCP servers, A2A registries, and prompt templates. Unlike traditional supply chain attacks on static dependencies, agentic ecosystems compose capabilities dynamically at runtime, expanding the attack surface to include runtime-discovered tools and agents.

**Common Vulnerabilities**:
- MCP servers loaded without provenance verification
- Tools discovered and invoked at runtime without integrity checks
- Prompt templates sourced from unverified repositories
- No content-hash pinning for agent dependencies
- Missing kill switch for emergency revocation of compromised components

**Key Prevention Patterns**:
- Require provenance verification and maintain SBOMs/AIBOMs for all agent components
- Implement dependency gatekeeping with typosquatting scanning for tools and plugins
- Run third-party agents and tools in sandboxed containers with limited access
- Place secure prompts and memory stores under version control
- Enforce mutual authentication (mTLS) for inter-agent communication
- Pin dependencies by content hash, not by name alone
- Maintain a supply chain kill switch for emergency revocation of compromised tools or agents

**Assessment Checklist**:
- [ ] All MCP servers and plugins have verified provenance and are loaded from trusted sources
- [ ] Tool and agent dependencies are pinned by content hash
- [ ] Third-party components run in isolated sandboxes
- [ ] A revocation mechanism exists for compromised components
- [ ] Prompt templates are version-controlled and reviewed before deployment

---

## ASI05: Unexpected Code Execution (RCE)

**Description**: Agentic systems generate and execute code as part of their workflow. Attackers exploit this for remote code execution via prompt injection leading to shell commands, code hallucination embedding backdoors, unsafe deserialization, multi-tool chain exploitation, and memory system eval() abuse.

**Common Vulnerabilities**:
- Agent-generated code executed without review or static analysis
- Use of eval(), exec(), or dynamic code compilation with agent-produced strings
- No separation between code generation and code execution stages
- Deserialization of untrusted data within agent workflows

**Key Prevention Patterns**:
- Sanitize all inputs to and outputs from code execution tools
- Ban eval, exec, and dynamic compilation in production agent workflows
- Execute agent-generated code in sandboxes with strict resource limits (CPU, memory, network, filesystem)
- Separate code generation from execution with a validation gate (static analysis, human review) in between
- Require human approval for elevated execution contexts (root, admin, production environments)

**Assessment Checklist**:
- [ ] No eval() or exec() with agent-generated or user-influenced content
- [ ] Code generation and code execution are separate stages with validation between them
- [ ] Execution sandboxes enforce resource limits and network isolation
- [ ] Static analysis runs on generated code before execution
- [ ] Human approval is required for code execution in elevated contexts

---

## ASI06: Memory and Context Poisoning

**Description**: Adversaries corrupt stored context — conversation history, memory tools, RAG stores, embedding databases — with malicious or misleading data. This causes biased future reasoning, tool misuse, or data exfiltration. Includes RAG poisoning, shared context poisoning across tenants, context window manipulation, long-term memory drift, and cross-agent memory propagation.

**Common Vulnerabilities**:
- Agent outputs are automatically re-ingested into trusted memory stores
- No content validation on memory writes
- Shared memory across users, sessions, or tenants without isolation
- No expiration or trust scoring for stored context
- RAG retrieval treats all indexed content as equally trustworthy

**Key Prevention Patterns**:
- Validate and sanitize all content before writing to memory stores
- Segment memory by user, session, and domain — enforce tenant isolation
- Attach source provenance metadata to all stored content and apply anomaly detection
- Prevent automatic re-ingestion of agent outputs into trusted memory
- Expire unverified memory entries after a defined retention period
- Weight retrieval results by trust score and tenancy boundaries

**Assessment Checklist**:
- [ ] Memory writes are validated and sanitized before storage
- [ ] Memory is segmented by user/session/tenant with enforced isolation boundaries
- [ ] Source provenance is tracked for all stored context
- [ ] Agent outputs are not automatically treated as trusted input for future sessions
- [ ] Retention policies exist with expiration for unverified entries

---

## ASI07: Insecure Inter-Agent Communication

**Description**: Weak authentication, integrity, or confidentiality in agent-to-agent exchanges enables interception, spoofing, and manipulation. Includes unencrypted communication channels, message tampering, replay attacks on trust chains, protocol downgrade, MCP descriptor spoofing, and A2A registration spoofing.

**Common Vulnerabilities**:
- Agent-to-agent messages transmitted without encryption or signing
- No mutual authentication between communicating agents
- Missing replay protection (nonces, timestamps) on inter-agent messages
- Tool and agent descriptors accepted without schema validation

**Key Prevention Patterns**:
- Enforce end-to-end encryption with mutual authentication for all agent communication
- Sign messages and validate signatures — include semantic validation of message content
- Implement anti-replay mechanisms using nonces, timestamps, and sequence numbers
- Pin protocol versions to prevent downgrade attacks
- Use attested registries for agent identity verification
- Enforce typed contracts and schema validation on all inter-agent message formats

**Assessment Checklist**:
- [ ] All inter-agent communication is encrypted and mutually authenticated
- [ ] Messages include signatures with integrity verification
- [ ] Anti-replay protections (nonces, timestamps) are present
- [ ] Agent identities are verified through an attested registry or certificate chain
- [ ] Message schemas are validated against typed contracts

---

## ASI08: Cascading Failures

**Description**: A single fault — hallucination, malicious input, corrupted tool output, poisoned memory — propagates across autonomous agents, compounding into system-wide harm. Includes planner-executor coupling failures, corrupted persistent memory spreading across sessions, inter-agent cascade amplification, cascading privilege escalation, auto-deployment from tainted updates, governance drift, and feedback-loop amplification.

**Common Vulnerabilities**:
- No isolation between agent components — a failure in one propagates to all
- Missing circuit breakers between agent stages
- No independent validation of outputs before passing to downstream agents
- Planner and executor tightly coupled without intermediate checks
- No behavioral drift detection across agent sessions

**Key Prevention Patterns**:
- Apply zero-trust design: assume any component can fail and contain the blast radius
- Enforce isolation and trust boundaries between agent stages
- Use JIT one-time tool access with runtime policy checks rather than persistent permissions
- Separate planning from execution with independent policy enforcement between stages
- Validate outputs at each stage boundary and insert human gates at critical checkpoints
- Implement rate limiting and circuit breakers to contain cascading failures
- Deploy behavioral drift detection to identify agents deviating from expected patterns
- Maintain immutable logging for non-repudiation and post-incident analysis

**Assessment Checklist**:
- [ ] Circuit breakers exist between agent stages to prevent cascade propagation
- [ ] Output validation occurs at each stage boundary before downstream consumption
- [ ] Human checkpoints exist at critical decision points
- [ ] Blast radius is limited — a failure in one agent cannot compromise the entire system
- [ ] Behavioral drift detection monitors agents across sessions

---

## ASI09: Human-Agent Trust Exploitation

**Description**: Agents exploit human trust through natural language fluency, perceived expertise, and persuasive explainability. Attackers weaponize this to influence decisions, extract sensitive information, or obtain approval for harmful actions. Includes fake explainability (plausible but incorrect reasoning), consent laundering through "read-only" previews that trigger side effects, and emotional manipulation.

**Common Vulnerabilities**:
- Single-click approval for high-impact agent actions
- No distinction between preview and execution in the UI
- Agent-generated explanations treated as verified truth without independent validation
- No audit trail for human approval decisions

**Key Prevention Patterns**:
- Require explicit multi-step confirmations for sensitive or high-impact actions
- Maintain immutable audit logs of all human-agent interactions and approval decisions
- Deploy behavioral detection for manipulation patterns
- Implement adaptive trust calibration with confidence-weighted cues in the UI
- Enforce content provenance — label agent-generated content distinctly from verified data
- Separate preview from effect — previews must be read-only with no side effects
- Apply human-factors UI safeguards (visual indicators for risk level, friction for high-impact approvals)
- Detect plan divergence — alert when agent execution deviates from the approved plan

**Assessment Checklist**:
- [ ] High-impact actions require multi-step human confirmation (not single-click)
- [ ] Preview operations are truly read-only with no side effects
- [ ] Agent-generated content is clearly labeled and distinguished from verified data
- [ ] Audit logs capture all human approval decisions with context
- [ ] Plan-divergence detection alerts when execution departs from the approved plan

---

## ASI10: Rogue Agents

**Description**: Malicious or compromised agents that deviate from intended function, acting harmfully within multi-agent ecosystems. Includes goal drift and scheming (agent pursues unintended objectives), workflow hijacking (agent redirects other agents), collusion and self-replication (agents cooperating maliciously or spawning copies), and reward hacking (agent optimizes for proxy metrics rather than intended goals).

**Common Vulnerabilities**:
- No behavioral baseline against which to detect deviation
- Missing containment — a compromised agent can access all system resources
- No mechanism to revoke agent credentials or shut down agent processes
- Agents can spawn new agents without governance controls

**Key Prevention Patterns**:
- Establish governance with immutable logging of all agent actions and decisions
- Enforce trust zone isolation with restricted execution boundaries per agent
- Deploy behavioral detection via watchdog agents that monitor for anomalous behavior
- Implement kill switches and credential revocation for rapid containment
- Require identity attestation and maintain behavioral integrity baselines
- Enforce periodic behavioral attestation with signed bills of materials

**Assessment Checklist**:
- [ ] Behavioral baselines are defined and monitored for each agent
- [ ] Kill switches can immediately revoke agent credentials and terminate processes
- [ ] Trust zone isolation prevents a compromised agent from accessing other agents' resources
- [ ] Agent spawning requires governance approval — agents cannot self-replicate unchecked
- [ ] Immutable audit logs capture all agent actions for forensic analysis

---

## Cross-Reference: OWASP Standards Mapping

The following table maps the Agentic Top 10 to related categories in the OWASP Top 10:2025 (traditional web applications) and the OWASP LLM Top 10:2025 (large language model applications). Use this to identify when traditional or LLM-specific controls also apply.

| Agentic (ASI) | OWASP Top 10:2025 | OWASP LLM Top 10:2025 | Relationship |
|---|---|---|---|
| ASI01: Agent Goal Hijack | A05: Injection | LLM01: Prompt Injection | Extends prompt injection to multi-step, multi-source agent context |
| ASI02: Tool Misuse | A01: Broken Access Control | LLM07: Excessive Agency | Adds tool-level permission scoping and budget controls |
| ASI03: Identity/Privilege Abuse | A01: Broken Access Control | LLM06: Excessive Agency | Extends to dynamic delegation chains and time-bound scoping |
| ASI04: Supply Chain | A03: Software Supply Chain Failures | LLM05: Supply Chain Vulnerabilities | Extends to runtime-composed agents, MCP servers, A2A registries |
| ASI05: Unexpected Code Execution | A05: Injection | LLM02: Insecure Output Handling | Specific to agent-generated code execution patterns |
| ASI06: Memory/Context Poisoning | -- | LLM08: Excessive Agency, LLM01: Prompt Injection | New category for persistent agent memory and RAG stores |
| ASI07: Insecure Inter-Agent Comms | A02: Security Misconfiguration | -- | New category for agent-to-agent protocol security |
| ASI08: Cascading Failures | A10: Mishandling Exceptional Conditions | LLM09: Overreliance | Extends fault handling to multi-agent cascade scenarios |
| ASI09: Human-Agent Trust | -- | LLM09: Overreliance | New category for manipulative agent-human interactions |
| ASI10: Rogue Agents | A01: Broken Access Control | LLM06: Excessive Agency | New category for adversarial agent behavior and containment |

---

## How to Use This Reference

1. **Detection**: Identify agentic patterns in the codebase (AI SDK imports, MCP configurations, tool-calling schemas, multi-agent orchestration).
2. **Scoping**: Determine which ASI categories are relevant based on the application's agentic architecture.
3. **Assessment**: Walk through each relevant category's checklist during security review.
4. **Reporting**: Document findings using the standard severity classification (CRITICAL/HIGH/MEDIUM/LOW) with specific ASI category references.
5. **Remediation**: Apply the prevention patterns for each finding, prioritizing by severity and exploitability.
