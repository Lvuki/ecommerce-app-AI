<!-- Project-specific Copilot instructions for the `ecommerce-app-AI` repo -->
# Copilot / Agent Guidance — ecommerce-app-AI

Summary
- Purpose: Full-stack ecommerce app (Express + React) with Sequelize/Postgres. Backend lives in `server/`, frontend in `client/`.
- Primary flows: API server (`/api/*`) -> controllers -> Sequelize models -> Postgres. Frontend communicates with `/api/*` and is built into `client/build` for production serving by the server.

Quick start (developer)
- Start Postgres (docker): `docker-compose up -d db` (root `docker-compose.yml`).
- Backend (dev): `cd server && npm install && npm run dev` (uses `nodemon`).
- Frontend (dev): `cd client && npm install && npm start` (React dev server at `http://localhost:3000`).
- Production build: `cd client && npm run build` then `cd server && npm start` to serve the static build from `client/build`.

Architecture & important files
- `server/server.js`: entrypoint. Registers routes, configures CORS, serves `client/build` when present, and uses `sequelize.sync({ alter: true })` in startup.
- Routes: `server/routes/*.js` — each route file forwards to controller functions.
- Controllers: `server/controllers/*.js` — request handlers and business logic for each resource (products, users, orders, blogs, categories).
- Models: `server/models/*.js` and `server/models/index.js` — Sequelize models and central export. Migrations live in `server/migrations/` (timestamped filenames).
- Config: `server/config/config.js` (Sequelize config) and `.env` for secrets (DB, JWT_SECRET, CLIENT_URL).
- Uploads: `server/uploads/` served at `/uploads` — used for images and static uploads.

Patterns & conventions agents should follow (project-specific)
- API naming: All API routes are mounted under `/api/*` (see `server/server.js`). Add new resources under `server/routes/` and `server/controllers/` following the same pattern.
- Model changes: Prefer creating Sequelize migrations (timestamped files under `server/migrations/`) rather than only changing models — the repo includes `sequelize-cli` in devDependencies.
- DB in dev: The app uses `sequelize.sync({ alter: true })` on startup which will modify the schema in development. For production or persistent changes, create migrations.
- Authentication: JWT tokens are set in cookies; admin-only pages are protected server-side by checking `req.cookies.token` and decoding JWT (see `server/server.js` admin route guard and `server/middleware/authMiddleware.js`).
- Static serving: When `client/build` exists, Express serves the React app and falls back to redirecting to `CLIENT_URL` during development.
- Seed data: Seeding scripts live in `server/scripts/` and `npm run seed` is available in the server's `package.json`.

Developer flows and commands (examples)
- Start postgres only: `docker-compose up -d db`
- Start backend dev server (hot reload):
  - `cd server; npm install; npm run dev`
- Start frontend dev server:
  - `cd client; npm install; npm start`
- Build frontend for production and run server:
  - `cd client; npm run build`
  - `cd ../server; npm start`

What to edit and where (practical examples)
- Add a new API resource `productsX`:
  - Create `server/controllers/productsXController.js` (exported handlers)
  - Create `server/routes/productsX.js` and mount it in `server/server.js` like other routes
  - Add Sequelize model `server/models/productsX.js` and register it in `server/models/index.js`
  - If schema changes are required for production, add a migration under `server/migrations/`.

Integration & external dependencies
- Postgres: `docker-compose.yml` (service name `db`) — connection configured by `server/config/config.js` via environment variables.
- Sequelize + `sequelize-cli` (dev): migrations and seeders should use `sequelize-cli` conventions.
- Auth: JSON Web Tokens (`jsonwebtoken`) with cookies. Look at `server/middleware/authMiddleware.js`.

Editing guidance for agents
- Small change + unit: make minimal, focused edits and run `server` dev and `client` dev to sanity-check.
- Database changes: avoid relying solely on `sequelize.sync({ alter: true })` for long-term schema changes — add a migration when appropriate.
- Tests: There are no project-wide automated tests in the repo root; run client tests with `cd client && npm test` if needed.

Merging note
- If this file already exists, preserve any existing project-specific rules and merge these instructions into them. Prefer concrete project commands and file references.

If anything here is unclear or you'd like more detail on a part of the codebase (e.g., auth flow, upload handling, or migrations), tell me which area to expand. 
