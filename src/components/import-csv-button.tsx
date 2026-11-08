"use client"

import { useRef, useState } from "react"
import { FileUp } from "lucide-react"
import { toast } from "sonner"
import { parseCsvLines } from "@/lib/csv"
import { Button } from "@/components/ui/button"

/**
 * Импорт строк из CSV-файла. parseRow получает ячейки строки без заголовка
 * и возвращает input мутации; ошибки отдельных строк не прерывают импорт.
 */
export const MAX_CSV_BYTES = 5 * 1024 * 1024 // защита от гигантских файлов
export function ImportCsvButton({
  importRow,
  onDone,
  label = "Импорт",
}: {
  importRow: (cells: string[]) => Promise<unknown>
  onDone: () => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handleFile = async (file: File) => {
    if (file.size > MAX_CSV_BYTES) {
      toast.error("Файл слишком большой (лимит 5 МБ)")
      if (inputRef.current) inputRef.current.value = ""
      return
    }
    setBusy(true)
    try {
      const text = await file.text()
      const rows = parseCsvLines(text)
      if (rows.length < 2) {
        toast.error("В файле нет строк с данными (нужны заголовок и хотя бы одна строка)")
        return
      }
      let imported = 0
      let failed = 0
      for (const cells of rows.slice(1)) {
        try {
          await importRow(cells)
          imported++
        } catch {
          failed++
        }
      }
      toast.success(`Импортировано: ${imported}${failed ? `, пропущено: ${failed}` : ""}`)
      onDone()
    } catch {
      toast.error("Не удалось прочитать файл")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
      <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        <FileUp className="mr-2 h-4 w-4" />
        {busy ? "Импорт…" : label}
      </Button>
    </>
  )
}
