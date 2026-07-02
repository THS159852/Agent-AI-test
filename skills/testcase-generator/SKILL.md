---
name: testcase-generator
description: Generates structured QA test cases in English with Verify-prefixed titles from requirements, user stories, acceptance criteria, API specs, and UI documents. Use when the user or tester agent needs test cases, scenarios, or validation coverage.
---

# Test Case Generator

Generate complete, traceable, executable test cases from requirements. Follow `docs/QA_GLOBAL_RULES.md`.

## Workflow

```
Progress:
- [ ] Step 1: Parse requirements and AC
- [ ] Step 2: Build test condition matrix (per AC)
- [ ] Step 3: Apply coverage + test design techniques
- [ ] Step 4: Write test cases (Verify titles, English)
- [ ] Step 5: Run quality checklist
- [ ] Step 6: Coverage summary + gaps
```

### Step 1: Parse requirements

Extract and list before writing any test case:

| Item                    | Notes |
|-------------------------|------|
| Feature / module         | Used for grouping and ID prefix |
| Actors / roles           | Each role → permission tests |
| Preconditions            | Shared setup reused across cases |
| Acceptance criteria      | Numbered; primary traceability source |
| Business rules           | If/then rules → decision-table candidates |
| Validations              | Field rules: required, format, min/max |
| API endpoints / UI screens | Separate API vs UI cases when both exist |
| Out of scope             | Do NOT write tests for these |

If AC are missing, derive **test conditions** from descriptions, mark as `[Derived]`, and add Questions.

### Step 2: Test condition matrix

For **each AC**, list conditions before writing cases:

| AC   | Type     | Condition                     | Priority hint |
|------|----------|-------------------------------|---------------|
| AC-1 | Positive | Valid input → success          | P0 |
| AC-1 | Negative | Invalid input → rejected       | P1 |
| AC-1 | Boundary | Min / max / empty / null       | P1 |
| AC-1 | Role     | Unauthorized actor blocked     | P0–P1 |

One test case = **one main verification**. Split combined scenarios.

### Step 3: Test design techniques

Apply what fits the requirement:

| Technique                     | When to use |
|------------------------------|-------------|
| **Equivalence partitioning** | Input fields with valid/invalid classes |
| **Boundary value analysis**  | Min, max, min−1, max+1, empty, null, whitespace |
| **Decision table**           | Multiple conditions → different outcomes (e.g. discount rules) |
| **State transition**         | Status flows: Draft → Submitted → Approved → Rejected |
| **Pairwise**                 | Many optional parameters — reduce combinations, note in summary |

**Coverage types** (skip if N/A, note in summary):

Positive · Negative · Boundary · Validation · Exception · Permission/Role · UI · API · Error handling · Localization · Accessibility · Performance (only if requirement mentions)

### Step 4: Write test cases

#### Title rules (mandatory)

- **Language:** English only
- **Prefix:** Every title starts with **`Verify`**
- **Pattern:** `Verify <subject> <expected outcome>`
- **One behavior per title** — no "and" chaining unrelated checks

| Type        | Title pattern | Example |
|-------------|---------------|---------|
| Happy path  | Verify \<actor\> can \<action\> when \<valid condition\> | Verify user can log in with valid credentials |
| Negative    | Verify \<action\> fails when \<invalid condition\> | Verify login fails when password is incorrect |
| Validation  | Verify error is shown when \<field\> is \<invalid state\> | Verify error is shown when email format is invalid |
| Permission  | Verify \<role\> cannot \<restricted action\> | Verify guest cannot access admin settings |
| API         | Verify \<METHOD\> \<endpoint\> returns \<code\> when \<condition\> | Verify POST /orders returns 400 when quantity is zero |
| UI          | Verify \<element/state\> is displayed when \<condition\> | Verify success message is displayed after form submission |

#### ID convention

```
<MODULE>-TC-<NNN>     e.g. LOGIN-TC-001, API-ORD-TC-012
```

Use project convention if user specifies one.

#### Standard output table

| ID | Module | Requirement Ref | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Test Type | Auto Candidate |
|----|--------|-----------------|-------|---------------|-----------|-------|-----------------|----------|-----------|----------------|

| Column             | Rule |
|--------------------|------|
| **Module**         | Feature or screen name |
| **Requirement Ref**| US-xxx / AC-n / BR-n |
| **Test Data**      | Concrete values (not "valid email" — use `user@test.com`) |
| **Steps**          | Numbered; one action per step |
| **Expected Result**| Observable: exact message, URL, status code, DB/UI state |
| **Auto Candidate** | Yes / No — Yes for stable P0/P1 repeatable cases |

#### Steps format

```
1. Navigate to /login
2. Enter email "qa@test.com"
3. Enter password "ValidPass123"
4. Click [Sign In]
```

Use `[Button Name]`, `{fieldName}` for UI. For API, include method, endpoint, headers, body.

#### API test case extension

When testing APIs, add after the table or in Steps:

```
Request: POST /api/v1/orders
Headers: Authorization: Bearer <token>, Content-Type: application/json
Body: { "productId": "P001", "quantity": 0 }
Expected: HTTP 400, body.error = "quantity must be greater than 0"
```

#### Grouping

Organize output by module or AC:

```markdown
### Login — AC-1: Valid authentication
| ID | ... |

### Login — AC-2: Invalid credentials
| ID | ... |
```

### Step 5: Quality checklist (before delivery)

Every deliverable must pass:

- [ ] Every title starts with **Verify** and is in English
- [ ] Every case maps to a Requirement Ref (or `[Derived]`)
- [ ] Steps are reproducible by another tester without guessing
- [ ] Expected results are specific (no "works correctly", "OK", "as expected")
- [ ] Test data is concrete, not placeholder-only
- [ ] No invented business rules — gaps listed in Questions
- [ ] No duplicate cases testing the same condition
- [ ] P0 covers all critical happy paths and security/permission blockers
- [ ] Negative and boundary covered for each validated field / rule
- [ ] Assumptions / Questions / Risks section included when anything is unclear

### Step 6: Coverage summary

```markdown
## Coverage Summary
| Metric | Count |
| Total test cases | N |
| P0 / P1 / P2 / P3 | x / x / x / x |
| By type | Functional X, UI Y, API Z, ... |

## Coverage matrix
| AC / Rule | Positive | Negative | Boundary | Role | Covered |
| AC-1 | ✓ | ✓ | ✓ | — | Yes |

## Gaps & N/A
- <what was not tested and why>

## Assumptions / Questions / Risks
```

## Anti-patterns

| Avoid                          | Do instead |
|-------------------------------|------------|
| Title without Verify           | Always prefix Verify |
| Vietnamese in case fields      | English only in table |
| Vague expected result          | Exact message, code, URL, state |
| One case for 5 AC              | Split per AC/condition |
| Invented max length "50 chars" | Ask in Questions or mark Assumption |
| Duplicate login happy path ×3  | One P0 + role variants if needed |
| Steps: "Perform login"         | Numbered atomic actions with data |

## Examples

See [examples.md](examples.md) for full login, form validation, and API samples.

## Related skills

- **requirement-analyzer** — load first when AC are messy or incomplete
- **testdata-generator** — after cases, generate data sets per Test Data column
- **automation-script-writer** — automate cases marked Auto Candidate = Yes

## Additional resources

- [GUIDE.md](GUIDE.md) · [GUIDE.vi.md](GUIDE.vi.md) · [examples.md](examples.md)
