from typing import Dict, Any
from ..enums.agent_types import AgentType

class AgentSelectorTool:
    @staticmethod
    def set_tool_config() -> dict:
        return {
            "name": "set_agent",
            "description": "Selects the most appropriate agent type based on the user query",
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_type": {
                        "type": "string",
                        "enum": [agent.value for agent in AgentType],
                        "description": "The type of agent to handle the query"
                    }
                },
                "required": ["agent_type"]
            }
        }

    @staticmethod
    def execute(tool_call: Dict[str, Any]) -> Dict[str, Any]:
        agent_type = tool_call.get("arguments", {}).get("agent_type", AgentType.FALLBACK.value)
        return agent_type