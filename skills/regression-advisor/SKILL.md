---
name: regression-advisor
description: Recommends regression testing tiers, priority suites, and release gates based on change scope. Use before releases or after major changes.
---

# Regression Advisor

## Workflow

1. Review change scope and risk.
2. Define smoke (critical path, fast), targeted (impacted modules), full (wide).
3. Map to test case IDs or feature areas.
4. Propose release gate: must-pass list.

## Output template

```markdown
## Regression Recommendation
### Smoke (< 1h)
### Targeted
### Full (if needed)

## Release Gate — Must Pass
| ID/Area | Reason |
|---------|--------|

## Assumptions / Questions / Risks
```

## MCP

GitHub MCP for changed files; CI test history if available.

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
