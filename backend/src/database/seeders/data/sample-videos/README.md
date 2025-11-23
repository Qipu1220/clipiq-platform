# Sample Videos Directory

Place sample video files here for development seeding.

## 📁 Supported Formats

- `.mp4` - H.264 video, AAC audio (recommended)
- `.webm` - VP8/VP9 video, Vorbis/Opus audio
- `.mov` - QuickTime format
- `.avi` - Audio Video Interleave (legacy)

## 📝 Naming Convention

Use descriptive names for sample videos:
- `sample-tutorial.mp4`
- `sample-vlog.mp4`
- `sample-gaming.webm`

## 📦 File Size Recommendations

For development:
- Keep files under 50MB for quick uploads
- Use short clips (30s - 2min)
- Lower resolution is fine (720p or less)

## 🎬 Getting Sample Videos

### 🤖 Automatic Download (Recommended):

```bash
# From seeders directory: backend/src/database/seeders/
# 1. Add API key to .env file (get free at https://pixabay.com/api/docs/)
# 2. Run download script
node download-pixabay-videos.js
```

See [../../README.md](../../README.md) for full instructions.

### 📥 Manual Download:
1. **Pexels Videos**: https://www.pexels.com/videos/
2. **Pixabay Videos**: https://pixabay.com/videos/
3. **Videvo**: https://www.videvo.net/
4. **Coverr**: https://coverr.co/

### 🎥 Create Your Own:
```bash
# Convert and compress using ffmpeg
ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -crf 23 -c:a aac -b:a 128k sample-video.mp4

# Extract first 30 seconds
ffmpeg -i input.mp4 -t 30 -c copy sample-short.mp4
```

## 🖼️ Thumbnails (Optional)

You can also include thumbnail images:
- `sample-tutorial-thumb.jpg`
- `sample-vlog-thumb.png`

## ⚠️ Important Notes

- **Do not commit** large video files to git
- Add `*.mp4`, `*.webm`, `*.mov` to `.gitignore`
- Only commit small sample files (<5MB) if necessary
- For CI/CD, use mock/stub files instead

## 🔐 Copyright

Ensure all sample videos are:
- ✅ Licensed under Creative Commons (CC0, CC BY, etc.)
- ✅ Self-created content
- ✅ Properly attributed if required
- ❌ Never use copyrighted material without permission

## 📋 Example .gitignore

Add to your `.gitignore`:
```gitignore
# Ignore large video files
backend/src/database/seeders/data/sample-videos/*.mp4
backend/src/database/seeders/data/sample-videos/*.webm
backend/src/database/seeders/data/sample-videos/*.mov
backend/src/database/seeders/data/sample-videos/*.avi

# Keep README
!backend/src/database/seeders/data/sample-videos/README.md

# Allow small stub files (optional)
!backend/src/database/seeders/data/sample-videos/*-stub.*
```
