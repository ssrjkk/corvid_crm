import { describe, expect, it } from "vitest"
import { parseCsvLines } from "@/lib/csv"

describe("parseCsvLines", () => {
  it("разбирает простые строки с ;", () => {
    expect(parseCsvLines("Имя;Email\nИван;ivan@x.ru")).toEqual([
      ["Имя", "Email"],
      ["Иван", "ivan@x.ru"],
    ])
  })

  it("экранированные кавычки и ; внутри кавычек", () => {
    expect(parseCsvLines('"a;b";"с ""кавычками"""')).toEqual([["a;b", 'с "кавычками"']])
  })

  it("пропускает пустые строки и \r\n", () => {
    expect(parseCsvLines("a;b\r\n\r\nc;d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  it("принимает запятую как разделитель", () => {
    expect(parseCsvLines("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })
})
