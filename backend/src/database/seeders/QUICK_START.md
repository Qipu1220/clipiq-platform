# 🚀 Quick Start: Download 100 Videos from Pixabay

## Step 1: Get API Key (Free)

1. Go to: https://pixabay.com/api/docs/
2. Sign up for free account
3. Copy your API key

## Step 2: Run Download Script

```bash
# Navigate to seeders directory
cd backend/src/database/seeders

# Option A: Direct command (recommended)
PIXABAY_API_KEY=your_key_here node download-pixabay-videos.js

# Option B: Using .env file
cp .env.example .env
# Edit .env and add your API key
# Then run:
node download-pixabay-videos.js
```

## Step 3: Wait for Download

The script will:
- ✅ Download 100 videos (or custom amount)
- ✅ Show progress for each video
- ✅ Skip videos that are too large (>50MB)
- ✅ Skip existing files
- ✅ Save to `data/sample-videos/` directory

Expected time: **~15-30 minutes** (depends on your internet speed)

## Step 4: Verify

```bash
# Check downloaded videos
ls -lh data/sample-videos/*.mp4

# Count videos
ls data/sample-videos/*.mp4 | wc -l
```

## 📊 Example Output

```
🎬 Pixabay Video Downloader
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Target: 100 videos
📁 Output: /path/to/sample-videos
🎥 Type: all
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Found 8456 videos (423 pages)

[1/100] pixabay-12345-medium.mp4 (1280x720, 15.2 MB)
  ✅ Downloaded successfully

[2/100] pixabay-67890-small.mp4 (640x360, 8.5 MB)
  ✅ Downloaded successfully

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Download Summary:
  ✅ Downloaded: 100 videos
  ⏭️  Skipped: 15 videos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Done!
```

## 🎯 Customization

### Download fewer videos:
```bash
PIXABAY_API_KEY=your_key DOWNLOAD_COUNT=20 node download-pixabay-videos.js
```

### Download specific category:
```bash
PIXABAY_API_KEY=your_key VIDEO_CATEGORY=nature node download-pixabay-videos.js
```

### Animation only:
```bash
PIXABAY_API_KEY=your_key VIDEO_TYPE=animation node download-pixabay-videos.js
```

## 💡 Tips

- Start with 10-20 videos to test
- Average file size: ~15MB per video
- 100 videos ≈ 1.5GB storage needed
- All videos are CC0 (Public Domain)

## 📚 Full Documentation

See [PIXABAY_DOWNLOADER.md](./PIXABAY_DOWNLOADER.md) for complete guide.

## ⚠️ Troubleshooting

**No API key?**
```bash
# Get free key: https://pixabay.com/api/docs/
```

**Downloads interrupted?**
```bash
# Just run again - skips existing files
PIXABAY_API_KEY=your_key node download-pixabay-videos.js
```

**Rate limit error?**
```bash
# Wait a few minutes and retry
# Free tier: 5,000 requests/hour
```

---

**Ready to seed your database?**

After downloading videos, run the seeder:
```bash
cd ../../..  # Back to backend root
npm run seed
```
