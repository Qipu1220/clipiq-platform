/**
 * Test Upload Script
 * Tests the video upload workflow with "Khoai Lang Thang.mp4"
 * 
 * Usage: node test_upload.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Video file path
const VIDEO_PATH = path.join(__dirname, '..', 'Khoai Lang Thang.mp4');

// Test configuration
const TEST_TITLE = 'Khoai Lang Thang - Du Lịch Việt Nam';
const TEST_DESCRIPTION = 'Video du lịch khám phá Việt Nam cùng Khoai Lang Thang. Những cảnh đẹp và trải nghiệm văn hóa địa phương.';

// Import services after dotenv is loaded
async function runTest() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 CLIPIQ VIDEO UPLOAD TEST');
    console.log('='.repeat(60));

    // Check if video file exists
    if (!fs.existsSync(VIDEO_PATH)) {
        console.error(`❌ Video file not found: ${VIDEO_PATH}`);
        console.log('Please make sure "Khoai Lang Thang.mp4" is in the project root directory');
        process.exit(1);
    }

    const videoStats = fs.statSync(VIDEO_PATH);
    console.log(`\n📹 Video file: ${path.basename(VIDEO_PATH)}`);
    console.log(`   Size: ${(videoStats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Title: ${TEST_TITLE}`);
    console.log(`   Description: ${TEST_DESCRIPTION.substring(0, 50)}...`);

    try {
        // Read video file
        console.log('\n📖 Reading video file...');
        const videoBuffer = fs.readFileSync(VIDEO_PATH);
        console.log(`   Buffer size: ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

        // Import upload service
        console.log('\n📦 Loading upload service...');
        const uploadService = await import('./src/services/upload.service.js');

        // Get a test user ID (first user in database)
        const pool = (await import('./src/config/database.js')).default;
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');

        if (userResult.rows.length === 0) {
            console.error('❌ No users found in database. Please create a user first.');
            process.exit(1);
        }

        const testUserId = userResult.rows[0].id;
        console.log(`   Using test user ID: ${testUserId}`);

        // Process video upload
        console.log('\n🚀 Starting video upload process...\n');

        const startTime = Date.now();

        const result = await uploadService.processVideoUpload(videoBuffer, {
            title: TEST_TITLE,
            description: TEST_DESCRIPTION,
            uploaderId: testUserId,
            thumbnailBuffer: null // Auto-generate from first frame
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('\n' + '='.repeat(60));
        console.log('✅ UPLOAD TEST COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60));
        console.log(`\n📊 Results:`);
        console.log(`   Video ID: ${result.video.id}`);
        console.log(`   Video URL: ${result.videoUrl}`);
        console.log(`   Thumbnail URL: ${result.thumbnailUrl}`);
        console.log(`   Keyframes Processed: ${result.keyframesProcessed}`);
        console.log(`   Status: ${result.video.status}`);
        console.log(`   Duration: ${duration} seconds`);

        // Verify database record
        console.log('\n🔍 Verifying database record...');
        const videoCheck = await pool.query('SELECT * FROM videos WHERE id = $1', [result.video.id]);
        if (videoCheck.rows.length > 0) {
            console.log('   ✅ Video record found in database');
            console.log(`   Title: ${videoCheck.rows[0].title}`);
            console.log(`   Status: ${videoCheck.rows[0].status}`);
        } else {
            console.log('   ❌ Video record NOT found in database');
        }

        // Check Qdrant indexing
        console.log('\n🔍 Checking Qdrant indexing...');
        try {
            const qdrantClient = (await import('./src/config/qdrant.js')).default;
            const qdrantResult = await qdrantClient.scroll('clipiq_vectors', {
                filter: {
                    must: [{
                        key: 'video_id',
                        match: { value: result.video.id }
                    }]
                },
                limit: 10,
                with_payload: true
            });

            if (qdrantResult.points && qdrantResult.points.length > 0) {
                console.log(`   ✅ Found ${qdrantResult.points.length} vector(s) in Qdrant`);
            } else {
                console.log('   ⚠️ No vectors found in Qdrant (keyframe extraction may have failed)');
            }
        } catch (error) {
            console.log(`   ⚠️ Could not check Qdrant: ${error.message}`);
        }

        // Check Elasticsearch indexing
        console.log('\n🔍 Checking Elasticsearch indexing...');
        try {
            const esClient = (await import('./src/config/elasticsearch.js')).default;
            const { ELASTIC_OCR_INDEX } = await import('./src/config/elasticsearch.js');

            const esResult = await esClient.search({
                index: ELASTIC_OCR_INDEX,
                query: {
                    term: { video_id: result.video.id }
                },
                size: 10
            });

            if (esResult.hits.hits.length > 0) {
                console.log(`   ✅ Found ${esResult.hits.hits.length} OCR document(s) in Elasticsearch`);
            } else {
                console.log('   ⚠️ No OCR documents found (frames may not have visible text)');
            }
        } catch (error) {
            console.log(`   ⚠️ Could not check Elasticsearch: ${error.message}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 TEST COMPLETE');
        console.log('='.repeat(60) + '\n');

        // Close database connection
        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        process.exit(1);
    }
}

// Run the test
runTest();
