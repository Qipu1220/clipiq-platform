
import { Client } from '@elastic/elasticsearch';
import { QdrantClient } from '@qdrant/js-client-rest';
import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';

const { Pool } = pg;

// Config
const LOG_FILE = 'test_all_results.txt';
const ES_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const ES_INDEX = process.env.ELASTIC_OCR_INDEX || 'clipiq_ocr';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const EMBEDDING_URL = process.env.EMBEDDING_SERVICE_URL;

// Clear log
fs.writeFileSync(LOG_FILE, '');

function log(msg) {
    if (typeof msg === 'object') msg = JSON.stringify(msg, null, 2);
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function testTitleSearch() {
    log('\n=== 1. Testing Title Search (PostgreSQL) ===');
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // Test connection
        const client = await pool.connect();
        log('✅ Database connected');

        // Use a generic term likely to exist
        const term = '%video%';
        const query = `
            SELECT id, title, description 
            FROM videos 
            WHERE title ILIKE $1 OR description ILIKE $1 
            LIMIT 5`;

        const res = await client.query(query, [term]);
        client.release();

        log(`✅ Title search successful. Found ${res.rowCount} matches for term 'video'.`);
        res.rows.forEach(r => log(`- ${r.title} (${r.id})`));
        return true;
    } catch (err) {
        log(`❌ Title search failed: ${err.message}`);
        return false;
    } finally {
        await pool.end();
    }
}

async function testSemanticSearch() {
    log('\n=== 2. Testing Semantic Search (Qdrant) ===');
    try {
        // 1. Embedding
        if (!EMBEDDING_URL) {
            throw new Error("EMBEDDING_SERVICE_URL not set");
        }

        log(`Fetching embedding from ${EMBEDDING_URL}...`);
        const query = "nature landscape";
        const response = await fetch(EMBEDDING_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: query })
        });

        if (!response.ok) throw new Error(`Embedding API Error: ${response.status}`);
        const data = await response.json();
        const vector = data.vector || data.data?.[0]?.embedding;

        if (!vector) throw new Error("No vector returned");
        log('✅ Embedding generated');

        // 2. Search
        const client = new QdrantClient({ url: QDRANT_URL });
        const result = await client.search('clipiq_vectors', {
            vector: vector,
            limit: 3,
            with_payload: true
        });

        log(`✅ Semantic search successful. Found ${result.length} matches.`);
        result.forEach(r => log(`- [${r.score.toFixed(2)}] ${r.payload?.title || 'No Title'}`));
        return true;
    } catch (err) {
        log(`❌ Semantic search failed: ${err.message}`);
        return false;
    }
}

async function testOcrSearch() {
    log('\n=== 3. Testing OCR Search (Elasticsearch) ===');
    const client = new Client({
        node: ES_URL,
        auth: {
            username: process.env.ELASTIC_USERNAME || '',
            password: process.env.ELASTIC_PASSWORD || ''
        },
        tls: { rejectUnauthorized: false }
    });

    try {
        const ping = await client.ping();
        if (!ping) throw new Error("Ping failed");

        const result = await client.search({
            index: ES_INDEX,
            query: { match_all: {} }, // Match all to ensure index has data
            size: 3
        });

        const total = result.hits.total.value;
        log(`✅ OCR search successful. Index '${ES_INDEX}' has ${total} documents.`);
        return true;
    } catch (err) {
        log(`❌ OCR search failed: ${err.message}`);
        return false;
    }
}

async function runAll() {
    log(`Starting Full Validation...`);
    await testTitleSearch();
    await testSemanticSearch();
    await testOcrSearch();
    log('\n✅ Validation Complete');
}

runAll();
