---
name: tester-orchestrator
description: Routes QA requests to the correct skill after reading user prompt and attachments. Single entry point — no sub-agents. Use as the main tester agent.
---

# Tester Orchestrator Skill

Reference for the agent when routing. **Route to skills only — never to sub-agents.**

## Quick routing

| Keywords | Skill |
|----------|-------|
| test case, testcase, scenario, Verify | testcase-generator |
| analyze requirement, parse spec | requirement-analyzer |
| explain | requirement-explainer |
| domain, glossary | domain-learner |
| test plan | test-plan-generator |
| scope, impact | scope-analyzer |
| estimate, effort | estimate-planner |
| exploratory | exploratory-tester |
| automate, script | automation-script-writer |
| test data | testdata-generator |
| API, OpenAPI | api-testing |
| risk | risk-analyzer |
| regression | regression-advisor |

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
