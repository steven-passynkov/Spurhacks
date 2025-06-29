import boto3
import google.auth
import google.auth.transport.requests
import httpx
import json
import os
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2 import service_account
from requests_aws4auth import AWS4Auth
from google.genai.types import Modality
from pydantic import BaseModel
from .graph import run_graph

from .api.live_llm_api import LLMApi
from .utils.global_store import GlobalStore

load_dotenv()

app = FastAPI(title="Live Gemini WebSocket Server")
store = GlobalStore()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: list[WebSocket] = []

GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID")
GOOGLE_SERVICE_ACCOUNT = os.getenv("GOOGLE_SERVICE_ACCOUNT")


def get_aws_auth():
    session = boto3.Session()
    credentials = session.get_credentials()
    region = os.getenv("AWS_REGION", "us-east-1")
    return AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        region,
        "es",
        session_token=credentials.token,
    )


@app.on_event("startup")
async def startup_event():
    aws_auth = get_aws_auth()
    store.set("aws_auth", aws_auth)


class MessageRequest(BaseModel):
    message: str
    mimeType: str


@app.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    store.clear()

    try:
        initial_data = await websocket.receive_json()
        company_id = initial_data.get("company-id")
        if not company_id:
            await websocket.close(code=4001, reason="Missing company-id in initial message")
            return
    except Exception as e:
        print(f"Error receiving initial message: {e}")
        await websocket.close(code=4001, reason="Invalid initial message format")
        return

    config_url = f"https://spurhacks-company.s3.us-east-1.amazonaws.com/{company_id}/config.json"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(config_url)
            if resp.status_code != 200:
                raise Exception(f"Status code: {resp.status_code}")
            company_config = resp.json()
            store.set("company_info", company_config)
    except Exception as e:
        print(f"Failed to fetch company config for {company_id}: {e}")
        await websocket.close(code=4002, reason="Could not retrieve company config")
        return

    try:
        if not GOOGLE_SERVICE_ACCOUNT:
            await websocket.close()
            return

        service_account_info = json.loads(GOOGLE_SERVICE_ACCOUNT)
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )

        request = google.auth.transport.requests.Request()
        credentials.refresh(request)
        access_token = credentials.token
        project_id = service_account_info.get("project_id")

    except json.JSONDecodeError:
        print("Failed to decode GOOGLE_SERVICE_ACCOUNT. Is it a valid JSON string?")
        await websocket.close()
        return
    except Exception as e:
        print(f"Error getting access token: {e}")
        await websocket.close()
        return

    store.set("google_access_token", access_token)
    store.set("google_credentials", credentials)
    store.set("google_project_id", project_id)
    active_connections.append(websocket)

    llm_live_api = LLMApi(credentials, project_id)

    try:
        await llm_live_api.get_session(modality=Modality.AUDIO)
    except Exception as e:
        print(f"Error creating session: {e}")
        await websocket.close()
        if websocket in active_connections:
            active_connections.remove(websocket)
        return

    try:
        while True:
            try:
                data = await websocket.receive_json()
                message_request = MessageRequest(**data['request'])

                text = message_request.message.strip()

                if message_request.mimeType.startswith('audio/'):
                    text = await llm_live_api.transcribe_audio(message_request.message, message_request.mimeType)

                # Pass llm_live_api and text to run_graph
                async for chunk in run_graph(llm_live_api, text):
                    if chunk and isinstance(chunk, dict):
                        await websocket.send_json({"response": chunk["response"]})
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"Error handling message: {e}")
                break

    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        await llm_live_api.close_session()
        if websocket in active_connections:
            active_connections.remove(websocket)
        store.clear()


if __name__ == "__main__":
    uvicorn.run(
        "live_gemini.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )