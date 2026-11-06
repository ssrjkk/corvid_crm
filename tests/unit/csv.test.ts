// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { downloadCsv } from "@/lib/csv"

describe("downloadCsv", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("формирует CSV с BOM, разделителем ; и экранированием кавычек", () => {
    const append = vi.fn()
    const remove = vi.fn()
    const click = vi.fn()

    const captured: { content: string; type: string }[] = []
    vi.stubGlobal("Blob", class {
      constructor(parts: string[], opts: { type: string }) {
        captured.push({ content: parts.join(""), type: opts.type })
      }
    })
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:mock",
      revokeObjectURL: vi.fn(),
    })
    vi.stubGlobal("document", {
      ...document,
      createElement: () => ({
        href: "",
        download: "",
        click,
      }),
      body: { appendChild: append, removeChild: remove },
    })

    downloadCsv("test.csv", [
      ["Имя", "Сумма", "Заметка"],
      ["Иван", 125000, 'Кавычки "внутри"'],
      [null, undefined, "x"],
    ])

    expect(click).toHaveBeenCalledTimes(1)
    expect(append).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledTimes(1)

    const { content, type } = captured[0]
    expect(type).toBe("text/csv;charset=utf-8;")
    expect(content.charCodeAt(0)).toBe(0xfeff) // BOM для Excel
    expect(content).toContain('"Имя";"Сумма";"Заметка"')
    expect(content).toContain('"125000"')
    expect(content).toContain('"Кавычки ""внутри"""') // кавычки удваиваются (RFC 4180)
    expect(content).toContain('"";"";"x"') // null/undefined → пустые ячейки
    expect(content).toContain("\r\n")
  })
})
