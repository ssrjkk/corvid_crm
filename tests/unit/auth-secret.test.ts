import { afterEach, describe, expect, it, vi } from "vitest"

describe("auth secret (fail-closed)", () => {
  const OLD_ENV = process.env.NODE_ENV
  const OLD_SECRET = process.env.BETTER_AUTH_SECRET

  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV
    if (OLD_SECRET === undefined) {
      delete process.env.BETTER_AUTH_SECRET
    } else {
      process.env.BETTER_AUTH_SECRET = OLD_SECRET
    }
    vi.resetModules()
  })

  it("в production без секрета падает сразу, а не раздаёт forgeable-сессии", async () => {
    process.env.NODE_ENV = "production"
    delete process.env.BETTER_AUTH_SECRET
    vi.resetModules()
    await expect(import("@/lib/auth")).rejects.toThrow(/BETTER_AUTH_SECRET/)
  })

  it("в production с секретом модуль грузится", async () => {
    process.env.NODE_ENV = "production"
    process.env.BETTER_AUTH_SECRET = "test-secret-for-unit"
    vi.resetModules()
    const mod = await import("@/lib/auth")
    expect(mod.auth).toBeDefined()
  })
})
