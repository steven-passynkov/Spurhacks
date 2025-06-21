mport asyncio
import base64
import json
import os
from datetime import datetime
from typing import Any, Optional

import google
import vertexai
from constants.prompts import SYSTEM_INSTRUCTION_TEMPLATE
from deepgram import (
    DeepgramClient,
    PrerecordedOptions,
    FileSource,
)
from dotenv import load_dotenv
from enums.message_types import MessageType
from google import genai
from google.genai.types import Content, LiveConnectConfig, Modality, Part, SpeechConfig, VoiceConfig, \
    PrebuiltVoiceConfig, RealtimeInputConfig, AutomaticActivityDetection, StartSensitivity, EndSensitivity
from tools.agent_selector_tool import AgentSelectorTool
from tools.booking_state_tool import BookingStateTool
from tools.cancellation_tool import CancellationTool
from tools.customer_info_tool import CustomerInfoTool
from tools.mention_tracker_tool import MentionTrackerTool
from utils.global_store import GlobalStore

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")


class LLMApi:
    def __init__(self):
        credentials, project_id = google.auth.default()
        vertexai.init(project=project_id, location="us-central1")
        self.client = genai.Client(project=project_id, location='us-central1', vertexai=True)
        self.store = GlobalStore()
        self.session = None
        self.deepgram = DeepgramClient(api_key=DEEPGRAM_API_KEY)

        company_info = self.store.get("company_info", {})
        formatted_instruction = SYSTEM_INSTRUCTION_TEMPLATE.format(
            company_name=company_info.get("companyName"),
            industry=company_info.get("industry"),
            timezone=company_info.get("timezone"),
            current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

        self.base_config = {
            "system_instruction": formatted_instruction,
            "tools": [{"function_declarations": [
                AgentSelectorTool.set_tool_config(),
                BookingStateTool.set_tool_config(),
                CustomerInfoTool.set_tool_config(),
                MentionTrackerTool.set_tool_config(),
                CancellationTool.set_tool_config()
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

    # async def transcribe_audio(self, base64_str: str, mime_type: str) -> str:
    #     try:
    #         if not self.session:
    #             raise Exception("No active session. WebSocket connection may have been lost.")
    #         audio_data = base64.b64decode(base64_str)
    #
    #         await self.session.send_realtime_input(
    #             media=google.genai.types.Blob(
    #                 data=audio_data,
    #                 mime_type=mime_type,
    #             )
    #         )
    #
    #         # await self.session.send_realtime_input(audio_stream_end=True)
    #
    #         # transcription = ""
    #         # async for response in self.session.receive():
    #         #     print(f"Received response: {response}")
    #         #     if (hasattr(response, 'server_content') and
    #         #             response.server_content and
    #         #             hasattr(response.server_content, 'input_transcription')):
    #         #         transcription = response.server_content.input_transcription
    #         #         if transcription:
    #         #             return transcription
    #         #
    #         # if transcription:
    #         #     return transcription
    #
    #
    #     except Exception as e:
    #         print(f"Transcription Error: {e}")
    #         raise

    async def transcribe_audio(self, base64_str: str, mime_type: str) -> str:
        try:
            audio_data = base64.b64decode(base64_str)

            sample_rate = 16000
            if ";rate=" in mime_type:
                try:
                    sample_rate = int(mime_type.split(";rate=")[1])
                except:
                    pass

            payload: FileSource = {
                "buffer": audio_data,
                "mimetype": "audio/l16",
                "encoding": "linear16",
                "sample_rate": sample_rate,
                "channels": 1,
                "bits_per_sample": 16
            }

            options = PrerecordedOptions(
                model="nova-3",
                smart_format=True,
                language="en-US",
                encoding="linear16",
                sample_rate=sample_rate
            )
            response = self.deepgram.listen.rest.v("1").transcribe_file(
                payload,
                options
            )

            if (response and hasattr(response, 'results') and
                    hasattr(response.results, 'channels') and
                    len(response.results.channels) > 0 and
                    len(response.results.channels[0].alternatives) > 0):
                transcription = response.results.channels[0].alternatives[0].transcript
                print(f"Transcription: {transcription}")
                return transcription

            raise Exception("No transcription received")

        except Exception as e:
            print(f"Transcription Error: {e}")
            print(f"Input mime_type was: {mime_type}")
            raise

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

llm_api = LLMApi()
llm_live_api = llm_api