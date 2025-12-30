<p align="center">
  <h1 align="center">🎬 ClipIQ Platform</h1>
  <p align="center">
    <strong>Nền tảng chia sẻ video thông minh với tìm kiếm AI-powered</strong>
  </p>
  <p align="center">
    <a href="#tính-năng">Tính năng</a> •
    <a href="#công-nghệ-sử-dụng">Công nghệ</a> •
    <a href="#cài-đặt">Cài đặt</a> •
    <a href="#api-documentation">API</a> •
    <a href="#đóng-góp">Đóng góp</a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/PostgreSQL-14+-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

---

## 📖 Giới thiệu

**ClipIQ** là một nền tảng chia sẻ video hoàn chỉnh được xây dựng với kiến trúc hiện đại, tích hợp AI để tìm kiếm thông minh. Dự án được phát triển như một phần của môn học **SE347 - Công nghệ Web và Ứng dụng**.

### ✨ Điểm nổi bật

- 🎥 **Upload & Stream video** - Hỗ trợ upload video với xử lý thumbnail tự động
- 🔍 **Tìm kiếm AI-powered** - Sử dụng Mistral AI + Qdrant Vector Database + Elasticsearch
- 🏠 **Feed cá nhân hóa** - Đề xuất video dựa trên sở thích người dùng
- 👤 **Hệ thống tài khoản** - Đăng ký, đăng nhập, quản lý profile
- 🛡️ **Phân quyền** - Admin, Staff, User với các quyền khác nhau
- 📊 **Dashboard quản trị** - Thống kê, quản lý người dùng và nội dung

---

## 🚀 Tính năng

### 👥 Người dùng (User)
| Tính năng | Mô tả |
|-----------|-------|
| 🔐 Đăng ký/Đăng nhập | Xác thực bằng JWT với access token & refresh token |
| 📤 Upload video | Upload video với title, description, tags |
| 🎬 Xem video | Stream video với player tích hợp |
| ❤️ Like/Unlike | Tương tác với video |
| 💬 Bình luận | Comment và reply comments |
| 🔔 Đăng ký kênh | Subscribe/Unsubscribe channels |
| 🔗 Chia sẻ video | Tạo link chia sẻ video |
| 🔍 Tìm kiếm | Tìm kiếm video bằng text hoặc OCR |
| 👤 Profile | Quản lý thông tin cá nhân, avatar |

### 👮 Staff
| Tính năng | Mô tả |
|-----------|-------|
| 📋 Xem báo cáo | Xem danh sách báo cáo vi phạm |
| ⚠️ Cảnh cáo người dùng | Gửi cảnh cáo đến người dùng |
| 🚫 Ban người dùng | Cấm người dùng vi phạm |
| 🗑️ Xóa nội dung | Xóa video/comment vi phạm |

### 👑 Admin
| Tính năng | Mô tả |
|-----------|-------|
| 📊 Dashboard | Thống kê tổng quan hệ thống |
| 👥 Quản lý người dùng | Xem, chỉnh sửa, ban/unban users |
| 👮 Quản lý staff | Promote/demote staff members |
| ⚙️ Cài đặt hệ thống | Cấu hình giới hạn upload, maintenance mode |
| 📈 Analytics | Xem thống kê chi tiết |

---

## 🛠️ Công nghệ sử dụng

### Backend
| Công nghệ | Mục đích |
|-----------|----------|
| **Node.js 20+** | Runtime environment |
| **Express.js** | Web framework |
| **PostgreSQL 14+** | Relational database |
| **MinIO** | Object storage (S3-compatible) |
| **Qdrant** | Vector database cho semantic search |
| **Elasticsearch** | Full-text search & OCR text search |
| **Mistral AI** | AI classification cho search queries |
| **JWT** | Authentication với access/refresh tokens |
| **Bcrypt** | Password hashing |

### Frontend
| Công nghệ | Mục đích |
|-----------|----------|
| **React 18+** | UI library |
| **Vite** | Build tool & dev server |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS** | Utility-first CSS |
| **Radix UI** | Accessible component primitives |
| **Redux Toolkit** | State management |
| **Axios** | HTTP client |
| **React Hook Form** | Form handling |
| **Recharts** | Charts & analytics |

### Infrastructure
| Công nghệ | Mục đích |
|-----------|----------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Nginx** | Reverse proxy (production) |

---

## 📁 Cấu trúc dự án

```
clipiq-platform/
├── 📂 backend/
│   ├── 📂 src/
│   │   ├── 📂 config/         # Database, MinIO configuration
│   │   ├── 📂 controllers/    # Request handlers
│   │   ├── 📂 database/       # Migrations & seeders
│   │   ├── 📂 middlewares/    # Auth, validation, error handling
│   │   ├── 📂 models/         # Data models (PostgreSQL)
│   │   ├── 📂 routes/         # API route definitions
│   │   ├── 📂 services/       # Business logic
│   │   ├── 📂 utils/          # Helper functions
│   │   ├── 📂 validators/     # Request validation schemas
│   │   └── server.js          # Express server entry point
│   ├── 📂 docs/               # API & Architecture documentation
│   └── package.json
│
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── 📂 api/            # API client functions
│   │   ├── 📂 components/     # React components
│   │   │   ├── 📂 admin/      # Admin dashboard components
│   │   │   ├── 📂 staff/      # Staff panel components
│   │   │   ├── 📂 user/       # User-facing components
│   │   │   └── 📂 ui/         # Reusable UI components (shadcn)
│   │   ├── 📂 store/          # Redux store & slices
│   │   ├── 📂 hooks/          # Custom React hooks
│   │   └── App.tsx            # Main application component
│   └── package.json
│
├── docker-compose.yml         # Docker services configuration
├── .env.example               # Environment variables template
└── README.md
```

---

## 📋 Yêu cầu hệ thống

- **Docker Desktop** phiên bản 4.0+ (bao gồm Docker Compose)
- **Git**
- Tối thiểu **8GB RAM** (khuyến nghị 16GB)
- **20GB** dung lượng ổ đĩa trống

---

## 🔧 Cài đặt

### Bước 1: Clone repository

```bash
git clone https://github.com/Qipu1220/clipiq-platform.git
cd clipiq-platform
```

### Bước 2: Tải sample videos (tùy chọn)

Để có dữ liệu demo, tải file sample videos và giải nén:

📥 [Download Sample Videos](https://drive.google.com/file/d/1DO2qigAcokw6MHIPY11YwndIrflXPxre/view?usp=drive_link)

Giải nén vào thư mục:
```
backend/src/database/seeders/data/sample-videos/
```

### Bước 3: Khởi động với Docker

```bash
docker compose up -d
```

Lần đầu chạy sẽ mất khoảng 5-10 phút để:
- Pull Docker images
- Cài đặt dependencies
- Chạy database migrations
- Seed dữ liệu mẫu
- Index dữ liệu vào Elasticsearch & Qdrant

### Bước 4: Truy cập ứng dụng

| Service | URL | Mô tả |
|---------|-----|-------|
| 🌐 **Frontend** | http://localhost:5173 | Giao diện người dùng |
| 🔌 **Backend API** | http://localhost:5000 | REST API |
| 🗄️ **MinIO Console** | http://localhost:9001 | Quản lý object storage |
| 🔍 **Qdrant Dashboard** | http://localhost:6333/dashboard | Vector database UI |

---

## 👤 Tài khoản mẫu

Sau khi seed dữ liệu, có các tài khoản mẫu:

| Role | Email | Password |
|------|-------|----------|
| 👑 Admin | `admin@clipiq.com` | `Admin@123` |
| 👮 Staff | `staff@clipiq.com` | `Staff@123` |
| 👤 User | `user@clipiq.com` | `User@123` |

---

## ⚙️ Cấu hình môi trường

Tạo file `.env` từ template:

```bash
cp .env.example .env
```

### Các biến môi trường quan trọng

```env
# Database
DATABASE_URL=postgresql://clipiq_user:clipiq_password@localhost:5432/clipiq_db

# JWT (thay đổi trong production!)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-token-secret

# MinIO Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# AI Services (tùy chọn)
MISTRAL_API_KEY=your-mistral-api-key
```

---

## 📚 API Documentation

API documentation chi tiết được lưu trong:

- 📄 [API Documentation](backend/docs/API_DOCUMENTATION.md)
- 🏗️ [Architecture Overview](backend/docs/ARCHITECTURE.md)
- 📊 [Database Schema](backend/docs/DATABASE_SCHEMA.md)
- 📐 [Class Diagram](backend/docs/CLASS_DIAGRAM.md)

### Quick API Reference

```http
# Authentication
POST   /api/v1/auth/register     # Đăng ký
POST   /api/v1/auth/login        # Đăng nhập
POST   /api/v1/auth/refresh      # Refresh token
GET    /api/v1/auth/me           # Lấy thông tin user hiện tại

# Videos
GET    /api/v1/videos            # Danh sách videos
POST   /api/v1/videos            # Upload video
GET    /api/v1/videos/:id        # Chi tiết video
DELETE /api/v1/videos/:id        # Xóa video

# Search
GET    /api/v1/search?q=keyword  # Tìm kiếm videos

# Users
GET    /api/v1/users/:id         # Profile người dùng
PUT    /api/v1/users/profile     # Cập nhật profile

# Admin
GET    /api/v1/admin/dashboard   # Dashboard stats
GET    /api/v1/admin/users       # Quản lý users
```

---

## 🧪 Development

### Chạy riêng Backend

```bash
cd backend
npm install
npm run dev
```

### Chạy riêng Frontend

```bash
cd frontend
npm install
npm run dev
```

### Chạy Database Migration

```bash
cd backend
npm run migrate
```

### Chạy Seeder

```bash
cd backend
npm run seed
```

### Chạy Tests

```bash
cd backend
npm test
```

---

## 🐳 Docker Commands

```bash
# Khởi động tất cả services
docker compose up -d

# Xem logs
docker compose logs -f

# Xem logs của service cụ thể
docker compose logs -f backend
docker compose logs -f frontend

# Dừng tất cả services
docker compose down

# Dừng và xóa volumes (reset data)
docker compose down -v

# Rebuild containers
docker compose up -d --build
```

---

## 🏗️ Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
│                     http://localhost:5173                     │
└─────────────────────────────┬────────────────────────────────┘
                              │ HTTP/REST
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Backend API (Express.js)                   │
│                     http://localhost:5000                     │
└───────┬─────────────┬─────────────┬──────────────┬───────────┘
        │             │             │              │
        ▼             ▼             ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│PostgreSQL │  │   MinIO   │  │  Qdrant   │  │Elasticsearch│
│  :5432    │  │   :9000   │  │   :6333   │  │    :9200   │
│           │  │   :9001   │  │           │  │            │
│  Database │  │  Storage  │  │  Vectors  │  │  Search    │
└───────────┘  └───────────┘  └───────────┘  └───────────┘
```

---

## 🤝 Đóng góp

Đóng góp luôn được chào đón! Vui lòng:

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

---

## 📄 License

Dự án được phân phối dưới giấy phép MIT. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [Qdrant](https://qdrant.tech/) - Vector similarity search
- [MinIO](https://min.io/) - High performance object storage
- [Mistral AI](https://mistral.ai/) - AI language model
