import { describe, expect, it } from "vitest"
import { z } from "zod"
import { ruAuthError } from "@/lib/auth-errors"
import { trpcToastMessage } from "@/server/error-format"
// Side-effect: русская локаль zod (тот же импорт, что в trpc.ts).
import "@/server/zod-ru"

/**
 * V25 «Последняя миля»: всё, что пользователь читает в тостах, — на русском.
 *
 * Дефект был двойной: zod v4 кладёт в `ZodError.message` JSON issues-массива,
 * а tRPC v11 подставляет cause.message как message TRPCError — тост валидации
 * показывал сырой JSON с английскими текстами.
 */

describe("zod-ru: русская локаль сообщений", () => {
  it("дефолтные сообщения на русском, без английских фраз", () => {
    try {
      z.object({ name: z.string().min(1), age: z.number() }).parse({ name: "", age: "x" })
      expect.unreachable("должен был упасть")
    } catch (e) {
      const messages = (e as z.ZodError).issues.map((i) => i.message)
      expect(messages).toContain("Слишком маленькое значение: ожидалось, что string будет иметь >=1 символ")
      expect(messages).toContain("Неверный ввод: ожидалось число, получено string")
      for (const m of messages) expect(m).not.toMatch(/expected|received/i)
    }
  })

  it("склонения локали: >=3 символа", () => {
    try {
      z.string().min(3).parse("ab")
      expect.unreachable("должен был упасть")
    } catch (e) {
      expect((e as z.ZodError).issues[0].message).toBe(
        "Слишком маленькое значение: ожидалось, что string будет иметь >=3 символа"
      )
    }
  })
})

describe("trpcToastMessage: сообщение для тоста", () => {
  const zodCause = (() => {
    try {
      z.object({ name: z.string().min(1), age: z.number() }).parse({ name: "", age: "x" })
      throw new Error("unreachable")
    } catch (e) {
      return e as z.ZodError
    }
  })()

  it("ZodError → русские issues через '; ' (не JSON)", () => {
    const msg = trpcToastMessage({ code: "BAD_REQUEST", message: zodCause.message, cause: zodCause })
    expect(msg).not.toMatch(/^\[/)
    expect(msg).not.toContain('"origin"')
    expect(msg).toBe(
      "Слишком маленькое значение: ожидалось, что string будет иметь >=1 символ; " +
        "Неверный ввод: ожидалось число, получено string"
    )
  })

  it("INTERNAL_SERVER_ERROR → общий русский текст без технических деталей", () => {
    const msg = trpcToastMessage({
      code: "INTERNAL_SERVER_ERROR",
      message: "SQLITE_BUSY: database is locked",
      cause: new Error("SQLITE_BUSY: database is locked"),
    })
    expect(msg).toBe("Внутренняя ошибка сервера. Попробуйте ещё раз")
  })

  it("осмысленные серверные сообщения проходят как есть", () => {
    expect(trpcToastMessage({ code: "UNAUTHORIZED", message: "Требуется авторизация" })).toBe(
      "Требуется авторизация"
    )
    expect(
      trpcToastMessage({
        code: "FORBIDDEN",
        message: "Пользователь с ролью VIEWER может только читать данные",
      })
    ).toBe("Пользователь с ролью VIEWER может только читать данные")
  })
})

describe("ruAuthError: ошибки better-auth на русском", () => {
  it("известные коды маппятся", () => {
    expect(ruAuthError({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe(
      "Неверная почта или пароль"
    )
    expect(ruAuthError({ code: "USER_ALREADY_EXISTS", status: 422 })).toBe(
      "Пользователь с такой почтой уже зарегистрирован"
    )
    expect(ruAuthError({ code: "PASSWORD_TOO_SHORT", status: 400 })).toBe("Слишком короткий пароль")
    expect(ruAuthError({ code: "SESSION_EXPIRED", status: 401 })).toBe(
      "Сессия истекла. Войдите заново"
    )
  })

  it("rate-limit: 429 без code (тело better-auth) → по статусу", () => {
    expect(ruAuthError({ status: 429 })).toBe("Слишком много попыток. Подождите немного")
  })

  it("неизвестный код → общий русский текст", () => {
    expect(ruAuthError({ code: "SOMETHING_NEW", status: 500 })).toBe(
      "Ошибка аутентификации. Попробуйте ещё раз"
    )
    expect(ruAuthError({})).toBe("Ошибка аутентификации. Попробуйте ещё раз")
  })
})
