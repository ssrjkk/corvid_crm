import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb, seedStages } from "../helpers"

beforeAll(async () => {
  await resetDb()
  await seedStages()
})

describe("pipeline: управление этапами", () => {
  it("createStage добавляет этап с переданным order", async () => {
    const admin = makeCaller("ADMIN")
    const existing = await admin.pipeline.getStages()
    const stage = await admin.pipeline.createStage({
      name: "Оплата",
      color: "#a78bfa",
      order: existing.length,
    })
    const list = await admin.pipeline.getStages()
    expect(list[list.length - 1].name).toBe("Оплата")
    expect(list[list.length - 1].id).toBe(stage.id)
  })

  it("updateStage меняет имя и цвет", async () => {
    const admin = makeCaller("ADMIN")
    const list = await admin.pipeline.getStages()
    const target = list[0]
    const updated = await admin.pipeline.updateStage({
      id: target.id,
      name: "Входящая заявка",
      color: "#22d3ee",
    })
    expect(updated.name).toBe("Входящая заявка")
    expect(updated.color).toBe("#22d3ee")
  })

  it("reorderStages переставляет порядок", async () => {
    const admin = makeCaller("ADMIN")
    const list = await admin.pipeline.getStages()
    const ids = list.map((s) => s.id)
    ;[ids[0], ids[1]] = [ids[1], ids[0]]
    const reordered = await admin.pipeline.reorderStages({ ids })
    expect(reordered[0].id).toBe(ids[0])
    expect(reordered[1].id).toBe(ids[1])
  })

  it("нельзя удалить этап со сделками, пустой — можно", async () => {
    const admin = makeCaller("ADMIN")
    const deal = await admin.deals.create({ title: "Занятый этап" })
    const busyId = deal.stageId as string
    await expect(admin.pipeline.deleteStage({ id: busyId })).rejects.toThrow(/сделок/)

    const empty = await admin.pipeline.createStage({ name: "Пустой" })
    await expect(admin.pipeline.deleteStage({ id: empty.id })).resolves.toBeDefined()
  })

  it("VIEWER не может управлять этапами", async () => {
    const viewer = makeCaller("VIEWER")
    await expect(viewer.pipeline.createStage({ name: "X" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
})

describe("deals.tags", () => {
  it("теги сохраняются и обновляются", async () => {
    const admin = makeCaller("ADMIN")
    const deal = await admin.deals.create({ title: "С тегами", tags: "срочно, крупный" })
    expect(deal.tags).toBe("срочно, крупный")

    const updated = await admin.deals.update({ id: deal.id, tags: "vip" })
    expect(updated.tags).toBe("vip")
  })
})
