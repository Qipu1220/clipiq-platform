# 🎬 ClipIQ Platform

Nền tảng chia sẻ video (YouTube Clone) với hệ thống phân quyền 3 cấp (Admin/Staff/User).

## 🚀 Tech Stack

### Frontend
- React 18
- TypeScript
- Redux Toolkit
- Tailwind CSS
- Vite

### Backend
- Node.js
- Express.js
- PostgreSQL
- MinIO S3
- JWT Authentication

## 📋 Yêu cầu hệ thống

- Docker & Docker Compose
- Git

## 🔧 Cài đặt và Chạy

### Khởi động hệ thống

```bash
# Khởi động tất cả services (tự động migrate & seed)
make up

# Hoặc dùng docker-compose trực tiếp
docker-compose up -d
```

### ✨ Auto-Initialization

Mỗi lần chạy `docker-compose up`, hệ thống sẽ **tự động**:
- ✅ Khởi động PostgreSQL database (port 5432)
- ✅ Khởi động MinIO S3 storage (port 9000, 9001)
- ✅ Tạo các buckets: clipiq-videos, clipiq-thumbnails, clipiq-avatars
- ✅ Chạy database migrations (tạo tables)
- ✅ **Seed 62 accounts** (2 admin + 10 staff + 50 users)
- ✅ **Upload 100 videos** từ sample-videos/ (2 videos/user)
- ✅ Khởi động Backend API (port 5000)
- ✅ Khởi động Frontend (port 5173)

**Thời gian khởi động**: ~5-10 phút (bao gồm upload videos)

> **📝 Lưu ý**: Seeders sẽ chạy mỗi lần khởi động. Nếu data đã tồn tại, seeders sẽ skip hoặc update. Để reset hoàn toàn database, dùng `make reset-db`.

### Truy cập ứng dụng

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api/v1
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **PostgreSQL**: localhost:5432 (clipiq_user/clipiq_password)

## 👥 Tài khoản mặc định (Auto-seeded)

Hệ thống tự động tạo **62 accounts** khi chạy lần đầu:

### Administrators (2)
```
Email: admin@clipiq.com
Password: Admin@123456

Email: admin2@clipiq.com
Password: Admin@123456
```

### Staff (10)
```
Email: mod1@clipiq.com đến mod10@clipiq.com
Password: Staff@123456
```

### Regular Users (50)
```
Email: user001@test.com đến user050@test.com
Password: User@123456
```

**⚠️ Lưu ý**: Đổi password trong production!

## 📹 Sample Videos

- **100 videos** tự động upload từ Pixabay
- **Phân bổ**: Mỗi user có 2 videos
- **Categories**: Tech, Gaming, Cooking, Fitness, DIY, Music, Travel, v.v.

## 🛠️ Makefile Commands

```bash
# Quick Start
make up              # Khởi động (auto-migrate & seed)
make down            # Dừng tất cả
make restart         # Restart
make status          # Xem trạng thái

# Logs
make logs            # Tất cả logs
make logs-backend    # Backend logs
make logs-db         # Database logs

# Database
make migrate         # Chạy migrations thủ công
make seed            # Seed data thủ công
make shell-db        # Mở PostgreSQL shell
make reset-db        # Xóa tất cả + seed lại (⚠️ Cẩn thận!)

# Cleanup
make clean           # Xóa containers (giữ data)
make rebuild         # Rebuild images
```

## 🛠️ Docker Commands (Manual)

```bash
# Xem logs
docker-compose logs -f

# Xem logs của service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend

# Dừng tất cả services
docker-compose down

# Dừng và xóa volumes (xóa database data)
docker-compose down -v

# Restart một service
docker-compose restart backend

# Rebuild và restart
docker-compose up -d --build

# Vào shell của container
docker exec -it clipiq_backend sh
docker exec -it clipiq_frontend sh
docker exec -it clipiq_postgres psql -U clipiq_user -d clipiq_db
```

## 📁 Cấu trúc thư mục

```
clipiq-platform/
├── frontend/              # React + TypeScript + Redux
│   ├── src/
│   │   ├── components/    # UI Components
│   │   ├── store/         # Redux store
│   │   └── styles/        # CSS files
│   └── package.json
├── backend/               # Node.js + Express
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── controllers/   # Request handlers
│   │   ├── middlewares/   # Middlewares
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Utilities
│   │   └── database/      # Migrations & seeders
│   └── package.json
├── docker-compose.yml     # Docker orchestration
└── README.md
```

## 🎯 Tính năng chính

### 🔴 Admin
- Bật/tắt chế độ bảo trì
- Quản lý người dùng (CRUD, ban, warn, change role)
- Truy cập hệ thống ngay cả khi bảo trì

### 🟡 Staff
- Kiểm duyệt video
- Xử lý báo cáo (video reports, user reports)
- Xử lý khiếu nại (appeals)
- Ban/warn người dùng vi phạm

### 🟢 User
- Xem và tìm kiếm video
- Upload video với thumbnail
- Like/unlike video
- Bình luận
- Subscribe/unsubscribe channel
- Nhận thông báo khi người đã subscribe upload video mới
- Báo cáo video/người dùng vi phạm
- Gửi khiếu nại nếu bị ban

## 📊 Database Schema

Xem chi tiết tại: `backend/docs/DATABASE_SCHEMA.md`

Các bảng chính:
- users
- videos
- comments
- likes
- subscriptions
- notifications
- video_reports
- user_reports
- appeals
- system_settings

## 🔒 Bảo mật

- JWT Authentication với refresh token
- Role-based Access Control (RBAC)
- Password hashing với bcrypt
- Rate limiting
- File upload validation
- CORS configuration
- Helmet security headers

## 🧪 Testing

```bash
# Backend tests
docker exec clipiq_backend npm test

# Watch mode
docker exec clipiq_backend npm run test:watch
```

## 📖 API Documentation

Xem chi tiết tại: `backend/docs/API_DOCUMENTATION.md`

Base URL: `http://localhost:5000/api/v1`

### Authentication
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh

### Videos
- GET /videos
- POST /videos
- GET /videos/:id
- PUT /videos/:id
- DELETE /videos/:id

### Users
- GET /users
- GET /users/:username
- PUT /users/:username
- DELETE /users/:username

(Xem full documentation trong file API_DOCUMENTATION.md)

## 🐛 Troubleshooting

### Port đã được sử dụng
```bash
# Kiểm tra port đang chạy
netstat -ano | findstr :5173
netstat -ano | findstr :5000
netstat -ano | findstr :5432
netstat -ano | findstr :9000

# Hoặc thay đổi port trong docker-compose.yml
```

### Container không start
```bash
# Xem logs để debug
docker-compose logs backend
docker-compose logs postgres
docker-compose logs minio

# Restart service
docker-compose restart backend
```

### Database connection error
```bash
# Kiểm tra PostgreSQL đã ready chưa
docker exec clipiq_postgres pg_isready -U clipiq_user

# Connect vào database
docker exec -it clipiq_postgres psql -U clipiq_user -d clipiq_db
```

### MinIO buckets không tạo được
```bash
# Chạy lại minio-setup
docker-compose up minio-setup

# Hoặc tạo thủ công qua MinIO Console
# http://localhost:9001
```
## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by YouTube
- Built with modern web technologies
- Designed for educational purposes
