import os
import glob
import sys
import json
import uuid

# Try to import dependencies
try:
    import numpy as np
    from qdrant_client import QdrantClient
    from qdrant_client.http import models
except ImportError:
    print("Error: Missing dependencies. Please run: pip install qdrant-client numpy")
    sys.exit(1)

# Configuration
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
COLLECTION_NAME = "clipiq_vectors"
VECTOR_SIZE = 1024
DATA_DIR = os.path.join(os.path.dirname(__file__), "sample-dense")

def index_data():
    print(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

    # Check connection
    try:
        client.get_collections()
    except Exception as e:
        print(f"Error: Could not connect to Qdrant. Is it running? ({e})")
        sys.exit(1)

    # Re-create collection
    if client.collection_exists(collection_name=COLLECTION_NAME):
        print(f"Collection '{COLLECTION_NAME}' exists. Checking config...")
        # In a real scenario, we might want to keep it or delete it. 
        # For seeding, let's assume we append or update.
    else:
        print(f"Creating collection '{COLLECTION_NAME}'...")
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        )

    # Find .npz files
    npz_files = glob.glob(os.path.join(DATA_DIR, "*.npz"))
    if not npz_files:
        print(f"No .npz files found in {DATA_DIR}")
        return

    print(f"Found {len(npz_files)} .npz files to index.")
    
    total_points = 0
    
    for npz_file in npz_files:
        try:
            data = np.load(npz_file, allow_pickle=True)
            
            if 'vectors' not in data or 'ids' not in data:
                print(f"Skipping {os.path.basename(npz_file)}: missing 'vectors' or 'ids'")
                continue

            vectors = data['vectors']
            ids = data['ids']
            payloads = data['payloads'] if 'payloads' in data else []

            points_batch = []
            for i in range(len(vectors)):
                # Handle ID
                pid = ids[i]
                if isinstance(pid, (np.integer, int)):
                    point_id = int(pid)
                else:
                    # Qdrant requires int or UUID. Convert string to UUID.
                    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(pid)))

                # Handle Vector
                vector = vectors[i].tolist()

                # Handle Payload
                payload = {}
                if len(payloads) > i:
                    raw_payload = payloads[i]
                    # Attempt to decode if bytes, or use as is if dict
                    if isinstance(raw_payload, (bytes, np.bytes_)):
                        try:
                            payload = json.loads(raw_payload.decode('utf-8'))
                        except:
                            payload = {"raw_data": str(raw_payload)}
                    elif isinstance(raw_payload, dict):
                        payload = raw_payload
                    elif isinstance(raw_payload, str):
                        try:
                            payload = json.loads(raw_payload)
                        except:
                             payload = {"raw_data": raw_payload}
                    else:
                        # Fallback
                        payload = {"data": str(raw_payload)}

                # Add video_name to payload from filename helpers if not present
                if "video_name" not in payload:
                    payload["video_name"] = os.path.basename(npz_file).replace(".npz", "")

                points_batch.append(models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload
                ))

            if points_batch:
                client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=points_batch
                )
                total_points += len(points_batch)
                print(f"Indexed {len(points_batch)} points from {os.path.basename(npz_file)}")

        except Exception as e:
            print(f"Error processing {os.path.basename(npz_file)}: {e}")

    print(f"Finished. Total points indexed: {total_points}")

if __name__ == "__main__":
    index_data()
