# 🚀 Quick Start - Test Authentication

## Mở Frontend
**URL:** http://localhost:5173

## Test Login

### 1. Admin Account
```
Username: admin001
Password: 123456
```
- ✅ Full quyền truy cập
- ✅ Xem tất cả dashboard tabs
- ✅ Quản lý users, videos, reports

### 2. Staff Account  
```
Username: staff001
Password: 123456
```
- ✅ Moderation quyền
- ✅ Xem reports
- ✅ Resolve content issues

### 3. User Account
```
Username: user001
Password: 123456
```
- ✅ User quyền cơ bản
- ✅ Upload videos
- ✅ Comment, like, subscribe

## Kiểm tra Authentication Flow

### Test 1: Login thành công
1. Mở http://localhost:5173
2. Nhập `admin001` / `123456`
3. Click "Đăng nhập"
4. ✅ Kiểm tra: Redirect đến Admin Dashboard

### Test 2: Login thất bại
1. Nhập sai username/password
2. Click "Đăng nhập"  
3. ✅ Kiểm tra: Hiển thị error message màu đỏ

### Test 3: Session Restore
1. Login thành công
2. Refresh page (F5)
3. ✅ Kiểm tra: Vẫn giữ đăng nhập, không bị logout

### Test 4: Token trong localStorage
1. Login thành công
2. Mở Developer Tools (F12)
3. Console tab, gõ:
```javascript
localStorage.getItem('accessToken')
localStorage.getItem('refreshToken')
localStorage.getItem('user')
```
4. ✅ Kiểm tra: Có tokens và user data

### Test 5: API Call
1. Login thành công
2. Mở Developer Tools → Network tab
3. Refresh page
4. ✅ Kiểm tra: Có request đến `/api/v1/auth/me` với Bearer token

## Troubleshooting

### Frontend không mở được?
```powershell
# Kiểm tra container
docker ps | Select-String "clipiq_frontend"

# Kiểm tra logs
docker logs clipiq_frontend --tail 20

# Restart nếu cần
docker restart clipiq_frontend
```

### Login không hoạt động?
```powershell
# Kiểm tra backend
docker logs clipiq_backend --tail 20

# Test API trực tiếp
curl -X POST http://localhost:5000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin001","password":"123456"}'
```

### Database không có users?
```powershell
# Connect vào database
docker exec -it clipiq_postgres psql -U clipiq_user -d clipiq_db

# Query users
SELECT username, email, role FROM users;

# Exit
\q
```

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | - |
| Backend API | http://localhost:5000/api/v1 | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| PostgreSQL | localhost:5432 | clipiq_user / clipiq_password |

## Docker Commands

```powershell
# Xem tất cả containers
docker ps

# Stop tất cả
docker-compose down

# Start lại
docker-compose up -d

# Xem logs realtime
docker logs -f clipiq_frontend
docker logs -f clipiq_backend

# Restart một service
docker restart clipiq_frontend
docker restart clipiq_backend
```

---

✅ **Tích hợp hoàn tất!** 

Frontend đã được kết nối với Backend authentication thành công.

Bạn có thể test ngay tại: **http://localhost:5173**
