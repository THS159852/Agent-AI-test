---
name: automation-script-writer
description: Generates test automation scripts from test cases using Playwright, Cypress, Selenium, pytest, or API clients. Use when automating P0/P1 test cases or building E2E/API suites.
---

# Automation Script Writer

## Workflow

1. Confirm framework (detect from repo or ask via orchestrator).
2. Read test cases or requirements to automate.
3. Check existing test structure (folders, helpers, fixtures).
4. Write scripts with clear arrange-act-assert.
5. Provide run command and env vars needed.

## Framework defaults (if unspecified)

| Layer | Default |
|-------|---------|
| Web E2E | Playwright |
| API | pytest + requests or Playwright API |
| Mobile | Note framework if not in repo |

## Script quality

- One logical assertion focus per test
- Descriptive test names mirroring Verify titles
- No hard-coded prod secrets
- Wait strategies — no arbitrary long sleeps

## MCP

Playwright MCP, Browser MCP for selector discovery.

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
