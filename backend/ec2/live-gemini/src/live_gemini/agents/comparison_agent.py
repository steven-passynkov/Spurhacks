from ..constants.prompts import COMPARISON_PROMPT
from ..utils.global_store import GlobalStore
from typing import Dict, Any

store = GlobalStore()


async def comparison_agent(llm_live_api, user_query: str, retrieve_products: Dict[str, Any]) -> Any:
    conversation_history = store.get("conversation_history")

    prompt = COMPARISON_PROMPT.format(
        user_query=user_query,
        conversation_history=conversation_history,
        retrieve_products=retrieve_products
    )

    async for response in llm_live_api.live_chat(prompt=prompt):
        yield response

