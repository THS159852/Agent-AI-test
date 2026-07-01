# QA Tester Agent System

One **Agent** receives requests and routes to the right **Skill**. No sub-agents.

## Architecture

```
User request → tester-orchestrator (Agent) → skills/<name>/SKILL.md → Output
```

| Layer | What | Where |
|-------|------|-------|
| **Agent** | Intake, triage, route to skill | `agents/tester-orchestrator.md` |
| **Skill** | Do the work (testcase, plan, estimate, ...) | `skills/<name>/SKILL.md` |
| **Guide** | Human docs (EN + VI) | `skills/<name>/GUIDE.md`, `GUIDE.vi.md` |

## Structure

```
agents/
├── README.md / README.vi.md
├── install.ps1
├── docs/
│   ├── QA_GLOBAL_RULES.md
│   └── QA_GLOBAL_RULES.vi.md
├── agents/
│   ├── tester-orchestrator.md      ← Only agent file
│   └── tester-orchestrator.vi.md
└── skills/
    └── <skill-name>/
        ├── SKILL.md
        ├── GUIDE.md
        └── GUIDE.vi.md
```

## Skills

| Skill | Purpose |
|-------|---------|
| requirement-analyzer | Parse and structure requirements |
| domain-learner | Learn business domain |
| requirement-explainer | Explain requirements plainly |
| **testcase-generator** | **Generate test cases (Verify…, English)** |
| automation-script-writer | Write automation scripts |
| test-plan-generator | Create test plans |
| scope-analyzer | Analyze impact scope |
| estimate-planner | Estimate QA effort |
| exploratory-tester | Exploratory testing charters |
| risk-analyzer | QA risk register |
| testdata-generator | Test data sets |
| api-testing | API test design |
| regression-advisor | Regression strategy |

## Install in Cursor

```powershell
cd f:\Vietlink\agent\agents
.\install.ps1
```

Copies **one agent** + all skills to `~/.cursor/`.

## Usage

```
Use tester-orchestrator to generate test cases from @requirements.md
```

The agent reads your prompt, routes to `testcase-generator` skill, and returns results.

You can also invoke a skill directly:

```
Follow skills/testcase-generator/SKILL.md for this user story: ...
```

## Typical routing

| User request | Skill chain |
|--------------|-------------|
| Generate test cases | testcase-generator |
| Explain requirement | requirement-explainer |
| Estimate effort | scope-analyzer → estimate-planner |
| Full QA pack | analyzer → scope → plan → testcase → testdata |

## GitHub workflow

### First push

```powershell
cd f:\Vietlink\agent\agents

# 1. Create repo on GitHub (web): github.com/new — e.g. qa-tester-agent
#    Do NOT add README (this repo already has one)

# 2. Add remote (replace YOUR_USER and REPO_NAME)
git remote add origin https://github.com/YOUR_USER/REPO_NAME.git

# 3. Push
git push -u origin main
```

### Clone on a new machine

```powershell
git clone https://github.com/YOUR_USER/REPO_NAME.git
cd REPO_NAME
.\install.ps1
```

### Daily sync

```powershell
# After editing locally
git add .
git commit -m "update: describe your change"
git push

# Pull latest and reinstall into Cursor
.\sync.ps1
```
