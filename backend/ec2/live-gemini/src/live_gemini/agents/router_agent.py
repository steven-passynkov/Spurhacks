from ..constants.agent_info import AGENTS_INFO
from ..constants.prompts import AGENT_ROUTER_PROMPT
from ..enums.agent_types import AgentType
from ..enums.message_types import MessageType
from ..tools.agent_selector_tool import AgentSelectorTool
from ..tools.retrieve_products_tool import RetrieveProductsTool
from ..utils.global_store import GlobalStore

store = GlobalStore()

FORMATTED_AGENTS = "\n\n".join([
    (
        f"{info['name']}:\n"
        f"Description: {info['description']}\n"
        f"Capabilities:\n- " + "\n- ".join(info['capabilities']) + "\n"
        f"Sample user questions:\n- " + "\n- ".join(info['sample_user_questions'])
    )
    for info in AGENTS_INFO.values()
])


async def determine_agent(llm_live_api, query: str):
    agent_type = AgentType.FALLBACK.value
    retrieved_products = None
    interrupted = False

    try:
        conversation_history = store.get("conversation_history", [])
        booking_state = store.get("booking_state")
        company_info = store.get("company_info")
        services = company_info.get("services") if company_info else None

        prompt = AGENT_ROUTER_PROMPT.format(
            query=query,
            agents_info=FORMATTED_AGENTS,
            conversation_history=conversation_history,
            booking_state=booking_state,
            services=services
        )

        async for response in llm_live_api.live_chat(prompt=prompt):
            if isinstance(response, dict):
                if response.get("type") == MessageType.STATUS.value and response.get("interrupted"):
                    interrupted = True

                if response.get("type") == MessageType.TOOL_RESPONSE.value:
                    match response.get("tool_name"):
                        case "set_agent":
                            agent_type = AgentSelectorTool.execute(response)

                        case "retrieve_products":
                            retrieved_products = await RetrieveProductsTool.execute(response)

        return {
            "agent_type": agent_type,
            "retrieved_products": retrieved_products,
            "interrupted": interrupted
        }

    except Exception as e:
        print(f"Error determining agent: {e}")
        return {
            "agent_type": AgentType.FALLBACK.value,
            "interrupted": False,
            "error": str(e)
        }
