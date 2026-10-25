# DevOps Mission Control — local microservices lab

A hands-on Docker Compose project: custom UI image, custom Nginx API gateway, Node.js incidents service, Python tasks service, PostgreSQL, and Redis.

## Requirements
- Docker Desktop installed and running
- Docker Compose v2 (`docker compose version`)
- Internet for the first build so Docker can pull public base images and packages

## Start (Windows CMD or PowerShell)
1. Extract this ZIP.
2. Open a terminal in the extracted `devops-mission-control` folder.
3. Validate the Compose file:
   ```bash
   docker compose config
   ```
4. Build custom images and start all services:
   ```bash
   docker compose up --build -d
   ```
5. Open **http://localhost:8080**.
6. See container status:
   ```bash
   docker compose ps
   ```
7. Follow logs:
   ```bash
   docker compose logs -f
   ```
   Press `Ctrl+C` to stop following logs; containers keep running.
8. Stop the app:
   ```bash
   docker compose down
   ```
   Database/cache data remains in named volumes.
9. Reset all lab data (destructive):
   ```bash
   docker compose down -v
   ```

## What's running
| Service | Purpose | Image |
|---|---|---|
| `ui` | Static dashboard | Custom image built from `nginx:alpine` |
| `gateway` | Routes `/api/incidents` and `/api/tasks` | Custom image built from `nginx:alpine` |
| `incidents` | Incident CRUD API + Redis visit counter | Custom image built from `node:22-alpine` |
| `tasks` | Task CRUD API | Custom image built from `python:3.12-slim` |
| `db` | Shared PostgreSQL database | Public `postgres:16-alpine` |
| `cache` | Redis persistence/cache demo | Public `redis:7-alpine` |

Only the UI publishes a host port. The gateway, APIs, database, and cache are reached over Docker's private networks. Compose service names (`db`, `cache`, `incidents`, `tasks`, `gateway`) act as DNS hostnames.

## Try the APIs
```bash
curl http://localhost:8080/api/incidents
curl http://localhost:8080/api/tasks
curl http://localhost:8080/api/health
```
In PowerShell, `curl` may be an alias; use `curl.exe` or open the browser at `http://localhost:8080/api/incidents`.

## Learning labs
1. **Image vs container:** `docker image ls` and `docker compose ps`
2. **Build context:** inspect each service's `Dockerfile` and `.dockerignore`
3. **Networking/DNS:** note that services use `db` and `cache`, not `localhost`, to reach other containers
4. **Health checks:** `docker compose ps` and `docker inspect`
5. **Logs:** `docker compose logs -f incidents`
6. **Persistence:** add a task, run `docker compose down`, start again; it remains
7. **Failure drill:** stop cache with `docker compose stop cache`; inspect incident service logs; restart using `docker compose start cache`
8. **Rebuild one service:** `docker compose up -d --build incidents`
9. **Clean reset:** `docker compose down -v` (deletes the lab's stored data)

## Important
This is a local learning lab, not production-ready. The credentials are intentionally simple demo credentials. Do not expose it to the internet or reuse them. Database initialization scripts run only when the database volume is first created. If you edit `database/init.sql` and need a fresh schema, use `docker compose down -v` (this deletes stored lab data).
