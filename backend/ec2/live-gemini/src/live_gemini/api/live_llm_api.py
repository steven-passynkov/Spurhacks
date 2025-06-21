import asyncio
import base64
import vertexai
# from constants.prompts import SYSTEM_INSTRUCTION_TEMPLATE
from datetime import datetime
from ..enums.message_types import MessageType
from google import genai
from google.genai.types import Content, LiveConnectConfig, Modality, Part, SpeechConfig, VoiceConfig, \
    PrebuiltVoiceConfig, RealtimeInputConfig, AutomaticActivityDetection, StartSensitivity, EndSensitivity
from ..tools.retrieve_products_tool import RetrieveProductsTool
from typing import Any, Optional


class LLMApi:
    def __init__(self, credentials, project_id):
        vertexai.init(project=project_id, location="us-central1", credentials=credentials)
        self.client = genai.Client(project=project_id, location='us-central1', vertexai=True, credentials=credentials)
        self.store = GlobalStore()
        self.session = None

        company_info = self.store.get("company_info", {})
        # formatted_instruction = SYSTEM_INSTRUCTION_TEMPLATE.format(
        #     company_name=company_info.get("companyName"),
        #     industry=company_info.get("industry"),
        #     timezone=company_info.get("timezone"),
        #     current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # )

        self.base_config = {
            # "system_instruction": formatted_instruction,
            "tools": [{"function_declarations": [
                RetrieveProductsTool.set_tool_config()
            ]}],
        }
        self._connection = None
        self.current_modality = None

    async def get_session(self, model: str = "gemini-2.0-flash-exp", modality: Modality = Modality.TEXT,
                          max_retries: int = 3) -> Optional[Any]:
        attempt = 0
        while attempt < max_retries:
            try:
                if self.session is None:
                    print(f"Creating new live connection session (attempt {attempt + 1}/{max_retries})")
                    self.current_modality = modality

                    config = LiveConnectConfig(
                        response_modalities=[modality],
                        tools=self.base_config["tools"],
                        system_instruction=self.base_config["system_instruction"],
                        speech_config=SpeechConfig(
                            voice_config=VoiceConfig(
                                prebuilt_voice_config=PrebuiltVoiceConfig(
                                    voice_name="Aoede",
                                )
                            ),
                        ),
                        realtime_input_config=RealtimeInputConfig(
                            automatic_activity_detection=AutomaticActivityDetection(
                                disabled=False,
                                start_of_speech_sensitivity=StartSensitivity.START_SENSITIVITY_LOW,
                                end_of_speech_sensitivity=EndSensitivity.END_SENSITIVITY_LOW,
                                prefix_padding_ms=20,
                                silence_duration_ms=100,
                            )
                        ),
                        input_audio_transcription={},
                        output_audio_transcription={},
                    )
                    self._connection = self.client.aio.live.connect(
                        model=model,
                        config=config
                    )
                    self.session = await self._connection.__aenter__()
                return self.session
            except Exception as e:
                attempt += 1
                print(f"Connection attempt {attempt} failed: {str(e)}")
                if self._connection:
                    await self._connection.__aexit__(None, None, None)
                self.session = None
                self._connection = None
                if attempt < max_retries:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise Exception("Our service is currently down. Please try again later.") from e

    async def close_session(self):
        if self.session and self._connection:
            try:
                await self._connection.__aexit__(None, None, None)
            except Exception as e:
                print(f"Error closing session: {e}")
            finally:
                self.session = None
                self._connection = None

    def _format_tool_response(self, tool_call) -> list:
        responses = []
        for function_call in tool_call.function_calls:
            responses.append({
                "type": MessageType.TOOL_RESPONSE.value,
                "tool_name": function_call.name,
                "arguments": function_call.args
            })
        return responses

    async def live_chat(
            self,
            prompt: str
    ) -> Any:
        try:
            if not self.session:
                raise Exception("No active session. WebSocket connection may have been lost.")

            user_turns = Content(
                role="user",
                parts=[Part(text=prompt)],
            )

            await self.session.send_client_content(
                turns=user_turns,
                turn_complete=True
            )

            current_assistant_message = ""
            seen_texts = set()

            try:
                async for message in self.session.receive():
                    print(message)
                    if (hasattr(message, 'server_content') and
                            message.server_content and
                            hasattr(message.server_content, 'interrupted')):
                        if message.server_content.interrupted:
                            yield {
                                "type": MessageType.STATUS.value,
                                "interrupted": True
                            }
                            continue

                    if self.current_modality == Modality.AUDIO:
                        if (hasattr(message, 'server_content') and
                                message.server_content):
                            if (hasattr(message.server_content, 'output_transcription') and
                                    message.server_content.output_transcription):
                                if hasattr(message.server_content.output_transcription, 'text'):
                                    text = message.server_content.output_transcription.text
                                    if text and text != "None" and text not in seen_texts:
                                        print(f"Assistant: {text}")
                                        current_assistant_message += text
                                        seen_texts.add(text)

                            if (hasattr(message.server_content, 'model_turn') and
                                    message.server_content.model_turn and
                                    hasattr(message.server_content.model_turn, 'parts') and
                                    message.server_content.model_turn.parts):
                                for part in message.server_content.model_turn.parts:
                                    if (hasattr(part, 'inline_data') and
                                            part.inline_data and
                                            hasattr(part.inline_data, 'data') and
                                            part.inline_data.data):
                                        audio_message = {
                                            "type": MessageType.AUDIO.value,
                                            "message": base64.b64encode(part.inline_data.data).decode('utf-8'),
                                            "mimeType": f"{part.inline_data.mime_type};rate=24000"
                                        }
                                        yield audio_message

                    if self.current_modality == Modality.TEXT:
                        if (hasattr(message, 'text') and
                                message.text is not None):
                            current_assistant_message += message.text
                            yield {
                                "type": MessageType.TEXT.value,
                                "message": message.text,
                                "mimeType": "text/plain"
                            }

                    if (hasattr(message, 'tool_call') and
                            message.tool_call and
                            hasattr(message.tool_call, 'function_calls') and
                            message.tool_call.function_calls):
                        try:
                            tool_responses = self._format_tool_response(message.tool_call)
                            for tool_response in tool_responses:
                                yield tool_response
                        except Exception as tool_e:
                            print(f"Error formatting tool call: {tool_e}")
                            yield {
                                "type": MessageType.ERROR.value,
                                "content": f"Error processing tool call: {str(tool_e)}"
                            }

                cleaned_message = current_assistant_message.replace("None", "").strip()

                if cleaned_message:
                    conversation_history = self.store.get("conversation_history")
                    conversation_history.append({'role': 'system', 'content': cleaned_message})
                    self.store.set("conversation_history", conversation_history)


            except Exception as inner_e:
                print(f"Error during message receive: {inner_e}")
                yield {
                    "type": MessageType.ERROR.value,
                    "content": str(inner_e)
                }

        except Exception as e:
            print(f"Live Chat Error: {e}")
            yield {
                "type": MessageType.ERROR.value,
                "content": f"Error during live chat: {e}"
            }