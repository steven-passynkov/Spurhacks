from typing import Dict, Any
import os
import dotenv
import json
import google.auth
from google.oauth2 import service_account
from opensearchpy import OpenSearch, RequestsHttpConnection
from opensearchpy.helpers.aio import OpenSearch as AsyncOpenSearch

dotenv.load_dotenv()


GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID")  # Replace with your project ID
GOOGLE_SERVICE_ACCOUNT = os.getenv("GOOGLE_SERVICE_ACCOUNT")          # Replace with a valid OAuth 2.0 token
OPENSEARCH_COLLECTION_ENDPOINT = os.getenv("OPENSEARCH_COLLECTION_ENDPOINT")
INDEX_NAME = os.getenv("INDEX_NAME")
OPENSEARCH_EMBEDDING_FIELD = os.getenv("OPENSEARCH_EMBEDDING_FIELD", "embedding")


def get_access_token():
    try:
        if not GOOGLE_SERVICE_ACCOUNT:
            print("GOOGLE_SERVICE_ACCOUNT env var not set.")
            return None
            
        service_account_info = json.loads(GOOGLE_SERVICE_ACCOUNT)
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        
        request = google.auth.transport.requests.Request()
        credentials.refresh(request)
        
        return credentials.token
    except json.JSONDecodeError:
        print("Failed to decode GOOGLE_SERVICE_ACCOUNT. Is it a valid JSON string?")
        return None
    except Exception as e:
        print(f"Error getting access token: {e}")
        return None

async def query_opensearch(embedding: list[float]):
    """
    Queries OpenSearch with a k-NN vector search.
    """
    if not all([OPENSEARCH_COLLECTION_ENDPOINT, INDEX_NAME]):
        print("OpenSearch environment variables not set.")
        return None

    client = AsyncOpenSearch(
        hosts=[{'host': OPENSEARCH_COLLECTION_ENDPOINT, 'port': 443}],
        http_auth=None,  # Assuming no auth for now, can be changed
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection
    )

    query = {
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
            body=query,
            index=INDEX_NAME
        )
        return response['hits']['hits']
    except Exception as e:
        print(f"Error querying OpenSearch: {e}")
        return None

class RetrieveProductsTool:
    @staticmethod
    def set_tool_config() -> dict:
        return {
            "name": "retrieve_products",
            "description": "Generates a search query for finding products in a vector database.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "query": {
                        "type": "STRING",
                        "description": "The search query for products, combining names, attributes, and other details."
                    }
                },
                "required": ["query"]
            }
        }

    @staticmethod
    def execute(tool_call: Dict[str, Any]) -> Dict[str, Any]:
        args = tool_call.get("arguments", {})
        query = args.get("query", "")
        return {"query": query}
