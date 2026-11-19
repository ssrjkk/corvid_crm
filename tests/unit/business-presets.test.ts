import { describe, expect, it } from "vitest"
import { businessPresets, findBusinessPreset } from "@/lib/business-presets"

/**
 * V36: пресеты — это данные, но данные структурные. Здесь закрепляем
 * инварианты, без которых применение шаблона создало бы мусор:
 * уникальные id, валидные hex-цвета, уникальные имена/лейблы, SELECT с
 * непустыми вариантами. Серверные последствия (идемпотентность, роли,
 * отсутствие фейковых сущностей) — в tests/server/presets.test.ts.
 */
describe("businessPresets: целостность определений", () => {
  it("id уникальны, поиск находит каждый шаблон", () => {
    const ids = businessPresets.map((preset) => preset.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const preset of businessPresets) {
      expect(findBusinessPreset(preset.id)?.name).toBe(preset.name)
    }
  })

  it("в каждом шаблоне есть этапы: уникальные имена и валидный hex", () => {
    for (const preset of businessPresets) {
      expect(preset.stages.length).toBeGreaterThanOrEqual(2)
      const names = preset.stages.map((stage) => stage.name)
      expect(new Set(names).size).toBe(names.length)
      for (const stage of preset.stages) {
        expect(stage.name.trim().length).toBeGreaterThan(0)
        expect(stage.color).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  it("поля уникальны в рамках сущности; SELECT всегда с непустыми вариантами", () => {
    for (const preset of businessPresets) {
      const keys = preset.fields.map((field) => `${field.entityType}:${field.label}`)
      expect(new Set(keys).size).toBe(keys.length)

      for (const field of preset.fields) {
        expect(field.label.trim().length).toBeGreaterThan(0)
        if (field.type === "SELECT") {
          const options = field.options ?? []
          expect(options.length).toBeGreaterThan(0)
          expect(new Set(options).size).toBe(options.length)
          for (const option of options) expect(option.trim().length).toBeGreaterThan(0)
        } else {
          expect(field.options).toBeUndefined()
        }
      }
    }
  })

  it("универсальный шаблон — базовая воронка без отраслевых полей", () => {
    const universal = findBusinessPreset("universal")
    expect(universal?.stages.map((stage) => stage.name)).toEqual([
      "Новая",
      "Переговоры",
      "Договор",
      "Выиграна",
      "Проиграна",
    ])
    expect(universal?.fields).toEqual([])
  })

  it("неизвестный id не ломает поиск", () => {
    expect(findBusinessPreset("no-such-preset")).toBeUndefined()
  })
})
