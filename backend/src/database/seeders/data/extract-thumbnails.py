"""
Extract first frame from all videos in sample-videos folder
and save as thumbnails in sample-thumbnails folder.

Requirements: pip install opencv-python
Usage: python extract-thumbnails.py
"""

import cv2
import os
from pathlib import Path

def extract_first_frame(video_path, output_path):
    """Extract first frame from video and save as JPEG."""
    cap = cv2.VideoCapture(str(video_path))
    
    if not cap.isOpened():
        print(f"  ❌ Cannot open: {video_path.name}")
        return False
    
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        print(f"  ❌ Cannot read frame: {video_path.name}")
        return False
    
    # Save as JPEG with good quality
    cv2.imwrite(str(output_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return True

def main():
    # Get current directory (data folder)
    data_dir = Path(__file__).parent
    videos_dir = data_dir / "sample-videos"
    thumbnails_dir = data_dir / "sample-thumbnails"
    
    # Create thumbnails directory if not exists
    thumbnails_dir.mkdir(exist_ok=True)
    
    # Get all MP4 files
    video_files = sorted(videos_dir.glob("*.mp4"))
    
    print(f"📹 Found {len(video_files)} videos")
    print(f"📁 Output directory: {thumbnails_dir}")
    print("")
    
    success_count = 0
    skip_count = 0
    
    for video_path in video_files:
        # Create thumbnail filename: pixabay-135658-medium.mp4 -> pixabay-135658-medium-thumb.jpg
        thumb_name = video_path.stem + "-thumb.jpg"
        thumb_path = thumbnails_dir / thumb_name
        
        # Skip if already exists
        if thumb_path.exists():
            skip_count += 1
            continue
        
        if extract_first_frame(video_path, thumb_path):
            success_count += 1
            if success_count % 10 == 0:
                print(f"  ✅ Extracted {success_count} thumbnails...")
        
    print("")
    print(f"📊 Summary:")
    print(f"  ✅ Extracted: {success_count}")
    print(f"  ⏭️  Skipped (already exist): {skip_count}")
    print(f"  📁 Total thumbnails: {len(list(thumbnails_dir.glob('*.jpg')))}")

if __name__ == "__main__":
    main()
