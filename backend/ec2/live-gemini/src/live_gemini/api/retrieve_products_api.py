import httpx
import os
from dotenv import load_dotenv
from opensearchpy import RequestsHttpConnection
from opensearchpy._async.client import AsyncOpenSearch
from ..utils.global_store import GlobalStore

load_dotenv()

OPENSEARCH_COLLECTION_ENDPOINT = os.getenv("OPENSEARCH_COLLECTION_ENDPOINT")
OPENSEARCH_EMBEDDING_FIELD = os.getenv("OPENSEARCH_EMBEDDING_FIELD")
INDEX_NAME = os.getenv("INDEX_NAME")


async def retrieve_products_api(query: str):
    store = GlobalStore()
    google_access_token = store.get("google_access_token")

    if not google_access_token:
        return {"error": "Google access token not found in global store."}

    project_id = os.getenv("GOOGLE_PROJECT_ID")
    if not project_id:
        return {"error": "GOOGLE_PROJECT_ID not set in environment."}

    url = f"https://us-central1-aiplatform.googleapis.com/v1/projects/{project_id}/locations/us-central1/publishers/google/models/text-embedding-005:predict"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {google_access_token}"
    }
    body_req = {
        "instances": [
            {
                "task_type": "RETRIEVAL_QUERY",
                "content": query
            }
        ]
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=body_req)
            resp.raise_for_status()
            data = resp.json()
            embedding = data["predictions"][0]["embeddings"]["values"]
    except Exception as e:
        return {"error": f"Failed to get embedding: {e}"}

    aws_auth = store.get("aws_auth")
    async with AsyncOpenSearch(
        hosts=[{'host': OPENSEARCH_COLLECTION_ENDPOINT, 'port': 443}],
        http_auth=aws_auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection
    ) as client:
        query_body = {
            "size": 4,
            "query": {
                "knn": {
                    OPENSEARCH_EMBEDDING_FIELD: {
                        "vector": embedding,
                        "k": 4
                    }
                }
            }
        }

        try:
            response = await client.search(
                body=query_body,
                index=INDEX_NAME
            )
            results = response['hits']['hits']
            for hit in results:
                if "embeddings" in hit["_source"]:
                    del hit["_source"]["embeddings"]
        except Exception as e:
            print(f"Error querying OpenSearch: {e}")
            results = None

    return {
        "results": results
    }