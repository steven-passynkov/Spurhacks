from .api.live_llm_api import LLMApi
from .constants.prompts import INITIAL_USER_PROMPT, FINAL_USER_PROMPT
from .enums.message_types import MessageType
from .tools.retrieve_products_tool import RetrieveProductsTool
from .tools.validate_products_tool import ValidateProductsTool
from .utils.global_store import GlobalStore


class ProductAgent:
    def __init__(self, llm_api: LLMApi):
        self.llm_api = llm_api
        self.global_store = GlobalStore()

    async def answer_user(self, user_query: str):
        conversation_history = self.global_store.get("conversation_history", [])
        conversation_history.append({'role': 'user', 'content': user_query})
        self.global_store.set("conversation_history", conversation_history)

        initial_prompt = INITIAL_USER_PROMPT.format(
            user_query=user_query,
            conversation_history="\n".join(
                [f"{entry['role']}: {entry['content']}" for entry in conversation_history]
            )
        )
        tool_input = None

        async for response in self.llm_api.live_chat(initial_prompt):
            # if response.get("type") == MessageType.STATUS.value and response.get("interrupted"):
            #     print("User interaction interrupted.")
            #     return
            if response.get("type") == MessageType.AUDIO.value or response.get("type") == MessageType.TEXT.value:
                yield response
            if response.get("type") == MessageType.TOOL_RESPONSE.value:
                if response.get("tool_name") == "retrieve_products":
                    tool_input = response

        products_response = await RetrieveProductsTool.execute(tool_input)

        final_prompt = FINAL_USER_PROMPT.format(
            user_query=user_query,
            products=products_response,
            conversation_history="\n".join(
                [f"{entry['role']}: {entry['content']}" for entry in conversation_history]
            )
        )
        first_yield = True
        async for response in self.llm_api.live_chat(final_prompt):
            if response.get("type") == MessageType.TOOL_RESPONSE.value:
                if response.get("tool_name") == "validate_products" and first_yield:
                    validation_result = ValidateProductsTool.execute(response, products_response)
                    yield {
                        "type": "products_response",
                        "data": validation_result
                    }
                    first_yield = False

            yield response