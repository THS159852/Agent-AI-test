---
name: requirement-analyzer
description: Parses and structures requirements from documents and tickets into actors, acceptance criteria, business rules, and testable conditions. Use before test case generation or when requirements are ambiguous.
---

# Requirement Analyzer

## Workflow

1. **Read** all provided sources (text, files, MCP tickets).
2. **Extract** structured fields (see output template).
3. **Normalize** AC — one testable statement per AC where possible.
4. **Identify gaps** — Assumptions, Questions, Risks.
5. **List testable conditions** — feed for `testcase-generator`.

## Output template

```markdown
## Feature Summary
<2-4 sentences>

## Actors / Roles
| Role | Description |

## Preconditions
- ...

## Acceptance Criteria
| ID | Criterion | Testable (Y/N) | Notes |

## Business Rules
| ID | Rule | Source ref |

## Validations
| Field / Area | Rule | Error expected |

## Dependencies / Integrations
- APIs, services, third parties

## Out of Scope
- ...

## Testable Conditions
| ID | Condition | Related AC | Type hint |

## Assumptions / Questions / Risks
```

## Multi-format tips

| Format       | Focus |
|--------------|-------|
| PDF/DOCX     | Headings, numbered lists, tables |
| Excel        | Column = field rules; rows = scenarios |
| OpenAPI      | Endpoints, schemas, error responses |
| Screenshots  | Labels, buttons, states (as stated) |

## MCP

Jira/Linear for tickets; Confluence/Notion for specs.

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
