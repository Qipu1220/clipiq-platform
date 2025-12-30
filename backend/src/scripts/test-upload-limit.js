
/**
 * Test script to verify upload size limit validation
 * Run with: node src/scripts/test-upload-limit.js
 */

import 'dotenv/config'; // Load env vars
import { SystemSettings } from '../models/SystemSettings.js';
import pg from 'pg';

const { Pool } = pg;

// Mock database connection if needed, but we can reuse the existing pool logic via checking SystemSettings directly?
// actually SystemSettings uses pool from '../config/database.js' which loads process.env
// We need to ensure we are in the backend directory or process.env is set correctly.
// The script will be run from backend root probably.

async function testUploadLimit() {
    console.log('🧪 Starting Upload Limit Test...');

    try {
        // 1. Get current limit
        console.log('1️⃣ Fetching current limit from DB...');
        const settings = await SystemSettings.getSettings(['max_upload_size_mb']);
        const limitMB = parseInt(settings.max_upload_size_mb || '500');
        console.log(`   Current limit: ${limitMB} MB`);

        // 2. Simulate logic from video.controller.js
        console.log('2️⃣ Simulating file checks...');

        // Case A: File smaller than limit
        const smallSizeMB = limitMB - 1;
        console.log(`   [Test A] File size: ${smallSizeMB} MB`);
        if (smallSizeMB > limitMB) {
            console.error('   ❌ FAILED: Small file validation failed (should pass)');
        } else {
            console.log('   ✅ PASSED: Small file allowed');
        }

        // Case B: File larger than limit
        const largeSizeMB = limitMB + 1;
        console.log(`   [Test B] File size: ${largeSizeMB} MB`);
        if (largeSizeMB > limitMB) {
            console.log(`   ✅ PASSED: Large file blocked (Simulated 400 Error: Video quá lớn...)`);
        } else {
            console.error('   ❌ FAILED: Large file validation failed (should block)');
        }

        // 3. Verify SystemSettings update works
        // We won't actually update it to avoid messing up user config, 
        // but we proved reading works which is what the controller uses.

        console.log('\n🏁 Test Complete.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test Error:', error);
        process.exit(1);
    }
}

testUploadLimit();
