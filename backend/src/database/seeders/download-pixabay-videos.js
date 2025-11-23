#!/usr/bin/env node
/**
 * Pixabay Video Downloader
 * 
 * Downloads sample videos from Pixabay for development seeding.
 * Requires Pixabay API key (free at https://pixabay.com/api/docs/)
 * 
 * Usage:
 *   node download-pixabay-videos.js
 * 
 * Environment variables:
 *   PIXABAY_API_KEY - Your Pixabay API key (required)
 *   DOWNLOAD_COUNT  - Number of videos to download (default: 100)
 *   VIDEO_TYPE      - all, film, animation (default: all)
 *   VIDEO_CATEGORY  - backgrounds, nature, science, etc. (optional)
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file if exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Configuration
const API_KEY = process.env.PIXABAY_API_KEY || '';
const DOWNLOAD_COUNT = parseInt(process.env.DOWNLOAD_COUNT || '100');
const VIDEO_TYPE = process.env.VIDEO_TYPE || 'all';
const VIDEO_CATEGORY = process.env.VIDEO_CATEGORY || '';
const OUTPUT_DIR = path.join(__dirname, 'data', 'sample-videos');

// Pixabay API settings
const API_BASE_URL = 'https://pixabay.com/api/videos/';
const PER_PAGE = 20; // Max allowed by Pixabay
const MAX_FILE_SIZE_MB = 50; // Skip videos larger than this

/**
 * Colors for console output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

/**
 * Log with color
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Download file from URL
 */
async function downloadFile(url, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        return downloadFile(response.headers.location, outputPath, onProgress)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'] || '0');
      let downloadedSize = 0;
      
      const fileStream = fs.createWriteStream(outputPath);
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (onProgress && totalSize > 0) {
          const progress = (downloadedSize / totalSize * 100).toFixed(1);
          onProgress(progress, downloadedSize, totalSize);
        }
      });
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve({ size: downloadedSize, path: outputPath });
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Fetch videos from Pixabay API
 */
async function fetchVideos(page = 1) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      key: API_KEY,
      page: page.toString(),
      per_page: PER_PAGE.toString(),
      video_type: VIDEO_TYPE,
      ...(VIDEO_CATEGORY && { category: VIDEO_CATEGORY }),
    });
    
    const url = `${API_BASE_URL}?${params}`;
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(new Error(`Failed to parse API response: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Select best video quality
 */
function selectBestVideo(videos) {
  // Prefer medium quality for sample videos (balance size/quality)
  const preferred = ['medium', 'small', 'large', 'tiny'];
  
  for (const quality of preferred) {
    const video = videos[quality];
    if (video) {
      return {
        quality,
        url: video.url,
        width: video.width,
        height: video.height,
        size: video.size,
      };
    }
  }
  
  return null;
}

/**
 * Main download function
 */
async function downloadVideos() {
  // Validate API key
  if (!API_KEY) {
    log('❌ ERROR: PIXABAY_API_KEY not set!', 'red');
    log('\nGet your free API key at: https://pixabay.com/api/docs/', 'yellow');
    log('\nUsage:', 'yellow');
    log('  PIXABAY_API_KEY=your_key_here node download-pixabay-videos.js\n', 'gray');
    process.exit(1);
  }
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    log(`✅ Created directory: ${OUTPUT_DIR}`, 'green');
  }
  
  log('\n🎬 Pixabay Video Downloader', 'blue');
  log('━'.repeat(50), 'gray');
  log(`📊 Target: ${DOWNLOAD_COUNT} videos`, 'blue');
  log(`📁 Output: ${OUTPUT_DIR}`, 'blue');
  log(`🎥 Type: ${VIDEO_TYPE}`, 'blue');
  if (VIDEO_CATEGORY) log(`📂 Category: ${VIDEO_CATEGORY}`, 'blue');
  log('━'.repeat(50), 'gray');
  
  let downloadedCount = 0;
  let skippedCount = 0;
  let totalPages = 0;
  let currentPage = 1;
  
  try {
    // Fetch first page to get total
    const firstResponse = await fetchVideos(1);
    totalPages = Math.ceil(firstResponse.totalHits / PER_PAGE);
    
    log(`\n📚 Found ${firstResponse.totalHits} videos (${totalPages} pages)`, 'green');
    log('━'.repeat(50), 'gray');
    
    // Download videos page by page
    while (downloadedCount < DOWNLOAD_COUNT && currentPage <= totalPages) {
      log(`\n📄 Fetching page ${currentPage}/${totalPages}...`, 'blue');
      
      const response = await fetchVideos(currentPage);
      
      if (!response.hits || response.hits.length === 0) {
        log('⚠️  No more videos available', 'yellow');
        break;
      }
      
      // Process each video
      for (const video of response.hits) {
        if (downloadedCount >= DOWNLOAD_COUNT) break;
        
        const bestVideo = selectBestVideo(video.videos);
        
        if (!bestVideo) {
          log(`⏭️  Skipping video ${video.id}: No suitable quality`, 'gray');
          skippedCount++;
          continue;
        }
        
        // Check file size
        const sizeMB = bestVideo.size / (1024 * 1024);
        if (sizeMB > MAX_FILE_SIZE_MB) {
          log(`⏭️  Skipping video ${video.id}: Too large (${sizeMB.toFixed(1)}MB)`, 'gray');
          skippedCount++;
          continue;
        }
        
        // Generate filename
        const extension = path.extname(new URL(bestVideo.url).pathname) || '.mp4';
        const filename = `pixabay-${video.id}-${bestVideo.quality}${extension}`;
        const outputPath = path.join(OUTPUT_DIR, filename);
        
        // Skip if already exists
        if (fs.existsSync(outputPath)) {
          log(`⏭️  Skipping ${filename}: Already exists`, 'gray');
          skippedCount++;
          continue;
        }
        
        // Download
        const videoNum = downloadedCount + 1;
        process.stdout.write(
          `\n[${videoNum}/${DOWNLOAD_COUNT}] ${filename} (${bestVideo.width}x${bestVideo.height}, ${formatBytes(bestVideo.size)})\n`
        );
        
        try {
          let lastProgress = 0;
          
          await downloadFile(
            bestVideo.url,
            outputPath,
            (progress, downloaded, total) => {
              // Only update every 10%
              const currentProgress = Math.floor(progress / 10) * 10;
              if (currentProgress > lastProgress) {
                process.stdout.write(
                  `  Progress: ${progress}% (${formatBytes(downloaded)}/${formatBytes(total)})\r`
                );
                lastProgress = currentProgress;
              }
            }
          );
          
          log(`  ✅ Downloaded successfully`, 'green');
          downloadedCount++;
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (err) {
          log(`  ❌ Download failed: ${err.message}`, 'red');
          skippedCount++;
          
          // Clean up partial file
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        }
      }
      
      currentPage++;
    }
    
    // Summary
    log('\n' + '━'.repeat(50), 'gray');
    log('📊 Download Summary:', 'blue');
    log(`  ✅ Downloaded: ${downloadedCount} videos`, 'green');
    log(`  ⏭️  Skipped: ${skippedCount} videos`, 'yellow');
    log(`  📁 Location: ${OUTPUT_DIR}`, 'blue');
    log('━'.repeat(50), 'gray');
    log('\n✨ Done!\n', 'green');
    
  } catch (err) {
    log(`\n❌ Error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  }
}

// Run
downloadVideos().catch(console.error);
