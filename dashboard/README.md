# DB Dashboard

A tiny local dashboard for browsing the `EventsData` Postgres database — a
read-only replacement for reaching for `psql`. Lives alongside `backend/`
and `frontend/` but is independent of both.

- `server/` — Express + `pg` API. Every query runs inside a `READ ONLY`
  transaction with a 5s statement timeout, so this can't write to or hang
  the database.
- `client/` — Simple React (Vite) app: a sidebar of tables with row counts,
  a paginated/sortable/searchable table browser, and a raw SQL box
  (`SELECT` / `WITH` / `EXPLAIN` / `SHOW` only).

## Setup (first time)

```bash
cd dashboard/server && npm install
cd ../client && npm install
```

`dashboard/server/.env` already points at `DATABASE_URL` for the local
`EventsData` database (see `.env.example` if you need to point it
elsewhere).

## Run

In two terminals:

```bash
cd dashboard/server && npm start      # API on http://localhost:4400
cd dashboard/client && npm run dev    # UI on http://localhost:4401
```

Open http://localhost:4401.
