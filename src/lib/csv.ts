type CsvCell = string | number | null | undefined

/**
 * Builds a UTF-8 CSV (semicolon separated, BOM for Excel) and triggers download.
 * Must be called from a client-side event handler.
 *
 * Защита от CSV-инъекций (CWE-1236): ячейка, начинающаяся с `= + - @` (после
 * пробелов тоже), Tab или CR, получает префикс `'` — Excel/LibreOffice трактуют
 * её как текст, а не формулу. Побочный эффект: телефоны "+7..." хранятся как
 * текст — для телефонов это правильно (иначе Excel съедает плюс).
 */
const INJECTION_LEAD = /^[\s]*[=+\-@\t\r]/

function escapeCell(cell: CsvCell): string {
  const value = cell == null ? "" : String(cell)
  const safe = INJECTION_LEAD.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const content =
    "\uFEFF" +
    rows.map((row) => row.map(escapeCell).join(";")).join("\r\n")

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Разбирает текст CSV (разделитель `;`, поддержка кавычек) в строки ячеек.
 * Чистая функция — используется импортом и unit-тестами.
 */
export function parseCsvLines(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  const pushCell = () => {
    row.push(cell)
    cell = ""
  }
  const pushRow = () => {
    pushCell()
    if (row.some((c) => c.trim() !== "")) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ";" || char === ",") {
      pushCell()
    } else if (char === "\n") {
      pushRow()
    } else if (char !== "\r") {
      cell += char
    }
  }
  if (cell !== "" || row.length > 0) pushRow()
  return rows
}
