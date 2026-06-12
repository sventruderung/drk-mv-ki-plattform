"""Steuerung von Stack und Host über den Docker-Socket.

SICHERHEIT: Der gemountete Docker-Socket ist root-äquivalent auf dem Host.
Alle Aufrufer MÜSSEN kv-admin-geprüft und auditiert sein (system.py).
"""

import asyncio
import json
import os

import httpx

from drk_shared.logging import get_logger

logger = get_logger(__name__)

SOCKET = "/var/run/docker.sock"


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.AsyncHTTPTransport(uds=SOCKET),
        base_url="http://docker", timeout=60,
    )


async def _self_info(client: httpx.AsyncClient) -> dict:
    """Eigener Container: liefert Compose-Projekt-Label und Image."""
    container_id = os.uname().nodename  # Hostname im Container = Container-ID
    resp = await client.get(f"/containers/{container_id}/json")
    resp.raise_for_status()
    return resp.json()


async def restart_stack() -> None:
    """Alle Container des Compose-Projekts neu starten — sich selbst zuletzt."""
    async with _client() as client:
        me = await _self_info(client)
        project = me["Config"]["Labels"].get("com.docker.compose.project", "")
        filters = json.dumps({"label": [f"com.docker.compose.project={project}"]})
        resp = await client.get(f"/containers/json?filters={filters}")
        resp.raise_for_status()
        my_id = me["Id"]
        others = [c["Id"] for c in resp.json() if c["Id"] != my_id]
        for cid in others:
            await client.post(f"/containers/{cid}/restart?t=10")
        logger.info("system.restart", containers=len(others) + 1)
        # Zum Schluss uns selbst — die Restart-Policy bringt uns zurück
        await client.post(f"/containers/{my_id}/restart?t=5")


async def host_power(action: str) -> None:
    """Host neu starten oder herunterfahren (action: 'reboot' | 'poweroff').

    Startet einen privilegierten Wegwerf-Container im Host-PID-Namespace,
    der per nsenter das Kommando des Hosts ausführt.
    """
    if action not in ("reboot", "poweroff"):
        raise ValueError(action)
    async with _client() as client:
        me = await _self_info(client)
        body = {
            "Image": me["Config"]["Image"],  # eigenes Image — sicher vorhanden
            "Entrypoint": ["nsenter", "-t", "1", "-m", "-u", "-i", "-n", action],
            "HostConfig": {
                "Privileged": True,
                "PidMode": "host",
                "AutoRemove": True,
                "NetworkMode": "none",
            },
        }
        resp = await client.post("/containers/create", json=body)
        resp.raise_for_status()
        cid = resp.json()["Id"]
        logger.info("system.power", action=action)
        await client.post(f"/containers/{cid}/start")


def schedule(coro_func, *args, delay: float = 2.0) -> None:
    """Aktion verzögert ausführen, damit die HTTP-Antwort noch rausgeht."""
    async def runner():
        await asyncio.sleep(delay)
        try:
            await coro_func(*args)
        except Exception as e:
            logger.info("system.action_failed", error=f"{type(e).__name__}: {e}")

    asyncio.create_task(runner())
