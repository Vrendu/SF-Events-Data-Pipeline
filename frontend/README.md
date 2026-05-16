# Plotted — SF events (iPhone web)

React + Vite app wired to the pipeline FastAPI.

## Environment (`frontend/.env`)

Create **`frontend/.env`** (gitignored) with the same secrets as **`backend/.env`**:

| Frontend variable | Backend variable |
|-------------------|------------------|
| `VITE_READ_API_KEY` | `READ_API_KEY` |
| `VITE_MAPBOX_ACCESS_TOKEN` | `MAPBOX_API_KEY` |

Optional: `VITE_API_BASE_URL=/api` (default) — Vite proxies `/api` to `http://127.0.0.1:8000` and attaches `X-API-Key` from `VITE_READ_API_KEY`.

Example:

```env
VITE_API_BASE_URL=/api
VITE_READ_API_KEY=your_read_key
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1I...
```

Restart `npm run dev` after changing env.

## Run

```bash
# Terminal 1
cd backend && uvicorn main:app --reload

# Terminal 2
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 — use device toolbar (iPhone width ~390–430px).

## Layout

The **map** is always the base layer under the header. Expand or collapse the **event list** with the sheet **drag handle**, the **Expand** control, or the collapsed peek area—not the header.
