import { useEffect, useState, useCallback } from "react";

const PAGE_SIZE = 50;

function formatCell(value) {
  if (value === null || value === undefined) return "∅";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Full, unabridged rendering of a single field's value for the detail drawer. */
function FieldValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="row-field__value is-null">∅ null</span>;
  }
  if (typeof value === "object") {
    return <pre className="row-field__value">{JSON.stringify(value, null, 2)}</pre>;
  }
  return <div className="row-field__value">{String(value)}</div>;
}

/**
 * Slide-in drawer showing every column of one row, fully expanded (no
 * truncation) and scrollable — plus prev/next to step through the rows
 * currently loaded without closing it.
 */
function RowDetail({ table, columns, row, index, rowCount, onClose, onPrev, onNext }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && onPrev) onPrev();
      else if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const colNames = columns?.length ? columns.map((c) => c.column_name ?? c) : Object.keys(row);
  const idLabel = row.id ?? row.ID ?? `row ${index + 1}`;

  return (
    <div className="row-detail-backdrop" onClick={onClose}>
      <div className="row-detail" onClick={(e) => e.stopPropagation()}>
        <div className="row-detail__header">
          <div>
            <div className="row-detail__title">
              {table} · {String(idLabel)}
            </div>
            <div className="row-detail__subtitle">
              Row {index + 1} of {rowCount}
            </div>
          </div>
          <div className="row-detail__nav">
            <button disabled={!onPrev} onClick={onPrev} aria-label="Previous row">
              ↑
            </button>
            <button disabled={!onNext} onClick={onNext} aria-label="Next row">
              ↓
            </button>
            <button className="row-detail__close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="row-detail__body">
          {colNames.map((c) => (
            <div className="row-field" key={c}>
              <div className="row-field__label">
                {c}
                {columns?.length ? (
                  <span className="row-field__type">
                    {columns.find((col) => (col.column_name ?? col) === c)?.data_type}
                  </span>
                ) : null}
              </div>
              <FieldValue value={row[c]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DataTable({ columns, rows, onRowClick }) {
  if (!rows.length) {
    return <p className="empty">No rows.</p>;
  }
  const colNames = columns?.length ? columns.map((c) => c.column_name ?? c) : Object.keys(rows[0]);
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {colNames.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={onRowClick ? "is-clickable" : undefined}
              onClick={onRowClick ? () => onRowClick(i) : undefined}
            >
              {colNames.map((c) => (
                <td key={c} title={formatCell(row[c])}>
                  {formatCell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableBrowser({ table }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(null);
  const [dir, setDir] = useState("asc");
  const [loading, setLoading] = useState(false);
  const [detailIndex, setDetailIndex] = useState(null);

  useEffect(() => {
    setOffset(0);
    setSearch("");
    setSort(null);
    setDir("asc");
    setDetailIndex(null);
  }, [table]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset,
      });
      if (search) params.set("search", search);
      if (sort) params.set("sort", sort);
      if (dir) params.set("dir", dir);
      const res = await fetch(`/api/tables/${table}/rows?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load rows");
      setData(json);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [table, offset, search, sort, dir]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSort = (colName) => {
    if (sort === colName) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSort(colName);
      setDir("asc");
    }
  };

  const total = data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search all columns…"
          value={search}
          onChange={(e) => {
            setOffset(0);
            setSearch(e.target.value);
          }}
        />
        <span className="count">{total} row{total === 1 ? "" : "s"}</span>
        <div className="pager">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            ← Prev
          </button>
          <span>
            Page {page} / {pageCount}
          </span>
          <button
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next →
          </button>
        </div>
      </div>

      {error && <p className="error">⚠️ {error}</p>}
      {loading && <p className="loading">Loading…</p>}

      {data && !error && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {data.columns.map((c) => (
                  <th key={c.column_name} onClick={() => toggleSort(c.column_name)}>
                    {c.column_name}
                    {sort === c.column_name ? (dir === "asc" ? " ▲" : " ▼") : ""}
                    <span className="dtype">{c.data_type}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="is-clickable" onClick={() => setDetailIndex(i)}>
                  {data.columns.map((c) => (
                    <td key={c.column_name} title={formatCell(row[c.column_name])}>
                      {formatCell(row[c.column_name])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.rows.length === 0 && <p className="empty">No rows match.</p>}
        </div>
      )}

      {data && detailIndex !== null && data.rows[detailIndex] && (
        <RowDetail
          table={table}
          columns={data.columns}
          row={data.rows[detailIndex]}
          index={detailIndex}
          rowCount={data.rows.length}
          onClose={() => setDetailIndex(null)}
          onPrev={detailIndex > 0 ? () => setDetailIndex(detailIndex - 1) : null}
          onNext={
            detailIndex < data.rows.length - 1 ? () => setDetailIndex(detailIndex + 1) : null
          }
        />
      )}
    </div>
  );
}

function QueryRunner() {
  const [sql, setSql] = useState("SELECT * FROM events ORDER BY id DESC LIMIT 50;");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailIndex, setDetailIndex] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setDetailIndex(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Query failed");
      setResult(json);
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
  };

  return (
    <div>
      <textarea
        className="sql-box"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={onKeyDown}
        rows={6}
        spellCheck={false}
      />
      <div className="toolbar">
        <button className="primary" onClick={run} disabled={loading}>
          {loading ? "Running…" : "Run (⌘/Ctrl + Enter)"}
        </button>
        <span className="hint">Read-only: SELECT / WITH / EXPLAIN / SHOW only</span>
      </div>
      {error && <p className="error">⚠️ {error}</p>}
      {result && !error && (
        <>
          <p className="count">{result.rows.length} row{result.rows.length === 1 ? "" : "s"}</p>
          <DataTable columns={result.columns} rows={result.rows} onRowClick={setDetailIndex} />
        </>
      )}
      {result && detailIndex !== null && result.rows[detailIndex] && (
        <RowDetail
          table="query result"
          columns={null}
          row={result.rows[detailIndex]}
          index={detailIndex}
          rowCount={result.rows.length}
          onClose={() => setDetailIndex(null)}
          onPrev={detailIndex > 0 ? () => setDetailIndex(detailIndex - 1) : null}
          onNext={
            detailIndex < result.rows.length - 1 ? () => setDetailIndex(detailIndex + 1) : null
          }
        />
      )}
    </div>
  );
}

export default function App() {
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("browse"); // "browse" | "query"
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTables(data);
          if (data.length) setSelected(data[0].name);
        } else {
          setError(data.error || "Failed to load tables");
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>SF Events DB</h1>
        <nav>
          <button
            className={mode === "query" ? "nav-item active" : "nav-item"}
            onClick={() => setMode("query")}
          >
            ⌨️ SQL Query
          </button>
        </nav>
        <h2>Tables</h2>
        {error && <p className="error">⚠️ {error}</p>}
        <ul className="table-list">
          {tables.map((t) => (
            <li key={t.name}>
              <button
                className={
                  mode === "browse" && selected === t.name ? "table-item active" : "table-item"
                }
                onClick={() => {
                  setSelected(t.name);
                  setMode("browse");
                }}
              >
                <span>{t.name}</span>
                <span className="row-count">{t.rowCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="content">
        {mode === "query" ? (
          <>
            <h2>SQL Query</h2>
            <QueryRunner />
          </>
        ) : selected ? (
          <>
            <h2>{selected}</h2>
            <TableBrowser table={selected} />
          </>
        ) : (
          <p>No tables found.</p>
        )}
      </main>
    </div>
  );
}
