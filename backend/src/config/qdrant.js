import { QdrantClient } from '@qdrant/js-client-rest';

// Initialize Qdrant client
// Ensure Qdrant is running on port 6333
const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333'
});

export default qdrantClient;
