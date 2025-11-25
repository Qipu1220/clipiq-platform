/**
 * Seeder: MinIO Buckets and Sample Files
 * 
 * Initialize MinIO buckets and optionally upload sample files.
 */

import * as Minio from 'minio';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MinIO buckets to create
 */
const buckets = [
  {
    name: 'videos',
    policy: 'private', // private, public, or custom
    description: 'Video files storage'
  },
  {
    name: 'thumbnails',
    policy: 'public', // Thumbnails can be public
    description: 'Video thumbnail images'
  },
  {
    name: 'avatars',
    policy: 'public', // Avatars can be public
    description: 'User avatar images'
  }
];

/**
 * Create MinIO client
 */
function createMinioClient() {
  return new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
  });
}

/**
 * Public read-only bucket policy
 */
function getPublicPolicy(bucketName) {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/*`]
      }
    ]
  };
}

/**
 * Create bucket if it doesn't exist
 */
async function ensureBucket(minioClient, bucket) {
  const exists = await minioClient.bucketExists(bucket.name);
  
  if (exists) {
    console.log(`   ✅ Bucket '${bucket.name}' already exists`);
    return false;
  }
  
  // Create bucket
  await minioClient.makeBucket(bucket.name, 'us-east-1');
  console.log(`   ✅ Created bucket: ${bucket.name}`);
  
  // Set bucket policy if public
  if (bucket.policy === 'public') {
    const policy = getPublicPolicy(bucket.name);
    await minioClient.setBucketPolicy(
      bucket.name,
      JSON.stringify(policy)
    );
    console.log(`   🔓 Set public policy for: ${bucket.name}`);
  }
  
  return true;
}

/**
 * Upload sample files (development only)
 */
async function uploadSampleFiles(minioClient) {
  if (process.env.NODE_ENV === 'production') {
    console.log('   ⏭️  Skipping sample files in production');
    return;
  }
  
  const sampleFilesDir = path.join(__dirname, 'data', 'sample-videos');
  
  try {
    // Check if sample files directory exists
    await fs.access(sampleFilesDir);
  } catch {
    console.log('   ℹ️  No sample files directory found, skipping uploads');
    console.log(`   💡 Create ${sampleFilesDir} and add sample video files to seed them`);
    return;
  }
  
  // List files in sample directory
  const files = await fs.readdir(sampleFilesDir);
  const videoFiles = files.filter(f => 
    f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mov')
  );
  
  if (videoFiles.length === 0) {
    console.log('   ℹ️  No video files found in sample directory');
    return;
  }
  
  console.log(`   📦 Found ${videoFiles.length} sample video(s) to upload`);
  
  for (const file of videoFiles) {
    const filePath = path.join(sampleFilesDir, file);
    const objectName = `sample/${file}`;
    
    try {
      // Check if file already exists
      try {
        await minioClient.statObject('videos', objectName);
        console.log(`   ⏭️  ${file} already exists, skipping`);
        continue;
      } catch {
        // File doesn't exist, proceed with upload
      }
      
      // Upload file
      const metaData = {
        'Content-Type': 'video/mp4',
        'X-Amz-Meta-Sample': 'true'
      };
      
      await minioClient.fPutObject('videos', objectName, filePath, metaData);
      console.log(`   ✅ Uploaded sample video: ${file}`);
    } catch (error) {
      console.error(`   ❌ Failed to upload ${file}:`, error.message);
    }
  }
}

/**
 * Seed MinIO buckets
 */
export async function seed(client) {
  console.log('   Initializing MinIO storage...');
  
  try {
    // Create MinIO client
    const minioClient = createMinioClient();
    
    // Test connection
    try {
      await minioClient.listBuckets();
      console.log('   ✅ MinIO connection successful');
    } catch (error) {
      console.error('   ❌ MinIO connection failed:', error.message);
      console.error('   💡 Make sure MinIO is running: docker compose up -d minio');
      throw error;
    }
    
    // Create buckets
    let createdCount = 0;
    for (const bucket of buckets) {
      const created = await ensureBucket(minioClient, bucket);
      if (created) createdCount++;
    }
    
    console.log(`   📊 Buckets: ${createdCount} created, ${buckets.length - createdCount} existing`);
    
    // Upload sample files (development only)
    await uploadSampleFiles(minioClient);
    
    console.log('   ✅ MinIO initialization complete');
  } catch (error) {
    console.error('   ❌ MinIO seeding failed:', error.message);
    throw error;
  }
}

export default seed;
