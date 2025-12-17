/**
 * Test Keyframe Extraction Only
 * Tests connection to keyframe extraction service
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEO_PATH = path.join(__dirname, '..', 'Khoai Lang Thang.mp4');
const EXTRACT_KEYFRAME_URL = process.env.EXTRACT_KEYFRAME_URL;

async function testKeyframeExtraction() {
    console.log('\n🧪 TEST: Keyframe Extraction Service');
    console.log('='.repeat(50));

    if (!fs.existsSync(VIDEO_PATH)) {
        console.error('❌ Video file not found:', VIDEO_PATH);
        process.exit(1);
    }

    if (!EXTRACT_KEYFRAME_URL) {
        console.error('❌ EXTRACT_KEYFRAME_URL not configured in .env');
        process.exit(1);
    }

    console.log(`\n📹 Video: ${path.basename(VIDEO_PATH)}`);
    console.log(`📡 API URL: ${EXTRACT_KEYFRAME_URL}`);
    console.log(`\n⏳ Sending video to extraction service...`);
    console.log('   (This may take 1-3 minutes, please wait...)\n');

    try {
        const videoBuffer = fs.readFileSync(VIDEO_PATH);

        const formData = new FormData();
        const blob = new Blob([videoBuffer], { type: 'video/mp4' });
        formData.append('file', blob, 'video.mp4');

        const startTime = Date.now();

        const response = await fetch(EXTRACT_KEYFRAME_URL, {
            method: 'POST',
            body: formData
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
        console.log(`⏱️  Time taken: ${elapsed} seconds`);
        console.log(`📦 Content-Type: ${response.headers.get('content-type')}`);
        console.log(`📏 Content-Length: ${response.headers.get('content-length')} bytes`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('\n❌ Error response:', errorText);
            process.exit(1);
        }

        // Download ZIP file
        const zipBuffer = Buffer.from(await response.arrayBuffer());
        const outputPath = path.join(__dirname, 'test_keyframes.zip');
        fs.writeFileSync(outputPath, zipBuffer);

        console.log(`\n✅ ZIP file downloaded successfully!`);
        console.log(`   Saved to: ${outputPath}`);
        console.log(`   Size: ${zipBuffer.length} bytes`);

        // Try to extract and show contents
        try {
            const AdmZip = (await import('adm-zip')).default;
            const zip = new AdmZip(outputPath);
            const entries = zip.getEntries();

            console.log(`\n📂 ZIP Contents (${entries.length} files):`);
            entries.forEach(entry => {
                if (!entry.isDirectory) {
                    console.log(`   - ${entry.entryName} (${entry.header.size} bytes)`);
                }
            });

            // Extract to test folder
            const extractDir = path.join(__dirname, 'test_extracted');
            if (!fs.existsSync(extractDir)) {
                fs.mkdirSync(extractDir, { recursive: true });
            }
            zip.extractAllTo(extractDir, true);
            console.log(`\n✅ Extracted to: ${extractDir}`);

        } catch (zipError) {
            console.warn('\n⚠️  Could not extract ZIP:', zipError.message);
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ TEST PASSED');
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testKeyframeExtraction();
