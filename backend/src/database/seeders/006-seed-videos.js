/**
 * Seeder: Videos
 * 
 * Uploads 100 sample videos and thumbnails to MinIO and creates video records in database.
 * Distributes videos evenly: each of 50 regular users gets 2 videos.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Minio from 'minio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Video titles and descriptions based on content categories
 */
const videoMetadata = [
  // Tech & Education (user001-user009)
  { title: 'Introduction to JavaScript ES6', description: 'Learn modern JavaScript features and best practices' },
  { title: 'React Hooks Tutorial', description: 'Complete guide to React Hooks for beginners' },
  { title: 'Travel Vlog: Tokyo 2024', description: 'Exploring the streets of Tokyo, Japan' },
  { title: 'Hidden Gems in Paris', description: 'Off the beaten path locations in Paris' },
  { title: 'Elden Ring Boss Guide', description: 'How to defeat the hardest bosses in Elden Ring' },
  { title: 'Gaming Setup Tour 2024', description: 'My complete gaming setup and peripherals' },
  { title: '15-Minute Pasta Recipe', description: 'Quick and delicious pasta for busy weeknights' },
  { title: 'Meal Prep Sundays', description: 'Preparing healthy meals for the entire week' },
  { title: 'Home Workout Routine', description: 'No equipment needed - Full body workout' },
  { title: 'Morning Yoga Flow', description: '20-minute energizing yoga sequence' },

  // Creative & DIY (user010-user018)
  { title: 'DIY Floating Shelves', description: 'Build modern floating shelves for any room' },
  { title: 'Succulent Garden Tutorial', description: 'Creating a beautiful succulent arrangement' },
  { title: 'Sony A7IV Review', description: 'In-depth camera review after 6 months' },
  { title: 'Portrait Photography Tips', description: 'Lighting techniques for stunning portraits' },
  { title: 'Fall Fashion Haul 2024', description: 'My favorite autumn fashion finds' },
  { title: 'Everyday Makeup Look', description: 'Natural makeup for work or school' },
  { title: 'Chemistry Experiment: Volcano', description: 'Fun science experiment for kids' },
  { title: 'Physics of Roller Coasters', description: 'Understanding forces and motion' },
  { title: 'Acoustic Guitar Cover: Wonderwall', description: 'Classic Oasis song on acoustic guitar' },
  { title: 'Piano Tutorial: River Flows in You', description: 'Learn this beautiful piano piece' },

  // Automotive & Pets (user011-user020)
  { title: 'Tesla Model 3 Review', description: 'Is it worth it? Full review after 1 year' },
  { title: 'Basic Car Maintenance', description: 'Oil change and tire rotation guide' },
  { title: 'Puppy Training Basics', description: 'Essential commands every dog should know' },
  { title: 'Cat Care 101', description: 'Everything you need for a happy cat' },
  { title: 'Live Edge Table Build', description: 'Woodworking project from start to finish' },
  { title: 'Epoxy Resin Art', description: 'Creating stunning resin artwork' },
  { title: 'Learn Spanish in 30 Days', description: 'Day 1: Basic greetings and introductions' },
  { title: 'Japanese Kanji Study Tips', description: 'How I learned 2000 kanji characters' },
  { title: 'Drone Footage: Mountain Sunset', description: 'Breathtaking aerial cinematography' },
  { title: 'FPV Drone Racing', description: 'High-speed drone racing through obstacles' },

  // Wellness & Gardening (user021-user030)
  { title: 'Guided Meditation 10 Minutes', description: 'Stress relief and mindfulness practice' },
  { title: 'Mental Health Resources', description: 'Important resources and support information' },
  { title: 'Growing Tomatoes from Seed', description: 'Complete guide to tomato gardening' },
  { title: 'Urban Balcony Garden', description: 'Maximizing small spaces for growing food' },
  { title: 'Book Review: 1984 by Orwell', description: 'Analysis and discussion of this classic' },
  { title: 'Top 10 Books of 2024', description: 'My favorite reads from this year' },
  { title: 'Starting a Business in 2024', description: 'First steps to entrepreneurship' },
  { title: 'Marketing Strategies for Startups', description: 'Low-cost marketing tactics that work' },
  { title: 'Vinyasa Yoga for Beginners', description: 'Flowing yoga sequence for flexibility' },
  { title: 'Pilates Core Workout', description: 'Strengthen your core with pilates' },

  // History & Beauty (user031-user040)
  { title: 'World War II: D-Day', description: 'Historical documentary about the Normandy landings' },
  { title: 'Ancient Egypt Mysteries', description: 'Exploring pyramids and pharaohs' },
  { title: 'Smokey Eye Tutorial', description: 'Perfect evening makeup look' },
  { title: 'Korean Skincare Routine', description: '10-step skincare for glowing skin' },
  { title: 'Basketball Skills Training', description: 'Improve your shooting and dribbling' },
  { title: 'Soccer Drills for Beginners', description: 'Essential training exercises' },
  { title: 'Modern Living Room Design', description: 'Interior design tips and trends' },
  { title: 'Small Space Organization', description: 'Maximizing storage in tiny apartments' },
  { title: 'Mountain Biking Adventure', description: 'Epic trail riding in the Alps' },
  { title: 'Bike Repair: Fixing Flat Tires', description: 'Essential bike maintenance skills' },

  // Food & Outdoor (user041-user050)
  { title: 'Chocolate Chip Cookies', description: 'The best cookie recipe you\'ll ever make' },
  { title: 'Sourdough Bread from Scratch', description: 'Master the art of sourdough baking' },
  { title: 'Bass Fishing Techniques', description: 'Tips for catching trophy bass' },
  { title: 'Camping Gear Essentials', description: 'What to pack for your next camping trip' },
  { title: 'Zero Waste Living Tips', description: 'Reducing plastic and living sustainably' },
  { title: 'Composting at Home', description: 'Turn food scraps into garden gold' },
  { title: 'Card Magic Tutorial', description: 'Learn amazing card tricks step by step' },
  { title: 'Mind Reading Illusion', description: 'Psychology behind mentalism tricks' },
  { title: 'Hip Hop Dance Routine', description: 'Learn this trending dance challenge' },
  { title: 'Contemporary Dance Performance', description: 'Original choreography showcase' },

  // Tech & Finance (user001-user010 second videos)
  { title: '3D Printing Basics', description: 'Getting started with 3D printing at home' },
  { title: 'Best 3D Printer Under $500', description: 'Budget 3D printer comparison and review' },
  { title: 'Stock Market for Beginners', description: 'How to start investing in stocks' },
  { title: 'Passive Income Ideas 2024', description: 'Building wealth while you sleep' },
  { title: 'Modern Architecture Tour', description: 'Visiting iconic buildings around the world' },
  { title: 'Sustainable Building Design', description: 'Eco-friendly architecture principles' },
  { title: 'Toddler Activities at Home', description: 'Fun and educational activities for kids' },
  { title: 'Baby Sleep Training Guide', description: 'Gentle methods for better sleep' },
  { title: 'Espresso Making Tutorial', description: 'Pulling the perfect espresso shot' },
  { title: 'Latte Art Techniques', description: 'Creating beautiful designs in coffee' },

  // Art & Travel (user011-user020 second videos)
  { title: 'Watercolor Painting Basics', description: 'Beginner techniques for watercolors' },
  { title: 'Oil Painting Landscape', description: 'Step by step landscape painting' },
  { title: 'Stand Up Comedy Set', description: 'Live comedy performance highlights' },
  { title: 'Writing Comedy Material', description: 'How to write jokes that land' },
  { title: 'Backpacking Through Europe', description: 'Budget travel tips and itinerary' },
  { title: 'Best Street Food in Bangkok', description: 'Trying authentic Thai street food' },
  { title: 'Telescope Buying Guide', description: 'Choosing your first telescope' },
  { title: 'Astrophotography Tutorial', description: 'Capturing the night sky' },
  { title: 'Wedding Planning Timeline', description: '12-month guide to planning your wedding' },
  { title: 'DIY Wedding Decorations', description: 'Beautiful budget-friendly decor ideas' },

  // Outdoor & Creative (user021-user030 second videos)
  { title: 'Backpacking Gear Review', description: 'Ultralight gear for long distance hiking' },
  { title: 'National Parks Travel Guide', description: 'Must-visit parks in the USA' },
  { title: 'Voice Over Recording Tips', description: 'Setting up a home voice over studio' },
  { title: 'Character Voice Acting', description: 'Creating unique character voices' },
  { title: 'Real Estate Investing 101', description: 'Buying your first rental property' },
  { title: 'House Flipping Strategy', description: 'Renovating homes for profit' },
  { title: 'Wire Jewelry Making', description: 'Create beautiful handmade jewelry' },
  { title: 'Beading Techniques', description: 'Designing unique beaded accessories' },
  { title: 'Ableton Live Tutorial', description: 'Music production for beginners' },
  { title: 'DJ Mixing Techniques', description: 'Beatmatching and transitions' },

  // Design & Martial Arts (user031-user040 second videos)
  { title: 'Adobe Photoshop Basics', description: 'Essential tools every designer needs' },
  { title: 'Logo Design Process', description: 'From concept to final design' },
  { title: 'Karate Kata Tutorial', description: 'Learning traditional martial arts forms' },
  { title: 'Self Defense Techniques', description: 'Practical self defense for everyone' },
  { title: 'Wine Tasting Guide', description: 'How to taste and appreciate wine' },
  { title: 'Pairing Wine with Food', description: 'Sommelier tips for perfect pairings' },
  { title: 'Bitcoin Explained Simply', description: 'Understanding cryptocurrency basics' },
  { title: 'Ethereum Smart Contracts', description: 'Introduction to blockchain development' },
  { title: 'Street Food Tour Mexico City', description: 'Authentic tacos and local favorites' },
  { title: 'Japanese Ramen Making', description: 'Making restaurant-quality ramen at home' }
];

/**
 * Get MinIO client configuration
 */
function getMinioClient() {
  return new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
  });
}

/**
 * Get thumbnail filename from video filename
 * @param {string} videoFilename - Video filename (e.g., 'pixabay-135658-medium.mp4')
 * @returns {string} - Thumbnail filename (e.g., 'pixabay-135658-medium-thumb.jpg')
 */
function getThumbnailFilename(videoFilename) {
  return videoFilename.replace('.mp4', '-thumb.jpg');
}

/**
 * Get MinIO thumbnail URL
 * @param {string} thumbnailFilename - Thumbnail filename
 * @returns {string} - Full MinIO URL
 */
function getThumbnailUrl(thumbnailFilename) {
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || 9000;
  return `${protocol}://${endpoint}:${port}/clipiq-thumbnails/${thumbnailFilename}`;
}

/**
 * Seed videos
 */
export async function seed(client) {
  console.log('   Seeding 100 videos with thumbnails (2 per user)...');

  const minioClient = getMinioClient();
  const videoBucketName = 'clipiq-videos';
  const thumbnailBucketName = 'clipiq-thumbnails';
  const videosDir = path.join(__dirname, 'data', 'sample-videos');
  const thumbnailsDir = path.join(__dirname, 'data', 'sample-thumbnails');

  // Check if sample videos directory exists
  if (!fs.existsSync(videosDir)) {
    console.error('   ❌ Sample videos directory not found!');
    console.error('   Run: node download-pixabay-videos.js first');
    return;
  }

  // Check if sample thumbnails directory exists
  if (!fs.existsSync(thumbnailsDir)) {
    console.error('   ❌ Sample thumbnails directory not found!');
    console.error('   Run: python data/extract-thumbnails.py first');
    return;
  }

  // Get all video files
  const videoFiles = fs.readdirSync(videosDir)
    .filter(file => file.endsWith('.mp4'))
    .slice(0, 100); // Take first 100 videos

  if (videoFiles.length < 100) {
    console.warn(`   ⚠️  Only found ${videoFiles.length} videos, expected 100`);
  }

  // Get all regular users (role = 'user')
  const usersResult = await client.query(
    `SELECT id, username FROM users WHERE role = 'user' ORDER BY username LIMIT 50`
  );

  const users = usersResult.rows;

  if (users.length < 50) {
    console.error(`   ❌ Only found ${users.length} users, expected 50`);
    console.error('   Run: 004-seed-regular-users.js first');
    return;
  }

  console.log(`   📹 Found ${videoFiles.length} video files`);
  console.log(`   👥 Found ${users.length} users`);
  console.log('   🚀 Starting upload and database insertion...');

  let uploadedCount = 0;
  let skippedCount = 0;
  let videoIndex = 0;

  // Load static IDs from ocr_es.json to sync with Search Engine
  const ocrDataPath = path.join(__dirname, 'data', 'sample-sparse', 'ocr_es.json');
  let videoIdMap = new Map();

  if (fs.existsSync(ocrDataPath)) {
    try {
      const ocrData = JSON.parse(fs.readFileSync(ocrDataPath, 'utf-8'));
      ocrData.forEach(item => {
        // item.video_name is like 'pixabay-135658-medium'
        // video file is like 'pixabay-135658-medium.mp4'
        if (item.id && item.video_name) {
          videoIdMap.set(item.video_name + '.mp4', item.id);
        }
      });
      console.log(`   🗺️  Loaded ${videoIdMap.size} static IDs from ocr_es.json`);
    } catch (e) {
      console.warn('   ⚠️  Failed to load ocr_es.json:', e.message);
    }
  }

  // Distribute videos: each user gets 2 videos
  for (let userIndex = 0; userIndex < users.length && videoIndex < videoFiles.length; userIndex++) {
    const user = users[userIndex];

    // Upload 2 videos per user
    for (let i = 0; i < 2 && videoIndex < videoFiles.length; i++) {
      const videoFile = videoFiles[videoIndex];
      const videoPath = path.join(videosDir, videoFile);
      const metadata = videoMetadata[videoIndex];

      // Check if video already exists in database
      const existingVideo = await client.query(
        'SELECT id FROM videos WHERE video_url = $1',
        [videoFile]
      );

      if (existingVideo.rows.length > 0) {
        skippedCount++;
        videoIndex++;
        continue;
      }

      try {
        // Get file stats
        const stats = fs.statSync(videoPath);
        const fileSizeBytes = stats.size;

        // Get thumbnail info
        const thumbnailFilename = getThumbnailFilename(videoFile);
        const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
        const hasThumbnail = fs.existsSync(thumbnailPath);

        // Upload video to MinIO
        await minioClient.fPutObject(videoBucketName, videoFile, videoPath, {
          'Content-Type': 'video/mp4',
          'uploaded-by': user.username,
          'upload-date': new Date().toISOString()
        });

        // Upload thumbnail to MinIO if exists
        let thumbnailUrl = null;
        if (hasThumbnail) {
          await minioClient.fPutObject(thumbnailBucketName, thumbnailFilename, thumbnailPath, {
            'Content-Type': 'image/jpeg',
            'uploaded-by': user.username,
            'upload-date': new Date().toISOString()
          });
          thumbnailUrl = thumbnailFilename; // Store just filename, will construct full URL in frontend/API
        }

        // Determine ID: use static ID if available, otherwise let DB generate (or generate one)
        // Note: If we use explicit ID, we need to include it in INSERT.
        // If map has it, use it. If not, don't include ID column?
        // Actually simpler to generate a random one if missing so we can use same query.

        let videoId = videoIdMap.get(videoFile);

        // Construct query based on whether we have a specific ID to enforce
        let result;
        if (videoId) {
          result = await client.query(
            `INSERT INTO videos (
                id,
                uploader_id,
                title,
                description,
                video_url,
                thumbnail_url,
                duration,
                status,
                processing_status,
                views
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
              RETURNING id, title`,
            [
              videoId,
              user.id,
              metadata.title,
              metadata.description,
              videoFile,
              thumbnailUrl || thumbnailFilename,
              Math.floor(Math.random() * 600) + 30,
              'active',
              'ready'
            ]
          );
        } else {
          // Fallback to auto-generated ID
          result = await client.query(
            `INSERT INTO videos (
                uploader_id,
                title,
                description,
                video_url,
                thumbnail_url,
                duration,
                status,
                processing_status,
                views
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
              RETURNING id, title`,
            [
              user.id,
              metadata.title,
              metadata.description,
              videoFile,
              thumbnailUrl || thumbnailFilename,
              Math.floor(Math.random() * 600) + 30,
              'active',
              'ready'
            ]
          );
        }

        uploadedCount++;
        videoIndex++;

        // Log progress every 10 videos
        if (uploadedCount % 10 === 0) {
          console.log(`   ✅ Uploaded ${uploadedCount} videos...`);
        }

      } catch (error) {
        console.error(`   ❌ Error uploading ${videoFile}:`, error.message);
        videoIndex++;
      }
    }
  }

  console.log(`   📊 Summary: ${uploadedCount} uploaded, ${skippedCount} skipped`);
  console.log('   🎬 Video distribution: 2 videos per user (50 users × 2 = 100 videos)');
}

export default seed;
