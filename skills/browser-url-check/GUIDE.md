# Browser URL Check — Guide

Check URLs in a real browser (Playwright) via MCP. Use when you need to verify access, crawl same-origin pages, and detect new feature URIs.

**MCP server:** `playwright-browser-check`  
**Tools:** `check_browser_url`, `capture_browser_session`

See [GUIDE.vi.md](GUIDE.vi.md) for the full Vietnamese guide.

---

## Setup

1. Install MCP dependencies in `agents/agents/mcps/mcp-playwright-browser-check`
2. Configure `.cursor/mcp.json` at workspace root
3. Run `install.ps1` to sync the skill
4. Restart Cursor

---

## Authentication flow

The system does **not** show a browser popup for credentials. Instead:

1. MCP detects auth requirement → returns `auth_required`
2. Agent asks user for username/password in chat
3. User provides credentials
4. Agent calls tool again with `url`, `username`, `password`

### Auth types

| Type | Detection | Retry format |
|------|-----------|--------------|
| HTTP Basic/Digest | `401` + `WWW-Authenticate` header | `{ url, username, password }` |
| Login form | `input[type="password"]` on page | `{ url, username, password }` |
| OAuth/SSO session | Google/Microsoft/SSO redirect or button | Capture once, then `{ url, sessionName }` |

For OAuth/SSO, call `capture_browser_session` with the application login URL and a local
`sessionName`. Complete login manually in the visible browser. The tool saves Playwright
cookies and local storage under `.auth-sessions/`; later scans reuse them through
`check_browser_url`. Use `successUrlContains` when the post-login URL is known.

### Security rules

- Never invent credentials
- Do not store or log passwords in reports
- Never ask for a Google/Microsoft OAuth password; use manual session capture
- Never commit or share `.auth-sessions/` because it contains sensitive cookies
- Use test accounts only

---

## Response statuses

| Status | Meaning |
|--------|---------|
| `ok` | Access successful, crawl completed, report saved |
| `auth_required` | Credentials needed — ask user and retry |
| `error` | Failed to access or process URL |

---

## Report files

Saved under `agents/agents/mcps/mcp-playwright-browser-check/browser-check-reports/<hostname>/run <n> - <datetime>/`:

| File | Content |
|------|---------|
| `summary-en.md` | English summary |
| `summary-vi.md` | Vietnamese summary |
| `scan-report.json` | Full scan result |
| `all-uris.json` | All crawled URIs |
| `new-features.json` | URIs not in previous baseline |
| `bug-report-en.md` | English bug report |
| `bug-report-vi.md` | Vietnamese bug report |
| `failed-requests-curl.txt` | Sanitized cURL for failed requests |
| `evidences/*.png` | Failure screenshots |
| `evidences/*.mp4` | Failure videos with highlighted test actions |

Videos display a `TESTING: <feature> | <action>` banner and a yellow outline around the active control. Videos from pages without bugs are deleted. Sensitive `Authorization`, `Cookie`, and `Proxy-Authorization` headers are redacted from cURL output.

---

## Crawl rules

- Same-origin links only
- Default max 50 pages, up to 100 via `maxPages`
- Skips `mailto:`, `tel:`, `javascript:`, external domains
