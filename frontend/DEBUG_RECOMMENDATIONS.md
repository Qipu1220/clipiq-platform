# Debug Guide - Recommendation System

## Cách kiểm tra F5 hoạt động đúng

### 1. Mở Browser Console (F12)

### 2. Các log cần xem:

#### Khi F5 (Page Refresh):
```
🔄 Component mounted - Clearing videos and generating new seed: [TIMESTAMP]
✅ Loaded batch: 30 videos (seed: [TIMESTAMP])
```

#### Khi chuyển tab khác rồi quay lại For You:
```
🔄 Switched to For You tab - New Seed: [TIMESTAMP]
✅ Loaded batch: 30 videos (seed: [TIMESTAMP])
```

#### Khi scroll xuống cuối (Infinite Scroll):
```
📜 Infinite Scroll triggered - Loading more videos with new seed: [TIMESTAMP]
✅ Loaded batch: 30 videos (seed: [TIMESTAMP])
```

### 3. Kiểm tra seed có thay đổi không:

- **F5**: Seed phải khác hoàn toàn → Videos mới
- **Infinite Scroll**: Seed mới → Videos mới append vào
- **Cùng seed**: Không nên xảy ra (trừ khi cache)

### 4. Nếu vẫn không hoạt động:

#### Check 1: Redux Store có persist không?
```bash
# Kiểm tra localStorage
localStorage.clear()  # Trong console
```

#### Check 2: API có được gọi không?
```
Network tab → Filter "recommendations/feed"
- Xem query params có seed khác nhau không
```

#### Check 3: Backend có nhận seed không?
```bash
# Check backend logs
docker logs clipiq-backend-1 -f
```

#### Check 4: Recommendation service có hoạt động không?
```bash
# Check recommendation service logs
docker logs clipiq-recommendation-1 -f
```

### 5. Test Flow:

1. **F5 lần 1**: Ghi lại seed (ví dụ: 1702345678901)
2. **F5 lần 2**: Seed phải khác (ví dụ: 1702345689234)
3. **So sánh videos**: Video list phải khác nhau
4. **Scroll xuống**: Seed mới lại → append thêm videos

### 6. Expected Behavior:

- ✅ Mỗi lần F5 → Clear videos → Load batch mới với seed mới
- ✅ Videos có 30% fresh (đăng trong 3 ngày gần đây)
- ✅ Videos có 70% recommended (dựa trên preferences)
- ✅ Videos được shuffle random theo seed
- ✅ Infinite scroll append thêm batch mới

### 7. Common Issues:

#### Issue: Videos không thay đổi khi F5
**Solution**: 
- Clear browser cache
- Check Redux DevTools xem videos có được clear không
- Check console logs xem seed có thay đổi không

#### Issue: API error 500
**Solution**:
- Check recommendation service có chạy không
- Check database connection
- Check backend logs

#### Issue: Videos bị duplicate
**Solution**:
- `appendVideos` action đã filter duplicates
- Check console xem có warning không

#### Issue: Infinite scroll không hoạt động
**Solution**:
- Check `currentVideoIndex >= videos.length - 3`
- Check `isLoadingRecommendations` state
- Check console logs

