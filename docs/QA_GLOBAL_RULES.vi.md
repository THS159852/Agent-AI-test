# Quy chuẩn QA chung

Tiêu chuẩn dùng chung cho tất cả skill trong hệ thống Tester Agent.

## Xử lý requirement

- Không tự bịa quy tắc nghiệp vụ không có trong tài liệu gốc.
- Nếu thiếu thông tin, luôn ghi rõ:
  1. **Assumptions** — giả định để tiếp tục
  2. **Questions** — cần PO/BA/Dev làm rõ
  3. **Risks** — hậu quả nếu giả định sai

## Định dạng input hỗ trợ

| Định dạng             | Cách đọc |
|-----------------------|----------|
| Markdown / TXT        | Đọc trực tiếp |
| PDF / DOCX            | Trích xuất text; lưu ý bảng/layout có thể mất |
| Excel / CSV           | Đọc sheet; xác định cột, rule, sample data |
| JSON / YAML / OpenAPI | Parse cấu trúc, endpoint, schema |
| Ảnh / Screenshot      | Mô tả UI, luồng, label |
| Jira / ticket         | Parse title, mô tả, AC, đính kèm |
| Code / config         | Xác định module, API, feature flag bị ảnh hưởng |

## Chuẩn Test Case (bắt buộc)

| Trường    | Quy tắc |
|-----------|---------|
| Ngôn ngữ  | **Tiếng Anh** |
| Tiêu đề   | **Bắt đầu bằng `Verify`** |
| ID        | `TC-XXX` hoặc convention dự án |
| Priority  | P0 / P1 / P2 / P3 |
| Test Type | Functional, UI, API, Integration, Regression, ... |

### Trường bắt buộc mỗi test case

```
ID | Module | Requirement Ref | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Test Type | Auto Candidate
```

| Trường           | Quy tắc |
|------------------|---------|
| Title            | Tiếng Anh, bắt đầu **Verify** |
| Test Data        | Giá trị cụ thể, không mơ hồ |
| Expected Result  | Quan sát được: message, URL, mã HTTP, trạng thái UI/DB |
| Auto Candidate   | Yes / No — có nên automate không |

### Checklist coverage

Luôn cân nhắc:

- Positive (happy path)
- Negative (input sai, trạng thái sai)
- Boundary (min, max, empty, null)
- Exception / xử lý lỗi
- Validation
- Permission / role
- UI
- API (status, payload, headers)
- Localization (nếu có)
- Accessibility (nếu có)
- Performance (chỉ khi requirement đề cập)

## Hợp đồng skill

1. `tester-orchestrator` load skill khi request user khớp mục đích.
2. Skill chỉ làm **đúng chuyên môn** của nó.
3. Trả output có cấu trúc để agent trình bày cho user.
4. Nằm tại `skills/<tên>/SKILL.md`; guide tại `GUIDE.md` / `GUIDE.vi.md`.

## Gợi ý MCP Server

| Mục đích                   | MCP gợi ý |
|---------------------------|-----------|
| Đọc ticket Jira/Linear     | Jira MCP, Linear MCP |
| Đọc tài liệu Confluence/Notion | Confluence MCP, Notion MCP |
| Khám phá UI                | Playwright MCP, Browser MCP |
| Test API                   | REST/HTTP MCP, Postman MCP |
| Test data DB               | PostgreSQL/MySQL MCP |
| PR / diff GitHub           | GitHub MCP |

Nếu không có MCP, dùng công cụ read/search trên file local.
