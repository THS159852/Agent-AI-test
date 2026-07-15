---
name: browser-url-check
description: Checks URLs in a real browser using the Playwright MCP server, handles HTTP and login-form authentication, crawls same-origin pages, detects new feature URIs, and saves scan reports. Use when the user sends a URL to inspect, verify, open, test, or check browser behavior.
---

# Browser URL Check

Check a URL in Playwright via MCP tool `check_browser_url`. Follow `docs/QA_GLOBAL_RULES.md` when reporting findings.

## Workflow

```
Progress:
- [ ] Step 1: Call MCP with URL only
- [ ] Step 2: Handle auth if required
- [ ] Step 3: Summarize scan result
- [ ] Step 4: Highlight new feature URIs and report folder path
- [ ] Step 5: Generate a test-ready browser document
```

### Step 1: Initial check

When the user sends a URL:

1. Call MCP tool `check_browser_url` with only `url`.
2. The MCP opens Chromium fullscreen using the executing device's native viewport. It runs features sequentially, closing the current browser before opening a new browser for the next feature. All generated input data is English.
3. Parse the returned JSON after browser execution finishes.

Optional input:

| Field | Notes |
|-------|-------|
| `maxPages` | Same-origin pages to crawl, default `50`, max `100` |

### Step 2: Authentication

If `status` is `auth_required`:

1. Ask the user for `username` and `password`.
2. Do not invent credentials.
3. Do not store, log, or repeat the password in summaries.
4. Call `check_browser_url` again with `url`, `username`, and `password`.

Auth types:

| `authType` | Meaning |
|------------|---------|
| HTTP `WWW-Authenticate` | HTTP Basic/Digest auth |
| `login_form` | HTML login form on the page |

If no auth is required, continue without asking for credentials.

### Step 3: Report result

If `status` is `ok`, summarize:

- Success message from `message` (e.g. `Truy cap thanh cong: ...`)
- `httpStatus`, `title`, `finalUrl`
- `pagesScanned`
- Total URIs discovered
- Any failed pages from `allUris` where `ok` is `false`

If `status` is `error`, explain `message` and suggest next steps.

### Step 4: New features, bugs, and saved files

When `newFeatureUris` is not empty:

1. List each new feature URI clearly.
2. Tell the user the `reportDir` path where files were saved.

If `bugReport` is present:

1. Report `runNumber`, `bugCount`, `totalActions`, and `status` (`no_bugs` or `has_bugs`).
2. Prefer summarizing UI interaction / navigation / form bugs over noisy third-party console noise.
3. If `has_bugs`, summarize each bug with feature, screen, URL, action, and error type.
4. Point user to `bug-report-en.md`, `bug-report-vi.md`, and `bug-report.json`.
5. Mention screenshot/video evidence paths for failures.
6. Mention `failed-requests-curl.txt` when failed HTTP requests were captured.

Report files per scan:

| File | Content |
|------|---------|
| `summary-en.md` | English summary |
| `summary-vi.md` | Vietnamese summary |
| `scan-report.json` | Full scan result |
| `all-uris.json` | All crawled URIs with metadata |
| `new-features.json` | URIs not seen in previous baseline |
| `bug-report.json` | Bug report for this run (JSON) |
| `bug-report-en.md` | English bug report |
| `bug-report-vi.md` | Vietnamese bug report |
| `failed-requests-curl.txt` | Sanitized cURL for failed requests |
| `evidences/*.png` | Failure screenshots |
| `evidences/*.mp4` | Failure videos with highlighted actions |
| `browser-test-document.md` | Structured source document for testcase generation |

### Step 5: Generate tester documentation

After every successful MCP result (`status: ok`):

1. Read and follow `skills/browser-document-generator/SKILL.md`.
2. Use the current run's `reportDir`; never use an older run by default.
3. Generate exactly one English document:
   `<reportDir>/browser-test-document.md`
4. Include its path in the final response.
5. Report how many screens, workflows, testable conditions, and defects were documented.

This step is required so testers can pass the generated document directly to `testcase-generator`.

Baseline file:

`agents/agents/mcps/mcp-playwright-browser-check/browser-check-reports/<hostname>/baseline.json`

## MCP

Server name: `playwright-browser-check`

Tool: `check_browser_url`

Report root:

`agents/agents/mcps/mcp-playwright-browser-check/browser-check-reports/`

## Example

**User:** Check browser URL https://example.com

**Agent:**

1. Call `check_browser_url` with `{ "url": "https://example.com" }`.
2. If auth is required, ask:

```text
URL nay yeu cau authentication. Ban hay gui username va password de minh kiem tra tiep.
```

3. Retry with credentials if provided.
4. Reply with scan summary, new feature URIs, and `reportDir`.

## Rules

- Always use the MCP tool; do not simulate browser checks.
- Crawl scope is same-origin only; external links are not followed.
- First scan may show many URIs as "new"; later scans only list truly new paths.
- Prefer concise output; attach URI lists only when useful.

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
