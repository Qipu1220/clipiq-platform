import { QdrantClient } from '@qdrant/js-client-rest';
import 'dotenv/config';

// NOTE: When running locally, localhost:6333 works if ports are mapped
// When running in docker, need http://qdrant:6333
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const EMBEDDING_URL = process.env.EMBEDDING_SERVICE_URL || "https://caulomic-spinningly-isaiah.ngrok-free.dev/search";

console.log('Testing Semantic Search Flow...');
console.log('1. Embedding URL:', EMBEDDING_URL);
console.log('2. Qdrant URL:', QDRANT_URL);

async function test() {
    // 1. Get Embedding
    console.log('\n--- Step 1: Generate Embedding ---');
    const query = "a dog playing in the park";
    try {
        const response = await fetch(EMBEDDING_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: query })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

        const data = await response.json();
        // Support both user format examples just in case
        const vector = data.vector || data.data?.[0]?.embedding;

        if (vector) {
            console.log('✅ Embedding generated successfully!');
            console.log('Vector dimension:', vector.length);
            console.log('First 5 dims:', vector.slice(0, 5));
        } else {
            console.error('❌ Failed to extract vector from response:', JSON.stringify(data, null, 2));
            return;
        }

        // 2. Search Qdrant
        console.log('\n--- Step 2: Search Qdrant ---');
        const client = new QdrantClient({ url: QDRANT_URL });

        // List collections first to verify connection
        const collections = await client.getCollections();
        console.log('Available collections:', collections.collections.map(c => c.name));

        try {
            const results = await client.search('clipiq_vectors', {
                vector: vector,
                limit: 5,
                with_payload: true
            });

            console.log('✅ Qdrant search successful!');
            console.log(`Found ${results.length} results.`);
            results.forEach(r => {
                console.log(`- [Score: ${r.score.toFixed(4)}] ${r.payload?.title || 'No Title'} (ID: ${r.id})`);
            });
        } catch (err) {
            console.error('❌ Qdrant search failed:', err.message);
            if (err.message.includes('404')) {
                console.log('⚠️ Suggestion: Collection "videos" might not exist yet. Ensure seed ran.');
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

test();
