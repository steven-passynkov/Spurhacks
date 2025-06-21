import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from utils.global_store import GlobalStore
from live_gemini.tools.tools import get_access_token

app = FastAPI(title="Live Gemini WebSocket Server")
store = GlobalStore()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: list[WebSocket] = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    access_token = get_access_token()
    if not access_token:
        print("Failed to get Google access token. Closing connection.")
        await websocket.close(code=1008, reason="Authentication failed")
        return

    store.set("google_access_token", access_token)
    print("Successfully authenticated and stored access token.")

    active_connections.append(websocket)



    try:
        response = {"message": "hi"}
        await websocket.send_text(json.dumps(response))

        # keep connection alive
        while True:
            try:
                data = await websocket.receive_text()

                response = {"message": "hi"}
                await websocket.send_text(json.dumps(response))

            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"Error handling message: {e}")
                break

    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)

@app.get("/")
async def root():
    return {"message": "WebSocket server is running on /ws endpoint"}


if __name__ == "__main__":
    uvicorn.run(
        "live_gemini.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
