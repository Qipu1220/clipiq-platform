import { Client } from '@elastic/elasticsearch';
import 'dotenv/config';
import fs from 'fs';

// Load config from environment
const ES_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const ES_INDEX = process.env.ELASTIC_OCR_INDEX || 'clipiq_ocr';
const LOG_FILE = 'test_result.txt';

// clear log file
fs.writeFileSync(LOG_FILE, '');

function log(msg) {
    if (typeof msg === 'object') msg = JSON.stringify(msg, null, 2);
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

log('--- Testing Elasticsearch OCR Search ---');
log(`URL: ${ES_URL}`);
log(`Index: ${ES_INDEX}`);

const client = new Client({
    node: ES_URL,
    auth: {
        username: process.env.ELASTIC_USERNAME || '',
        password: process.env.ELASTIC_PASSWORD || ''
    },
    tls: { rejectUnauthorized: false }
});

async function test() {
    try {
        // 1. Ping
        log('\n1. Checking Connection...');
        const ping = await client.ping();
        log(`Connection result: ${ping}`);

        if (!ping) {
            log('❌ Ping failed. Is Elasticsearch running?');
            return;
        }

        // 2. Check Index Information
        log('\n2. Retrieving Index Info...');
        const indexExists = await client.indices.exists({ index: ES_INDEX });
        if (!indexExists) {
            log(`❌ Index '${ES_INDEX}' does NOT exist.`);
            return;
        }
        log(`✅ Index '${ES_INDEX}' exists.`);

        // 3. Simple Search
        log('\n3. Performing Test Search...');
        // Search for * something * (wildcard) or just match_all
        const result = await client.search({
            index: ES_INDEX,
            query: {
                match_all: {}
            },
            size: 5
        });

        // safely access hits
        const total = result.hits?.total?.value || 0;
        log(`✅ Search successful! Found ${total} documents.`);

        const hits = result.hits?.hits || [];
        if (hits.length > 0) {
            log('Sample documents:');
            hits.forEach(hit => {
                log(`- [${hit._id}] Score: ${hit._score}`);
                const content = hit._source.content || '';
                log(`  Content: ${content.substring(0, 100)}...`);
            });
        } else {
            log('⚠️ No documents found in index.');
        }

    } catch (error) {
        log(`❌ Test failed: ${error.message}`);
        if (error.meta) {
            log(`Meta: ${JSON.stringify(error.meta, null, 2)}`);
        }
    }
}

test();
