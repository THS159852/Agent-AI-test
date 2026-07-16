# Skill Call Examples — Cách gọi từng skill

Copy prompt vào Cursor chat. Có 2 cách:

| Cách | Khi nào dùng | Mẫu |
|------|--------------|-----|
| **Qua router** | Để agent tự chọn skill | `Use qa-agent-router to …` |
| **Gọi trực tiếp** | Biết rõ skill cần chạy | `Follow skills/<tên>/SKILL.md …` |

Dùng `@file` để gắn requirement, OpenAPI, testcase đã sinh, v.v.

---

## 1. requirement-analyzer

Phân tích / chuẩn hóa requirement trước khi sinh testcase.

```text
Use qa-agent-router to analyze requirements in @requirements.md
```

```text
Follow skills/requirement-analyzer/SKILL.md for @user-story-login.md
Extract actors, AC, business rules, and testable conditions.
```

---

## 2. domain-learner

Học glossary / workflow / entity khi domain lạ.

```text
Use qa-agent-router to learn the domain from @product-docs/
```

```text
Follow skills/domain-learner/SKILL.md using @confluence-export.md
Build glossary, main workflows, and entity model.
```

---

## 3. requirement-explainer

Giải thích requirement bằng ngôn ngữ dễ hiểu (cho BA/Dev/stakeholder).

```text
Use qa-agent-router to explain @US-payment.md in plain language with examples
```

```text
Follow skills/requirement-explainer/SKILL.md for @US-payment.md
Explain expected behavior with concrete examples.
```

---

## 4. scope-analyzer

Phân tích impact / phạm vi QA khi có change hoặc ticket.

```text
Use qa-agent-router to analyze QA scope for @ticket-ORD-120.md
```

```text
Follow skills/scope-analyzer/SKILL.md for this PR change summary:
- Added discount rules on Checkout
List direct/indirect impact and regression surfaces.
```

---

## 5. risk-analyzer

Lập risk register trước release / test plan.

```text
Use qa-agent-router to build a QA risk register for @release-notes-v2.md
```

```text
Follow skills/risk-analyzer/SKILL.md for @feature-checkout.md
Include likelihood, impact, mitigation, and test focus.
```

---

## 6. test-plan-generator

Lập test plan (scope, strategy, env, entry/exit).

```text
Use qa-agent-router to create a test plan for release R-2026.07 from @scope-summary.md
```

```text
Follow skills/test-plan-generator/SKILL.md
Scope: Checkout redesign. Environments: staging + UAT.
Include entry/exit criteria and test types.
```

---

## 7. estimate-planner

Estimate effort (design, execute, automate, regression).

```text
Use qa-agent-router to estimate QA effort for @scope-summary.md
```

```text
Follow skills/estimate-planner/SKILL.md
Feature: Login + MFA. Assume 2 testers. Break down design / execution / automation.
```

---

## 8. testcase-generator

Sinh testcase (English, title bắt đầu `Verify`).

```text
Use qa-agent-router to generate test cases from @user-story-login.md
```

```text
Follow skills/testcase-generator/SKILL.md for @user-story-login.md
Generate P0/P1 cases with Verify titles, concrete test data, and coverage summary.
```

```text
Generate test cases from @agents/mcps/mcp-playwright-browser-check/browser-check-reports/<host>/run 1 - <datetime>/browser-test-document.md
```

---

## 9. testcase-reviewer

Review bộ testcase đã generate — báo mismatch / gap theo **màn hình**.

```text
Use qa-agent-router to review the generated test cases below against @user-story-login.md
Report mismatches and which screen each finding belongs to.
```

```text
Follow skills/testcase-reviewer/SKILL.md
Sources: @user-story-login.md
Test cases: @testcases-login.md
Review quality, source alignment, coverage gaps. Group findings by screen.
```

```text
Review các testcase vừa generate so với @requirements.md
Chỉ ra chỗ mismatch / miss và thuộc màn hình nào.
```

---

## 10. testdata-generator

Sinh bộ data (valid / invalid / boundary) map theo testcase.

```text
Use qa-agent-router to generate test data for the P0 cases in @testcases-login.md
```

```text
Follow skills/testdata-generator/SKILL.md for @testcases-checkout.md
Create valid, invalid, and boundary datasets. No real PII.
```

---

## 11. api-testing

Thiết kế coverage API từ OpenAPI / spec.

```text
Use qa-agent-router to design API tests from @openapi.yaml
```

```text
Follow skills/api-testing/SKILL.md for @openapi.yaml
Focus on auth, status codes, payload validation, and error contracts for /orders.
```

---

## 12. automation-script-writer

Viết script automation từ testcase (Playwright / Cypress / …).

```text
Use qa-agent-router to automate P0 cases from @testcases-login.md using Playwright
```

```text
Follow skills/automation-script-writer/SKILL.md
Framework: Playwright + TypeScript
Automate cases marked Auto Candidate = Yes in @testcases-login.md
```

---

## 13. exploratory-tester

Charter exploratory khi feature mới / docs yếu.

```text
Use qa-agent-router to create exploratory charters for @feature-new-dashboard.md
```

```text
Follow skills/exploratory-tester/SKILL.md for Checkout v2
Include heuristics, session timebox, and note areas for later formal testcases.
```

---

## 14. regression-advisor

Gợi ý tier regression / gate trước release.

```text
Use qa-agent-router to recommend a regression strategy for @release-diff.md
```

```text
Follow skills/regression-advisor/SKILL.md
Change: payment gateway swap. Suggest P0 smoke, extended pack, and release gates.
```

---

## 15. browser-url-check

Quét URL thật bằng Playwright MCP, lưu report.

```text
Use qa-agent-router to check browser URL https://staging.example.com
```

```text
Follow skills/browser-url-check/SKILL.md
Check https://staging.example.com
Crawl same-origin pages and save the scan report.
```

```text
Check browser URL https://staging.example.com/admin
(Use HTTP Basic if auth_required; or capture_browser_session for OAuth/SSO)
```

---

## 16. browser-document-generator

Chuyển kết quả browser scan → tài liệu sẵn sàng cho testcase-generator.

```text
Use qa-agent-router to generate a browser test document from the latest scan report
```

```text
Follow skills/browser-document-generator/SKILL.md
Use reportDir: @agents/mcps/mcp-playwright-browser-check/browser-check-reports/<host>/run 1 - <datetime>/
Create browser-test-document.md for testcase generation.
```

---

## Chuỗi multi-skill (gói đầy đủ)

### A. Từ requirement → testcase đã review

```text
Use qa-agent-router and run this chain on @user-story-checkout.md:
requirement-analyzer → testcase-generator → testcase-reviewer
```

### B. Full QA pack

```text
Use qa-agent-router for a full QA pack on @feature-checkout.md:
requirement-analyzer → scope-analyzer → risk-analyzer → test-plan-generator → testcase-generator → testcase-reviewer → testdata-generator
```

### C. Website → testcase

```text
Use qa-agent-router for https://staging.example.com:
browser-url-check → browser-document-generator → testcase-generator → testcase-reviewer
```

### D. Sau review → automation

```text
Follow skills/automation-script-writer/SKILL.md
Only automate P0 cases that passed testcase-reviewer in @testcases-login.md
Framework: Playwright.
```

---

## Mẹo nhanh

1. **Router mặc định** khi nói “test cases / scenarios” → `testcase-generator`.
2. Nói rõ **review / audit / mismatch** → `testcase-reviewer`.
3. Gắn file bằng `@path` trước khi nhờ agent chạy.
4. Muốn **một skill thôi** → dùng `Follow skills/<name>/SKILL.md …`.
5. Testcase title luôn **English** + prefix **`Verify`**.

## Liên quan

- Agent: `agents/qa-agent-router.md`
- Quy chuẩn: `docs/QA_GLOBAL_RULES.md`
- Cài skill vào Cursor: `.\install.ps1`
