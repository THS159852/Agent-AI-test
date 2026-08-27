# Test Case Reviewer — Hướng dẫn

## Skill này làm gì

Rà soát bộ testcase **đã sinh** bởi `testcase-generator`. Phát hiện lệch requirement/UI, lỗi chất lượng, thiếu coverage, và **gắn mỗi finding với màn hình** tương ứng.

Bắt buộc **dựng lại coverage matrix** (AC / Rule / Endpoint / Branch) từ spec gốc lúc review. Coverage summary của generator **không** được coi là bằng chứng đã cover.

**Không** tự sinh lại toàn bộ suite trừ khi bạn yêu cầu sửa.

## Khi nào dùng

- Ngay sau khi `testcase-generator` xong
- Trước khi automation hoặc bàn giao tester
- Khi review file `.md` / Excel chứa testcase đã generate
- Từ khóa: review testcase, audit, mismatch, kiểm tra bộ TC đã sinh, coverage matrix

## Input cần có

1. Bảng testcase đã generate
2. Requirement / AC / API spec / browser document gốc (nên có)
3. Tuỳ chọn: Coverage Summary từ generator — **vẫn phải dựng lại matrix**

## Output

| Phần | Mục đích |
|------|----------|
| Summary + verdict | Pass / Pass with fixes / Rework required |
| Screen Registry | Các màn hình mà bộ TC đụng tới |
| Coverage matrix | Mỗi AC/rule/endpoint/branch được chấm Covered Yes/No |
| Findings theo màn hình | Mismatch, sai màn hình, over-spec, under-spec, assumed coverage |
| Coverage gaps theo màn hình | Điều kiện thiếu + gợi ý title TC mới |
| Assumptions / Questions / Risks | Nguồn chưa rõ |

## Coverage matrix (khi review)

Dựng hàng từ **spec**, rồi map TC ID vào từng hàng.

**Covered = Yes** chỉ khi có TC đúng nhánh đó **và** Expected Result assert data/mapping theo spec (không chỉ HTTP 200 / "success").

Fail bộ TC khi:

- Chỉ assert status, bỏ qua field/merge/token
- Nhánh happy path hợp lệ bị đẩy sang edge/"làm sau"
- Flag / merge / endpoint khác nhau bị gộp vào một TC
- Mỗi API chỉ có một happy case trong khi spec có nhiều nhánh success
- Bỏ qua bước matrix

## Mức độ nghiêm trọng

- **Critical** — sai so với AC, lỗ hổng quyền, gắn nhầm màn hình, thiếu hàng P0 happy-path / mapping
- **Major** — thiếu hàng P0/P1 trên matrix, assert chỉ status, bịa rule, bước không chạy được, assumed coverage
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
