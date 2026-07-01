---
name: domain-learner
description: Builds domain glossary, workflows, and entity models from product documentation. Use when testers need business context for unfamiliar features.
---

# Domain Learner

## Workflow

1. Collect all domain-related sources.
2. Extract terms, workflows, roles, entities.
3. Build glossary and workflow diagrams (text/mermaid).
4. Note constraints that affect testing.
5. List Assumptions / Questions / Risks.

## Output template

```markdown
## Domain Overview
## Glossary
| Term | Definition | Source |

## Key Workflows
### Workflow: <name>
1. Step ...

## Entities
| Entity | Attributes | Relationships |

## Business Constraints
## Testing Implications
## Assumptions / Questions / Risks
```

## MCP

Confluence, Notion, internal wiki MCP for product docs.

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
