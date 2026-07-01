---
name: test-plan-generator
description: Produces structured QA test plans with scope, strategy, environments, and entry/exit criteria. Use at the start of a test cycle or release.
---

# Test Plan Generator

## Workflow

1. Gather scope from `scope-analyzer` or requirements.
2. Define in/out of scope, test types, environments.
3. Set entry/exit criteria and deliverables.
4. Outline schedule and ownership (roles, not names unless given).
5. Link risks from `risk-analyzer` if available.

## Template

```markdown
# Test Plan: <Feature/Release>

## 1. Introduction & Objectives
## 2. Scope
### In Scope / Out of Scope
## 3. Test Strategy
## 4. Test Types (Functional, Regression, API, UAT, ...)
## 5. Test Environment
## 6. Entry Criteria
## 7. Exit Criteria
## 8. Deliverables
## 9. Schedule & Milestones
## 10. Risks & Mitigation
## 11. Assumptions / Questions
```

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
