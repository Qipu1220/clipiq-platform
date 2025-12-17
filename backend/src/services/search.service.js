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

    // 3. Fusion (Simple concatenation for now, distinct by ID)
    // In a real system, you'd use a re-ranker here
    const allResults = results.flat();

    // Deduplicate and Merge by ID
    const mergedResults = new Map();

    for (const item of allResults) {
        if (!item.id) continue;

        if (mergedResults.has(item.id)) {
            // Merge matching items
            const existing = mergedResults.get(item.id);

            // Keep highest score
            existing.score = Math.max(existing.score || 0, item.score || 0);

            // Append unique sources
            if (!existing.source.includes(item.source)) {
                existing.source += `, ${item.source}`;
            }

            // Should probably prefer the one with video_name if missing
            if (!existing.video_name && item.video_name) {
                existing.video_name = item.video_name;
            }
        } else {
            mergedResults.set(item.id, { ...item });
        }
    }

    const uniqueResults = Array.from(mergedResults.values());

    // Sort by score (descending)
    const sortedResults = uniqueResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
        classification,
        results: sortedResults
    };
}

export default {
    classifyQuery,
    performMultimodalSearch
};
