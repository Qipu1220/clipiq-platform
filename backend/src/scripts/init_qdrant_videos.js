#!/usr/bin/env node
/**
 * Initialize Qdrant Videos Collection
 * 
 * Creates the 'videos' collection for video-level embeddings.
 * Run this script once before starting the recommendation system.
 * 
 * Usage:
 *   node src/scripts/init_qdrant_videos.js
 */

import qdrantService from '../services/qdrant.service.js';

async function initCollection() {
    console.log('🚀 Initializing Qdrant videos collection...');
    console.log('='.repeat(50));

    try {
        // Create collection
        console.log('\n📦 Creating videos collection...');
        await qdrantService.createVideosCollection();

        // Get collection info
        console.log('\n📊 Collection info:');
        const info = await qdrantService.getCollectionInfo();
        console.log(JSON.stringify(info, null, 2));

        console.log('\n' + '='.repeat(50));
        console.log('✅ Videos collection initialized successfully!');
        console.log('='.repeat(50));

        console.log('\n📝 Next steps:');
        console.log('  1. Run backfill script to populate with existing videos:');
        console.log('     node src/scripts/backfill_qdrant_videos.js');
        console.log('  2. Or upload new videos - they will be automatically indexed');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Failed to initialize collection:');
        console.error(error);
        process.exit(1);
    }
}

// Run initialization
initCollection();
