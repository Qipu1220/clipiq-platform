import json
import os
import sys

# Try to import elasticsearch, warn if missing
try:
    from elasticsearch import Elasticsearch, helpers
except ImportError:
    print("Error: 'elasticsearch' module not found. Please run: pip install elasticsearch")
    sys.exit(1)

# Configuration
ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
INDEX_NAME = "clipiq_ocr"
# Path to ocr_es.json relative to this script
DATA_FILE = os.path.join(os.path.dirname(__file__), "sample-sparse", "ocr_es.json")

def index_data():
    print(f"Connecting to Elasticsearch at {ES_HOST}...")
    es = Elasticsearch(ES_HOST)
    
    if not es.ping():
        print("Error: Could not connect to Elasticsearch. Is it running?")
        sys.exit(1)

    if not os.path.exists(DATA_FILE):
        print(f"Error: Data file not found at {DATA_FILE}")
        sys.exit(1)

    print(f"Reading data from {DATA_FILE}...")
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Create index if it doesn't exist
    if not es.indices.exists(index=INDEX_NAME):
        print(f"Creating index '{INDEX_NAME}'...")
        # Optional: Define mappings here if needed, but dynamic mapping works for simple use cases
        es.indices.create(index=INDEX_NAME)
    else:
        print(f"Index '{INDEX_NAME}' already exists.")

    print(f"Indexing {len(data)} documents...")
    
    # Prepare actions for bulk indexing
    actions = []
    for item in data:
        action = {
            "_index": INDEX_NAME,
            "_id": item["id"],
            "_source": item
        }
        actions.append(action)

    # Bulk index
    try:
        success, failed = helpers.bulk(es, actions, stats_only=True)
        print(f"Successfully indexed {success} documents.")
        if failed:
            print(f"Failed to index {failed} documents.")
    except Exception as e:
        print(f"Error during bulk indexing: {e}")

if __name__ == "__main__":
    index_data()
