# Pixabay Video Downloader

Script tự động tải videos từ Pixabay API vào thư mục sample-videos.

## 🔑 Setup

### 1. Lấy API Key miễn phí

1. Truy cập: https://pixabay.com/api/docs/
2. Đăng ký tài khoản (miễn phí)
3. Copy API key của bạn

### 2. Cài đặt (nếu cần)

Script sử dụng Node.js built-in modules, không cần cài thêm package.

## 🚀 Sử dụng

### Download 100 videos (default):

```bash
PIXABAY_API_KEY=your_api_key_here node download-pixabay-videos.js
```

### Download số lượng tùy chỉnh:

```bash
PIXABAY_API_KEY=your_key DOWNLOAD_COUNT=50 node download-pixabay-videos.js
```

### Download theo category:

```bash
# Available categories: backgrounds, fashion, nature, science, education,
# feelings, health, people, religion, places, animals, industry, computer,
# food, sports, transportation, travel, buildings, business, music

PIXABAY_API_KEY=your_key VIDEO_CATEGORY=nature node download-pixabay-videos.js
```

### Download theo loại video:

```bash
# all (default), film, animation
PIXABAY_API_KEY=your_key VIDEO_TYPE=film node download-pixabay-videos.js
```

### Kết hợp nhiều options:

```bash
PIXABAY_API_KEY=your_key \
  DOWNLOAD_COUNT=50 \
  VIDEO_TYPE=film \
  VIDEO_CATEGORY=nature \
  node download-pixabay-videos.js
```

## 📋 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PIXABAY_API_KEY` | Your Pixabay API key | - | ✅ Yes |
| `DOWNLOAD_COUNT` | Number of videos to download | 100 | ❌ No |
| `VIDEO_TYPE` | all, film, animation | all | ❌ No |
| `VIDEO_CATEGORY` | Category filter (see above) | - | ❌ No |

## 🎬 Features

- ✅ **Auto-quality selection**: Chọn quality phù hợp (medium preferred)
- ✅ **Size limit**: Skip videos > 50MB
- ✅ **Skip existing**: Không download lại file đã có
- ✅ **Progress bar**: Hiển thị tiến trình download
- ✅ **Rate limiting**: Delay giữa các requests
- ✅ **Error handling**: Xử lý lỗi và retry
- ✅ **Summary report**: Báo cáo chi tiết sau khi hoàn thành

## 📊 Output

Videos sẽ được lưu với format:
```
pixabay-{video_id}-{quality}.mp4
```

Ví dụ:
```
pixabay-12345-medium.mp4
pixabay-67890-small.mp4
```

## 🎯 Use Cases

### Development seeding:
```bash
# Download 20 short videos
PIXABAY_API_KEY=your_key DOWNLOAD_COUNT=20 node download-pixabay-videos.js
```

### Testing different categories:
```bash
# Nature videos
PIXABAY_API_KEY=your_key VIDEO_CATEGORY=nature DOWNLOAD_COUNT=10 node download-pixabay-videos.js

# Business videos
PIXABAY_API_KEY=your_key VIDEO_CATEGORY=business DOWNLOAD_COUNT=10 node download-pixabay-videos.js
```

### Animation only:
```bash
PIXABAY_API_KEY=your_key VIDEO_TYPE=animation DOWNLOAD_COUNT=30 node download-pixabay-videos.js
```

## 📝 Example Output

```
🎬 Pixabay Video Downloader
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Target: 100 videos
📁 Output: /path/to/sample-videos
🎥 Type: all
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Found 8456 videos (423 pages)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Fetching page 1/423...

[1/100] pixabay-12345-medium.mp4 (1280x720, 15.2 MB)
  Progress: 100% (15.2 MB/15.2 MB)
  ✅ Downloaded successfully

[2/100] pixabay-67890-small.mp4 (640x360, 8.5 MB)
  Progress: 100% (8.5 MB/8.5 MB)
  ✅ Downloaded successfully

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Download Summary:
  ✅ Downloaded: 100 videos
  ⏭️  Skipped: 15 videos
  📁 Location: /path/to/sample-videos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Done!
```

## ⚠️ Important Notes

### Rate Limiting:
- Free API key: **5,000 requests/hour**
- Script adds 500ms delay between downloads
- Theo tốc độ này: ~7 requests/minute = safe

### Storage:
- 100 videos @ ~15MB average = **~1.5GB**
- Đảm bảo có đủ disk space

### Copyright:
- ✅ Tất cả videos trên Pixabay là **CC0 (Public Domain)**
- ✅ Không cần attribution
- ✅ Sử dụng tự do cho commercial/non-commercial

## 🐛 Troubleshooting

### "PIXABAY_API_KEY not set"
```bash
# Make sure to set the API key
export PIXABAY_API_KEY=your_key_here
node download-pixabay-videos.js
```

### "Failed to download: 429"
```bash
# Rate limit exceeded, wait and retry
# Or increase delay in script (line with setTimeout)
```

### "No suitable quality"
```bash
# Some videos don't have medium/small quality
# Script will skip these automatically
```

### Download interrupted
```bash
# Simply run again - script skips existing files
PIXABAY_API_KEY=your_key node download-pixabay-videos.js
```

## 🔧 Customization

### Change max file size:
Edit line in script:
```javascript
const MAX_FILE_SIZE_MB = 50; // Change to your preferred limit
```

### Change quality preference:
Edit line in script:
```javascript
const preferred = ['medium', 'small', 'large', 'tiny']; // Reorder as needed
```

### Change delay between downloads:
Edit line in script:
```javascript
await new Promise(resolve => setTimeout(resolve, 500)); // Change 500ms
```

## 📚 API Documentation

Full Pixabay API docs: https://pixabay.com/api/docs/

## 💡 Tips

1. **Start small**: Test with 10-20 videos first
2. **Check storage**: Monitor disk space during download
3. **Use categories**: Download varied content for better testing
4. **Backup API key**: Save it in `.env` file (don't commit!)
5. **Clean old files**: Delete unused videos to save space

## 🔐 Security

```bash
# Create .env file (add to .gitignore!)
echo "PIXABAY_API_KEY=your_key_here" > .env

# Load in script or use:
source .env
node download-pixabay-videos.js
```

**Never commit your API key to git!**
