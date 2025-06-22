from enum import Enum

class AgentType(Enum):
    COMPARISON = "Comparison"
    NAVIGATION = "Navigation"
    PRODUCT_INFO = "ProductInfo"
    FALLBACK = "Fallback"

    @classmethod
    def get_valid_values(cls) -> set:
        return {agent.name.lower() for agent in cls}

    @classmethod
    def from_string(cls, value: str) -> 'AgentType':
        value = value.strip().lower()
        for agent in cls:
            if agent.name.lower() == value:
                return agent
        return cls.CUSTOMER_SERVICE
