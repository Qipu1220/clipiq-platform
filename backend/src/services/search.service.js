import { Mistral } from '@mistralai/mistralai';
import ApiError from '../utils/apiError.js';
import pool from '../config/database.js';
import qdrantClient from '../config/qdrant.js';
import esClient, { ELASTIC_OCR_INDEX } from '../config/elasticsearch.js';

const apiKey = process.env.MISTRAL_API_KEY;

let client;
if (apiKey) {
    client = new Mistral({ apiKey: apiKey });
} else {
    console.warn('MISTRAL_API_KEY is not set. Search classifier will not function correctly.');
}

/**
 * Classify search query using Mistral AI
 */
export async function classifyQuery(queryText) {
    if (!client) {
        throw new ApiError(500, 'Search configuration error: Mistral API key missing');
    }

    try {
        const prompt = `
    Analyze the following video search query and classify it into three categories:
    1. "title": Exact or partial keywords likely to appear in a video title.
    2. "semantic": Contextual or descriptive meaning for vector search.
    3. "ocr": Visible text that might appear inside the video (on screen).

    Query: "${queryText}"

    Return ONLY a JSON object with these keys. Do not add any markdown formatting or explanation. 
    Example format: {"title": "...", "semantic": "...", "ocr": "..."}
    If a category is not applicable, use an empty string.
    `;

        const result = await client.chat.complete({
            model: 'mistral-large-latest',
            messages: [
                { role: 'user', content: prompt }
            ],
            responseFormat: { type: 'json_object' }
        });

        const content = result.choices[0].message.content;

        try {
            const parsed = JSON.parse(content);
            return {
                title: parsed.title || '',
                semantic: parsed.semantic || '',
                ocr: parsed.ocr || ''
            };
        } catch (parseError) {
            console.error('Failed to parse Mistral response:', content);
            return { title: queryText, semantic: queryText, ocr: '' };
        }
    } catch (error) {
        console.error('Mistral API Error:', error);
        // Fallback on error
        return { title: queryText, semantic: queryText, ocr: '' };
    }
}

/**
 * Fetch embedding from external service
 */
async function getEmbedding(text) {
    const serviceUrl = process.env.EMBEDDING_SERVICE_URL;
    if (!serviceUrl) {
        console.warn('EMBEDDING_SERVICE_URL not set');
        return null;
    }

    try {
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            throw new Error(`Embedding service returned ${response.status}`);
        }

        const data = await response.json();
        const vector = data.vector || data.data?.[0]?.embedding;

        if (!vector || !Array.isArray(vector)) {
            throw new Error('Invalid vector format from embedding service');
        }

        return vector;
    } catch (error) {
        console.error('Embedding fetch failed:', error);
        return null;
    }
}

/**
 * Search by Title (PostgreSQL)
 */
async function searchByTitle(titleQuery) {
    if (!titleQuery) return [];

    const query = `
    SELECT id, title, description, thumbnail_url, 'title_match' as source
    FROM videos
    WHERE status = 'active' 
    AND title ILIKE $1
    LIMIT 10
  `;

    try {
        const result = await pool.query(query, [`%${titleQuery}%`]);
        return result.rows.map(row => ({
            ...row,
            score: 5.0 // High score for direct title match
        }));
    } catch (error) {
        console.error('Title search failed:', error);
        return [];
    }
}

/**
 * Search by Semantic (Qdrant)
 */
async function searchBySemantic(semanticQuery) {
    if (!semanticQuery) return [];

    try {
        // 1. Generate Embedding
        const vector = await getEmbedding(semanticQuery);

        if (!vector) {
            return [];
        }

        // 2. Search in Qdrant
        const searchResult = await qdrantClient.search('clipiq_vectors', {
            vector: vector,
            limit: 20,
            with_payload: true,
            params: {
                exact: false,
                hnsw_ef: 128
            }
        });

        return searchResult.map(item => ({
            id: item.payload?.video_id || item.id,
            title: item.payload?.title,
            score: item.score,
            source: 'semantic_match'
        }));
    } catch (error) {
        console.error('Semantic search failed:', error);
        return [];
    }
}

/**
 * Search by OCR (Elasticsearch)
 */
async function searchByOcr(ocrQuery) {
    if (!ocrQuery) return [];

    try {
        const result = await esClient.search({
            index: ELASTIC_OCR_INDEX,
            size: 20,
            query: {
                match: {
                    ocr_text: ocrQuery
                }
            }
        });

        return result.hits.hits.map(hit => ({
            id: hit._source.id,
            video_name: hit._source.video_name,
            text_match: hit._source.ocr_text,
            score: hit._score,
            source: 'ocr_match'
        }));
    } catch (error) {
        console.error('OCR search failed:', error);
        return [];
    }
}

/**
 * Perform Multimodal Search
 * Orchestrates the classifier and parallel search execution
 */
export async function performMultimodalSearch(queryText) {
    // 1. Classify
    const classification = await classifyQuery(queryText);

    console.log('Use Classification:', classification);

    // 2. Parallel, Independent Searches
    const searchPromises = [];

    if (classification.title) {
        searchPromises.push(searchByTitle(classification.title));
    }
    if (classification.semantic) {
        searchPromises.push(searchBySemantic(classification.semantic));
    }
    if (classification.ocr) {
        searchPromises.push(searchByOcr(classification.ocr));
    }

    const results = await Promise.all(searchPromises);

    // 3. Fusion: Normalize, Weight, Boost
    const allResults = results.flat();

    // --- Step 3a: Separate by source and find max score for normalization ---
    const titleResults = allResults.filter(r => r.source === 'title_match');
    const semanticResults = allResults.filter(r => r.source === 'semantic_match');
    const ocrResults = allResults.filter(r => r.source === 'ocr_match');

    const maxTitleScore = titleResults.length > 0 ? Math.max(...titleResults.map(r => r.score || 0)) : 1;
    const maxSemanticScore = semanticResults.length > 0 ? Math.max(...semanticResults.map(r => r.score || 0)) : 1;
    const maxOcrScore = ocrResults.length > 0 ? Math.max(...ocrResults.map(r => r.score || 0)) : 1;

    // --- Step 3b: Configure Weights ---
    const WEIGHT_TITLE = 0.5;
    const WEIGHT_SEMANTIC = 0.3;
    const WEIGHT_OCR = 0.2;
    const BOOST_MULTI_SOURCE = 1.2;

    // --- Step 3c: Aggregate scores by video ID ---
    // Key observation: 'title_match' uses video id, 'semantic_match' uses video_id, 'ocr_match' uses video_name
    // We need to group by video. For title/semantic, the id is the video id.
    // For OCR, the "video_name" is the key. The id is a frame id like "pixabay-296958-medium_390".

    // videoMap: key = video identifier, value = { data, sources: Set, contributions: Map<source, scores[]> }
    const videoMap = new Map();

    for (const item of allResults) {
        // Determine the "video key" for grouping
        const videoKey = item.id;

        if (!videoKey) continue;

        if (!videoMap.has(videoKey)) {
            videoMap.set(videoKey, {
                data: { ...item, original_id: item.id }, // Keep original data
                sources: new Set(),
                contributions: new Map() // source -> [normalized_scores]
            });
        }

        const entry = videoMap.get(videoKey);
        entry.sources.add(item.source);

        // Merge data preferring non-null values
        if (!entry.data.title && item.title) entry.data.title = item.title;
        if (!entry.data.description && item.description) entry.data.description = item.description;
        if (!entry.data.thumbnail_url && item.thumbnail_url) entry.data.thumbnail_url = item.thumbnail_url;
        if (!entry.data.video_name && item.video_name) entry.data.video_name = item.video_name;

        // Calculate normalized score and add to contributions
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

    // --- Step 3d: Calculate final fused score for each video ---
    const fusedResults = [];

    for (const [videoKey, entry] of videoMap.entries()) {
        let baseScore = 0;
        const sourcesList = [];

        // Get the best normalized score from each source and apply weight
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

        // Apply boost if multi-source
        const finalScore = entry.sources.size >= 2 ? baseScore * BOOST_MULTI_SOURCE : baseScore;

        fusedResults.push({
            ...entry.data,
            score: parseFloat(finalScore.toFixed(6))
        });
    }

    // Sort by fused score (descending)
    const sortedResults = fusedResults.sort((a, b) => b.score - a.score);

    console.log('Search Results:', sortedResults.map(r => ({
        id: r.id,
        title: r.title,
        score: r.score,
        sources: Array.from(videoMap.get(r.id)?.sources || [])
    })));

    return {
        classification,
        results: sortedResults
    };
}

export default {
    classifyQuery,
    performMultimodalSearch
};
