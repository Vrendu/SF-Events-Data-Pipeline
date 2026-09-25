import "dotenv/config";
import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "❌ DATABASE_URL is not set. Create dashboard/server/.env (see .env.example)."
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4400;

// Every request gets its own read-only, time-limited transaction so this
// dashboard can never accidentally mutate or hang the database.
async function withReadOnlyClient(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    await client.query("SET LOCAL statement_timeout = 5000");
    const result = await fn(client);
    await client.query("ROLLBACK");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

// GET /api/tables — list user tables with row counts.
app.get("/api/tables", async (req, res) => {
  try {
    const result = await withReadOnlyClient(async (client) => {
      const { rows: tables } = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      const counts = await Promise.all(
        tables.map(async ({ table_name }) => {
          const { rows } = await client.query(
            `SELECT COUNT(*)::int AS count FROM ${quoteIdent(table_name)}`
          );
          return { name: table_name, rowCount: rows[0].count };
        })
      );
      return counts;
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tables/:table/columns — column metadata for a table.
app.get("/api/tables/:table/columns", async (req, res) => {
  try {
    const columns = await withReadOnlyClient(async (client) => {
      const { rows: valid } = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [req.params.table]
      );
      if (valid.length === 0) return null;
      const { rows } = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [req.params.table]
      );
      return rows;
    });
    if (columns === null) return res.status(404).json({ error: "Unknown table" });
    res.json(columns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tables/:table/rows — paginated, sortable, searchable rows.
app.get("/api/tables/:table/rows", async (req, res) => {
  const { table } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const sort = req.query.sort;
  const dir = req.query.dir === "desc" ? "DESC" : "ASC";
  const search = (req.query.search || "").trim();

  try {
    const result = await withReadOnlyClient(async (client) => {
      const { rows: cols } = await client.query(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      if (cols.length === 0) return null;

      const columnNames = cols.map((c) => c.column_name);
      const sortCol = columnNames.includes(sort) ? sort : columnNames[0];

      let where = "";
      const params = [];
      if (search) {
        // Search across every text-ish column, cast to text so it also
        // matches things like array or numeric columns.
        const clauses = columnNames.map(
          (c) => `${quoteIdent(c)}::text ILIKE $1`
        );
        where = `WHERE ${clauses.join(" OR ")}`;
        params.push(`%${search}%`);
      }

      const { rows: countRows } = await client.query(
        `SELECT COUNT(*)::int AS count FROM ${quoteIdent(table)} ${where}`,
        params
      );

      const { rows } = await client.query(
        `SELECT * FROM ${quoteIdent(table)} ${where}
         ORDER BY ${quoteIdent(sortCol)} ${dir}
         LIMIT ${limit} OFFSET ${offset}`,
        params
      );

      return { columns: cols, rows, total: countRows[0].count, sortCol, dir };
    });
    if (result === null) return res.status(404).json({ error: "Unknown table" });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/query { sql } — run an arbitrary read-only query.
app.post("/api/query", async (req, res) => {
  const sql = (req.body?.sql || "").trim();
  if (!sql) return res.status(400).json({ error: "Missing sql" });

  // Only allow a single read-only statement. The transaction is READ ONLY
  // too, so this is defense in depth rather than the only guard.
  const withoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)+/g, "").trim();
  const firstWord = withoutLeadingComments.split(/\s+/)[0]?.toLowerCase();
  if (!["select", "with", "explain", "show"].includes(firstWord)) {
    return res
      .status(400)
      .json({ error: "Only SELECT / WITH / EXPLAIN / SHOW statements are allowed" });
  }
  if (sql.includes(";") && sql.trim().indexOf(";") !== sql.trim().length - 1) {
    return res.status(400).json({ error: "Only a single statement is allowed" });
  }

  try {
    const result = await withReadOnlyClient(async (client) => {
      const { rows, fields } = await client.query(sql);
      return { rows, columns: fields.map((f) => f.name) };
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`📊 Dashboard API listening on http://localhost:${PORT}`);
});
