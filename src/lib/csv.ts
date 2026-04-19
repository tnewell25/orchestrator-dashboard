// Tiny CSV exporter — no library, no streaming, just enough for list-page exports.
// Quotes any cell containing comma/quote/newline; escapes embedded quotes.

function escape(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  const s = typeof cell === "string" ? cell : String(cell);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCsv<T extends object>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; header: string; format?: (v: T[keyof T]) => string }[],
) {
  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = c.format ? c.format(row[c.key]) : row[c.key];
      return escape(val);
    }).join(","),
  ).join("\n");
  const blob = new Blob(["\ufeff" + header + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
