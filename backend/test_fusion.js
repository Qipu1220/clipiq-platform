// Test script to verify the fusion logic with the user's example data.
// Run with: node test_fusion.js

// Sample response data provided by the user
const mockResults = [
    // Title match
    { id: "703bb08d-5811-4619-80e7-0939088562fd", title: "React Hooks Tutorial", source: "title_match", score: 5 },
    // OCR matches
    { id: "pixabay-296958-medium_390", video_name: "pixabay-296958-medium", source: "ocr_match", score: 2.492326 },
    { id: "pixabay-296958-medium_702", video_name: "pixabay-296958-medium", source: "ocr_match", score: 2.492326 },
    { id: "pixabay-315357-medium_0", video_name: "pixabay-315357-medium", source: "ocr_match", score: 2.492326 },
    { id: "pixabay-315357-medium_78", video_name: "pixabay-315357-medium", source: "ocr_match", score: 2.492326 },
    { id: "pixabay-315357-medium_156", video_name: "pixabay-315357-medium", source: "ocr_match", score: 2.492326 },
    { id: "pixabay-91562-medium_468", video_name: "pixabay-91562-medium", source: "ocr_match", score: 2.492326 },
    // Semantic matches
    { id: "27de0da6-942f-500d-9d40-8bb120759e9b", source: "semantic_match", score: 0.25288072 },
    { id: "2e585f54-b2ee-5738-8381-d755409cd91e", source: "semantic_match", score: 0.25108448 },
    { id: "4e785c42-57d8-58fc-942b-e21e56a63e72", source: "semantic_match", score: 0.24862999 },
    { id: "f2b87f6a-835f-5940-bab6-c7d6923374e0", source: "semantic_match", score: 0.24705598 },
    { id: "403932cb-6401-5767-8267-f5ef0bcf1760", source: "semantic_match", score: 0.24617702 },
    { id: "d9d630f2-8db2-5983-b9d3-628f6a0aeab1", source: "semantic_match", score: 0.2458545 },
    { id: "f5a49d7a-1374-56a6-bc72-2d4dda866510", source: "semantic_match", score: 0.24394327 },
    { id: "8124dd91-94ae-5d49-b0d5-7ac6cedfbd90", source: "semantic_match", score: 0.24056754 },
    { id: "d716de83-6b42-5bec-a2ab-f9be25db3123", source: "semantic_match", score: 0.23983276 },
    { id: "73a0c16f-77db-5744-bea0-eeb3cce32950", source: "semantic_match", score: 0.23953122 },
    { id: "26810ca2-412d-5e6d-92e7-5e0b300a43b1", source: "semantic_match", score: 0.23211846 },
    { id: "9513f1b2-da9d-5faa-9968-ed88674fa9a0", source: "semantic_match", score: 0.23073716 },
    { id: "3c170bbf-7502-5922-9bba-1895d07daba4", source: "semantic_match", score: 0.22920032 },
    { id: "e173a0fa-9fb5-5471-bdb6-69c48ab977e5", source: "semantic_match", score: 0.226927 },
    { id: "f3108691-b06f-5876-935e-75205232e2da", source: "semantic_match", score: 0.22436148 },
    { id: "caa78f02-a164-58b8-8e3c-4feffa79a2ff", source: "semantic_match", score: 0.22171246 },
    { id: "875af93f-d3ec-56b7-83ac-4b977369ffa7", source: "semantic_match", score: 0.21780862 },
    { id: "76a193eb-4a07-5b11-a5a9-30a8f0819d1c", source: "semantic_match", score: 0.21724075 },
    { id: "64bdf496-6ad3-5d71-bcf2-18dfba53257c", source: "semantic_match", score: 0.21669498 },
    { id: "a0f64d03-2bcd-549b-a80b-90ec924c7cac", source: "semantic_match", score: 0.21589762 },
    { id: "pixabay-29881-medium_162", video_name: "pixabay-29881-medium", source: "ocr_match", score: 0.14256263 },
];

// --- Fusion Logic (copied from search.service.js) ---
function fuseResults(allResults) {
    const titleResults = allResults.filter(r => r.source === 'title_match');
    const semanticResults = allResults.filter(r => r.source === 'semantic_match');
    const ocrResults = allResults.filter(r => r.source === 'ocr_match');

    const maxTitleScore = titleResults.length > 0 ? Math.max(...titleResults.map(r => r.score || 0)) : 1;
    const maxSemanticScore = semanticResults.length > 0 ? Math.max(...semanticResults.map(r => r.score || 0)) : 1;
    const maxOcrScore = ocrResults.length > 0 ? Math.max(...ocrResults.map(r => r.score || 0)) : 1;

    console.log('--- Normalization Parameters ---');
    console.log('Max Title Score:', maxTitleScore);
    console.log('Max Semantic Score:', maxSemanticScore);
    console.log('Max OCR Score:', maxOcrScore);

    const WEIGHT_TITLE = 0.5;
    const WEIGHT_SEMANTIC = 0.3;
    const WEIGHT_OCR = 0.2;
    const BOOST_MULTI_SOURCE = 1.2;

    const videoMap = new Map();

    for (const item of allResults) {
        let videoKey = null;
        if (item.source === 'ocr_match') {
            videoKey = item.video_name;
        } else {
            videoKey = item.id;
        }

        if (!videoKey) continue;

        if (!videoMap.has(videoKey)) {
            videoMap.set(videoKey, {
                data: { ...item, original_id: item.id },
                sources: new Set(),
                contributions: new Map()
            });
        }

        const entry = videoMap.get(videoKey);
        entry.sources.add(item.source);

        if (!entry.data.title && item.title) entry.data.title = item.title;
        if (!entry.data.video_name && item.video_name) entry.data.video_name = item.video_name;

        let normalizedScore = 0;
        if (item.source === 'title_match') {
            normalizedScore = (item.score || 0) / maxTitleScore;
        } else if (item.source === 'semantic_match') {
            normalizedScore = (item.score || 0) / maxSemanticScore;
        } else if (item.source === 'ocr_match') {
            normalizedScore = (item.score || 0) / maxOcrScore;
        }

        if (!entry.contributions.has(item.source)) {
            entry.contributions.set(item.source, []);
        }
        entry.contributions.get(item.source).push(normalizedScore);
    }

    const fusedResults = [];

    for (const [videoKey, entry] of videoMap.entries()) {
        let baseScore = 0;
        const sourcesList = [];

        if (entry.contributions.has('title_match')) {
            const scores = entry.contributions.get('title_match');
            const bestNorm = Math.max(...scores);
            baseScore += bestNorm * WEIGHT_TITLE;
            sourcesList.push('title_match');
        }
        if (entry.contributions.has('semantic_match')) {
            const scores = entry.contributions.get('semantic_match');
            const bestNorm = Math.max(...scores);
            baseScore += bestNorm * WEIGHT_SEMANTIC;
            sourcesList.push('semantic_match');
        }
        if (entry.contributions.has('ocr_match')) {
            const scores = entry.contributions.get('ocr_match');
            const bestNorm = Math.max(...scores);
            baseScore += bestNorm * WEIGHT_OCR;
            sourcesList.push('ocr_match');
        }

        const finalScore = entry.sources.size >= 2 ? baseScore * BOOST_MULTI_SOURCE : baseScore;

        fusedResults.push({
            id: entry.data.id,
            title: entry.data.title,
            video_name: entry.data.video_name,
            source: sourcesList.join(', '),
            score: parseFloat(finalScore.toFixed(6))
        });
    }

    return fusedResults.sort((a, b) => b.score - a.score);
}

// --- Run the test ---
console.log('\\n--- Input Results (Sample) ---');
console.log(JSON.stringify(mockResults.slice(0, 5), null, 2) + '...');

const fusedResults = fuseResults(mockResults);

console.log('\\n--- Fused and Sorted Results ---');
fusedResults.forEach((r, i) => {
    console.log(`${i + 1}. [${r.source}] ID: ${r.id || r.video_name}, Score: ${r.score}`);
});
