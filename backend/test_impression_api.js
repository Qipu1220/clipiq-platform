/**
 * Test Impression API Endpoints
 * 
 * Tests the impression logging and watch event endpoints
 */

import 'dotenv/config';
import crypto from 'node:crypto';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';

// Test credentials (use existing test user)
const TEST_USER = {
    login: 'user001',
    password: 'User@123456'
};

let authToken = null;
let userId = null;
let videoId = null;
let sessionId = crypto.randomUUID();
let impressionId = null;

/**
 * Login to get auth token
 */
async function login() {
    console.log('\n📝 Step 1: Login...');

    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    
    authToken = data.data.tokens.accessToken;
    userId = data.data.user.id;

    console.log(`✅ Logged in as: ${data.data.user.username} (${userId})`);
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
}

/**
 * Get a random active video
 */
async function getRandomVideo() {
    console.log('\n📝 Step 2: Get random video...');

    const response = await fetch(`${API_BASE}/videos?limit=1`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
        throw new Error(`Get videos failed: ${response.status}`);
    }

    const data = await response.json();

    // Handle both possible response structures
    const videos = data.videos || data.data?.videos || data.data;
    
    if (!videos || videos.length === 0) {
        throw new Error('No videos found');
    }

    videoId = videos[0].id;
    console.log(`✅ Got video: ${videos[0].title} (${videoId})`);
}

/**
 * Test POST /impressions
 */
async function testLogImpression() {
    console.log('\n📝 Step 3: Log impression...');

    const impressionData = {
        user_id: userId,
        video_id: videoId,
        session_id: sessionId,
        position: 0,
        source: 'personal',
        model_version: 'v0'
    };

    const response = await fetch(`${API_BASE}/impressions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(impressionData)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Log impression failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    impressionId = data.impression_id;

    console.log(`✅ Impression logged: ${impressionId}`);
    console.log(`   Data:`, JSON.stringify(data.data, null, 2));
}

/**
 * Test POST /watch
 */
async function testLogWatch() {
    console.log('\n📝 Step 4: Log watch event...');

    const watchData = {
        impression_id: impressionId,
        user_id: userId,
        video_id: videoId,
        watch_duration: 15,
        completed: false
    };

    const response = await fetch(`${API_BASE}/impressions/watch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(watchData)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Log watch failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    console.log(`✅ Watch event logged`);
    console.log(`   Data:`, JSON.stringify(data.data, null, 2));
}

/**
 * Test GET /impressions/history
 */
async function testGetHistory() {
    console.log('\n📝 Step 5: Get impression history...');

    const response = await fetch(`${API_BASE}/impressions/history?limit=5`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Get history failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    console.log(`✅ Got ${data.count} impressions`);

    if (data.data.length > 0) {
        console.log(`   Latest impression:`);
        console.log(`   - Video: ${data.data[0].title}`);
        console.log(`   - Source: ${data.data[0].source}`);
        console.log(`   - Watch duration: ${data.data[0].watch_duration || 'N/A'}s`);
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🧪 Testing Impression API Endpoints');
    console.log('='.repeat(50));

    try {
        await login();
        await getRandomVideo();
        await testLogImpression();
        await testLogWatch();
        await testGetHistory();

        console.log('\n' + '='.repeat(50));
        console.log('✅ All tests passed! 🎉');
        console.log('='.repeat(50));
    } catch (error) {
        console.error('\n' + '='.repeat(50));
        console.error('❌ Test failed:', error.message);
        console.error('='.repeat(50));
        process.exit(1);
    }
}

// Run tests
runTests();
