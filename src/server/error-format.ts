import { ZodError } from "zod"

/**
 * Человекочитаемое сообщение ошибки tRPC для тостов.
 *
 * Два документированных дефекта (V25), которые закрывает эта функция:
 *
 * 1. zod v4: `ZodError.message` — это JSON всего issues-массива, не строка
 *    (проверено пробой: JSON.stringify(issues)). tRPC v11 при провале
 *    парсинга ввода кидает `TRPCError({ code: "BAD_REQUEST", cause })`
 *    БЕЗ message, а конструктор берёт message из cause — итог: тост
 *    показывал сырой JSON `[{"origin":"string",...}]`. Здесь: русские
 *    сообщения (локаль zod-ru) всех issues через "; ".
 *
 * 2. INTERNAL_SERVER_ERROR: технические тексты (Prisma/SQLite и т.п.)
 *    не должны утекать в тост пользователю — общий русский текст;
 *    причину пишет в лог сервера errorFormatter (в trpc.ts).
 */
export function trpcToastMessage(error: {
  code: string
  message: string
  cause?: unknown
}): string {
  if (error.cause instanceof ZodError) {
    const messages = error.cause.issues.map((issue) => issue.message)
    return messages.length > 0 ? messages.join("; ") : error.message
  }

  if (error.code === "INTERNAL_SERVER_ERROR") {
    return "Внутренняя ошибка сервера. Попробуйте ещё раз"
  }

  return error.message
}
