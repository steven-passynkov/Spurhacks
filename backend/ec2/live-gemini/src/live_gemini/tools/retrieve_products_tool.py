from typing import Dict, Any
from ..api.retrieve_products_api import retrieve_products_api

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
                    },
                    "k": {
                        "type": "INTEGER",
                        "description": "The number of top results to retrieve."
                    }
                },
                "required": ["query", "k"]
            }
        }

    @staticmethod
    async def execute(tool_call: Dict[str, Any]) -> Dict[str, Any]:
        query = tool_call.get("arguments").get("query")
        k = tool_call.get("arguments").get("k", 4)
        return await retrieve_products_api(query, k)
