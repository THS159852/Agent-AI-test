# Hệ thống QA Tester Agent

**1 Agent** nhận yêu cầu và đẩy sang **Skill** phù hợp. Không dùng sub-agent.

## Kiến trúc

```
User nhập yêu cầu → qa-agent-router (Agent) → skills/<tên>/SKILL.md → Kết quả
```

| Lớp     | Làm gì                           | Ở đâu |
|---------|----------------------------------|------|
| **Agent** | Nhận request, phân loại, chọn skill (router — chỉ trong `agents/`) | `agents/qa-agent-router.md` |
| **Skill** | Xử lý chuyên môn (testcase, plan, ...) | `skills/<tên>/SKILL.md` |
| **Guide** | Tài liệu cho người (EN + VI)     | `skills/<tên>/GUIDE.vi.md` |

## Cấu trúc thư mục

```
agents/
├── README.md / README.vi.md
├── install.ps1
├── docs/
│   └── QA_GLOBAL_RULES.md (+ .vi.md)
├── agents/
│   ├── qa-agent-router.md      ← Chỉ 1 file agent
│   ├── qa-agent-router.vi.md
│   └── mcps/
│       ├── mcp.json.example
│       └── mcp-playwright-browser-check/
│           ├── package.json
│           ├── src/
│           └── browser-check-reports/  ← Tự sinh local, Git bỏ qua
├── .cursor/                    ← Người dùng tạo local, Git bỏ qua
│   └── mcp.json
└── skills/
    └── <tên-skill>/
        ├── SKILL.md                ← AI đọc và thực thi
        ├── GUIDE.md
        └── GUIDE.vi.md             ← Bạn đọc để hiểu skill
```

## Tại sao không cần sub-agent?

| Sub-agent (cũ)                     | Skill (đúng mô hình) |
|------------------------------------|----------------------|
| Mỗi việc 1 agent riêng → trùng lặp | 1 agent điều phối, skill làm việc |
| Cursor phải chọn agent nào         | Agent đọc prompt → load skill |
| Agent + Skill trùng nội dung       | Agent mỏng, skill đầy đủ workflow |

**Agent = người nhận và route. Skill = người xử lý.**

## Danh sách Skill

| Skill                  | Mục đích |
|------------------------|----------|
| requirement-analyzer   | Phân tích requirement |
| domain-learner         | Học domain nghiệp vụ |
| requirement-explainer  | Giải thích requirement |
| **testcase-generator** | **Sinh testcase (Verify, tiếng Anh)** |
| automation-script-writer | Viết script automation |
| test-plan-generator    | Lập test plan |
| scope-analyzer         | Phân tích scope |
| estimate-planner       | Estimate effort |
| exploratory-tester     | Exploratory testing |
| risk-analyzer          | Phân tích rủi ro |
| testdata-generator     | Sinh test data |
| api-testing            | Test API |
| browser-url-check      | Khám phá và kiểm tra URL bằng Playwright MCP |
| browser-document-generator | Chuyển kết quả browser thành tài liệu sẵn sàng sinh testcase |
| regression-advisor     | Chiến lược regression |

## Cài đặt

```powershell
cd f:\Vietlink\agent\agents
.\install.ps1
```

## Setup Playwright Browser Check MCP cho người dùng mới

Source code MCP được commit lên Git. Hai đường dẫn local sau được chủ động loại khỏi Git:

| Đường dẫn | Cách tạo | Lý do không commit |
|-----------|----------|---------------------|
| `.cursor/mcp.json` | Người dùng tạo theo hướng dẫn bên dưới | Chứa đường dẫn tuyệt đối riêng của từng máy |
| `browser-check-reports/` | MCP tự tạo sau lần scan đầu tiên | Chứa report, screenshot, video và evidence local |

Bạn **không cần tạo thủ công** folder `browser-check-reports/`.

### Bước 1: Cài phần mềm cần thiết

Cần có:

- [Node.js](https://nodejs.org/) 18 trở lên
- Cursor có hỗ trợ MCP
- Git

Kiểm tra Node.js:

```powershell
node --version
npm --version
```

### Bước 2: Cài dependency MCP và Chromium

Chạy từ thư mục gốc repo:

```powershell
cd agents/mcps/mcp-playwright-browser-check
npm install
npx playwright install chromium
cd ../../..
```

Lệnh này tạo `node_modules/` local; folder này được Git bỏ qua.

### Bước 3: Tạo cấu hình MCP cho project

Tạo folder và file sau tại thư mục gốc repo:

```text
.cursor/
└── mcp.json
```

Có thể tham khảo `agents/mcps/mcp.json.example`. Trước tiên, lấy đường dẫn tuyệt đối trên máy:

```powershell
(Get-Command node).Source
(Resolve-Path "agents/mcps/mcp-playwright-browser-check").Path
```

Tạo `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "playwright-browser-check": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:/DUONG_DAN_TUYET_DOI_DEN_REPO/agents/mcps/mcp-playwright-browser-check/node_modules/tsx/dist/cli.mjs",
        "C:/DUONG_DAN_TUYET_DOI_DEN_REPO/agents/mcps/mcp-playwright-browser-check/src/server.ts"
      ],
      "cwd": "C:/DUONG_DAN_TUYET_DOI_DEN_REPO/agents/mcps/mcp-playwright-browser-check"
    }
  }
}
```

Thay:

- `command` bằng kết quả của `(Get-Command node).Source`
- toàn bộ `C:/DUONG_DAN_TUYET_DOI_DEN_REPO` bằng đường dẫn repo đã clone

Quy tắc JSON:

- Dùng `/` trong đường dẫn hoặc escape dấu `\` thành `\\`
- Không để dấu phẩy thừa ở phần tử cuối
- Đặt `.cursor/mcp.json` đúng tại thư mục gốc repo

### Bước 4: Cài agent và skills vào Cursor

```powershell
.\install.ps1
```

Lệnh này cài QA router và toàn bộ skill, bao gồm:

- `browser-url-check`
- `browser-document-generator`

### Bước 5: Reload và kiểm tra Cursor

1. Trong Cursor, nhấn `Ctrl+Shift+P`
2. Chạy **Developer: Reload Window**
3. Mở **Cursor Settings → MCP**
4. Kiểm tra `playwright-browser-check` được bật và có trạng thái màu xanh

Nếu trạng thái màu đỏ:

1. Chọn **Show Output**
2. Kiểm tra đường dẫn Node.js và repo trong `.cursor/mcp.json`
3. Chạy lại `npm install` và `npx playwright install chromium`

### Bước 6: Chạy browser check đầu tiên

Trong Cursor Agent chat:

```text
Check browser https://example.com and generate test documentation
```

MCP sẽ mở Chromium fullscreen, thực hiện tuần tự các thao tác giống người dùng và đóng từng browser sau khi kiểm tra xong chức năng.

Sau lần chạy, report tự động được tạo:

```text
agents/mcps/mcp-playwright-browser-check/browser-check-reports/
└── example.com/
    ├── baseline.json
    └── run 1 - <datetime>/
        ├── summary-en.md
        ├── summary-vi.md
        ├── bug-report-en.md
        ├── bug-report-vi.md
        ├── failed-requests-curl.txt
        ├── browser-test-document.md
        └── evidences/
```

Dùng `browser-test-document.md` để sinh testcase:

```text
Generate test cases from @<reportDir>/browser-test-document.md
```

### Bước 7: Xử lý authentication

Nếu URL yêu cầu HTTP authentication hoặc có form login HTML, agent trả `auth_required` và hỏi username/password. Credentials không được ghi vào report. Chỉ nên sử dụng tài khoản test.

## Cách dùng

```
Use qa-agent-router to generate test cases from @requirements.md
```

Agent tự route sang skill `testcase-generator`.

## Luồng routing

| Yêu cầu          | Skill |
|------------------|-------|
| Sinh testcase    | testcase-generator |
| Giải thích requirement | requirement-explainer |
| Estimate         | scope-analyzer → estimate-planner |
| Gói QA đầy đủ    | analyzer → scope → plan → testcase → testdata |

## Quản lý bằng GitHub

### Lần đầu — đẩy repo lên GitHub

```powershell
cd f:\Vietlink\agent\agents

# 1. Tạo repo trên GitHub (web): github.com/new → tên repo, ví dụ: qa-tester-agent
#    Chọn Public hoặc Private, KHÔNG tick "Add README" (repo local đã có sẵn)

# 2. Liên kết remote (thay YOUR_USER và REPO_NAME)
git remote add origin https://github.com/YOUR_USER/REPO_NAME.git

# 3. Push lần đầu
git push -u origin main
```

### Máy mới — clone và cài Cursor

```powershell
git clone https://github.com/YOUR_USER/REPO_NAME.git
cd REPO_NAME
.\install.ps1
```

### Cập nhật hàng ngày

```powershell
# Sau khi sửa skill/agent trên máy này → push lên GitHub
git add .
git commit -m "update: mô tả thay đổi"
git push

# Máy khác (hoặc cùng máy) → pull và cài lại vào Cursor
.\sync.ps1
```

`sync.ps1` = `git pull` + `install.ps1` — giữ Cursor đồng bộ với repo.
