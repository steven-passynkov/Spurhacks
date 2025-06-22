from ..constants.prompts import FALLBACK_PROMPT
from ..utils.global_store import GlobalStore
from typing import Any

store = GlobalStore()


async def fallback_agent(llm_live_api, user_query: str) -> Any:
    conversation_history = store.get("conversation_history")

    prompt = FALLBACK_PROMPT.format(
        user_query=user_query,
        conversation_history=conversation_history,
    )

    async for response in llm_live_api.live_chat(prompt=prompt):
        yield response

