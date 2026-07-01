# Test Case Generator — Hướng dẫn

## Skill này làm gì

Chuyển requirement thành **test case QA** có cấu trúc, coverage rộng, format thống nhất.

## Khi nào dùng

- User Story sẵn sàng cho QA
- Cần bộ regression cho feature
- Spec API/UI cần bước kiểm thử
- Orchestrator giao task sinh testcase sau bước phân tích

## Input

| Input | Gợi ý |
|-------|-------|
| User Story + AC | Nguồn tốt nhất — map Requirement Ref |
| OpenAPI | Status code, schema, auth |
| Mockup UI | Trạng thái màn hình, validation |
| Excel rules | Mỗi rule → ít nhất 1 testcase |

## Output

Bảng markdown + coverage summary. Tiêu đề tiếng Anh, bắt đầu **Verify**.

## Công thức tiêu đề

```
Verify <đối tượng> <hành vi/kết quả mong đợi>
```

Ví dụ:

- `Verify guest cannot access admin dashboard`
- `Verify order total includes tax when tax-enabled region is selected`
- `Verify POST /orders returns 400 when quantity is zero`

## Ma trận coverage

| Loại | Kiểm tra gì |
|------|-------------|
| Positive | Happy path đúng AC |
| Negative | Input sai, role sai, state sai |
| Boundary | 0, 1, max, max+1, empty, null |
| Validation | Format, độ dài, bắt buộc |
| Permission | Từng role: được / bị chặn |
| API | Method, auth, payload, mã lỗi |
| UI | Label, trạng thái, điều hướng, message |

## Gợi ý MCP

| MCP | Lợi ích |
|-----|---------|
| Jira / Linear | Lấy AC từ ticket |
| Confluence / Notion | Đọc spec đầy đủ |
| OpenAPI tools | Parse endpoint |
| Playwright / Browser | Xác nhận UI thực tế |

## Agent liên quan

- **requirement-analyzer** — chạy trước nếu AC lộn xộn
- **testdata-generator** — sinh data sau khi có testcase
- **automation-script-writer** — automate P0/P1

## Cấu trúc file

| File | Mục đích |
|------|----------|
| `SKILL.md` | Workflow cho AI |
| `GUIDE.md` | Giải thích tiếng Anh |
| `GUIDE.vi.md` | File này |
