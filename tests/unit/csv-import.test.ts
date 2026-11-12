import { describe, expect, it } from "vitest"
import { importCsvRows, EmptyCsvError } from "@/lib/csv"

describe("importCsvRows (логика импорта из ImportCsvButton)", () => {
  it("пропускает заголовок, считает импортированные и неудачные строки", async () => {
    const seen: string[][] = []
    const res = await importCsvRows(
      "Имя;Email\nИван;ivan@x.ru\nМария;m@x.ru\nПётр;p@x.ru",
      async (cells) => {
        if (cells[0] === "Пётр") throw new Error("дубликат")
        seen.push(cells)
      }
    )
    expect(res).toEqual({ imported: 2, failed: 1 })
    expect(seen).toEqual([
      ["Иван", "ivan@x.ru"],
      ["Мария", "m@x.ru"],
    ])
  })

  it("ошибка отдельной строки не прерывает импорт остальных", async () => {
    let calls = 0
    const res = await importCsvRows("a;b\n1;2\n3;4\n5;6", async () => {
      calls++
      throw new Error("всегда падаю")
    })
    expect(calls).toBe(3)
    expect(res).toEqual({ imported: 0, failed: 3 })
  })

  it("файл только с заголовком — EmptyCsvError с понятным текстом", async () => {
    await expect(importCsvRows("Имя;Email", async () => {})).rejects.toBeInstanceOf(
      EmptyCsvError
    )
    await expect(importCsvRows("", async () => {})).rejects.toThrow(/нет строк/)
  })
})
