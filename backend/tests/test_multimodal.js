
import 'dotenv/config';
import { performMultimodalSearch } from '../src/services/search.service.js';

async function test() {
    console.log('Testing performMultimodalSearch...');
    const query = "running dog";

    try {
        const result = await performMultimodalSearch(query);
        console.log('Classification:', result.classification);
        console.log(`Found ${result.results.length} unique videos.`);
        result.results.forEach(v => console.log(`- ${v.title} (${v.source})`));
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
