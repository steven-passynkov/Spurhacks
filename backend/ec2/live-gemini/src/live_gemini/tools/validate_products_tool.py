from typing import Dict, Any

class ValidateProductsTool:
    @staticmethod
    def set_tool_config() -> dict:
        return {
            "name": "validate_products",
            "description": "Validates if the retrieved products are relevant to the user's query.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "products": {
                        "type": "ARRAY",
                        "items": {
                            "type": "STRING"
                        },
                        "description": "The list of product SKUs to validate."
                    }
                },
                "required": ["products"]
            }
        }

    @staticmethod
    def execute(tool_call: Dict[str, Any], allProducts: Any) -> Dict[str, Any]:
        products_to_validate = tool_call.get("arguments", {}).get("products", [])

        if isinstance(allProducts, dict) and "results" in allProducts:
            allProducts = allProducts["results"]

        all_product_details_by_sku = {
            product["_source"]["sku"]: product["_source"]
            for product in allProducts
            if isinstance(product, dict) and "_source" in product and "sku" in product["_source"]
        }

        relevant_product_details = [
            all_product_details_by_sku[sku]
            for sku in products_to_validate
            if sku in all_product_details_by_sku
        ]

        return relevant_product_details
