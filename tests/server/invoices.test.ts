import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb } from "../helpers"

beforeAll(async () => {
  await resetDb()
})

describe("invoices.create", () => {
  it("номер присваивается автоматически и растёт", async () => {
    const caller = makeCaller("ADMIN")
    const first = await caller.invoices.create({
      items: [{ name: "Работы", qty: 2, price: 50000 }],
    })
    expect(first.number).toBe("INV-0001")

    const second = await caller.invoices.create({
      items: [{ name: "Ещё работы", qty: 1, price: 1000 }],
    })
    expect(second.number).toBe("INV-0002")
  })

  it("позиции сохраняются с суммой qty × price", async () => {
    const caller = makeCaller("ADMIN")
    const invoice = await caller.invoices.create({
      note: "Оплата в течение 5 дней",
      items: [
        { name: "Дизайн", qty: 1, price: 30000 },
        { name: "Вёрстка", qty: 3, price: 10000 },
      ],
    })
    expect(invoice.items).toHaveLength(2)
    const total = invoice.items.reduce((sum, item) => sum + item.qty * item.price, 0)
    expect(total).toBe(60000)
    expect(invoice.note).toBe("Оплата в течение 5 дней")
    expect(invoice.status).toBe("DRAFT")
  })
})

describe("invoices.create: целостность номеров (V26)", () => {
  it("серия создаёт уникальные возрастающие номера", async () => {
    const caller = makeCaller("ADMIN")
    // К этому моменту первый describe уже создал INV-0001…INV-0003.
    const fourth = await caller.invoices.create({
      items: [{ name: "Работы", qty: 1, price: 100 }],
    })
    expect(fourth.number).toBe("INV-0004")

    const fifth = await caller.invoices.create({
      items: [{ name: "Работы", qty: 1, price: 100 }],
    })
    expect(fifth.number).toBe("INV-0005")
    expect(fifth.number).not.toBe(fourth.number)
  })

  it("после удаления номера не конфликтуют (UNIQUE), счёт создаётся", async () => {
    const caller = makeCaller("ADMIN")
    const victim = await caller.invoices.create({
      items: [{ name: "Работы", qty: 1, price: 100 }],
    })
    await caller.invoices.delete({ id: victim.id })

    // Семантика «номер по количеству»: следующий счёт может занять номер
    // удалённого — это допустимо, UNIQUE-конфликта быть не должно.
    const again = await caller.invoices.create({
      items: [{ name: "Работы", qty: 1, price: 100 }],
    })
    expect(again.number).toMatch(/^INV-\d{4}$/)
  })
})

describe("invoices.updateStatus", () => {
  it("PAID ставит paidAt, возврат в DRAFT сбрасывает", async () => {
    const caller = makeCaller("ADMIN")
    const invoice = await caller.invoices.create({
      items: [{ name: "Разработка", qty: 1, price: 45000 }],
    })

    const paid = await caller.invoices.updateStatus({ id: invoice.id, status: "PAID" })
    expect(paid.status).toBe("PAID")
    expect(paid.paidAt).not.toBeNull()

    const draft = await caller.invoices.updateStatus({ id: invoice.id, status: "DRAFT" })
    expect(draft.status).toBe("DRAFT")
    expect(draft.paidAt).toBeNull()
  })
})

describe("invoices.delete", () => {
  it("удаляет счёт вместе с позициями (cascade)", async () => {
    const caller = makeCaller("ADMIN")
    const invoice = await caller.invoices.create({
      items: [
        { name: "A", qty: 1, price: 1 },
        { name: "B", qty: 2, price: 2 },
      ],
    })
    await caller.invoices.delete({ id: invoice.id })
    const found = await caller.invoices.getById({ id: invoice.id })
    expect(found).toBeNull()
  })

  it("регресс V22: VIEWER и MANAGER не могут удалять счёт (право только у ADMIN)", async () => {
    const admin = makeCaller("ADMIN")
    const invoice = await admin.invoices.create({
      items: [{ name: "A", qty: 1, price: 1 }],
    })
    await expect(
      makeCaller("VIEWER").invoices.delete({ id: invoice.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(
      makeCaller("MANAGER").invoices.delete({ id: invoice.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    // Счёт пережил обе попытки и удаляется только админом
    expect(await admin.invoices.getById({ id: invoice.id })).not.toBeNull()
  })
})

describe("invoices.getById", () => {
  it("несуществующий счёт — null", async () => {
    const caller = makeCaller("VIEWER")
    expect(await caller.invoices.getById({ id: "ghost" })).toBeNull()
  })
})
