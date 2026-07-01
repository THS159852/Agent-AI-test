# Test Case Generator — Guide

## What this skill does

Turns requirements into **executable QA test cases** with consistent format and broad coverage.

## When to use

- New user story ready for QA
- Need regression pack for a feature
- API or UI spec needs validation steps
- Orchestrator delegated testcase task after analysis

## Inputs

| Input | Tips |
|-------|------|
| User Story + AC | Best source — map 1:1 to Requirement Ref |
| OpenAPI | Focus on status codes, schemas, auth |
| UI mockup | Derive visible states and validations |
| Excel rules | Each row/rule → at least one test case |

## Output contract

Markdown table + coverage summary. All titles in English starting with **Verify**.

## Priority: Verify prefix

```
Verify <subject> <expected behavior/outcome>
```

Examples:

- `Verify guest cannot access admin dashboard`
- `Verify order total includes tax when tax-enabled region is selected`
- `Verify POST /orders returns 400 when quantity is zero`

## Coverage matrix (quick reference)

| Type | What to test |
|------|--------------|
| Positive | Valid path meets AC |
| Negative | Invalid input, wrong role, wrong state |
| Boundary | 0, 1, max, max+1, empty, null |
| Validation | Field rules: format, length, required |
| Permission | Each role: allowed vs denied |
| API | Method, auth, payload, error codes |
| UI | Labels, states, navigation, messages |

## MCP suggestions

| MCP | Benefit |
|-----|---------|
| Jira / Linear | Pull AC directly from ticket |
| Confluence / Notion | Read full spec |
| OpenAPI / Swagger tools | Parse endpoints |
| Playwright / Browser | Confirm UI labels and flows |

## Related agents

- **requirement-analyzer** — run first if AC are messy
- **testdata-generator** — after cases, generate data sets
- **automation-script-writer** — automate P0/P1 cases

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Agent workflow (this folder) |
| `GUIDE.md` | This file — human explanation |
| `GUIDE.vi.md` | Vietnamese version |
