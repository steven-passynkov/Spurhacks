from typing import Dict, Any
from ..constants.prompts import LOCATION_PROMPT
from ..utils.global_store import GlobalStore

store = GlobalStore()


async def navigation_agent(llm_live_api, user_query: str, retrieve_products: Dict[str, Any]) -> Any:
    conversation_history = store.get("conversation_history")

    product_locations = []
    for product in retrieve_products.get("products", []):
        name = product.get("name", "Unknown")
        location = product.get("location", {})
        aisle = location.get("aisle", "Unknown")
        section = location.get("section", "Unknown")
        shelf = location.get("shelf", "Unknown")
        product_locations.append(
            f"{name}: aisle {aisle}, section {section}, shelf {shelf}"
        )
    locations_str = "\n".join(product_locations)

    prompt = LOCATION_PROMPT.format(
        user_query=user_query,
        conversation_history=conversation_history,
        retrieve_products=retrieve_products,
        locations_str=locations_str
    )

    async for response in llm_live_api.live_chat(prompt=prompt):
        yield response