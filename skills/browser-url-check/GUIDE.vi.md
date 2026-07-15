# Browser URL Check — Hướng dẫn

Kiểm tra URL bằng browser thật (Playwright) qua MCP server. Skill này dùng khi bạn muốn mở web, kiểm tra truy cập, crawl các trang cùng domain, và phát hiện URI chức năng mới.

**MCP server:** `playwright-browser-check`  
**Tool:** `check_browser_url`

---

## 1. Cài đặt (một lần)

### 1.1. Cài dependency MCP

```powershell
cd F:/Vietlink/agent/agents/agents/mcps/mcp-playwright-browser-check
npm install
npx playwright install chromium
```

### 1.2. Cấu hình Cursor

File `.cursor/mcp.json` ở **gốc workspace** (`agents/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "playwright-browser-check": {
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "F:/Vietlink/agent/agents/agents/mcps/mcp-playwright-browser-check"
    }
  }
}
```

### 1.3. Sync skill

```powershell
cd F:/Vietlink/agent/agents
.\install.ps1
```

Sau đó **restart Cursor** hoặc reload MCP trong **Settings → MCP**.

---

## 2. Cách dùng

Trong chat Cursor, gửi URL cần kiểm tra:

```text
Check browser URL https://example.com
```

Agent sẽ gọi MCP tool `check_browser_url` và báo kết quả.

MCP sẽ mở cửa sổ Chromium fullscreen theo kích thước màn hình của thiết bị đang chạy. Bạn có thể quan sát trực tiếp các thao tác scroll, nhập dữ liệu tiếng Anh, click nút, submit form và chuyển màn hình. Các chức năng chạy tuần tự: hoàn tất một chức năng → đóng browser hiện tại → mở browser mới để chạy chức năng tiếp theo. Các thao tác có độ trễ ngắn và được highlight để dễ theo dõi.

### Tham số tùy chọn

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| `url` | Có | URL cần mở và kiểm tra |
| `username` | Không | Username khi site yêu cầu auth |
| `password` | Không | Password khi site yêu cầu auth |
| `maxPages` | Không | Số trang cùng domain tối đa để crawl (mặc định `50`, tối đa `100`) |

---

## 3. Luồng xử lý

```
User gửi URL
    │
    ▼
Agent gọi check_browser_url (chỉ url)
    │
    ├── Không cần auth ──► Mở browser ──► Crawl URI ──► Lưu báo cáo ──► Trả kết quả
    │
    └── Cần auth ──► Trả auth_required ──► Agent hỏi user username/password
                              │
                              ▼
                    User gửi credentials
                              │
                              ▼
                    Agent gọi lại tool (url + username + password)
                              │
                              ▼
                    Mở browser ──► Crawl URI ──► Lưu báo cáo ──► Trả kết quả
```

---

## 4. Quy tắc xác thực (Authentication)

Hệ thống **không** hiện popup nhập username/password trong browser. Thay vào đó:

1. MCP phát hiện site cần auth
2. Trả `status: "auth_required"` cho Agent
3. Agent hỏi bạn trong chat
4. Bạn gửi username/password
5. Agent gọi lại MCP với credentials

### 4.1. HTTP Basic / Digest Auth

**Cách phát hiện:** Server trả HTTP `401` kèm header `WWW-Authenticate`.

**Lần gọi đầu (không có credentials):**

```json
{
  "url": "https://example.com/admin"
}
```

**Response khi cần auth:**

```json
{
  "status": "auth_required",
  "message": "URL nay yeu cau HTTP authentication. Hay gui username va password, sau do goi lai tool.",
  "entryUrl": "https://example.com/admin",
  "authType": "Basic realm=\"Restricted Area\"",
  "pagesScanned": 0,
  "allUris": [],
  "newFeatureUris": []
}
```

**Agent hỏi user theo format:**

```text
URL này yêu cầu xác thực HTTP.

Username:
Password:
```

**User trả lời:**

```text
Username: tester
Password: my-secret-password
```

**Lần gọi lại (có credentials):**

```json
{
  "url": "https://example.com/admin",
  "username": "tester",
  "password": "my-secret-password"
}
```

Playwright tự gửi credentials qua `httpCredentials` — không cần popup browser.

### 4.2. Form đăng nhập HTML

**Cách phát hiện:** Trang có `input[type="password"]` (và thường kèm ô username/email).

**Response khi cần auth:**

```json
{
  "status": "auth_required",
  "message": "Trang co form dang nhap. Hay gui username va password, sau do goi lai tool.",
  "authType": "login_form",
  "entryUrl": "https://example.com/login",
  "finalUrl": "https://example.com/login"
}
```

**Lần gọi lại:** Cùng format như HTTP auth — gửi `url`, `username`, `password`. MCP sẽ tự điền form và submit.

### 4.3. OAuth/SSO bằng session đã đăng nhập

Áp dụng cho Google, Microsoft và các nhà cung cấp SSO không phù hợp với cách tự động
điền username/password:

1. Gọi `capture_browser_session` với URL login của ứng dụng và `sessionName`.
2. Người dùng hoàn tất đăng nhập thủ công trong browser đang hiển thị.
3. MCP lưu cookies và local storage vào `.auth-sessions/` trên máy local.
4. Gọi `check_browser_url` với `url` và cùng `sessionName`.

```json
{
  "url": "https://example.com/login",
  "sessionName": "google-test"
}
```

Có thể truyền `successUrlContains` cho `capture_browser_session` nếu biết URL sau đăng
nhập, ví dụ `"/dashboard"`. Khi session hết hạn, capture lại cùng tên để ghi đè.

### 4.4. Quy tắc bảo mật

| Quy tắc | Giải thích |
|---------|------------|
| Không tự bịa credentials | Agent chỉ dùng username/password do user cung cấp |
| Không lưu password vào file báo cáo | Report không chứa password |
| Không log password trong summary | Agent không lặp lại password khi tóm tắt |
| Không hỏi password Google/Microsoft | OAuth/SSO phải đăng nhập thủ công và lưu session |
| Không commit session | `.auth-sessions/` chứa cookie nhạy cảm và chỉ lưu local |
| Chỉ dùng tài khoản test | Không dùng tài khoản production hoặc mật khẩu quan trọng |

---

## 5. Kết quả trả về

### 5.1. Truy cập thành công (`status: "ok"`)

```json
{
  "status": "ok",
  "message": "Truy cap thanh cong: https://example.com/",
  "entryUrl": "https://example.com",
  "finalUrl": "https://example.com/",
  "title": "Example Domain",
  "httpStatus": 200,
  "pagesScanned": 12,
  "allUris": [
    {
      "url": "https://example.com/",
      "title": "Example Domain",
      "httpStatus": 200,
      "ok": true
    }
  ],
  "newFeatureUris": [
    "https://example.com/about",
    "https://example.com/contact"
  ],
  "reportDir": "F:/Vietlink/agent/agents/agents/mcps/mcp-playwright-browser-check/browser-check-reports/example.com/run 1 - 2026-07-15T04-45-00-000Z",
  "summary": "Found 2 new feature URI(s) compared to previous baseline."
}
```

### 5.2. Lỗi (`status: "error"`)

```json
{
  "status": "error",
  "message": "Khong the truy cap URL: Timeout 30000ms exceeded",
  "entryUrl": "https://example.com",
  "pagesScanned": 0,
  "allUris": [],
  "newFeatureUris": []
}
```

---

## 6. File báo cáo được lưu

Mỗi lần scan tạo **một folder mới**:

```text
agents/agents/mcps/mcp-playwright-browser-check/browser-check-reports/
└── example.com/
    ├── baseline.json                    # URI đã biết từ các lần scan trước
    └── run 1 - 2026-07-15T04-45-00-000Z/   # Folder mới mỗi lần chạy (run {số} - datetime)
        ├── summary-en.md                # Tóm tắt tiếng Anh
        ├── summary-vi.md                # Tóm tắt tiếng Việt
        ├── scan-report.json             # Báo cáo đầy đủ
        ├── all-uris.json                # Tất cả URI đã crawl
        ├── new-features.json            # URI chức năng mới (so với baseline)
        ├── bug-report.json              # Báo cáo bug của lần chạy này
        ├── bug-report-en.md             # Báo cáo bug tiếng Anh
        ├── bug-report-vi.md             # Báo cáo bug tiếng Việt
        ├── failed-requests-curl.txt      # cURL của các request lỗi
        └── evidences/
            ├── BUG-001-feature.png      # Ảnh lúc lỗi
            └── run-1-page-1-feature.mp4 # Video có highlight thao tác
```

### Ý nghĩa từng file

| File | Nội dung |
|------|----------|
| `summary-en.md` | Tóm tắt bằng tiếng Anh |
| `summary-vi.md` | Tóm tắt bằng tiếng Việt |
| `scan-report.json` | Toàn bộ kết quả scan dạng JSON |
| `all-uris.json` | Danh sách URI kèm title, HTTP status, trạng thái ok/error |
| `new-features.json` | URI chưa có trong `baseline.json` — coi là chức năng mới |
| `bug-report.json` | Báo cáo bug đầy đủ của lần chạy (run number, danh sách bug) |
| `bug-report-en.md` | Báo cáo bug bằng tiếng Anh |
| `bug-report-vi.md` | Báo cáo bug bằng tiếng Việt |
| `failed-requests-curl.txt` | cURL đã che Authorization/Cookie của request lỗi |
| `evidences/*.png` | Ảnh chụp màn hình tại thời điểm lỗi |
| `evidences/*.mp4` | Video thao tác của màn hình có lỗi |
| `baseline.json` | Tích lũy URI đã biết; dùng so sánh lần scan sau |

### Quy tắc phát hiện chức năng mới

- **Lần scan đầu:** Mọi URI đều là "mới" (baseline trống)
- **Lần scan sau:** Chỉ URI chưa có trong `baseline.json` mới được liệt kê trong `new-features.json`
- Sau mỗi scan thành công, `baseline.json` được cập nhật

---

## 6.1. Báo cáo bug theo từng lần chạy

Sau khi crawl xong, MCP sẽ **tự động thao tác như người dùng** trên từng màn hình:

1. Đóng modal / cookie / overlay chặn thao tác
2. Scroll trang như user
3. Nhập vào các ô input/search đang hiện
4. Điền và submit form (trừ form có password)
5. Click các nút an toàn (bỏ qua logout/delete/cancel)
6. Click menu/link cùng domain để mở màn hình khác → thao tác tiếp → quay lại
7. Ghi nhận lỗi thao tác UI, validation, navigation; lọc nhiễu CSP/CORS/analytics

Mỗi lần chạy có `runNumber` tăng dần (Run 1, Run 2, Run 3...).

### Không có bug (Run 1)

`bug-report-vi.md`:

```markdown
# Bug Report - Run 1

**Trang thai:** Khong co bug
...
Khong phat hien loi trong lan chay nay.
```

### Có bug (Run 2, nhiều bug ở Run 3, 4...)

`bug-report-vi.md`:

```markdown
# Bug Report - Run 2

**Trang thai:** Co 1 bug

### Bug 1: BUG-001
- **Chuc nang:** contact
- **Man hinh:** Contact Us
- **URL:** https://example.com/contact
- **Thao tac:** Submit form-1 (Send)
- **Loai loi:** validation_error
- **Mo ta:** Email is required
```

Một lần chạy có thể sinh **nhiều bug** từ nhiều màn hình khác nhau.

### Evidence và cURL lỗi

- Mỗi lỗi có thể tham chiếu tới ảnh `.png` và video `.mp4` trong `evidences/`.
- Video hiển thị banner `TESTING: <chức năng> | <thao tác>` và viền vàng quanh control đang được thao tác.
- Chỉ giữ video của màn hình có lỗi; video không có lỗi bị xóa.
- Request trả `4xx`, `5xx` hoặc `requestfailed` được ghi thành cURL trong `failed-requests-curl.txt`.
- Header `Authorization`, `Cookie` và `Proxy-Authorization` được thay bằng `<REDACTED>`.

---

| Quy tắc | Chi tiết |
|---------|----------|
| Cùng domain | Chỉ crawl link cùng origin với URL gốc |
| Giới hạn số trang | Mặc định 50, tối đa 100 (qua `maxPages`) |
| Bỏ qua | `mailto:`, `tel:`, `javascript:`, link ngoài domain |
| Không mở popup auth | Credentials qua MCP tool argument, không qua UI browser |

---

## 8. Ví dụ đầy đủ

### Ví dụ 1: URL không cần auth

**User:**

```text
Check browser URL https://example.com
```

**Agent gọi:**

```json
{ "url": "https://example.com" }
```

**Kết quả:** Truy cập thành công, crawl URI, lưu báo cáo, báo `reportDir`.

### Ví dụ 2: URL cần HTTP auth

**User:**

```text
Check browser URL https://staging.example.com/admin
```

**Lần 1 — Agent gọi không credentials → nhận `auth_required`**

**Agent hỏi:**

```text
URL này yêu cầu xác thực HTTP. Bạn hãy gửi username và password.
```

**User:**

```text
Username: qa-tester
Password: Test@123
```

**Lần 2 — Agent gọi:**

```json
{
  "url": "https://staging.example.com/admin",
  "username": "qa-tester",
  "password": "Test@123"
}
```

**Kết quả:** Truy cập thành công, crawl, lưu báo cáo.

### Ví dụ 3: Giới hạn số trang crawl

```json
{
  "url": "https://example.com",
  "maxPages": 20
}
```

---

## 9. Xử lý sự cố

| Vấn đề | Cách xử lý |
|--------|------------|
| MCP không chạy | Kiểm tra **Settings → MCP**, restart Cursor |
| `npm run start` lỗi | Chạy `npm install` và `npx playwright install chromium` |
| Vẫn `auth_required` sau khi gửi credentials | Kiểm tra username/password đúng; thử lại |
| Form login không tự điền được | Site có form đặc biệt — báo dev để mở rộng selector |
| Crawl ít trang | Tăng `maxPages` (tối đa 100) |
| Lần đầu nhiều URI "mới" | Bình thường — baseline trống; lần sau sẽ chính xác hơn |

---

## 10. Cấu trúc liên quan

```text
agents/
├── .cursor/
│   └── mcp.json
├── agents/
│   └── mcps/
│       └── mcp-playwright-browser-check/
│           ├── src/server.ts
│           └── browser-check-reports/
└── skills/
    └── browser-url-check/
        ├── SKILL.md      ← Hướng dẫn cho Agent
        ├── GUIDE.md      ← Hướng dẫn tiếng Anh (ngắn)
        └── GUIDE.vi.md   ← Hướng dẫn tiếng Việt (file này)
```
