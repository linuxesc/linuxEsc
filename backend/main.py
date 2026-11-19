"""Optional pseudonymous progress service. Never accepts or executes terminal commands."""
import asyncio
import hashlib
from contextlib import suppress
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

import psycopg
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

try:
    from .incident_feed import initialize, router, worker
except ImportError:
    from incident_feed import initialize, router, worker

DB_URL = os.getenv("DATABASE_URL", "")
SCHEMA = """CREATE TABLE IF NOT EXISTS quest_progress (
    token_hash TEXT PRIMARY KEY,
    progress JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db_url = DB_URL
    task = None
    if DB_URL:
        async with await psycopg.AsyncConnection.connect(DB_URL) as conn:
            await conn.execute(SCHEMA)
            await initialize(conn)
        if os.getenv("INCIDENT_SYNC_ENABLED") == "1":
            task = asyncio.create_task(worker(DB_URL))
    try:
        yield
    finally:
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task


app = FastAPI(title="LinuxQuest Progress API", version="1.0.0", lifespan=lifespan)
app.include_router(router)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","), allow_methods=["GET", "PUT"], allow_headers=["Content-Type", "X-Progress-Key"])


class Completion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(max_length=64)
    date: str = Field(max_length=40)
    score: int = Field(ge=0, le=100)
    commands: int = Field(ge=0, le=100000)
    seconds: int = Field(ge=0, le=31536000)
    mode: Literal["Guided", "Challenge", "Interview", "Production"]
    hints: int = Field(ge=0, le=3)


class Progress(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    nickname: str = Field(default="Explorer", min_length=1, max_length=24)
    experience: int = Field(default=0, ge=0, le=5)
    distro: Literal["Ubuntu", "Debian", "RHEL", "Rocky Linux", "AlmaLinux"] = "Ubuntu"
    mode: Literal["Guided", "Challenge", "Interview", "Production"] = "Guided"
    onboarded: bool = True
    xp: int = Field(default=0, ge=0, le=10000000)
    completed: dict[str, Completion] = Field(default_factory=dict, max_length=1000)
    dailyDates: list[str] = Field(default_factory=list, max_length=10000)
    activity: dict[str, int] = Field(default_factory=dict, max_length=10000)
    lastMission: str = Field(default="hidden-file", max_length=64)


def token_hash(key: str | None) -> str:
    if not key or not 32 <= len(key) <= 256:
        raise HTTPException(401, "Send your own random secret (32–256 characters) in X-Progress-Key. Keep it private; possession grants access to that progress record.")
    return hashlib.sha256(key.encode()).hexdigest()


def database_required():
    if not DB_URL:
        raise HTTPException(503, "Configure DATABASE_URL to enable PostgreSQL progress storage.")


@app.get("/health")
async def health():
    return {"status": "ok", "database_configured": bool(DB_URL), "terminal_execution": False}


@app.get("/missions")
async def catalog():
    return json.loads((Path(__file__).parent / "missions.json").read_text())


@app.get("/progress/me")
async def get_progress(x_progress_key: Annotated[str | None, Header()] = None):
    identity = token_hash(x_progress_key)
    database_required()
    async with await psycopg.AsyncConnection.connect(DB_URL) as conn:
        cursor = await conn.execute("SELECT progress, updated_at FROM quest_progress WHERE token_hash = %s", (identity,))
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "No progress saved for this key.")
    return {"progress": row[0], "updated_at": row[1]}


@app.put("/progress/me")
async def put_progress(progress: Progress, x_progress_key: Annotated[str | None, Header()] = None):
    identity = token_hash(x_progress_key)
    database_required()
    catalog_data = json.loads((Path(__file__).parent / "missions.json").read_text())
    awards = {m["id"]: m["xp"] for m in catalog_data}
    if any(m not in awards for m in progress.completed):
        raise HTTPException(422, "Unknown mission ID.")
    # This endpoint stores client progress. It is not an anti-cheat verification service.
    data = progress.model_dump()
    data["dailyDates"] = sorted(set(data["dailyDates"]))
    data["xp"] = sum(awards[m] for m in data["completed"]) + 50 * len(data["dailyDates"])
    async with await psycopg.AsyncConnection.connect(DB_URL) as conn:
        await conn.execute("INSERT INTO quest_progress (token_hash, progress) VALUES (%s, %s::jsonb) ON CONFLICT (token_hash) DO UPDATE SET progress = EXCLUDED.progress, updated_at = NOW()", (identity, json.dumps(data)))
    return {"saved": True, "xp": data["xp"], "updated_at": datetime.now(timezone.utc)}
