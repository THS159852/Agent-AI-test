# Test Case Reviewer — Hướng dẫn

## Skill này làm gì

Rà soát bộ testcase **đã sinh** bởi `testcase-generator`. Phát hiện lệch requirement/UI, lỗi chất lượng, thiếu coverage, và **gắn mỗi finding với màn hình** tương ứng.

**Không** tự sinh lại toàn bộ suite trừ khi bạn yêu cầu sửa.

## Khi nào dùng

- Ngay sau khi `testcase-generator` xong
- Trước khi automation hoặc bàn giao tester
- Khi review file `.md` / Excel chứa testcase đã generate
- Từ khóa: review testcase, audit, mismatch, kiểm tra bộ TC đã sinh

## Input cần có

1. Bảng testcase đã generate
2. Requirement / AC / browser document gốc (nên có)
3. Tuỳ chọn: Coverage Summary từ generator

## Output

| Phần | Mục đích |
|------|----------|
| Summary + verdict | Pass / Pass with fixes / Rework required |
| Screen Registry | Các màn hình mà bộ TC đụng tới |
| Findings theo màn hình | Mismatch, sai màn hình, over-spec, … |
| Coverage gaps theo màn hình | Điều kiện thiếu + gợi ý title TC mới |
| Assumptions / Questions / Risks | Nguồn chưa rõ |

## Mức độ nghiêm trọng

- **Critical** — sai so với AC, lỗ hổng quyền, gắn nhầm màn hình khiến fail khi chạy
- **Major** — thiếu P0, bịa rule, bước không chạy được, Expected Result không phải tiếng Anh
- **Minor** — style, ID, Auto Candidate

## Chuỗi dùng phổ biến

```
testcase-generator → testcase-reviewer → (sửa) → testdata-generator / automation-script-writer
```

UI từ browser:

```
browser-url-check → browser-document-generator → testcase-generator → testcase-reviewer
```

## Liên quan

- Skill: [SKILL.md](SKILL.md)
- Quy tắc generator: `skills/testcase-generator/SKILL.md`
- Quy chuẩn chung: `docs/QA_GLOBAL_RULES.vi.md`
