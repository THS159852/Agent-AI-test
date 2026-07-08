# Test Case Generator — Guide

## What this skill does

Turns requirements into **executable QA test cases**: traceable, grouped, with concrete test data and a quality checklist before delivery.

## When to use

- User story ready for QA
- Regression pack for a feature
- API or UI spec needs validation steps
- Tester agent routes here after reading your prompt

## Output contract

| Deliverable | Format |
|-------------|--------|
| Test cases | Markdown table (see columns below) |
| Coverage | Summary + matrix + gaps |
| Gaps | Assumptions / Questions / Risks |

### Standard columns

`ID` · `Module` · `Requirement Ref` · `Title` · `Preconditions` · `Test Data` · `Steps` · `Expected Result` · `Priority` · `Test Type` · `Auto Candidate`

## Title rule (critical)

```
Verify <subject> <expected outcome>
```

All titles start with **Verify**. **Every column — Title, Steps, Expected Result, etc. — must be in English**, even when the source requirement is in Vietnamese. See [examples.md](examples.md).

## Test design techniques

| Technique | Use for |
|-----------|---------|
| Equivalence partitioning | Valid vs invalid input classes |
| Boundary values | Min, max, empty, null |
| Decision table | Multi-condition business rules |
| State transition | Status workflows |

## Priority

| Level | Typical content |
|-------|-----------------|
| P0 | Happy path, security, data loss, auth |
| P1 | Main negatives, validations, boundaries |
| P2 | Secondary flows |
| P3 | Cosmetic / edge nice-to-have |

## Export tips

Copy markdown table into:

- **Excel / Google Sheets** — paste and split columns
- **TestRail / Zephyr** — map columns to custom fields
- **Jira Xray** — Title → Summary, Steps → Test Steps

Ask the agent: "Export testcase as CSV" if you need comma-separated output.

## Workflow with other skills

```
requirement-analyzer (if AC messy) → testcase-generator → testdata-generator → automation-script-writer
```

## MCP suggestions

| MCP | Benefit |
|-----|---------|
| Jira / Linear | Pull AC from ticket |
| Confluence / Notion | Full spec |
| Playwright / Browser | Confirm UI labels |
| OpenAPI tools | Parse endpoints |

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Full workflow for AI |
| `examples.md` | Login, form, API samples |
| `GUIDE.vi.md` | Vietnamese guide |
