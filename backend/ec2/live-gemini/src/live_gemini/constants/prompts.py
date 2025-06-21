INITIAL_USER_PROMPT = """
First, respond to the user with a polite message indicating that you are processing their query. 
You can phrase this message in your own words, but it should reassure the user that their query is being handled. 
Then, respond ONLY with a retrieve_products tool call. Carefully summarize the user's main intent in a concise way, and use this summary as the input for the retrieve_products tool. 
Do not include any other text, reasoning, or explanation.

User query: "{user_query}"
Previous Conversation: 
{conversation_history}
"""

FINAL_USER_PROMPT = """
The user asked: "{user_query}".
Previous Conversation: 
{conversation_history}
Here are the relevant products found: {products}.
Please review the products and craft a helpful, concise, and informative response to the user's query. If suitable, mention specific products and their relevant features, explain your recommendations, and offer guidance or next steps to assist the user effectively.
"""