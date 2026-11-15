import { CustomFieldType } from "@/generated/prisma/client"

/**
 * V32 «Универсальность»: нормализация значений кастомных полей.
 *
 * Форма присылает значение всегда СТРОКОЙ (удобство ввода: 64,5 / 2026-11-17).
 * Здесь тип и варианты SELECT проверяются на сервере — компромисса «просто
 * строка в БД» нет: неверное значение отклоняется с русским сообщением,
 * транзакция создания/правки сделки откатывается целиком.
 */

/** Верхняя граница числа в значении поля (не деньги, но та же санитария). */
const MAX_NUMBER = 1_000_000_000_000

export type CustomFieldDef = {
  type: CustomFieldType
  /** Варианты для SELECT (из Json-колонки). */
  options: string[] | null
}

/**
 * Нормализует значение по типу поля. Пустая/пробельная строка → "" (поле
 * не заполнено, вызывающий код пропускает/удаляет значение).
 * Бросает Error с русским сообщением — его отдаёт errorFormatter (V25).
 */
export function normalizeFieldValue(field: CustomFieldDef, raw: string): string {
  const value = raw.trim()
  if (value === "") return ""

  switch (field.type) {
    case "TEXT":
      return value

    case "NUMBER": {
      // Удобство ru-ввода: запятая и пробелы-разделители («64,5», «1 200»).
      const parsed = Number(value.replace(/\s+/g, "").replace(",", "."))
      if (!Number.isFinite(parsed)) {
        throw new Error("Введите число (например, 64,5)")
      }
      if (Math.abs(parsed) > MAX_NUMBER) {
        throw new Error("Слишком большое число")
      }
      return String(parsed)
    }

    case "DATE": {
      if (Number.isNaN(new Date(value).getTime())) {
        throw new Error("Некорректная дата")
      }
      // Храним как ввёл пользователь («2026-11-17») — без сдвига часовых поясов.
      return value
    }

    case "SELECT": {
      const options = field.options ?? []
      if (!options.includes(value)) {
        throw new Error("Выберите вариант из списка")
      }
      return value
    }
  }
}
