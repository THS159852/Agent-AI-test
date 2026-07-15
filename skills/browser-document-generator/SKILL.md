---
name: browser-document-generator
description: Generates a structured, test-ready browser product document from playwright-browser-check MCP results and saved run artifacts. Use automatically after a successful browser URL scan, or when testers need observed screens, workflows, controls, validations, defects, and testable conditions as input for testcase generation.
---

# Browser Document Generator

Convert one completed `playwright-browser-check` run into a factual document that a tester or `testcase-generator` can use as source material.

## Required inputs

Use the MCP response and the latest `reportDir`. Read these files when present:

1. `scan-report.json`
2. `all-uris.json`
3. `new-features.json`
4. `bug-report.json`
5. `bug-report-en.md`
6. `failed-requests-curl.txt`
7. Evidence filenames under `evidences/`

Do not use a previous run unless the user explicitly requests comparison.

## Output

Create exactly one English document:

`<reportDir>/browser-test-document.md`

English is required because this document feeds `testcase-generator`.

## Evidence rules

- Record only behavior observed in MCP output or run artifacts.
- Do not invent business rules, expected outcomes, roles, or validations.
- Label uncertain interpretations as `Assumption`.
- Label unavailable information as `Not observed`.
- Treat console/network failures as technical observations, not confirmed product defects, unless user-visible behavior also failed.
- Preserve the exact screen title, URL, HTTP status, action, and evidence path.
- Never copy passwords, authorization headers, cookies, tokens, or unredacted credentials.
- Deduplicate redirected or repeated URLs. Keep the final URL and note redirects.

## Workflow

### Step 1: Validate the run

Confirm:

- MCP status is `ok`
- `reportDir` exists
- run number and scan timestamp are known
- at least one screen was scanned

If status is `auth_required`, stop and follow the authentication workflow first.

If status is `error`, generate no product document; report the blocker.

### Step 2: Build the observed application model

Extract:

- Entry URL and final URL
- Page title and HTTP status
- Run number and timestamp
- Screens and feature URIs
- Redirects and duplicate routes
- New feature URIs
- User-like action count
- Forms, input, button, navigation, and submit actions mentioned in reports
- Validation, UI, navigation, console, and network issues
- cURL/evidence references

### Step 3: Derive testable conditions

Create stable IDs:

- `SCR-###` — screens
- `WF-###` — observed workflows
- `UI-###` — UI controls/actions
- `VAL-###` — validations
- `INT-###` — integrations/network calls
- `DEF-###` — observed defects
- `TCN-###` — testable conditions

Each testable condition must reference one or more observed source IDs.

### Step 4: Write the document

Use this exact structure:

```markdown
# Browser Test Document: <application title>

## 1. Document Metadata
- Run:
- Scanned at:
- Entry URL:
- Final URL:
- HTTP status:
- Report directory:
- Source: playwright-browser-check

## 2. Application Overview
<Observed purpose based only on titles, labels, and URLs>

## 3. Scope and Coverage
### In scope
- ...

### Not observed / out of scope
- ...

## 4. Screen Inventory
| ID | Screen / Feature | URL | Title | HTTP | Observed state | Evidence |
|----|------------------|-----|-------|------|----------------|----------|

## 5. Observed Navigation and Workflows
### WF-001: <workflow name>
**Start screen:** SCR-...
**End screen:** SCR-...
**Observed steps:**
1. ...
**Observed outcome:** ...
**Evidence:** ...

## 6. UI Elements and User Actions
| ID | Screen | Element / Action | Input data | Observed outcome | Source |
|----|--------|------------------|------------|------------------|--------|

## 7. Forms and Validations
| ID | Screen | Form / Field | Submitted data | Validation / outcome | Source |
|----|--------|--------------|----------------|----------------------|--------|

## 8. Integrations and Failed Requests
| ID | Screen / Action | Method | Endpoint | Result | cURL reference |
|----|-----------------|--------|----------|--------|----------------|

## 9. Observed Defects and Risks
| ID | Feature | Screen | URL | Action | Type | Observation | Evidence |
|----|---------|--------|-----|--------|------|-------------|----------|

## 10. Testable Conditions
| ID | Verify condition | Type | Priority hint | Source IDs |
|----|------------------|------|---------------|------------|

## 11. Suggested Test Data
| Data ID | Purpose | Example | Constraints / Notes |
|---------|---------|---------|---------------------|

## 12. Coverage Gaps
- Authentication / authorization: ...
- Roles / permissions: ...
- Negative validation: ...
- Boundary values: ...
- State persistence: ...
- Browser / responsive coverage: ...
- Accessibility: ...
- API contract details: ...

## 13. Assumptions, Questions, and Risks
### Assumptions
- ...

### Questions
- ...

### Risks
- ...

## 14. Testcase Generator Handoff
- Recommended source file: `<reportDir>/browser-test-document.md`
- Generate English test cases with titles beginning with `Verify`.
- Trace every test case to `TCN-*` and relevant `SCR/WF/UI/VAL/INT/DEF` IDs.
- Do not convert unconfirmed technical noise into expected product behavior.
```

### Step 5: Quality check

Before saving, verify:

- Every screen row has a URL.
- Duplicate URLs are normalized.
- Every defect has feature, screen, URL, action, type, and evidence when available.
- Every `TCN-*` links to observed source IDs.
- Unknown expected behavior is not invented.
- The document is self-contained and usable without opening chat history.
- The output path is exactly `<reportDir>/browser-test-document.md`.

## Handoff to testcase-generator

When the user asks for test cases after the document exists:

1. Load `skills/testcase-generator/SKILL.md`.
2. Use `browser-test-document.md` as the primary input.
3. Treat `TCN-*` as test conditions and preserve traceability.
4. Include positive, negative, boundary, navigation, validation, error handling, and regression coverage where supported.

## Completion response

Return:

- Document path
- Run number
- Screens documented
- Workflows documented
- Testable conditions generated
- Defects included
- Important coverage gaps
