import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb, seedStages } from "../helpers"

beforeAll(async () => {
  await resetDb()
})

describe("Контроль доступа", () => {
  it("без сессии любой вызов отклоняется с UNAUTHORIZED", async () => {
    const caller = makeCaller("ANON")
    await expect(caller.deals.getAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    await expect(caller.invoices.getAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("VIEWER может читать, но не может писать", async () => {
    await seedStages()
    const viewer = makeCaller("VIEWER")
    await expect(viewer.deals.getAll()).resolves.toBeDefined()
    await expect(
      viewer.deals.create({ title: "Сделка зрителя" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("MANAGER может создавать, но не может удалять", async () => {
    const manager = makeCaller("MANAGER")
    const deal = await manager.deals.create({ title: "Сделка менеджера" })
    await expect(manager.deals.delete({ id: deal.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })

  it("ADMIN удаляет свободно", async () => {
    const admin = makeCaller("ADMIN")
    const deal = await admin.deals.create({ title: "Сделка админа" })
    await expect(admin.deals.delete({ id: deal.id })).resolves.toBeDefined()
  })
})
