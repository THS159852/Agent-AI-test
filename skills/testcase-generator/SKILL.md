---
name: testcase-generator
description: Generates structured QA test cases in English with Verify-prefixed titles from requirements, user stories, acceptance criteria, API specs, and UI documents. Use when the user or orchestrator needs test cases, scenarios, or validation coverage.
---

# Test Case Generator

Generate complete, traceable test cases from requirements. Follow `docs/QA_GLOBAL_RULES.md`.

## Workflow

Copy and track:

```
Progress:
- [ ] Step 1: Parse requirements and AC
- [ ] Step 2: List testable conditions
- [ ] Step 3: Apply coverage checklist
- [ ] Step 4: Write test cases (Verify… titles)
- [ ] Step 5: Coverage summary + gaps
```

### Step 1: Parse requirements

Extract:

- Feature / module name
- Actors / roles
- Preconditions (system state, data)
- Acceptance criteria (numbered)
- Business rules and validations
- API endpoints / UI screens (if mentioned)
- Out of scope items

If AC are missing, derive **test conditions** from descriptions but label them as derived and add Questions.

### Step 2: List test conditions

For each AC, brainstorm conditions:

| AC | Condition type | Example condition |
|----|----------------|-------------------|
| AC-1 | Positive | Valid input succeeds |
| AC-1 | Negative | Invalid input rejected |
| AC-1 | Boundary | Min/max length |

### Step 3: Coverage checklist

Ensure you considered ALL applicable types from QA_GLOBAL_RULES:

- Positive, Negative, Boundary, Exception, Validation
- Permission / Role, UI, API, Error Handling
- Localization, Accessibility, Performance (if in scope)

Do not force Performance/Accessibility cases if not relevant — note as N/A in summary.

### Step 4: Write test cases

**Title rule:** English, starts with **`Verify`**.

**Template:**

| ID | Requirement Ref | Title | Preconditions | Steps | Expected Result | Priority | Test Type |
|----|-----------------|-------|---------------|-------|-----------------|----------|-----------|
| TC-001 | US-101 / AC-1 | Verify ... | User exists; app on login page | 1. ... 2. ... | ... | P1 | Functional |

**Priority guide:**

| Priority | When |
|----------|------|
| P0 | Core happy path, security, data loss prevention |
| P1 | Main alternate flows, critical validations |
| P2 | Secondary flows, minor validations |
| P3 | Cosmetic, nice-to-have |

**Steps:** One action per step. Include test data in steps when needed.

**Expected result:** Specific, observable outcome (message text, URL, status code, DB state).

### Step 5: Coverage summary

```markdown
## Coverage Summary
- Total: N test cases
- By type: Functional X, UI Y, API Z, ...
- Covered: positive, negative, boundary, ...
- Gaps: <areas not covered and why>
- Assumptions / Questions / Risks
```

## Example

**Input AC:** User can reset password via email link valid for 24 hours.

**Output (sample rows):**

| ID | Requirement Ref | Title | Preconditions | Steps | Expected Result | Priority | Test Type |
|----|-----------------|-------|---------------|-------|-----------------|----------|-----------|
| TC-001 | AC-3 | Verify user receives reset email after submitting registered email | User registered with email@test.com | 1. Open forgot password 2. Enter email@test.com 3. Submit | Reset email sent; confirmation message shown | P0 | Functional |
| TC-002 | AC-3 | Verify reset link expires after 24 hours | Reset link generated 25 hours ago | 1. Open expired link | Error: link expired; prompt to request new link | P1 | Functional |
| TC-003 | AC-3 | Verify reset fails for unregistered email | Email not in system | 1. Submit unknown@email.com | Generic success message (no enumeration) OR error per spec | P1 | Negative |

## Anti-patterns

- Titles not starting with Verify
- Vietnamese in test case fields
- Vague expected results ("should work")
- Invented validation rules not in requirements
- One giant test case covering multiple AC

## Additional resources

- Human guide: [GUIDE.md](GUIDE.md)
- Vietnamese guide: [GUIDE.vi.md](GUIDE.vi.md)
