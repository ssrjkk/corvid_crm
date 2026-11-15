import { z } from "zod"

/**
 * V31 «ВВОД»: переиспользуемые схемы валидации входа tRPC.
 *
 * До V31: whitespace-заголовки ("   ") проходили z.string().min(1),
 * у строк не было лимитов вообще (в БД уходили мегабайты),
 * value принимал отрицательные суммы, а битые date-строки доезжали
 * до new Date() → Invalid Date → «Внутренняя ошибка» вместо тоста.
 *
 * Все сообщения — на русском: их показывает errorFormatter (V25),
 * zod-локаль подставляет русские дефолты для остальных случаев.
 * Правка в этом файле распространяется на все роутеры сразу.
 */

export const LIMITS = {
  /** Заголовки/названия (сделки, задачи, этапы, позиции счёта). */
  title: 200,
  /** Длинные тексты (описания, содержание активностей). */
  text: 2000,
  /** Заметки к счетам. */
  note: 1000,
  /** Телефоны. */
  phone: 64,
  /** Короткие имена (фамилия, должность). */
  shortName: 120,
  /** RFC-максимум email. */
  email: 254,
  /** Сайт компании (без проверки формата — «grafit.studio» валиден). */
  website: 200,
  /** Адрес компании. */
  address: 300,
  /** Строка тегов сделки. */
  tags: 500,
  /** Позиций в счёте. */
  invoiceItems: 100,
  /** Верхняя граница суммы: 1 триллион. */
  money: 1_000_000_000_000,
} as const

/** Стандартный заголовок (сделки, задачи): обрезка пробелов + 1..200. */
export const titleSchema = requiredText("название")

/** Деньги: неотрицательная конечная сумма (NaN z.number() отсекает сам). */
export const moneySchema = z
  .number()
  .min(0, "Сумма не может быть отрицательной")
  .max(LIMITS.money, "Сумма слишком велика")

/**
 * Обязательный текст с обрезкой пробелов. «   » больше не проходит
 * как валидный заголовок — раньше min(1) пропускал whitespace-мусор.
 */
export function requiredText(label: string, max: number = LIMITS.title) {
  return z
    .string()
    .trim()
    .min(1, `Укажите ${label}`)
    .max(max, `${label[0]?.toUpperCase() ?? ""}${label.slice(1)} — до ${max} символов`)
}

/** Опциональный текст с лимитом (описания, заметки). */
export function optionalText(max: number = LIMITS.text) {
  return z.string().trim().max(max, `Текст — до ${max} символов`).optional()
}

/** Опциональный обнуляемый текст (описания в update-путях). */
export function optionalNullableText(max: number = LIMITS.text) {
  return optionalText(max).nullable()
}

/** Email: обрезка, RFC-лимит; пустая строка по-прежнему означает «нет». */
export const emailSchema = z
  .string()
  .trim()
  .max(LIMITS.email, `Email — до ${LIMITS.email} символов`)
  .email("Некорректный email")
  .optional()
  .or(z.literal(""))

/** Телефон: только лимит — форматов слишком много для регексов. */
export const phoneSchema = z
  .string()
  .trim()
  .max(LIMITS.phone, `Телефон — до ${LIMITS.phone} символов`)
  .optional()

/** Короткие имена: фамилия, должность. */
export const shortTextSchema = z
  .string()
  .trim()
  .max(LIMITS.shortName, `До ${LIMITS.shortName} символов`)
  .optional()

/** Сайт компании: только лимит, без URL-проверки («grafit.studio» валиден). */
export const websiteSchema = z
  .string()
  .trim()
  .max(LIMITS.website, `Сайт — до ${LIMITS.website} символов`)
  .optional()

/** Адрес компании. */
export const addressSchema = z
  .string()
  .trim()
  .max(LIMITS.address, `Адрес — до ${LIMITS.address} символов`)
  .optional()

/** Строка тегов сделки. */
export const tagsSchema = z
  .string()
  .trim()
  .max(LIMITS.tags, `Теги — до ${LIMITS.tags} символов`)
  .optional()

/** Обнуляемые теги для update-путей. */
export const optionalNullableTagsSchema = tagsSchema.nullable()

/**
 * Дата-строка: «2026-11-17» ок, «не дата» — русский тост вместо
 * Invalid Date → Prisma-краша → «Внутренняя ошибка».
 */
export const dateStringSchema = z
  .string()
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Некорректная дата")

/** Опциональная дата-строка (create-пути; роутер конвертирует в Date). */
export const optionalDateStringSchema = dateStringSchema.optional()

/** Опциональная обнуляемая дата-строка (update-пути; null = снять дату). */
export const optionalNullableDateStringSchema = dateStringSchema
  .optional()
  .nullable()

/**
 * Цвет этапа: hex вида #RRGGBB (данные пользователя из <input type=color>,
 * задокументированное исключение). Раньше принималась любая строка.
 */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Цвет — hex вида #RRGGBB")
  .optional()

/** Позиция счёта: имя с лимитом, qty > 0, цена ≥ 0. */
export const invoiceItemSchema = z.object({
  name: requiredText("наименование позиции"),
  qty: z
    .number()
    .positive("Количество — больше нуля")
    .max(1_000_000, "Количество слишком велико")
    .default(1),
  price: moneySchema.default(0),
})

/** Позиции счёта: минимум одна, максимум — лимит ресурса. */
export const invoiceItemsSchema = z
  .array(invoiceItemSchema)
  .min(1, "Добавьте хотя бы одну позицию")
  .max(LIMITS.invoiceItems, `Не больше ${LIMITS.invoiceItems} позиций в счёте`)
