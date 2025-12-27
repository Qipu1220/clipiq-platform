
const idToCheck = "4d60217d-9a2b-49b0-82ee-6a0a4445a72c";

console.log(`Checking ID: ${idToCheck}`);

async function checkQdrant() {
    try {
        const response = await fetch("http://qdrant:6333/collections/clipiq_vectors/points/scroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filter: {
                    must: [
                        {
                            key: "video_id",
                            match: { value: idToCheck }
                        }
                    ]
                },
                limit: 1
            })
        });
        const data = await response.json();
        if (data.result && data.result.points && data.result.points.length > 0) {
            console.log("✅ Qdrant: Found!");
        } else {
            console.log("❌ Qdrant: Not Found", JSON.stringify(data));
        }
    } catch (e) {
        console.log(`❌ Qdrant Error: ${e.message}`);
    }
}

async function checkElastic() {
    try {
        const response = await fetch("http://elasticsearch:9200/clipiq_ocr/_search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: {
                    match: { id: idToCheck }
                }
            })
        });
        const data = await response.json();
        if (data.hits && data.hits.total && data.hits.total.value > 0) {
            console.log("✅ Elasticsearch: Found!");
        } else {
            console.log("❌ Elasticsearch: Not Found", JSON.stringify(data));
        }
    } catch (e) {
        console.log(`❌ Elasticsearch Error: ${e.message}`);
    }
}

async function main() {
    await checkQdrant();
    await checkElastic();
}

main();
