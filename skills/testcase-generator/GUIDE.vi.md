# Test Case Generator — Hướng dẫn

## Skill này làm gì

Chuyển requirement thành **testcase QA thực thi được**: có traceability, test data cụ thể, checklist chất lượng trước khi giao.

## Khi nào dùng

- User Story sẵn sàng cho QA
- Cần bộ regression
- Spec API/UI cần bước kiểm thử
- Tester agent route sang skill này sau khi đọc prompt

## Output

| Thành phần | Nội dung |
|------------|----------|
| Testcase | Bảng markdown (11 cột chuẩn) |
| Coverage | Summary + ma trận + gaps |
| Thiếu sót | Assumptions / Questions / Risks |

### Cột chuẩn

`ID` · `Module` · `Requirement Ref` · `Title` · `Preconditions` · `Test Data` · `Steps` · `Expected Result` · `Priority` · `Test Type` · `Auto Candidate`

## Quy tắc tiêu đề (bắt buộc)

```
Verify <đối tượng> <kết quả mong đợi>
```

- Tiếng **Anh**
- Bắt đầu **Verify**
- **Toàn bộ các cột — Title, Steps, Expected Result, ... — đều phải viết bằng tiếng Anh**, kể cả khi yêu cầu gốc bằng tiếng Việt
- Ví dụ đầy đủ: [examples.md](examples.md)

## Kỹ thuật thiết kế test

| Kỹ thuật | Dùng khi |
|----------|----------|
| Equivalence partitioning | Phân lớp input hợp lệ / không hợp lệ |
| Boundary values | Min, max, empty, null |
| Decision table | Rule nhiều điều kiện (giảm giá, phê duyệt) |
| State transition | Luồng trạng thái Draft → Approved |

## Mức ưu tiên

| Mức | Nội dung thường gặp |
|-----|---------------------|
| P0 | Happy path, bảo mật, mất dữ liệu, auth |
| P1 | Negative chính, validation, boundary |
| P2 | Luồng phụ |
| P3 | Cosmetic |

## Cột mới so với bản cũ

| Cột | Ý nghĩa |
|-----|---------|
| **Module** | Nhóm theo feature/màn hình |
| **Test Data** | Giá trị cụ thể (`user@test.com`, không chỉ "email hợp lệ") |
| **Auto Candidate** | Yes/No — case nào nên automate |

## Checklist trước khi giao

- Mọi title bắt đầu **Verify**, tiếng Anh
- Expected result cụ thể (message, URL, status code)
- Không tự bịa business rule
- Không trùng case
- P0 đủ happy path + security

## Export

- Paste bảng vào Excel / Google Sheets
- Map sang TestRail, Zephyr, Jira Xray
- Có thể yêu cầu agent: "Export testcase as CSV"

## Luồng với skill khác

```
requirement-analyzer (AC lộn xộn) → testcase-generator → testcase-reviewer → testdata-generator → automation-script-writer
```

## File trong folder

| File | Mục đích |
|------|----------|
| `SKILL.md` | Workflow đầy đủ cho AI |
| `examples.md` | Ví dụ login, form, API |
| `GUIDE.md` | Bản tiếng Anh |
