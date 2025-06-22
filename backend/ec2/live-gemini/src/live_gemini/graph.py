from langgraph.config import get_stream_writer
from langgraph.graph import StateGraph, END
from pydantic import BaseModel
from typing import TypedDict, Dict, Any, AsyncGenerator

from .agents.comparison_agent import comparison_agent
from .agents.fallback_agent import fallback_agent
from .agents.navigation_agent import navigation_agent
from .agents.product_info_agent import product_info_agent
from .agents.router_agent import determine_agent
from .enums.agent_types import AgentType
from .utils.global_store import GlobalStore

store = GlobalStore()
COMPANY_INFO = store.get("company_info")


class MessageRequest(BaseModel):
    message: str
    mimeType: str


class AgentState(TypedDict):
    request: str
    response: str
    current_agent: str
    retrieved_products: Dict[str, Any] = {}


async def router(llm_live_api, state: AgentState) -> Dict[str, str]:
    result = await determine_agent(llm_live_api, state["request"])

    print(f"Router determined agent: {result['agent_type']}")

    return {"agent": result["agent_type"]}


async def process_comparison(llm_live_api, state: AgentState) -> AgentState:
    writer = get_stream_writer()
    async for chunk in comparison_agent(llm_live_api, state["request"], state["retrieved_products"]):
        response_state = {
            "request": state["request"],
            "response": chunk,
            "current_agent": AgentType.COMPARISON.value
        }
        writer(response_state)


async def process_navigation(llm_live_api, state: AgentState) -> AgentState:
    writer = get_stream_writer()
    async for chunk in navigation_agent(llm_live_api, state["request"], state["retrieved_products"]):
        response_state = {
            "request": state["request"],
            "response": chunk,
            "current_agent": AgentType.NAVIGATION.value,
        }
        writer(response_state)


async def process_product_info(llm_live_api, state: AgentState) -> AgentState:
    writer = get_stream_writer()
    async for chunk in product_info_agent(llm_live_api, state["request"], state.get("retrieved_products", {})):
        response_state = {
            "request": state["request"],
            "response": chunk,
            "current_agent": AgentType.PRODUCT_INFO.value,
        }
        writer(response_state)


async def fallback(llm_live_api, state: AgentState) -> AgentState:
    writer = get_stream_writer()
    async for chunk in fallback_agent(llm_live_api, state["request"]):
        response_state = {
            "request": state["request"],
            "response": chunk,
            "current_agent": AgentType.FALLBACK.value,
        }
        writer(response_state)


async def run_graph(llm_live_api, text):
    builder = StateGraph(AgentState)

    conversation_history = store.get("conversation_history")
    conversation_history.append({'role': 'user', 'content': text})
    store.set("conversation_history", conversation_history)

    initial_state = {
        "request": text,
        "response": "",
        "current_agent": "",
        "retrieved_products": {}
    }

    # Define async wrappers instead of async lambdas
    async def router_node(state):
        return await router(llm_live_api, state)

    async def comparison_node(state):
        return await process_comparison(llm_live_api, state)

    async def navigation_node(state):
        return await process_navigation(llm_live_api, state)

    async def product_info_node(state):
        return await process_product_info(llm_live_api, state)

    async def fallback_node(state):
        return await fallback(llm_live_api, state)

    builder.add_node("Router", router_node)
    builder.add_node(AgentType.COMPARISON.value, comparison_node)
    builder.add_node(AgentType.NAVIGATION.value, navigation_node)
    builder.add_node(AgentType.PRODUCT_INFO.value, product_info_node)
    builder.add_node(AgentType.FALLBACK.value, fallback_node)

    builder.set_entry_point("Router")

    builder.add_conditional_edges(
        "Router",
        lambda x: x["agent"],
        {
            AgentType.COMPARISON.value: AgentType.COMPARISON.value,
            AgentType.NAVIGATION.value: AgentType.NAVIGATION.value,
            AgentType.PRODUCT_INFO.value: AgentType.PRODUCT_INFO.value,
            AgentType.FALLBACK.value: AgentType.FALLBACK.value
        }
    )

    builder.add_edge(AgentType.COMPARISON.value, END)
    builder.add_edge(AgentType.NAVIGATION.value, END)
    builder.add_edge(AgentType.PRODUCT_INFO.value, END)
    builder.add_edge(AgentType.FALLBACK.value, END)

    graph = builder.compile()

    try:
        async for chunk in graph.astream(initial_state, stream_mode="custom"):
            response_data = chunk["response"].copy()

            yield {
                "response": {
                    **response_data,
                }
            }

    except Exception as e:
        print(f"Error in run_graph: {str(e)}")
        yield {
            "response": {
                "error": str(e)
            }
        }