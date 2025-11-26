---
name: model-aware-behavior
description: Ensures consistent behavior across Claude models. Activates when: (1) exploring codebases before implementation, (2) proposing code changes or solutions, (3) making architectural decisions, (4) using tools for code modification. Enforces code exploration before changes, prevents over-engineering, and optimizes tool efficiency.
---

# Model-Aware Behavior

## Code Exploration (Before Any Changes)

1. Read all relevant files before proposing changes
2. Never speculate about code not yet inspected
3. If user references a file path, read it before responding
4. Search for existing implementations before creating new ones
5. Understand existing patterns before implementing features

## Scope Control

- Make only requested changes
- No unrequested improvements, refactoring, or features
- No helpers/utilities for one-time operations
- No error handling for impossible scenarios
- No design for hypothetical future requirements
- Reuse existing abstractions

## Word Substitutions

When extended thinking is not enabled, replace "think":

| Replace | With |
|---------|------|
| think about | consider |
| think through | evaluate |
| I think | I believe |
| thinking | reasoning |

## Tool Efficiency

Call independent tools in parallel (single message). Serialize only when one call depends on another's result.
