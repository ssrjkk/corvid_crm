import { describe, expect, it } from "vitest"
import { permissionsFor } from "@/lib/use-permissions"

describe("permissionsFor (матрица прав, единый источник для UI-гейтов)", () => {
  it("ADMIN: пишет и удаляет", () => {
    expect(permissionsFor("ADMIN")).toEqual({
      canWrite: true,
      canDelete: true,
      isViewer: false,
    })
  })

  it("MANAGER: пишет, но не удаляет", () => {
    expect(permissionsFor("MANAGER")).toEqual({
      canWrite: true,
      canDelete: false,
      isViewer: false,
    })
  })

  it("VIEWER: только читает", () => {
    expect(permissionsFor("VIEWER")).toEqual({
      canWrite: false,
      canDelete: false,
      isViewer: true,
    })
  })

  it("роль недоступна (сессия ещё не загрузилась) — безопасный дефолт: ничего нельзя", () => {
    expect(permissionsFor(null)).toEqual({
      canWrite: false,
      canDelete: false,
      isViewer: false,
    })
  })
})
