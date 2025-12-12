# Test User Reports Feature - Staff Dashboard

## 🎯 Mục đích
Kiểm tra tính năng staff xem và xử lý user reports từ database thật

## 📋 Prerequisites
1. Backend đang chạy: http://localhost:5000
2. Frontend đang chạy: http://localhost:5173
3. Database có data user reports (user đã report user khác)
4. Có tài khoản staff/admin để login

## 🧪 Test Cases

### Test 1: Xem danh sách User Reports
**Steps:**
1. Login với tài khoản staff/admin
2. Vào Staff Dashboard (click icon cài đặt hoặc /staff-dashboard)
3. Click tab "Báo cáo người dùng"
4. Quan sát sub-tabs và số lượng

**Expected Results:**
- ✅ Hiển thị 2 sub-tabs: "Chưa xử lý (X)" và "Đã xử lý (Y)"
- ✅ Mặc định hiển thị tab "Chưa xử lý"
- ✅ Mỗi report hiển thị:
  - Tên người bị báo cáo (reported_username)
  - Người báo cáo (reporter_username)
  - Lý do báo cáo
  - Thời gian tạo
- ✅ Có các nút: "Xem profile", "Cảnh báo", "Bỏ qua"

### Test 2: Xem Chi Tiết Report
**Steps:**
1. Click vào một user report
2. Quan sát thông tin chi tiết

**Expected Results:**
- ✅ Hiển thị đầy đủ thông tin user bị report
- ✅ Hiển thị lý do báo cáo
- ✅ Có thể xem profile user

### Test 3: Cảnh Báo User
**Steps:**
1. Ở tab "Chưa xử lý", click nút "Cảnh báo" trên một report
2. Xác nhận trong modal
3. Đợi xử lý

**Expected Results:**
- ✅ Hiển thị modal xác nhận với message rõ ràng
- ✅ Sau khi xác nhận, report biến mất khỏi tab "Chưa xử lý"
- ✅ Report xuất hiện trong tab "Đã xử lý"
- ✅ Resolution note: "User đã bị cảnh báo"
- ✅ Có thời gian xử lý (reviewed_at)

### Test 4: Bỏ Qua Report
**Steps:**
1. Ở tab "Chưa xử lý", click nút "Bỏ qua" trên một report
2. Xác nhận trong modal
3. Đợi xử lý

**Expected Results:**
- ✅ Hiển thị modal xác nhận
- ✅ Sau khi xác nhận, report chuyển sang "Đã xử lý"
- ✅ Resolution note: "Báo cáo bị bỏ qua"

### Test 5: Auto Refresh Data
**Steps:**
1. Mở Staff Dashboard
2. Ở tab khác, có user khác tạo report mới
3. Đợi 30 giây

**Expected Results:**
- ✅ Dashboard tự động cập nhật số lượng reports
- ✅ Report mới xuất hiện trong danh sách

### Test 6: Switch Between Sub-tabs
**Steps:**
1. Click qua lại giữa "Chưa xử lý" và "Đã xử lý"

**Expected Results:**
- ✅ Tab active có màu đỏ (#ff3b5c)
- ✅ Số lượng reports chính xác
- ✅ Chỉ hiển thị reports của tab đang chọn
- ✅ Tab "Đã xử lý" KHÔNG có nút "Cảnh báo" và "Bỏ qua"

## 🔍 Kiểm Tra Database

### Query 1: Xem tất cả user reports
```bash
docker exec -it clipiq_postgres psql -U clipiq_admin -d clipiq_db -c "SELECT id, reported_user_id, reported_by_id, reason, status, resolution_note, created_at FROM user_reports ORDER BY created_at DESC;"
```

### Query 2: Xem user reports pending
```bash
docker exec -it clipiq_postgres psql -U clipiq_admin -d clipiq_db -c "SELECT id, reported_user_id, reported_by_id, reason, status FROM user_reports WHERE status = 'pending';"
```

### Query 3: Xem user reports resolved
```bash
docker exec -it clipiq_postgres psql -U clipiq_admin -d clipiq_db -c "SELECT id, reported_user_id, reported_by_id, reason, status, resolution_note, reviewed_at FROM user_reports WHERE status = 'resolved' ORDER BY reviewed_at DESC;"
```

### Query 4: Xem report với username (JOIN)
```bash
docker exec -it clipiq_postgres psql -U clipiq_admin -d clipiq_db -c "
SELECT 
  ur.id,
  u1.username AS reported_username,
  u2.username AS reporter_username,
  ur.reason,
  ur.status,
  ur.resolution_note,
  ur.created_at
FROM user_reports ur
JOIN users u1 ON ur.reported_user_id = u1.id
JOIN users u2 ON ur.reported_by_id = u2.id
ORDER BY ur.created_at DESC;
"
```

## 🐛 Troubleshooting

### Issue 1: "Không có quyền xem báo cáo user"
**Solution:** Kiểm tra user role:
```bash
docker exec -it clipiq_postgres psql -U clipiq_admin -d clipiq_db -c "SELECT id, username, role FROM users WHERE username = 'YOUR_USERNAME';"
```
Role phải là 'admin' hoặc 'staff'

### Issue 2: Staff Dashboard không hiển thị data
**Check:**
1. Mở DevTools Console, xem có error?
2. Check Network tab, xem API call `/api/v1/reports/users` có success không?
3. Kiểm tra backend logs: `docker logs clipiq_backend -f`

### Issue 3: Sau khi resolve, report không cập nhật
**Check:**
1. Xem console có error từ `resolveUserReportApi`?
2. Check database xem status có đổi không
3. Đợi 30s để auto-refresh chạy

## 📊 Test Data Setup

Nếu chưa có data để test, tạo user reports:

```bash
# Login với 2 user khác nhau
# User A vào profile của User B
# Click nút "Báo cáo" trong PublicUserProfile
# Chọn lý do và submit
# Lặp lại để tạo nhiều reports
```

## ✅ Success Criteria

- [ ] Staff có thể xem danh sách user reports từ database
- [ ] Sub-tabs hoạt động chính xác (pending/resolved)
- [ ] Số lượng reports chính xác
- [ ] Có thể cảnh báo user và report chuyển sang resolved
- [ ] Có thể bỏ qua report và report chuyển sang resolved
- [ ] Data auto-refresh sau 30s
- [ ] Resolved reports hiển thị resolution_note và reviewed_at
- [ ] Console không có error
- [ ] API responses đúng format

## 🎉 Expected Behavior

Khi mọi thứ hoạt động đúng:
1. Staff login và vào dashboard
2. Tab "Báo cáo người dùng" hiển thị data thật từ database
3. Có thể switch giữa pending và resolved reports
4. Click "Cảnh báo" hoặc "Bỏ qua" sẽ call API và cập nhật database
5. UI tự động refresh để hiển thị trạng thái mới nhất
6. Không có mockdata nào được sử dụng
