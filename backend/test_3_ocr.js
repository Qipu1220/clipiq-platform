/**
 * Test OCR Service
 * Tests a single image
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OCR_KEYFRAME_URL = process.env.OCR_KEYFRAME_URL;

async function testOCR() {
    console.log('\n🧪 TEST: OCR Service');
    console.log('='.repeat(50));

    if (!OCR_KEYFRAME_URL) {
        console.error('❌ OCR_KEYFRAME_URL not configured in .env');
        process.exit(1);
    }

    // Check if test_extracted folder has images
    const extractedDir = path.join(__dirname, 'test_extracted');
    if (!fs.existsSync(extractedDir)) {
        console.error('❌ test_extracted folder not found');
        console.log('   Run test_1_keyframe.js first to extract keyframes');
        process.exit(1);
    }

    // Find first image
    const files = fs.readdirSync(extractedDir);
    const imageFile = files.find(f => f.match(/\.(jpg|jpeg|png|webp)$/i));

    if (!imageFile) {
        console.error('❌ No image files found in test_extracted/');
        process.exit(1);
    }

    const imagePath = path.join(extractedDir, imageFile);
    console.log(`\n🖼️  Test image: ${imageFile}`);
    console.log(`📡 API URL: ${OCR_KEYFRAME_URL}`);
    console.log(`\n⏳ Sending image for OCR...\n`);

    try {
        const imageBuffer = fs.readFileSync(imagePath);

        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('file', blob, imageFile);

        const startTime = Date.now();

        const response = await fetch(OCR_KEYFRAME_URL, {
            method: 'POST',
            body: formData
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
        console.log(`⏱️  Time taken: ${elapsed} seconds`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('\n❌ Error response:', errorText);
            process.exit(1);
        }

        const result = await response.json();

        console.log(`\n✅ OCR successful!`);
        console.log(`   Filename: ${result.filename}`);
        console.log(`   Text length: ${result.text.length} characters`);
        if (result.text.length > 0) {
            console.log(`   Extracted text: "${result.text}"`);
        } else {
            console.log(`   No text found in image`);
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

testOCR();
