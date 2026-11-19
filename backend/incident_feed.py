"""Allowlisted Google public status metadata; raw descriptions are never retained."""
import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from fastapi import APIRouter, Request as ApiRequest
from psycopg.types.json import Jsonb

SOURCE = "https://status.cloud.google.com/incidents.json"
SCHEMA = """
CREATE TABLE IF NOT EXISTS incident_sources (
    id text PRIMARY KEY, url text NOT NULL, last_success timestamptz
);
CREATE TABLE IF NOT EXISTS incident_reports (
    id text PRIMARY KEY, payload jsonb NOT NULL,
    discovered timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS incident_reviews (
    id text PRIMARY KEY, payload jsonb NOT NULL
);
"""
router = APIRouter()


def parse(raw):
    if not isinstance(raw, list):
        raise ValueError("Expected a list of public incident records")
    for report in raw:
        if not isinstance(report, dict):
            continue
        key = report.get("id")
        start = report.get("created") or report.get("begin")
        if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9_-]{5,80}", key):
            continue
        try:
            published = datetime.fromisoformat(start)
            if published.tzinfo is None:
                continue
        except (ValueError, TypeError):
            continue
        yield {
            "id": f"gcp-{key}",
            "title": "Google Cloud service disruption",
            "source": "Google Cloud Service Health",
            "url": f"https://status.cloud.google.com/incidents/{key}",
            "published": published.astimezone(timezone.utc).isoformat(),
            "technology": "Google Cloud",
            "category": "Production DevOps",
            "incidentStatus": "Resolved per source" if report.get("end") else "Open per source",
            "status": "Unresolved",
            "summary": "Discovered from the official public status feed. Root cause and remediation await review.",
        }


def download():
    req = Request(SOURCE, headers={"User-Agent": "InfraQuest incident metadata sync/1.0"})
    with urlopen(req, timeout=15) as response:
        if response.geturl() != SOURCE:
            raise ValueError("Unexpected source redirect")
        body = response.read(8_000_001)
    if len(body) > 8_000_000:
        raise ValueError("Feed exceeded size limit")
    result = list(parse(json.loads(body)))
    if not result:
        raise ValueError("No usable records returned")
    return result


async def initialize(conn):
    await conn.execute(SCHEMA)
    seed = Path(__file__).parent / "incident_seed.json"
    if not seed.exists():
        seed = Path(__file__).parents[1] / "data" / "incidents.json"
    for report in json.loads(seed.read_text()):
        await conn.execute("INSERT INTO incident_reviews VALUES (%s,%s) ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload",
                           (report["id"], Jsonb(report)))


async def sync(db_url):
    import psycopg
    reports = await asyncio.to_thread(download)
    async with await psycopg.AsyncConnection.connect(db_url) as conn:
        for report in reports:
            await conn.execute("INSERT INTO incident_reports(id,payload) VALUES (%s,%s) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload",
                               (report["id"], Jsonb(report)))
        await conn.execute("INSERT INTO incident_sources VALUES ('gcp',%s,now()) ON CONFLICT(id) DO UPDATE SET last_success=now()", (SOURCE,))


async def worker(db_url):
    import logging
    failures = 0
    while True:
        try:
            await sync(db_url)
            failures = 0
        except Exception:
            failures += 1
            logging.getLogger(__name__).exception("Incident sync failed")
        await asyncio.sleep(min(3600, 60 * 2 ** min(failures - 1, 6)) if failures else 3600)


@router.get("/incidents")
async def incidents(request: ApiRequest):
    import psycopg
    db_url = request.app.state.db_url
    if not db_url:
        return {"lastSuccessfulSync": None, "reports": []}
    async with await psycopg.AsyncConnection.connect(db_url) as conn:
        cursor = await conn.execute("SELECT last_success FROM incident_sources WHERE id='gcp'")
        stamp = await cursor.fetchone()
        cursor = await conn.execute("""
            SELECT r.payload, r.discovered FROM incident_reports r
            WHERE NOT EXISTS (SELECT 1 FROM incident_reviews v WHERE v.payload->>'url'=r.payload->>'url')
            ORDER BY r.payload->>'published' DESC LIMIT 250
        """)
        reports = [{**payload, "discovered": seen.isoformat()} for payload, seen in await cursor.fetchall()]
        return {"lastSuccessfulSync": stamp[0] if stamp else None, "reports": reports}
