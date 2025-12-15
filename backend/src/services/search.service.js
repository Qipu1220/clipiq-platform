import { Mistral } from '@mistralai/mistralai';
import ApiError from '../utils/apiError.js';

const apiKey = process.env.MISTRAL_API_KEY;

let client;
if (apiKey) {
    client = new Mistral({ apiKey: apiKey });
} else {
    console.warn('MISTRAL_API_KEY is not set. Search classifier will not function correctly.');
}

/**
 * Classify search query using Mistral AI
 * Determines if query is searching by title, semantic content, or OCR text
 * 
 * @param {string} queryText - User's search query
 * @returns {Promise<{title: string, semantic: string, ocr: string}>} Classified query components
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
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            responseFormat: { type: 'json_object' }
        });

        const content = result.choices[0].message.content;

        // Parse JSON response
        try {
            const parsed = JSON.parse(content);
            return {
                title: parsed.title || '',
                semantic: parsed.semantic || '',
                ocr: parsed.ocr || ''
            };
        } catch (parseError) {
            console.error('Failed to parse Mistral response:', content);
            // Fallback: treat entire query as simple title search
            return {
                title: queryText,
                semantic: queryText,
                ocr: ''
            };
        }
    } catch (error) {
        console.error('Mistral API Error:', error);
        throw new ApiError(503, 'Search service temporarily unavailable');
    }
}

export default {
    classifyQuery
};
