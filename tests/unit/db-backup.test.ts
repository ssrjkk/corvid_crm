import { describe, expect, it } from "vitest"
import { backupFileName, selectBackupsToDelete } from "../../scripts/db-backup.mjs"

/**
 * V27 «Ресурсы»: чистая логика db:backup — ротация «хранить N свежих»
 * и формат имени. Сам скрипт (checkpoint + копия) гоняется только вручную
 * через npm run db:backup и в тестах не выполняется.
 */
describe("selectBackupsToDelete", () => {
  const files = [
    "corvid-20261114-103000.db",
    "corvid-20261113-220001.db",
    "corvid-20261112-091500.db",
    "corvid-20261111-180045.db",
  ]

  it("хранит keep самых свежих, удаляет остальные", () => {
    expect(selectBackupsToDelete(files, 2)).toEqual([
      "corvid-20261112-091500.db",
      "corvid-20261111-180045.db",
    ])
  })

  it("keep больше количества — удалять нечего", () => {
    expect(selectBackupsToDelete(files, 10)).toEqual([])
    expect(selectBackupsToDelete(files, files.length)).toEqual([])
  })

  it("keep = 0 удаляет всё", () => {
    expect(selectBackupsToDelete(files, 0)).toHaveLength(4)
  })

  it("пустой список — пустое удаление", () => {
    expect(selectBackupsToDelete([], 3)).toEqual([])
  })

  it("лексикографический порядок имён = хронологический (формат таймстампа)", () => {
    const rotated = [...files].sort()
    expect(rotated[0]).toBe("corvid-20261111-180045.db")
    expect(rotated[rotated.length - 1]).toBe("corvid-20261114-103000.db")
  })
})

describe("backupFileName", () => {
  it("формат corvid-YYYYMMDD-HHmmss.db с паддингом", () => {
    const name = backupFileName(new Date(2026, 10, 14, 9, 5, 3))
    expect(name).toBe("corvid-20261114-090503.db")
    expect(name).toMatch(/^corvid-\d{8}-\d{6}\.db$/)
  })

  it("имя сортируется по времени: позднее — больше", () => {
    const earlier = backupFileName(new Date(2026, 10, 14, 9, 5, 3))
    const later = backupFileName(new Date(2026, 10, 14, 21, 5, 3))
    expect(later > earlier).toBe(true)
  })
})
