# 🚀 Quick Start Guide - ClipIQ Platform

## Chỉ cần 3 bước để chạy toàn bộ ứng dụng!

### Bước 1: Clone repository
```powershell
git clone <repository-url>
cd clipiq-platform
```

### Bước 2: Start tất cả services
```powershell
docker-compose up -d
```

Đợi khoảng 1-2 phút để:
- PostgreSQL khởi động
- MinIO khởi động và tạo buckets
- Backend install dependencies và start
- Frontend install dependencies và start

### Bước 3: Setup database (chỉ lần đầu)
```powershell
# Đợi backend ready, sau đó chạy:
docker exec clipiq_backend npm run migrate
docker exec clipiq_backend npm run seed
```

## ✅ Xong! Truy cập ứng dụng

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api/v1
- **MinIO Console**: http://localhost:9001
- **Database**: localhost:5432

### Login với tài khoản mặc định:
- Admin: `admin001` / `123456`
- Staff: `staff001` / `123456`
- User: `user001` / `123456`

---

## 📊 Kiểm tra trạng thái services

```powershell
# Xem tất cả containers đang chạy
docker-compose ps

# Xem logs
docker-compose logs -f

# Xem logs từng service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f minio
```

---

## 🛑 Dừng và Xóa

```powershell
# Dừng tất cả services
docker-compose down

# Dừng và XÓA database (reset toàn bộ data)
docker-compose down -v
```

---

## 🔧 Troubleshooting

### ❌ Port đã được sử dụng
```powershell
# Kiểm tra port
netstat -ano | findstr :5173
netstat -ano | findstr :5000
netstat -ano | findstr :5432

# Giải pháp: Tắt ứng dụng đang dùng port hoặc đổi port trong docker-compose.yml
```

### ❌ Backend không connect được database
```powershell
# Kiểm tra PostgreSQL đã ready
docker exec clipiq_postgres pg_isready -U clipiq_user

# Nếu chưa ready, đợi thêm vài giây rồi kiểm tra lại
```

### ❌ Frontend không load được
```powershell
# Xem logs frontend
docker-compose logs -f frontend

# Restart frontend
docker-compose restart frontend
```

### ❌ MinIO buckets không có
```powershell
# Chạy lại minio-setup
docker-compose up minio-setup

# Hoặc vào MinIO Console: http://localhost:9001
# Login: minioadmin / minioadmin
# Tạo 3 buckets: clipiq-videos, clipiq-thumbnails, clipiq-avatars
```

---

## 🔄 Rebuild khi có thay đổi

```powershell
# Rebuild tất cả
docker-compose up -d --build

# Rebuild từng service
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

---

## 📝 Các lệnh hữu ích

```powershell
# Vào shell backend
docker exec -it clipiq_backend sh

# Vào shell frontend  
docker exec -it clipiq_frontend sh

# Vào PostgreSQL
docker exec -it clipiq_postgres psql -U clipiq_user -d clipiq_db

# Install thêm package vào backend
docker exec clipiq_backend npm install <package-name>

# Chạy tests
docker exec clipiq_backend npm test
```

---

## 💡 Tips

1. **Lần đầu chạy sẽ lâu hơn** vì phải pull Docker images và install dependencies
2. **Đợi PostgreSQL ready** trước khi run migrations
3. **Không xóa volumes** nếu muốn giữ data: `docker-compose down` (không dùng `-v`)
4. **Xem logs realtime**: `docker-compose logs -f` để debug
5. **MinIO Console rất hữu ích** để xem/quản lý files đã upload

---

## 🆘 Cần trợ giúp?

1. Kiểm tra logs: `docker-compose logs`
2. Xem status: `docker-compose ps`
3. Restart service: `docker-compose restart <service-name>`
4. Reset toàn bộ: `docker-compose down -v && docker-compose up -d`
