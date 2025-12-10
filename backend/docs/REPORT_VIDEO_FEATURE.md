# Tính năng Report Video - Hướng dẫn Test

## 📝 Tổng quan
Đã implement đầy đủ backend và frontend cho tính năng report video:

### User Role (✅ Hoàn thành)
- ✅ Model: VideoReport với đầy đủ CRUD operations
- ✅ Service: Business logic xử lý reports, validate, check duplicate
- ✅ Controller: Handle requests, response formatting
- ✅ Validator: Validate input data với express-validator
- ✅ Routes: RESTful API endpoints
- ✅ Frontend API: Integration với backend
- ✅ UI Components: TikTokStyleHome và VideoPlayer đã được update

### Staff Role (✅ Hoàn thành)
- ✅ API Endpoints: GET reports, GET report by ID, Resolve report
- ✅ Frontend API Client: TypeScript types và functions
- ✅ StaffDashboard: Auto-fetch reports mỗi 30s
- ✅ Resolve Actions: dismiss, warn_user, ban_user, delete_content
- ✅ Real-time Updates: Refresh sau khi resolve

## 🏗️ Cấu trúc Backend

### Model (`models/VideoReport.js`)
- `createVideoReport()` - Tạo report mới
- `getVideoReportById()` - Lấy report theo ID
- `getAllVideoReports()` - Lấy danh sách reports (staff/admin)
- `hasUserReportedVideo()` - Check duplicate report
- `updateVideoReportStatus()` - Cập nhật status (staff/admin)
- `deleteVideoReport()` - Xóa report

### Service (`services/report.service.js`)
- Validate video exists
- Prevent self-reporting
- Check duplicate reports
- Validate reason types
- Handle report resolution (staff/admin)

### Controller (`controllers/report.controller.js`)
- `reportVideo` - POST /api/v1/reports/videos
- `getVideoReports` - GET /api/v1/reports/videos (staff/admin)
- `getVideoReportById` - GET /api/v1/reports/videos/:id (staff/admin)
- `resolveVideoReport` - PUT /api/v1/reports/videos/:id/resolve (staff/admin)

### Validator (`validators/report.validator.js`)
- Validate UUID format
- Validate reason types
- Validate description length
- Validate action types

## 🔌 API Endpoints

### POST /api/v1/reports/videos
Report một video (User role)

**Request:**
```json
{
  "videoId": "uuid-of-video",
  "reason": "spam|harassment|hate|violence|nudity|copyright|misleading|other",
  "description": "Optional description (max 500 chars)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "reportId": "uuid"
  },
  "message": "Report submitted successfully"
}
```

**Errors:**
- `400` - Invalid input, already reported, cannot report own video
- `401` - Unauthorized
- `404` - Video not found
- `409` - Already reported this video

### Valid Reason Types
- `spam` - Spam or scam
- `harassment` - Harassment or bullying
- `hate` - Hate speech
- `violence` - Violence or dangerous content
- `nudity` - Nudity or sexual content
- `copyright` - Copyright violation
- `misleading` - Misleading or false information
- `other` - Other reasons

## 🎨 Frontend Integration

### API Client (`api/reports.ts`)
```typescript
reportVideoApi(videoId, reason, description?)
```

### Components Updated
1. **TikTokStyleHome.tsx**
   - Nút "Báo cáo" trên video player
   - Modal nhập lý do báo cáo
   - AlertDialog xác nhận
   - Call API thực tế thay vì chỉ dispatch Redux

2. **VideoPlayer.tsx**
   - Tương tự TikTokStyleHome
   - Report từ page xem chi tiết video

## 🧪 Test Cases

### 1. Test Report Video Thành Công
```bash
# Đăng nhập với user bình thường
POST /api/v1/auth/login
{
  "login": "user001@example.com",
  "password": "123456"
}

# Lấy token và report một video
POST /api/v1/reports/videos
Authorization: Bearer <token>
{
  "videoId": "<video-id>",
  "reason": "spam",
  "description": "This video is spam content"
}
```

### 2. Test Duplicate Report (Should Fail)
```bash
# Report lại video đã report
POST /api/v1/reports/videos
Authorization: Bearer <token>
{
  "videoId": "<same-video-id>",
  "reason": "hate",
  "description": "Another report"
}
# Expected: 409 Conflict
```

### 3. Test Self Report (Should Fail)
```bash
# User report video của chính mình
POST /api/v1/reports/videos
Authorization: Bearer <token-of-uploader>
{
  "videoId": "<own-video-id>",
  "reason": "spam"
}
# Expected: 400 Bad Request
```

### 4. Test Invalid Reason (Should Fail)
```bash
POST /api/v1/reports/videos
Authorization: Bearer <token>
{
  "videoId": "<video-id>",
  "reason": "invalid-reason"
}
# Expected: 400 Bad Request
```

### 5. Test Report Non-existent Video (Should Fail)
```bash
POST /api/v1/reports/videos
Authorization: Bearer <token>
{
  "videoId": "00000000-0000-0000-0000-000000000000",
  "reason": "spam"
}
# Expected: 404 Not Found
```

## 🖥️ Test trên UI

### Bước 1: Start Backend
```bash
cd backend
npm run dev
# Server chạy trên http://localhost:5000
```

### Bước 2: Start Frontend
```bash
cd frontend
npm run dev
# Frontend chạy trên http://localhost:5173
```

### Bước 3: Test Flow
1. Đăng nhập với tài khoản user: `user001@example.com` / `123456`
2. Xem một video trên feed
3. Click nút "Báo cáo" (Flag icon)
4. Chọn lý do: spam, harassment, hate, violence, etc.
5. Nhập mô tả (optional)
6. Click "Gửi báo cáo"
7. Xác nhận trong dialog
8. Kiểm tra toast notification "Báo cáo đã được gửi thành công!"

### Bước 4: Verify trong Database
```sql
-- Kiểm tra report đã được tạo
SELECT * FROM video_reports 
WHERE video_id = '<video-id>' 
ORDER BY created_at DESC;

-- Kiểm tra thông tin đầy đủ
SELECT 
  vr.*,
  v.title as video_title,
  u_reporter.username as reporter,
  u_uploader.username as uploader
FROM video_reports vr
LEFT JOIN videos v ON vr.video_id = v.id
LEFT JOIN users u_reporter ON vr.reported_by_id = u_reporter.id
LEFT JOIN users u_uploader ON v.uploader_id = u_uploader.id
WHERE vr.id = '<report-id>';
```

## ⚠️ Error Handling

### Backend Errors
- `ApiError` class cho consistent error format
- Validation errors từ express-validator
- Database errors catch và format
- Async handler wraps controllers

### Frontend Errors
- Try-catch trong API calls
- Toast notifications cho user feedback
- Error response parsing từ backend
- Fallback error messages

## 📋 Database Schema

```sql
CREATE TABLE video_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    reported_by_id UUID NOT NULL,
    reason TEXT NOT NULL,
    evidence_url VARCHAR(500) NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by_id UUID NULL,
    reviewed_at TIMESTAMP NULL,
    resolution_note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL
);
```

## 🔐 Security

- ✅ Authentication required (JWT token)
- ✅ User cannot report own videos
- ✅ Duplicate report prevention
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting (nếu có middleware)

## 📌 Notes

- Report status mặc định là 'pending'
- Description field là optional, có thể để trống
- Reason field bắt buộc và phải thuộc danh sách valid reasons
- Reports được lưu vào database thực, không chỉ Redux store
- Video bị report vẫn hiển thị bình thường cho đến khi staff xử lý

## 🎯 Staff Features

### GET /api/v1/reports/videos (Staff/Admin)
Xem tất cả video reports

**Query Parameters:**
- `status` (optional): 'pending' | 'reviewed' | 'resolved'
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "uuid",
        "video_id": "uuid",
        "reported_by_id": "uuid",
        "reason": "spam",
        "evidence_url": "description text",
        "status": "pending",
        "created_at": "2024-12-10T...",
        "video_title": "Video Title",
        "reporter_username": "user001",
        "uploader_username": "creator01"
      }
    ],
    "total": 45,
    "pagination": {
      "page": 1,
      "pages": 3,
      "total": 45
    }
  }
}
```

### PUT /api/v1/reports/videos/:id/resolve (Staff/Admin)
Xử lý report

**Request:**
```json
{
  "action": "dismiss|warn_user|ban_user|delete_content",
  "note": "Optional resolution note"
}
```

**Actions:**
- `dismiss` - Bỏ qua report (không hành động)
- `warn_user` - Cảnh báo uploader
- `ban_user` - Ban uploader
- `delete_content` - Xóa video

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "status": "resolved",
    "action": "dismiss"
  },
  "message": "Report resolved successfully"
}
```

## 🖥️ Staff Dashboard Features

1. **Auto-refresh**: Tự động fetch reports mỗi 30 giây
2. **Resolve Actions**: 
   - Dismiss report (bỏ qua)
   - Delete video (xóa video vi phạm)
3. **Real-time Updates**: Refresh danh sách sau khi resolve
4. **Error Handling**: Toast notifications cho mọi action

## 🧪 Test Staff Features

### 1. Login as Staff
```bash
POST /api/v1/auth/login
{
  "login": "staff001@example.com",
  "password": "123456"
}
```

### 2. View Reports
```bash
GET /api/v1/reports/videos?status=pending
Authorization: Bearer <staff-token>
```

### 3. Resolve Report
```bash
PUT /api/v1/reports/videos/<report-id>/resolve
Authorization: Bearer <staff-token>
{
  "action": "dismiss",
  "note": "Không có vi phạm"
}
```

## 🚀 Next Steps (Future Work)

- [ ] Thêm notification cho staff khi có report mới
- [ ] Implement report statistics và analytics
- [ ] Thêm filter và search cho reports
- [ ] Export reports data
- [ ] Report history cho users
- [ ] Email notifications khi report được resolve

## ✅ Checklist Hoàn thành

**Backend:**
- [x] Model VideoReport
- [x] Service layer với business logic
- [x] Controller với proper error handling
- [x] Validator với express-validator
- [x] Routes integration
- [x] Validation middleware
- [x] Role-based access control

**Frontend User:**
- [x] Frontend API client
- [x] TikTokStyleHome component update
- [x] VideoPlayer component update
- [x] Error handling frontend
- [x] Toast notifications

**Frontend Staff:**
- [x] Staff API client với TypeScript types
- [x] StaffDashboard integration
- [x] Auto-refresh reports
- [x] Resolve actions (dismiss, delete)
- [x] Real-time updates
- [x] Error handling và feedback
- [x] Database schema exists
- [x] Testing documentation

---

**Developed by:** ClipIQ Team
**Date:** December 2024
**Version:** 1.0.0
