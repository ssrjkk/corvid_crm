import { beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { businessPresets } from "@/lib/business-presets"
import { makeCaller, resetDb } from "../helpers"

/**
 * V36 «Пресеты бизнеса»: серверная семантика применения.
 * Законы: admin-only, аддитивность (ничего не менять/не удалять),
 * идемпотентность, продолжение order, НОЛЬ выдуманных сущностей.
 */

beforeEach(async () => {
  await resetDb()
})

describe("presets.applyPreset: отраслевые шаблоны", () => {
  it("агентство создаёт этапы и поля, но ни одной фейковой сущности", async () => {
    const admin = makeCaller("ADMIN")
    const result = await admin.presets.applyPreset({ presetId: "agency" })

    expect(result).toEqual({
      stagesCreated: 6,
      stagesSkipped: 0,
      fieldsCreated: 3,
      fieldsSkipped: 0,
    })

    const stages = await admin.pipeline.getStages()
    expect(stages.map((stage) => stage.name)).toEqual([
      "Заявка",
      "Бриф",
      "Смета",
      "В работе",
      "Сдача",
      "Закрыта",
    ])
    expect(stages.map((stage) => stage.order)).toEqual([0, 1, 2, 3, 4, 5])

    const fields = await prisma.customField.findMany({
      orderBy: [{ entityType: "asc" }, { order: "asc" }],
    })
    expect(fields.map((field) => `${field.entityType}:${field.label}:${field.type}`)).toEqual([
      "COMPANY:ИНН:TEXT",
      "DEAL:Источник заявки:SELECT",
      "DEAL:Срок сдачи:DATE",
    ])
    expect(fields.find((field) => field.label === "Источник заявки")?.options).toEqual([
      "Сайт",
      "Рекомендация",
      "Соцсети",
      "Повторный клиент",
    ])

    expect(await prisma.deal.count()).toBe(0)
    expect(await prisma.company.count()).toBe(0)
    expect(await prisma.contact.count()).toBe(0)
  })

  it("повторное применение идемпотентно: 0 создано, всё пропущено", async () => {
    const admin = makeCaller("ADMIN")
    await admin.presets.applyPreset({ presetId: "agency" })

    const again = await admin.presets.applyPreset({ presetId: "agency" })
    expect(again).toEqual({
      stagesCreated: 0,
      stagesSkipped: 6,
      fieldsCreated: 0,
      fieldsSkipped: 3,
    })
    expect(await prisma.pipelineStage.count()).toBe(6)
    expect(await prisma.customField.count()).toBe(3)
  })

  it("существующие этап и поле пропускаются без переименования и смены цвета", async () => {
    const admin = makeCaller("ADMIN")
    const existingStage = await admin.pipeline.createStage({
      name: "Заявка",
      color: "#111111",
      order: 0,
    })
    await admin.customFields.create({
      entityType: "DEAL",
      label: "Адрес объекта",
      type: "TEXT",
    })

    const result = await admin.presets.applyPreset({ presetId: "realty" })
    expect(result).toEqual({
      stagesCreated: 4,
      stagesSkipped: 1,
      fieldsCreated: 2,
      fieldsSkipped: 1,
    })

    const stage = await prisma.pipelineStage.findUniqueOrThrow({
      where: { id: existingStage.id },
    })
    expect(stage.name).toBe("Заявка")
    expect(stage.color).toBe("#111111")
    expect(stage.order).toBe(0)

    const addresses = await prisma.customField.findMany({
      where: { entityType: "DEAL", label: "Адрес объекта" },
    })
    expect(addresses).toHaveLength(1)
    expect(addresses[0].type).toBe("TEXT")
  })

  it("новые этапы продолжают максимальный order, а не начинают с нуля", async () => {
    const admin = makeCaller("ADMIN")
    await admin.pipeline.createStage({
      name: "Существующий",
      color: "#111111",
      order: 7,
    })

    const result = await admin.presets.applyPreset({ presetId: "universal" })
    expect(result.stagesCreated).toBe(5)

    const stages = await admin.pipeline.getStages()
    expect(stages.map((stage) => stage.order)).toEqual([7, 8, 9, 10, 11, 12])
  })

  it("все шаблоны вместе создают только определения и ничего выдуманного", async () => {
    const admin = makeCaller("ADMIN")
    for (const preset of businessPresets) {
      await admin.presets.applyPreset({ presetId: preset.id })
    }

    expect(await prisma.deal.count()).toBe(0)
    expect(await prisma.company.count()).toBe(0)
    expect(await prisma.contact.count()).toBe(0)
    expect(await prisma.pipelineStage.count()).toBe(22)
    expect(await prisma.customField.count()).toBe(11)

    const stages = await admin.pipeline.getStages()
    expect(stages.map((stage) => stage.order)).toEqual(
      Array.from({ length: 22 }, (_, index) => index)
    )
  })

  it("применять шаблон может только ADMIN", async () => {
    await expect(
      makeCaller("MANAGER").presets.applyPreset({ presetId: "agency" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(
      makeCaller("VIEWER").presets.applyPreset({ presetId: "agency" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(
      makeCaller("ANON").presets.applyPreset({ presetId: "agency" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("неизвестный шаблон отклоняется на валидации", async () => {
    await expect(
      makeCaller("ADMIN").presets.applyPreset({ presetId: "no-such-preset" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
