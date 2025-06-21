from enum import Enum

class MessageType(Enum):
    STATUS = "status"
    AUDIO = "audio"
    TEXT = "text"
    TOOL_RESPONSE = "tool_response"
    ERROR = "error"
