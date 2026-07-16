# QA Tester Agent System

One **Agent** receives requests and routes to the right **Skill**. No sub-agents.

## Architecture

```
User request → qa-agent-router (Agent) → skills/<name>/SKILL.md → Output
```

| Layer     | What                                | Where |
|-----------|-------------------------------------|-------|
| **Agent** | Intake, triage, route to skill (router only — not under `skills/`) | `agents/qa-agent-router.md` |
| **Skill** | Do the work (testcase, plan, estimate, ...) | `skills/<name>/SKILL.md` |
| **Guide** | Human docs (EN + VI)                 | `skills/<name>/GUIDE.md`, `GUIDE.vi.md` |

## Structure

```
agents/
├── README.md / README.vi.md
├── install.ps1
├── docs/
│   ├── QA_GLOBAL_RULES.md
│   ├── QA_GLOBAL_RULES.vi.md
│   └── SKILL_CALL_EXAMPLES.md  ← Copy-paste prompts per skill
├── agents/
│   ├── qa-agent-router.md      ← Only agent file
│   ├── qa-agent-router.vi.md
│   └── mcps/
│       ├── mcp.json.example
│       └── mcp-playwright-browser-check/
│           ├── package.json
│           ├── src/
│           └── browser-check-reports/  ← Generated locally, ignored by Git
├── .cursor/                    ← Create locally, ignored by Git
│   └── mcp.json
└── skills/
    └── <skill-name>/
        ├── SKILL.md
        ├── GUIDE.md
        └── GUIDE.vi.md
```

## Skills

| Skill                   | Purpose |
|-------------------------|---------|
| requirement-analyzer    | Parse and structure requirements |
| domain-learner          | Learn business domain |
| requirement-explainer   | Explain requirements plainly |
| **testcase-generator**  | **Generate test cases (Verify…, English)** |
| **testcase-reviewer**   | **Review generated test cases (mismatch / screen report)** |
| automation-script-writer| Write automation scripts |
| test-plan-generator     | Create test plans |
| scope-analyzer          | Analyze impact scope |
| estimate-planner        | Estimate QA effort |
| exploratory-tester      | Exploratory testing charters |
| risk-analyzer           | QA risk register |
| testdata-generator      | Test data sets |
| api-testing             | API test design |
| browser-url-check       | Explore and test URLs with Playwright MCP |
| browser-document-generator | Convert browser runs into testcase-ready documents |
| regression-advisor      | Regression strategy |

## Install in Cursor

```powershell
cd f:\Vietlink\agent\agents
.\install.ps1
```

Copies **one agent** + all skills to `~/.cursor/`.

## Set up Playwright Browser Check MCP

The MCP source is committed to Git. Two local paths are intentionally excluded:

| Path | How it is created | Why it is ignored |
|------|-------------------|-------------------|
| `.cursor/mcp.json` | Create manually using the steps below | Contains machine-specific absolute paths |
| `browser-check-reports/` | Created automatically after the first scan | Contains local reports, screenshots, videos, and runtime evidence |
| `.auth-sessions/` | Created by OAuth/SSO session capture | Contains sensitive local cookies and browser storage |

You do **not** need to create `browser-check-reports/` manually.

### 1. Prerequisites

Install:

- [Node.js](https://nodejs.org/) 18 or later
- Cursor with MCP support
- Git

Check Node.js:

```powershell
node --version
npm --version
```

### 2. Install MCP dependencies and Chromium

From the repository root:

```powershell
cd agents/mcps/mcp-playwright-browser-check
npm install
npx playwright install chromium
cd ../../..
```

This creates local `node_modules/`, which is ignored by Git.

### 3. Create the project MCP configuration

Create this directory and file at the repository root:

```text
.cursor/
└── mcp.json
```

You can use `agents/mcps/mcp.json.example` as a reference. First obtain the absolute paths on your machine:

```powershell
(Get-Command node).Source
(Resolve-Path "agents/mcps/mcp-playwright-browser-check").Path
```

Then create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "playwright-browser-check": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:/ABSOLUTE/PATH/TO/REPO/agents/mcps/mcp-playwright-browser-check/node_modules/tsx/dist/cli.mjs",
        "C:/ABSOLUTE/PATH/TO/REPO/agents/mcps/mcp-playwright-browser-check/src/server.ts"
      ],
      "cwd": "C:/ABSOLUTE/PATH/TO/REPO/agents/mcps/mcp-playwright-browser-check"
    }
  }
}
```

Replace:

- `command` with the output of `(Get-Command node).Source`
- every `C:/ABSOLUTE/PATH/TO/REPO` with your cloned repository path

JSON rules:

- Use `/` in paths, or escape every backslash as `\\`
- Do not leave trailing commas
- Keep `.cursor/mcp.json` at the repository root

### 4. Install the agent and skills

```powershell
.\install.ps1
```

This copies the QA router and all skills, including:

- `browser-url-check`
- `browser-document-generator`

### 5. Reload and verify Cursor

1. In Cursor, press `Ctrl+Shift+P`
2. Run **Developer: Reload Window**
3. Open **Cursor Settings → MCP**
4. Confirm `playwright-browser-check` is enabled and green

If it is red:

1. Select **Show Output**
2. Verify the Node.js path and all repository paths in `.cursor/mcp.json`
3. Run `npm install` and `npx playwright install chromium` again

### 6. Run the first browser check

In Cursor Agent chat:

```text
Check browser https://example.com and generate test documentation
```

The MCP opens a visible fullscreen Chromium browser, performs user-like actions sequentially, and closes each browser after its feature finishes.

After the run, reports are created automatically:

```text
agents/mcps/mcp-playwright-browser-check/browser-check-reports/
└── example.com/
    ├── baseline.json
    └── run 1 - <datetime>/
        ├── summary-en.md
        ├── summary-vi.md
        ├── bug-report-en.md
        ├── bug-report-vi.md
        ├── failed-requests-curl.txt
        ├── browser-test-document.md
        └── evidences/
```

`browser-test-document.md` is the input for generating test cases:

```text
Generate test cases from @<reportDir>/browser-test-document.md
```

### 7. Authentication

Both authentication methods remain available:

- **Username/password:** HTTP Basic/Digest and regular HTML login forms. The agent
  returns `auth_required`, asks for test credentials, and retries the scan.
- **Saved browser session:** Google, Microsoft, and other OAuth/SSO flows. The agent
  opens a visible browser through `capture_browser_session`; finish login manually once,
  then future checks reuse the named session through `check_browser_url`.

Passwords are not written to reports. Saved sessions are stored locally under
`.auth-sessions/`, are ignored by Git, and must never be shared or committed. When a
session expires, capture it again using the same session name.

## Usage

See copy-paste prompts for **every skill**: [`docs/SKILL_CALL_EXAMPLES.md`](docs/SKILL_CALL_EXAMPLES.md).

```
Use qa-agent-router to generate test cases from @requirements.md
```

The agent reads your prompt, routes to `testcase-generator` skill, and returns results.

You can also invoke a skill directly:

```
Follow skills/testcase-generator/SKILL.md for this user story: ...
```

## Typical routing

| User request        | Skill chain |
|--------------------|------------|
| Generate test cases | testcase-generator |
| Review generated test cases | testcase-reviewer |
| Explain requirement | requirement-explainer |
| Estimate effort     | scope-analyzer → estimate-planner |
| Full QA pack        | analyzer → scope → plan → testcase → testdata |

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
