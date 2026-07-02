# Tester Agent — Hướng dẫn tiếng Việt

## Mô hình đơn giản

```
User nhập yêu cầu → Tester Agent → Skill phù hợp → Kết quả
```

**Chỉ có 1 Agent.** Không có sub-agent.

| Thành phần | Vai trò |
|------------|---------|
| **Agent**  | Nhận request, đọc prompt/file, chọn đúng skill, trả kết quả |
| **Skill**  | Làm việc thực tế (phân tích, sinh testcase, lập plan, ...) |

## Agent làm gì

1. Đọc yêu cầu user (text, @file, ticket, PDF, Excel, ...)
2. Phân loại intent (testcase? explain? estimate? ...)
3. **Load skill** tương ứng từ `skills/<tên>/SKILL.md`
4. Thực thi theo workflow trong skill
5. Trả kết quả gọn cho user

## Agent KHÔNG làm gì

- Không tự viết testcase khi chưa load skill
- Không delegate sang "sub-agent" khác
- Không trùng việc của skill

## Bảng routing nhanh

| User cần              | Skill |
|----------------------|-------|
| Phân tích requirement | `requirement-analyzer` |
| Học domain            | `domain-learner` |
| Giải thích requirement | `requirement-explainer` |
| **Sinh testcase**     | **`testcase-generator`** |
| Viết script automation | `automation-script-writer` |
| Lập test plan         | `test-plan-generator` |
| Phân tích scope       | `scope-analyzer` |
| Estimate effort        | `estimate-planner` |
| Exploratory testing    | `exploratory-tester` |
| Test API              | `api-testing` |
| Sinh test data        | `testdata-generator` |
| Phân tích rủi ro      | `risk-analyzer` |
| Chiến lược regression | `regression-advisor` |

## Ví dụ prompt

```
Use tester-orchestrator to generate test cases from @user-story-login.md
```

Agent sẽ tự route sang skill `testcase-generator`.

## Quy tắc testcase

- Tiếng **Anh**
- Tiêu đề bắt đầu **`Verify`**

## File liên quan

- Agent (EN): `agents/tester-orchestrator.md`
- Quy chuẩn: `docs/QA_GLOBAL_RULES.vi.md`
- Giải thích từng skill: `skills/<tên>/GUIDE.vi.md`
