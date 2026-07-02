---
name: scope-analyzer
description: Maps change impact and QA scope across modules, APIs, integrations, and regression areas. Use before test planning, estimation, or regression decisions.
---

# Scope Analyzer

## Workflow

1. Understand the change (requirement, diff, ticket).
2. List direct vs indirect impact.
3. Identify regression surfaces (shared components, APIs, auth).
4. Rate areas: High / Medium / Low test depth.
5. Recommend regression pack focus.

## Output template

```markdown
## Change Summary
## Impacted Areas
| Area | Impact | Reason | Suggested depth |
|------|--------|--------|-----------------|
## APIs / Integrations
## Regression Candidates
## Dependency Map
## Recommended Focus
## Assumptions / Questions / Risks
```

## MCP

GitHub MCP for PR diffs; Jira for linked components.

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
