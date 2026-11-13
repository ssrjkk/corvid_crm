import { describe, expect, it, vi } from "vitest"
import {
  createInvoiceWithNumber,
  formatInvoiceNumber,
  isUniqueViolation,
} from "@/server/invoice-number"

/**
 * V26 «Целостность»: номер счёта INV-0001 по count — при двух одновременных
 * create оба читают одинаковый count → одинаковый номер → P2002. Ретрай
 * с пересчётом номера выдаёт следующий свободный номер (SQLite сериализует
 * запись). Здесь проверяется чистая логика с инъекцией зависимостей —
 * реальную гонку сериально не воспроизвести.
 */
describe("formatInvoiceNumber", () => {
  it("паддинг до 4 знаков", () => {
    expect(formatInvoiceNumber(0)).toBe("INV-0001")
    expect(formatInvoiceNumber(9)).toBe("INV-0010")
    expect(formatInvoiceNumber(123)).toBe("INV-0124")
    expect(formatInvoiceNumber(9999)).toBe("INV-10000")
  })
})

describe("isUniqueViolation", () => {
  it("распознаёт P2002 duck-typing'ом", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true)
    expect(isUniqueViolation({ code: "P2025" })).toBe(false)
    expect(isUniqueViolation(new Error("plain"))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation("P2002")).toBe(false)
  })
})

describe("createInvoiceWithNumber", () => {
  const uniqueError = Object.assign(new Error("Unique constraint failed"), { code: "P2002" })

  it("восстанавливается после гонки: ретрай пересчитывает номер", async () => {
    const numbers = ["INV-0001", "INV-0002"] // первая попытка конфликтует
    const nextNumber = vi.fn(async () => numbers.shift() ?? "INV-0003")
    const create = vi
      .fn<(number: string) => Promise<string>>()
      .mockRejectedValueOnce(uniqueError)
      .mockResolvedValueOnce("ok")

    const result = await createInvoiceWithNumber(3, nextNumber, create)

    expect(result).toBe("ok")
    expect(nextNumber).toHaveBeenCalledTimes(2)
    expect(create.mock.calls.map(([n]) => n)).toEqual(["INV-0001", "INV-0002"])
  })

  it("исчерпание попыток бросает последнюю ошибку", async () => {
    const nextNumber = vi.fn(async () => "INV-0001")
    const create = vi.fn(async () => {
      throw uniqueError
    })

    await expect(createInvoiceWithNumber(3, nextNumber, create)).rejects.toThrow(
      "Unique constraint failed"
    )
    expect(nextNumber).toHaveBeenCalledTimes(3)
    expect(create).toHaveBeenCalledTimes(3)
  })

  it("не-уникальная ошибка пробрасывается сразу, без ретраев", async () => {
    const boom = new Error("connection lost")
    const nextNumber = vi.fn(async () => "INV-0001")
    const create = vi.fn(async () => {
      throw boom
    })

    await expect(createInvoiceWithNumber(3, nextNumber, create)).rejects.toBe(boom)
    expect(nextNumber).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledTimes(1)
  })
})
