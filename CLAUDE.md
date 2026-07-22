# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Blue Banner Engine (BBE) is an AI-driven scouting and strategy platform for FIRST Robotics Competition (FRC) teams. It is a three-language monorepo: a **Go/Gin API gateway** (root), a **Python gRPC ML service** (`matchpoint/`), and a **React/TypeScript SPA** (`bbe-ui/`). The Go gateway is the single public entrypoint (port 8080) — it serves the built UI, proxies `/api/v1/*` requests, and calls the Python ML service over gRPC.

## Architecture

```
Browser ──HTTP──> Go/Gin gateway (:8080) ──gRPC──> Python ML service (:50051)
                        │                                  │
                  serves bbe-ui/dist              XGBoost models, Statbotics/TBA data
                  proxies TBA/FTC/Statbotics
```

- **Go gateway (`main.go`, `src/`)**: Gin server. `main.go` wires up CORS, Swagger, static file serving of `bbe-ui/dist`, and registers all route groups under `/api/v1`. Route handlers live in `src/routes/*.go`, each exposing a `RegisterXxxRoutes(router *gin.RouterGroup, ...)` function called from `main.go`: `matchpoint.go` (predictions), `simulation.go` (OPL/Monte Carlo), `analytics.go`, `tba.go`, `ftc.go`, `statbotics.go`, `assignments.go` (scouting assignments), `metrics.go`. It fans out to: TBA API, FTC API, Statbotics, and the Python gRPC service. Supporting code lives in `src/clients`, `src/db`, `src/helpers`, `src/models`, `src/types`, `src/utils`. SPA fallback routing is handled by `router.NoRoute` (serves `index.html` for non-API paths). Auth is OIDC/JWT via `src/middleware/auth.go` (validates Supabase/Keycloak tokens) but most ML/analytics routes are currently unauthenticated.
- **Python ML service (`matchpoint/`)**: gRPC server started via `python3 -m matchpoint.server`. Implements two services defined in `protos/`: `Matchpoint` (match prediction/simulation) and `Analytics`. Key subpackages: `services/` (prediction, simulator, analytics), `models/model_loader.py` (loads XGBoost `.json` models), `domain/` (prediction/simulation types), `third_parties/` (TBA, Statbotics, fetcher clients).
- **Frontend (`bbe-ui/`)**: React + TypeScript + Vite + Tailwind. Uses Supabase (`@supabase/supabase-js`) and Keycloak (`keycloak-js`) for auth, Recharts for charts, react-router.
- **Data layer**: Supabase (Postgres). SQL migrations in `migrations/` (timestamped `.sql` files). Supabase config/email-templates in `supabase/`.

The five product "modules" from the README (Matchpoint predictions, OPL pick-lister, Playbook/SHAP, Heat Seeker CV, Woodie chatbot) are largely implemented inside `matchpoint/` and surfaced through the Go routes.

## Protobuf / gRPC contract

`.proto` files in `protos/` (`prediction.proto`, `analytics.proto`) are the shared contract between Go and Python. Generated code is committed, not built on demand:
- Go: `protos/*.pb.go`, `protos/*_grpc.pb.go`, `protos/analytics/`
- Python: `matchpoint/generated/*_pb2.py`, `*_pb2_grpc.py`

When you change a `.proto`, you must regenerate both sides and keep the generated files in sync. There is no Makefile target for this — regenerate manually with `protoc` (Go plugins) and `python -m grpc_tools.protoc`.

## Common commands

### Run the full stack (dev)
```bash
./devmode.sh   # tmux: Go API (go run main.go), Python server, and Vite dev server
```
Or individually:
```bash
go run main.go                                          # Go gateway :8080
source .venv/bin/activate && python3 -m matchpoint.server   # Python gRPC :50051
cd bbe-ui && npm run dev                                 # Vite dev server :5173
```
Docker: `docker compose up` runs `go-api` + `python-predictor` (see `docker-compose.yml`, `Dockerfile.go`, `Dockerfile.python`).

### Tests
```bash
./scripts/run-tests.sh              # all three suites (parallel)
./scripts/run-tests.sh --coverage   # with coverage reports
./scripts/run-tests.sh --test frontend|backend|python

go test -race ./...                 # Go only
go test -race ./src/routes/ -run TestName   # single Go test
python -m pytest                    # Python only (config in pytest.ini)
python -m pytest tests/test_foo.py::test_bar   # single Python test
cd bbe-ui && npm run test           # frontend (Vitest)
cd bbe-ui && npx vitest run src/foo.test.tsx   # single frontend test
```
CI requires **≥70% coverage** across all services and only deploys from `main` when all tests pass.

### Lint / build
```bash
golangci-lint run          # Go (config .golangci.yml)
cd bbe-ui && npm run lint   # ESLint
cd bbe-ui && npm run build  # tsc -b + vite build → bbe-ui/dist (served by Go)
```
`npm run build` runs a `prebuild` step that copies `VITE_*` / `SWAGGER_HOST` vars from the root `.env` into `bbe-ui/.env`.

## Configuration

Config is via the root `.env` (copy from `.env.example`). Key vars: `TBA_API_KEY` (Blue Alliance data), `FTC_API_KEY`/`FTC_USER` (FTC data), `GRPC_SERVER_ADDRESS` (default `localhost:50051`), `SWAGGER_HOST`, `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, `VITE_TESTING`. Production TLS is enabled when `PRODUCTION=true` with `CERT_PATH`/`KEY_PATH` set.

**Required external assets (not in git):** pre-trained models go in `models/` (`.json`, `.pt`) and Statbotics data CSV goes in `matchpoint/data/` — download links are in `CONTRIBUTING.md`. The service will not run without them.

## Conventions & gotchas

- Swagger docs are generated from Go annotation comments (`// @...` in `main.go` and route files) into `docs/`. API is documented at `/swagger/index.html` and `/swagger.json`.
- Some route files have colocated tests (`*_test.go` in `src/routes/`).
- The Go module path is `blue-banner-engine` (imports like `blue-banner-engine/src/routes`).
- Prod site is https://bbe-frc.com; CORS allows `localhost:5173`, `localhost:8080`, and that origin.
