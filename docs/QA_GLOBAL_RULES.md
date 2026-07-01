# QA Global Rules

Shared standards for all QA skills used by the Tester Agent.

## Requirement Handling

- Never invent business rules not stated in the source material.
- If information is missing, always output:
  - 1. **Assumptions** — what you assumed to proceed
  2. **Questions** — what must be clarified with PO/BA/Dev
  3. **Risks** — impact if assumptions are wrong

## Supported Input Formats

Agents must read and interpret:

| Format | How to read |
|--------|-------------|
| Markdown / TXT | Read directly |
| PDF / DOCX | Extract text; note if layout/tables may be lossy |
| Excel / CSV | Read sheets; identify columns, rules, sample data |
| JSON / YAML / OpenAPI | Parse structure, endpoints, schemas |
| Images / Screenshots | Describe UI elements, flows, labels |
| Jira / ticket text | Parse title, description, AC, attachments |
| Code / config | Identify behavior: modules, APIs, flags |

## Test Case Standard (Mandatory)

| Field | Rule |
|-------|------|
| Language | **English only** |
| Title | **Must start with `Verify`** |
| ID | `TC-XXX` or project convention |
| Priority | P0 / P1 / P2 / P3 |
| Test Type | Functional, UI, API, Integration, Regression, etc. |

### Required fields per test case

```
ID | Title | Preconditions | Steps | Expected Result | Priority | Test Type
```

### Coverage checklist

Always consider:

- Positive (happy path)
- Negative (invalid input, wrong state)
- Boundary (min, max, empty, null)
- Exception / error handling
- Validation rules
- Permission / role-based access
- UI behavior
- API contract (status, payload, headers)
- Localization (if applicable)
- Accessibility (if applicable)
- Performance (only when requirement mentions it)

## Skill contract

Each skill:

1. Is loaded by `tester-orchestrator` when the user request matches its purpose.
2. Completes **only** its specialty.
3. Returns structured output for the agent to present to the user.
4. Lives in `skills/<name>/SKILL.md` with human guides in `GUIDE.md` / `GUIDE.vi.md`.

## Output Quality

- Concise, professional, actionable.
- Use tables for test cases and matrices.
- Number steps clearly.
- Map each test case to a requirement / AC when possible (`Requirement Ref` column).

## MCP Server Suggestions (Optional)

| Use case | Suggested MCP |
|----------|---------------|
| Read Jira/Linear tickets | Jira MCP, Linear MCP |
| Read Confluence/Notion docs | Confluence MCP, Notion MCP |
| Browser / UI exploration | Playwright MCP, Browser MCP |
| API testing | REST/HTTP MCP, Postman MCP |
| Database test data | PostgreSQL/MySQL MCP |
| GitHub PR / diff context | GitHub MCP |
| File storage attachments | Google Drive MCP, S3 MCP |

If MCP is unavailable, use built-in read/search tools on local files.
