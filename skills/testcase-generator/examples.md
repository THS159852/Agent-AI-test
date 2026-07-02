# Test Case Examples

Full samples for the testcase-generator skill. Titles are English and start with **Verify**.

---

## Example 1: Login (UI + Functional)

**Input AC:**

- AC-1: Registered user can log in with valid email and password → redirect to dashboard
- AC-2: Invalid password shows error "Invalid email or password" (no account enumeration)
- AC-3: Account locks after 5 failed attempts within 15 minutes

### AC-1 — Valid authentication

| ID | Module | Requirement Ref | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Test Type | Auto Candidate |
|----|--------|-----------------|-------|---------------|-----------|-------|-----------------|----------|-----------|----------------|
| LOGIN-TC-001 | Login | US-42 / AC-1 | Verify user is redirected to dashboard after login with valid credentials | User exists and is active; user is on login page | email: `active.user@test.com`, password: `ValidPass123!` | 1. Open `/login` 2. Enter email 3. Enter password 4. Click [Sign In] | URL is `/dashboard`; welcome message shows user's display name | P0 | Functional | Yes |

### AC-2 — Invalid credentials

| ID | Module | Requirement Ref | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Test Type | Auto Candidate |
|----|--------|-----------------|-------|---------------|-----------|-------|-----------------|----------|-----------|----------------|
| LOGIN-TC-002 | Login | US-42 / AC-2 | Verify login fails when password is incorrect | Registered user exists; on login page | email: `active.user@test.com`, password: `WrongPass999` | 1. Enter valid email 2. Enter wrong password 3. Click [Sign In] | User remains on `/login`; error "Invalid email or password" is displayed; no redirect | P1 | Negative | Yes |
| LOGIN-TC-003 | Login | US-42 / AC-2 | Verify login fails when email is not registered | Email not in system; on login page | email: `unknown@test.com`, password: `AnyPass123` | 1. Enter unregistered email 2. Enter any password 3. Click [Sign In] | Same generic error as wrong password (no hint that email does not exist) | P1 | Negative | Yes |

### AC-3 — Account lockout

| ID | Module | Requirement Ref | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Test Type | Auto Candidate |
|----|--------|-----------------|-------|---------------|-----------|-------|-----------------|----------|-----------|----------------|
| LOGIN-TC-004 | Login | US-42 / AC-3 | Verify account is locked after five failed login attempts within fifteen minutes | User exists; lock counter reset | email: `lock.test@test.com`, wrong password ×5 | 1. Submit wrong password 5 times within 15 min 2. Submit correct password on 6th attempt | Account locked message shown; login denied even with correct password | P0 | Security | No |

---

## Example 2: Form validation (Boundary)

**Input rule:** Username required, 3–20 characters, alphanumeric only.

| ID | Module | Requirement Ref | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Test Type | Auto Candidate |
|----|--------|-----------------|-------|---------------|-----------|-------|-----------------|----------|-----------|----------------|
| PROFILE-TC-001 | Profile | BR-07 | Verify profile saves when username is exactly 3 characters | User logged in; on profile edit | username: `abc` | 1. Open profile edit 2. Enter username 3. Click [Save] | Profile saved; username displayed as `abc` | P1 | Boundary | Yes |
| PROFILE-TC-002 | Profile | BR-07 | Verify error is shown when username is 2 characters | User logged in; on profile edit | username: `ab` | 1. Enter username 2. Click [Save] | Validation error: username must be 3–20 characters; save blocked | P1 | Boundary | Yes |
| PROFILE-TC-003 | Profile | BR-07 | Verify error is shown when username contains special characters | User logged in; on profile edit | username: `user@name` | 1. Enter username 2. Click [Save] | Validation error: alphanumeric only; save blocked | P1 | Validation | Yes |
| PROFILE-TC-004 | Profile | BR-07 | Verify error is shown when username field is empty | User logged in; on profile edit | username: *(empty)* | 1. Clear username 2. Click [Save] | Required field error; save blocked | P1 | Negative | Yes |

---

## Example 3: API (REST)

**Input:** POST `/api/v1/orders` — creates order; requires auth; quantity must be > 0.

| ID | Module | Requirement Ref | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Test Type | Auto Candidate |
|----|--------|-----------------|-------|---------------|-----------|-------|-----------------|----------|-----------|----------------|
| API-ORD-TC-001 | Orders API | AC-5 | Verify POST /api/v1/orders returns 201 when request is valid | Valid auth token; product P001 exists | `{ "productId": "P001", "quantity": 1 }` | 1. Send POST with Bearer token and body 2. Capture response | HTTP 201; body contains `orderId`; `quantity` = 1 | P0 | API | Yes |
| API-ORD-TC-002 | Orders API | AC-5 | Verify POST /api/v1/orders returns 400 when quantity is zero | Valid auth token | `{ "productId": "P001", "quantity": 0 }` | 1. Send POST with body 2. Capture response | HTTP 400; error indicates quantity must be greater than 0 | P1 | API | Yes |
| API-ORD-TC-003 | Orders API | AC-5 | Verify POST /api/v1/orders returns 401 when authorization token is missing | No auth header | `{ "productId": "P001", "quantity": 1 }` | 1. Send POST without Authorization header | HTTP 401; no order created | P0 | API | Yes |

---

## Example 4: Decision table (discount rule)

**Rule:** 10% discount if cart total ≥ $100 AND user is Premium; 5% if total ≥ $100 only; 0% otherwise.

| Cart total | Premium | Expected discount |
|------------|---------|-------------------|
| $99 | Yes | 0% |
| $100 | No | 5% |
| $100 | Yes | 10% |
| $50 | Yes | 0% |

→ One test case per row, titles like:
- `Verify no discount is applied when cart total is below minimum`
- `Verify 10 percent discount is applied for premium user when cart total meets threshold`

---

## Coverage summary (template)

```markdown
## Coverage Summary
| Metric | Value |
| Total | 11 |
| P0 | 4 |
| P1 | 7 |
| Auto Candidate Yes | 9 |

## Gaps
- Performance not in scope per requirement
- Accessibility: keyboard nav not specified order not specified in AC

## Questions
- AC-2: Should lockout message text be specified? (not in source)
```
