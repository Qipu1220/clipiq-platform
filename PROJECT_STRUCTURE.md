# 📁 ClipIQ Platform - Cấu trúc Project

## Tổng quan về các files cấu hình

### 🔧 Root Level Files

```
clipiq-platform/
├── .gitignore              ✅ Ignore files cho Git (toàn project)
├── .dockerignore           ✅ Ignore files khi build Docker
├── .env.example            ✅ Template environment variables
├── docker-compose.yml      ✅ Orchestration tất cả services
├── Makefile                ✅ Shortcuts cho lệnh Docker
├── README.md               ✅ Documentation chính
├── QUICKSTART.md           ✅ Hướng dẫn nhanh 3 bước
└── LICENSE                 ✅ License file
```

### 📂 Backend Structure

```
backend/
├── src/                    # Source code
│   ├── config/            # 4 files - Database, MinIO, JWT, CORS
│   ├── controllers/       # 9 files - Request handlers
│   ├── middlewares/       # 7 files - Auth, validation, error...
│   ├── models/            # 10 files - Database models
│   ├── routes/            # 9 files - API endpoints
│   ├── services/          # 7 files - Business logic
│   ├── utils/             # 7 files - Helper functions
│   ├── validators/        # 4 files - Input validation
│   ├── database/
│   │   ├── migrations/    # 8 SQL files
│   │   └── seeders/       # 3 seeder files
│   └── server.js          # Entry point
├── tests/                  # Unit & integration tests
│   ├── unit/
│   └── integration/
├── docs/                   # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── DEPLOYMENT.md
│   └── ARCHITECTURE.md
├── .env.example            ✅ Backend env template
├── .eslintrc.json          ✅ ESLint config
├── .prettierrc             ✅ Prettier config
├── jest.config.js          ✅ Jest test config
├── nodemon.json            ✅ Nodemon config
└── package.json            ✅ Dependencies
```

### 🎨 Frontend Structure

```
frontend/
├── src/
│   ├── components/         # React components
│   ├── store/             # Redux store
│   ├── styles/            # CSS files
│   └── ...
├── package.json
├── vite.config.ts
└── index.html
```

---

## 🗑️ Files đã XÓA (dư thừa)

### ❌ Đã xóa khỏi backend:
- ~~`backend/.gitignore`~~ → Dùng `.gitignore` chung ở root
- ~~`backend/README.md`~~ → Dùng `README.md` chung ở root

### ✅ Lý do:
1. **Tránh duplicate config**: Một file `.gitignore` ở root đủ cho cả project
2. **Single source of truth**: README ở root là documentation chính
3. **Cleaner structure**: Ít files config hơn, dễ maintain hơn

---

## 📝 Vai trò từng file

### 1. `.gitignore` (Root)
- **Công dụng**: Ignore files không cần commit lên Git
- **Scope**: Toàn bộ project (backend + frontend)
- **Quan trọng**: 
  - ✅ Ignore `node_modules/`
  - ✅ Ignore `.env` (chứa secrets)
  - ✅ Ignore `dist/`, `build/`

### 2. `.dockerignore` (Root)
- **Công dụng**: Ignore files khi copy vào Docker image
- **Tác dụng**: 
  - ⚡ Tăng tốc build
  - 💾 Giảm kích thước image
  - 🔒 Không copy secrets vào image

### 3. `.env.example` (Root & Backend)
- **Công dụng**: Template cho environment variables
- **Workflow**:
  ```powershell
  Copy-Item .env.example .env
  # Edit .env với config thật
  ```
- **Quan trọng**: `.env` KHÔNG được commit lên Git!

### 4. `Makefile` (Root)
- **Công dụng**: Shortcuts cho lệnh Docker
- **Examples**:
  ```bash
  make up       # docker-compose up -d
  make migrate  # docker exec clipiq_backend npm run migrate
  make setup    # up + migrate + seed (all in one)
  ```

### 5. `docker-compose.yml` (Root)
- **Công dụng**: Định nghĩa và chạy multi-container Docker
- **Services**:
  - PostgreSQL (port 5432)
  - MinIO (port 9000, 9001)
  - Backend (port 5000)
  - Frontend (port 5173)

---

## 🎯 Workflow Chuẩn

### Setup lần đầu:
```powershell
# 1. Clone
git clone <repo>
cd clipiq-platform

# 2. Start all services (Docker sẽ handle mọi thứ)
docker-compose up -d

# 3. Setup database
docker exec clipiq_backend npm run migrate
docker exec clipiq_backend npm run seed

# 4. Done! Truy cập http://localhost:5173
```

### Development daily:
```powershell
# Start
docker-compose up -d

# Xem logs
docker-compose logs -f backend

# Stop
docker-compose down
```

---

## 🔍 So sánh: Trước và Sau

### ❌ TRƯỚC (có duplicate):
```
clipiq-platform/
├── .gitignore                    # Root gitignore
├── backend/
│   ├── .gitignore               # ❌ DUPLICATE
│   ├── README.md                # ❌ DUPLICATE
│   └── ARCHITECTURE.md          # ❌ Nên ở trong docs/
└── frontend/
```

### ✅ SAU (clean):
```
clipiq-platform/
├── .gitignore                    # ✅ Duy nhất, cover toàn project
├── .dockerignore                 # ✅ Cho Docker build
├── README.md                     # ✅ Main documentation
├── QUICKSTART.md                 # ✅ Quick guide
├── Makefile                      # ✅ Command shortcuts
├── docker-compose.yml            # ✅ Service orchestration
├── backend/
│   ├── docs/
│   │   └── ARCHITECTURE.md      # ✅ Đúng vị trí
│   ├── .env.example             # ✅ Backend config
│   └── ...
└── frontend/
    └── ...
```

---

## 💡 Best Practices

### ✅ DO:
- Commit `.env.example` (template)
- Commit `.gitignore`, `.dockerignore`
- Commit `Makefile`, `docker-compose.yml`
- Commit documentation files (`.md`)
- Commit config files (`.eslintrc`, `.prettierrc`, `jest.config.js`)

### ❌ DON'T:
- ❌ NEVER commit `.env` (chứa secrets)
- ❌ NEVER commit `node_modules/`
- ❌ NEVER commit `dist/`, `build/`
- ❌ NEVER commit `.vscode/`, `.idea/` (trừ shared configs)
- ❌ NEVER duplicate config files

---

## 🚀 Benefits

### Cấu trúc hiện tại:
1. ✅ **Clean**: Không có duplicate files
2. ✅ **Maintainable**: Dễ update và maintain
3. ✅ **Docker-friendly**: Tối ưu cho containerization
4. ✅ **Git-friendly**: Proper ignore patterns
5. ✅ **Developer-friendly**: Clear documentation và quick commands

### Single Command Setup:
```powershell
# Literally chỉ cần 1 lệnh!
docker-compose up -d && docker exec clipiq_backend npm run migrate && docker exec clipiq_backend npm run seed
```

Hoặc với Makefile:
```powershell
make setup
```

---

## 📚 Tài liệu liên quan

- `README.md` - Documentation chính
- `QUICKSTART.md` - Hướng dẫn nhanh
- `backend/docs/API_DOCUMENTATION.md` - API docs
- `backend/docs/DATABASE_SCHEMA.md` - Database schema
- `backend/docs/DEPLOYMENT.md` - Deployment guide
- `backend/docs/ARCHITECTURE.md` - Architecture overview
