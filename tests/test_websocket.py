import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from backend import main


def test_websocket_rejects_missing_token():
    client = TestClient(main.app)

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/dashboard"):
            pass


def test_websocket_rejects_invalid_token(monkeypatch):
    monkeypatch.setattr(
        main,
        "get_current_user_from_token",
        lambda token: None,
    )

    client = TestClient(main.app)

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(
            "/ws/dashboard?token=invalid"
        ):
            pass


def test_dashboard_connection_manager_broadcasts_and_disconnects():
    manager = main.DashboardConnectionManager()

    class FakeWebSocket:
     def __init__(self):
        self.messages = []
        self.accepted = False

     async def accept(self):
        self.accepted = True

     async def send_json(self, message):
        self.messages.append(message)
    import asyncio

    websocket = FakeWebSocket()

    asyncio.run(manager.connect(websocket))
    assert websocket.accepted is True

    assert websocket in manager.active_connections

    message = {
        "event": "dashboard_updated",
        "message": "Attendance data updated",
    }

    asyncio.run(manager.broadcast(message))

    assert websocket.messages == [message]

    manager.disconnect(websocket)

    assert websocket not in manager.active_connections