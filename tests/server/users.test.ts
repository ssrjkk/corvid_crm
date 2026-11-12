import { describe, expect, it } from "vitest"
import { createCallerFactory, type Context } from "@/server/trpc"
import { appRouter } from "@/server/routers/_app"
import { makeCaller } from "../helpers"

describe("users.me (источник роли для UI-гейтов)", () => {
  it("возвращает роль из контекста", async () => {
    const me = await makeCaller("MANAGER").users.me()
    expect(me.role).toBe("MANAGER")
  })

  it("роль отсутствует в контексте — fail-safe фолбэк VIEWER", async () => {
    const factory = createCallerFactory(appRouter)
    const caller = factory({
      user: { id: "u1", name: "Без роли", email: "norole@test.local" },
    } as unknown as Context)
    const me = await caller.users.me()
    expect(me.role).toBe("VIEWER")
  })

  it("без сессии — UNAUTHORIZED", async () => {
    await expect(makeCaller("ANON").users.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })
  })
})
