#!/usr/bin/env node
/**
 * Verify Qdrant Videos Collection
 * 
 * Verifies that video count in Postgres matches point count in Qdrant
 * 
 * Usage:
 *   node verify_qdrant_videos.js
 */

import pool from './src/config/database.js';
import qdrantService from './src/services/qdrant.service.js';

async function verifyVideos() {
    console.log('🔍 Verifying Qdrant Videos Collection');
    console.log('='.repeat(60));

    try {
        // Get video count from Postgres
        console.log('\n📊 Querying Postgres...');
        const pgResult = await pool.query(
            "SELECT COUNT(*) as count FROM videos WHERE status = 'active'"
        );
        const dbCount = parseInt(pgResult.rows[0].count);
        console.log(`   Active videos in Postgres: ${dbCount}`);

        // Get point count from Qdrant
        console.log('\n📊 Querying Qdrant...');
        const collectionInfo = await qdrantService.getCollectionInfo();
        const qdrantCount = collectionInfo.points_count;
        console.log(`   Points in Qdrant 'videos': ${qdrantCount}`);

        // Compare counts
        console.log('\n' + '='.repeat(60));
        if (qdrantCount === dbCount) {
            console.log('✅ VERIFICATION PASSED');
            console.log(`   ${qdrantCount} videos in both Postgres and Qdrant`);
        } else {
            console.log('⚠️  COUNT MISMATCH');
            console.log(`   Postgres: ${dbCount} active videos`);
            console.log(`   Qdrant:   ${qdrantCount} points`);
            console.log(`   Difference: ${Math.abs(dbCount - qdrantCount)}`);
            
            if (qdrantCount < dbCount) {
                console.log('\n💡 Some videos are missing from Qdrant.');
                console.log('   Run backfill script to sync missing videos.');
            } else {
                console.log('\n💡 Qdrant has more points than active videos.');
                console.log('   This may include deleted/inactive videos.');
            }
        }
        console.log('='.repeat(60));

        // Show collection details
        console.log('\n📋 Collection Details:');
        console.log(`   Name: ${collectionInfo.name}`);
        console.log(`   Status: ${collectionInfo.status}`);
        console.log(`   Points: ${collectionInfo.points_count}`);
        console.log(`   Vectors: ${collectionInfo.vectors_count}`);
        console.log(`   Indexed: ${collectionInfo.indexed_vectors_count}`);

        // Sample a few points
        console.log('\n🔍 Sample Points (first 3):');
        const sampleResult = await pool.query(
            "SELECT id, title FROM videos WHERE status = 'active' ORDER BY created_at DESC LIMIT 3"
        );

        for (const video of sampleResult.rows) {
            try {
                const points = await qdrantService.batchRetrieveVideos([video.id]);
                if (points.length > 0) {
                    console.log(`   ✅ ${video.id} - "${video.title}"`);
                } else {
                    console.log(`   ❌ ${video.id} - "${video.title}" (NOT IN QDRANT)`);
                }
            } catch (error) {
                console.log(`   ❌ ${video.id} - "${video.title}" (ERROR: ${error.message})`);
            }
        }

        console.log('\n✅ Verification complete!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Verification failed:');
        console.error(error);
        process.exit(1);
    }
}

// Run verification
verifyVideos();
