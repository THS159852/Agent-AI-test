# Hệ thống QA Tester Agent

**1 Agent** nhận yêu cầu và đẩy sang **Skill** phù hợp. Không dùng sub-agent.

## Kiến trúc

```
User nhập yêu cầu → qa-agent-router (Agent) → skills/<tên>/SKILL.md → Kết quả
```

| Lớp     | Làm gì                           | Ở đâu |
|---------|----------------------------------|------|
| **Agent** | Nhận request, phân loại, chọn skill | `agents/qa-agent-router.md` |
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
│   └── qa-agent-router.vi.md
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
| regression-advisor     | Chiến lược regression |

## Cài đặt

```powershell
cd f:\Vietlink\agent\agents
.\install.ps1
```

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
