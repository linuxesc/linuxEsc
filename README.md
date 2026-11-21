# linuxEsc — Linux, Networking, DevOps & Data Center Simulator

Live site: [linuxesc.com](https://linuxesc.com).

A playable Next.js, React, TypeScript, Tailwind CSS and xterm.js learning platform. The initial deployment is a static export with browser-local progress. The optional FastAPI/PostgreSQL progress service runs separately.

## Start the website

Requirements: Node.js 20.9+ and npm.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Choose your experience, enter an optional nickname, and click **Let’s play**. Your first mission is immediately playable:

```sh
pwd
ls -la
cd .secrets
cat flag.txt
```

The flag completes the mission, awards 100 XP once, and unlocks the next quest. No terminal command is sent to a server or executed on a real operating system.

## Build and verify

```sh
npm run typecheck
npm test
npm run build
```

`out/` contains the deployable static site. Serve this directory with any static web server; `next start` is not used with static exports.

## What works

- 24 state-validated missions, four in each of six difficulty chapters.
- All ten requested game types: hidden files, permissions, rescue, SSH, disk cleanup, processes, networks, escape rooms, multiple hosts, and incident command.
- xterm.js input, arrow-key history, cursor editing, Tab completion, Ctrl+C, Ctrl+L, and a touch-friendly command input.
- Simulated filesystem, permissions, user/group administration, processes, services, networking, firewall rules, storage, cron, scripts, and selected DevOps tools.
- Quoted arguments, pipelines, `>`, `>>`, `&&`, and `;`.
- Guided, Challenge, Interview, and Production modes. Interview notes are session-only. Production mode allows one hint. Hints and errors lower the performance score.
- XP, ranks, daily bonus quests, activity streaks, badges, a personal local leaderboard, profile placement, JSON progress export/import, and reset controls.
- Five distro profiles. Ubuntu/Debian use APT, nginx, ssh, and AppArmor defaults. RHEL/Rocky/Alma use DNF/YUM, httpd, sshd, and SELinux defaults.
- Dashboard, roadmap, mission catalog, terminal playground, troubleshooting lab, daily challenges, interview practice, achievements, leaderboard, and profile.

## Simulation boundaries

This is a focused teaching model, not an emulator of a full Linux kernel or Bash interpreter. Only commands in `lib/simulator.ts` are implemented. Unsupported commands fail explicitly. `help` lists the available surface. Editors, background job execution, command substitutions, arbitrary programs, real cloud APIs, and network connections are not executed. `less`, `top`, and similar interactive commands return a snapshot. Distribution behavior is intentionally modeled rather than guaranteed identical to every installed Linux version.

Services and network endpoints are modeled state. Container, Kubernetes, Ansible, Jenkins, Terraform, AWS, and Azure outputs are simulations. No cloud resources are created. No real multi-user authentication, hosted global leaderboard, or container lab backend is enabled. Browser progress belongs to this origin/browser; clearing browser data removes it. Use Export progress for a portable backup. Mission environments restart when you launch a mission or change distribution; completion records remain saved.

Each mission's solution is in source for reproducible testing. The simulator is not designed as an anti-cheat system.

## Optional FastAPI + PostgreSQL service

The hosted frontend uses local storage and does not call this API automatically. This service provides a working API foundation for manual progress backup or a future signed-in frontend. It never accepts shell commands.

```sh
export POSTGRES_PASSWORD='choose-a-long-local-password'
docker compose up --build -d
```

Open http://127.0.0.1:8000/docs for the API. `GET /health` checks service configuration. `GET /missions` returns the public catalog. `PUT /progress/me` and `GET /progress/me` store and retrieve validated progress in PostgreSQL.

For the progress endpoints, supply your own cryptographically random secret of 32–256 characters in the `X-Progress-Key` header. The server stores only its SHA-256 hash. Anyone holding the key can access that record; this is pseudonymous possession-based access, not account authentication. Keep it private and run this development service on localhost. XP is recomputed from completed mission IDs, but mission completion is trusted client input. A public competitive service needs server-authoritative validation, real authentication, rate limiting, and session controls.

To run the API without Docker:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
export DATABASE_URL='postgresql://linuxquest:your-password@127.0.0.1:5432/linuxquest'
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Without `DATABASE_URL`, health and catalog work; progress endpoints return HTTP 503. The PostgreSQL table is initialized at startup. Set `CORS_ORIGINS` to explicit permitted origins for another frontend.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Dashboard, navigation, modes, onboarding, mission workspace, progress UI |
| `app/globals.css` | Responsive design and animation |
| `components/Terminal.tsx` | xterm.js lifecycle, input handling, history, autocomplete |
| `lib/simulator.ts` | Typed, deterministic shell and environment model |
| `lib/missions.ts` | Mission catalog, world seeds, objectives, hints, explanations, solutions |
| `lib/progress.ts` | Progress types, ranks, achievements, local day/streak calculation |
| `tests/simulator.test.ts` | Every mission on all five distributions plus shell invariants |
| `backend/` | Optional FastAPI service and public mission catalog |
| `compose.yaml` | Local API and PostgreSQL development stack |

## Add a mission

Add an entry to `missions` in `lib/missions.ts` with a unique ID, tier, scenario, objective, supported commands, hints, state checks, explanation, interview prompt, and a reproducible solution. Add its environment seed to `missionWorld` or `createWorld` if needed. The terminal invokes objective checks after every command. The test suite automatically exercises each new mission on all distributions. The catalog and chapter counts are derived from mission data. Update overview copy and the completion badge target if your curriculum grows beyond the initial 24 missions.

## Reference documentation

- https://nextjs.org/docs/app/guides/static-exports
- https://xtermjs.org/docs/api/terminal/classes/terminal/
- https://fastapi.tiangolo.com/
- https://www.psycopg.org/psycopg3/docs/

## Incident intelligence

The public site uses Google's public status JSON feed and refreshes it every five minutes while the incident page is open. The displayed timestamp is the last successful fetch; discovery time on that deployment is scoped to the open page. Reviewed historical cases live in `data/incidents.json`. Only operator-documented completed recoveries are labeled verified in the seed. Simulated commands and telemetry are fictional and explicitly identified.

For scheduled ingest, launch the existing Compose stack with PostgreSQL configured. The API's incident worker runs hourly, retries after failures, and upserts public metadata by source ID without storing raw posts. Set `NEXT_PUBLIC_INCIDENTS_API` before building the frontend to the HTTPS origin of that API and configure `CORS_ORIGINS` for the frontend. The endpoint is `GET /incidents`. PostgreSQL preserves first discovery time. The scheduled API is a separate deployment from the static site.

To review a discovered incident, read the operator report and record the date, scope, confirmed recovery and verification basis in the curated seed. Missing details remain unknown. Never promote a raw source record automatically. Publish a separately labeled lab only after testing the recovery. Current source coverage is the Google feed and the two reviewed postmortems. The cooling coach gives source-linked scripted hints based on the training scenario.
