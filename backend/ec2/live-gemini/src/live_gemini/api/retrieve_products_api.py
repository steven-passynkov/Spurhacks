import httpx
import os
from dotenv import load_dotenv
from requests_aws4auth import AWS4Auth

from ..utils.global_store import GlobalStore

load_dotenv()

OPENSEARCH_COLLECTION_ENDPOINT = os.getenv("OPENSEARCH_COLLECTION_ENDPOINT")
INDEX_NAME = os.getenv("INDEX_NAME")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_REGION = os.getenv("AWS_REGION")


async def retrieve_products_api(query: str, k: int):
    store = GlobalStore()
    google_access_token = store.get("google_access_token")

    if not google_access_token:
        return {"error": "Google access token not found in global store."}

    project_id = os.getenv("GOOGLE_PROJECT_ID")

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

    aws_auth = AWS4Auth(AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION, 'es')

    company_id = store.get("company_info")["companyId"]

    query_body = {
        "size": k,
        "query": {
            "bool": {
                "must": [
                    {
                        "knn": {
                            "embedding": {
                                "vector": embedding,
                                "k": k
                            }
                        }
                    }
                ],
                "filter": [
                    {
                        "term": {
                            "companyId": company_id
                        }
                    }
                ]
            }
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://{OPENSEARCH_COLLECTION_ENDPOINT}/{INDEX_NAME}/_search",
                auth=aws_auth,
                json=query_body,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            results = data['hits']['hits']

            print(results)

            for hit in results:
                if "_source" in hit and "embedding" in hit["_source"]:
                    del hit["_source"]["embedding"]
    except Exception as e:
        print(f"Error querying OpenSearch: {e}")
        results = None

    return {
        "results": results
    }
