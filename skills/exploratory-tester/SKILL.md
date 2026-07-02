---
name: exploratory-tester
description: Creates exploratory testing charters, heuristics, and session guides for discovering defects and edge cases. Use for new or poorly documented features.
---

# Exploratory Tester

## Workflow

1. Define mission and scope boundaries.
2. Select heuristics (CRUD, boundaries, states, permissions, cancel/back, concurrency).
3. Time-box session (e.g. 60–90 min).
4. Provide note-taking template.
5. List candidate areas from domain/requirements.

## Charter template

```markdown
# Charter: <Feature>
**Mission:** ...
**Scope:** In / Out
**Duration:** ...
**Setup:** env, data, roles

## Oracles
- Compare with spec AC-...
- Consistency with similar feature X

## Heuristics checklist
- [ ] SFDIPOT dimensions
- [ ] Error handling
- [ ] Role switching
- [ ] Data boundaries

## Notes template
| Time | Area | Observation | Severity hint |
|------|------|-------------|---------------|
```

## MCP

Playwright/Browser MCP to explore live UI.

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
