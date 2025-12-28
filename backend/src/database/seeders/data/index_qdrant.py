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

# Keep old collection (frame-level)
COLLECTION_NAME = "clipiq_vectors"

# New collection (video-level)
VIDEO_COLLECTION_NAME = "videos"

VECTOR_SIZE = 1024
DATA_DIR = os.path.join(os.path.dirname(__file__), "sample-dense")


# -------------------- POOLING UTILS --------------------
def l2_normalize(v: np.ndarray, axis=None, eps: float = 1e-12) -> np.ndarray:
    """L2 normalize numpy array along axis."""
    norm = np.linalg.norm(v, axis=axis, keepdims=True)
    return v / (norm + eps)

def mean_pool(vectors: np.ndarray) -> np.ndarray:
    """Mean pool over first axis. vectors shape (N, D) -> (D,)"""
    return vectors.mean(axis=0)


def index_data():
    print(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

    # Check connection
    try:
        client.get_collections()
    except Exception as e:
        print(f"Error: Could not connect to Qdrant. Is it running? ({e})")
        sys.exit(1)

    # -------------------- FRAME COLLECTION (KEEP OLD) --------------------
    if client.collection_exists(collection_name=COLLECTION_NAME):
        print(f"Collection '{COLLECTION_NAME}' exists. Keeping as-is (frame-level).")
    else:
        print(f"Creating collection '{COLLECTION_NAME}' (frame-level)...")
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        )

    # -------------------- VIDEO COLLECTION (NEW) --------------------
    if client.collection_exists(collection_name=VIDEO_COLLECTION_NAME):
        print(f"Collection '{VIDEO_COLLECTION_NAME}' exists. Keeping as-is (video-level).")
    else:
        print(f"Creating collection '{VIDEO_COLLECTION_NAME}' (video-level)...")
        client.create_collection(
            collection_name=VIDEO_COLLECTION_NAME,
            vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        )

    # Find .npz files
    npz_files = glob.glob(os.path.join(DATA_DIR, "*.npz"))
    if not npz_files:
        print(f"No .npz files found in {DATA_DIR}")
        return

    # Load static IDs from ocr_es.json to sync with Search Engine and DB
    ocr_data_file = os.path.join(os.path.dirname(__file__), "sample-sparse", "ocr_es.json")
    video_id_map = {}
    if os.path.exists(ocr_data_file):
        try:
            with open(ocr_data_file, 'r', encoding='utf-8') as f:
                ocr_data = json.load(f)
                for item in ocr_data:
                    if 'video_name' in item and 'id' in item:
                        video_id_map[item['video_name']] = item['id']
            print(f"Loaded {len(video_id_map)} static IDs from ocr_es.json")
        except Exception as e:
            print(f"Warning: Failed to load ocr_es.json: {e}")

    print(f"Found {len(npz_files)} .npz files to index.")

    total_frame_points = 0
    total_video_points = 0

    for npz_file in npz_files:
        try:
            data = np.load(npz_file, allow_pickle=True)

            if 'vectors' not in data or 'ids' not in data:
                print(f"Skipping {os.path.basename(npz_file)}: missing 'vectors' or 'ids'")
                continue

            vectors = data['vectors']         # (N, 1024)
            ids = data['ids']
            payloads = data['payloads'] if 'payloads' in data else []

            # Determine video name from filename
            video_name_base = os.path.basename(npz_file).replace(".npz", "")

            # Lookup static video_id (UUID string)
            static_video_id = video_id_map.get(video_name_base)

            # Choose a deterministic video point id
            video_point_id = static_video_id or str(uuid.uuid5(uuid.NAMESPACE_DNS, video_name_base))

            # -------------------- FRAME-LEVEL UPSERT (EXISTING) --------------------
            points_batch = []
            for i in range(len(vectors)):
                # Handle ID
                pid = ids[i]
                if isinstance(pid, (np.integer, int)):
                    point_id = int(pid)
                else:
                    # Convert string to UUID for Qdrant
                    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(pid)))

                # Handle Vector
                vector = vectors[i].tolist()

                # Handle Payload
                payload = {}
                if len(payloads) > i:
                    raw_payload = payloads[i]
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
                        payload = {"data": str(raw_payload)}

                if "video_name" not in payload:
                    payload["video_name"] = video_name_base

                # Inject static video_id for sync
                if static_video_id:
                    payload["video_id"] = static_video_id

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
                total_frame_points += len(points_batch)
                print(f"Indexed {len(points_batch)} frame points from {os.path.basename(npz_file)}")

            # -------------------- VIDEO-LEVEL POOLING + UPSERT (NEW) --------------------
            # vectors: (N, D)
            if vectors.ndim != 2 or vectors.shape[1] != VECTOR_SIZE:
                raise ValueError(f"Unexpected vectors shape {vectors.shape} in {os.path.basename(npz_file)}")

            # L2 normalize each frame (safe even if already normalized)
            v_norm = l2_normalize(vectors.astype(np.float32), axis=1)

            # Mean pool
            pooled = mean_pool(v_norm)  # (D,)

            # L2 normalize pooled
            pooled_norm = l2_normalize(pooled.astype(np.float32), axis=0).reshape(-1)

            video_payload = {
                "video_id": static_video_id or video_point_id,
                "video_name": video_name_base,
                "frame_count": int(vectors.shape[0]),
            }

            # Upsert 1 point/video
            client.upsert(
                collection_name=VIDEO_COLLECTION_NAME,
                points=[models.PointStruct(
                    id=video_point_id,
                    vector=pooled_norm.tolist(),
                    payload=video_payload
                )]
            )
            total_video_points += 1
            print(f"✅ Indexed 1 video pooled point into '{VIDEO_COLLECTION_NAME}' from {os.path.basename(npz_file)}")

        except Exception as e:
            print(f"Error processing {os.path.basename(npz_file)}: {e}")

    print(f"Finished.")
    print(f"  Total frame points indexed into '{COLLECTION_NAME}': {total_frame_points}")
    print(f"  Total video points indexed into '{VIDEO_COLLECTION_NAME}': {total_video_points}")


if __name__ == "__main__":
    index_data()
