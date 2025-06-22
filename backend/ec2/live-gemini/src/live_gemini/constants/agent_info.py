from typing import TypedDict, List

class AgentInfo(TypedDict):
    name: str
    description: str
    capabilities: List[str]
    sample_user_questions: List[str]

AGENTS_INFO: dict[str, AgentInfo] = {
    "Navigation": {
        "name": "Navigation",
        "description": "Helps users navigate the store by providing directions to specific products, aisles, brands, or sections. Can guide customers to the checkout and suggest the fastest route to a desired item based on the current store layout.",
        "capabilities": [
            "Locate specific products or brands",
            "Provide aisle numbers",
            "Guide to store sections",
            "Direct to checkout",
            "Suggest fastest in-store route"
        ],
        "sample_user_questions": [
            "Where can I find shampoo?",
            "What aisle is peanut butter in?",
            "Take me to the dairy section.",
            "Where’s the Nike shelf?",
            "Show me the fastest route to the light bulbs."
        ]
    },
    "ProductInfo": {
        "name": "ProductInfo",
        "description": "Provides detailed product insights, including features, materials, usage, safety, availability, and return or warranty policies. Can answer questions about variants, stock levels, and alternative packaging or materials.",
        "capabilities": [
            "Explain product features and usage",
            "Provide material and safety info",
            "Check availability and stock",
            "Show size, color, and pack options",
            "Give return and warranty details"
        ],
        "sample_user_questions": [
            "Tell me more about this product.",
            "Is this microwave-safe?",
            "Do you have this in stock?",
            "Is this available in a different color?",
            "Does this come with a warranty?"
        ]
    },
    "Comparison": {
        "name": "Comparison",
        "description": "Assists in comparing products by highlighting differences, suggesting lower-cost alternatives, and recommending similar items based on the user’s needs or intended use.",
        "capabilities": [
            "Compare products side by side",
            "Suggest cheaper alternatives",
            "Recommend similar items",
            "Match products to specific needs"
        ],
        "sample_user_questions": [
            "What’s the difference between this and the other one?",
            "Is there a cheaper version of this?",
            "Show me similar items.",
            "Which one is better for sensitive skin?",
            "What’s a good alternative to this?"
        ]
    },
    "Fallback": {
        "name": "Fallback",
        "description": "Acts as a safety net for any questions or requests that don’t clearly fall under navigation, product information, or comparison. It manages ambiguous, complex, or off-topic queries by asking clarifying questions, providing general assistance, or redirecting users to the appropriate resource or agent. This agent ensures a smooth user experience by gracefully handling unexpected interactions and guiding users toward finding the help they need.",
        "capabilities": [
            "Handle unclear or general questions",
            "Ask clarifying follow-up questions",
            "Redirect to appropriate help",
            "Maintain smooth user experience"
        ],
        "sample_user_questions": [
            "Uh... I’m not sure what I’m looking for.",
            "Can you help me?",
            "I saw something here last week—do you know what it was?",
            "What do you recommend?",
            "Do you have any deals right now?"
        ]
    }
}
