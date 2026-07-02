---
name: estimate-planner
description: Estimates QA effort for test design, execution, automation, and regression based on scope and complexity. Use for timelines and capacity planning.
---

# Estimate Planner

## Workflow

1. Ingest scope (features, AC count, integrations, platforms).
2. Break down activities: analysis, testcase design, data prep, manual run, automation, regression, bug retest.
3. Apply complexity factors (new domain, API count, roles, locales).
4. Output table with low/expected/high range if uncertainty is high.

## Output template

```markdown
## Estimate Summary
| Activity | Effort (hours/pd) | Notes |
| Test case design | | |
| Manual execution | | |
| Automation | | |
| Regression | | |
| Buffer (bug retest) | | |
| **Total** | | |

## Assumptions
## Confidence: Low / Medium / High
## Risks to estimate
## Questions
```

## Heuristics (adjust per project)

| Signal                 | Impact |
|------------------------|--------|
| Each AC                | +1–3 test cases |
| New API endpoint       | +2–4h design + exec |
| New role/permission    | +test matrix expansion |
| Third-party integration | +env dependency risk |

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
