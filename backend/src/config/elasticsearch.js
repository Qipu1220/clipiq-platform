import { Client } from '@elastic/elasticsearch';

// Initialize Elasticsearch client
// Ensure Elasticsearch is running on port 9200
const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    auth: {
        username: process.env.ELASTIC_USERNAME || '',
        password: process.env.ELASTIC_PASSWORD || ''
    },
    tls: {
        rejectUnauthorized: false // Development only
    }
});

// Index names
export const ELASTIC_OCR_INDEX = process.env.ELASTIC_OCR_INDEX || 'clipiq_ocr';

export default esClient;
