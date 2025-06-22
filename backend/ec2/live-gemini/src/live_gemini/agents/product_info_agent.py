from ..constants.prompts import PRODUCT_INFO_PROMPT
from ..utils.global_store import GlobalStore

store = GlobalStore()


async def product_info_agent(llm_live_api, user_query: str, retrieve_products: dict[str, any]) -> any:
    conversation_history = store.get("conversation_history")

    prompt = PRODUCT_INFO_PROMPT.format(
        user_query=user_query,
        conversation_history=conversation_history,
        retrieve_products=retrieve_products
    )

    async for response in llm_live_api.live_chat(prompt=prompt):
        yield response
