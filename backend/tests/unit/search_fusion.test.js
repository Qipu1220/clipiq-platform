import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../src/config/database.js', () => ({
    default: { query: jest.fn() }
}));
jest.unstable_mockModule('../../src/config/qdrant.js', () => ({
    default: { search: jest.fn() }
}));
jest.unstable_mockModule('../../src/config/elasticsearch.js', () => ({
    default: { search: jest.fn() },
    ELASTIC_OCR_INDEX: 'test_index'
}));

// Mock Mistral to control classification
const mockChatComplete = jest.fn();
jest.unstable_mockModule('@mistralai/mistralai', () => ({
    Mistral: class {
        chat = { complete: mockChatComplete };
    }
}));

// Set Env vars BEFORE import
process.env.MISTRAL_API_KEY = "mock-key";
process.env.EMBEDDING_SERVICE_URL = "http://mock-embedding";

// Import module under test
const { performMultimodalSearch } = await import('../../src/services/search.service.js');
const esClient = (await import('../../src/config/elasticsearch.js')).default;
const qdrantClient = (await import('../../src/config/qdrant.js')).default;

describe('Search Fusion Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should merge OCR results using UUID (id) instead of video_name', async () => {
        const queryText = "test video";
        const videoUUID = "b5a93d80-5a93-4d80-5a93-4d805a93d805";
        const videoName = "video_123.mp4";

        // 1. Mock Classification -> forcing all search types
        mockChatComplete.mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        title: "",
                        semantic: "test video",
                        ocr: "test text"
                    })
                }
            }]
        });

        // 2. Mock Qdrant (Semantic) - Returns the UUID
        qdrantClient.search.mockResolvedValue([
            {
                id: videoUUID,
                payload: { title: "Semantic Match Title" },
                score: 0.9
            }
        ]);

        // 3. Mock Elastic (OCR) - Returns UUID and video_name
        // IMPORTANT: This data simulates what the real ES returns
        esClient.search.mockResolvedValue({
            hits: {
                hits: [
                    {
                        _source: {
                            id: videoUUID, // The UUID
                            video_name: videoName, // The filename
                            ocr_text: "Found inside video"
                        },
                        _score: 0.8
                    }
                ]
            }
        });

        // 4. Mock Embedding (required for semantic search)
        // We need to mock global fetch for getEmbedding
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ vector: [0.1, 0.2, 0.3] })
            })
        );
        process.env.EMBEDDING_SERVICE_URL = "http://mock-embedding";
        process.env.MISTRAL_API_KEY = "mock-key";

        // Act
        const result = await performMultimodalSearch(queryText);

        // Assert
        console.log("Fusion Results:", result.results);

        // Expected: 1 single merged result, not 2 split results
        expect(result.results.length).toBe(1);
        expect(result.results[0].id).toBe(videoUUID);

        // Verify source boosting (multi-source should be boosted)
        // If it was split, we would have 2 results with lower scores
    });
});
