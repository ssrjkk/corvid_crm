import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb } from "../helpers"

beforeAll(async () => {
  await resetDb()
})

describe("pipeline.initDefault (инициализация воронки)", () => {
  it("создаёт 5 дефолтных этапов на пустой воронке", async () => {
    const admin = makeCaller("ADMIN")
    expect(await admin.pipeline.getStages()).toHaveLength(0)

    const res = await admin.pipeline.initDefault()
    expect(res.created).toBe(5)

    const stages = await admin.pipeline.getStages()
    expect(stages.map((s) => s.name)).toEqual([
      "Новая",
      "Переговоры",
      "Договор",
      "Выиграна",
      "Проиграна",
    ])
    expect(stages.map((s) => s.order)).toEqual([0, 1, 2, 3, 4])
  })

  it("повторный вызов ничего не создаёт (идемпотентность)", async () => {
    const res = await makeCaller("ADMIN").pipeline.initDefault()
    expect(res.created).toBe(0)
    expect(await makeCaller("VIEWER").pipeline.getStages()).toHaveLength(5)
  })

  it("VIEWER не может инициализировать воронку", async () => {
    await expect(makeCaller("VIEWER").pipeline.initDefault()).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
})
