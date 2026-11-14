import { z } from "zod"
import { CURRENCY_CODE, normalizeCurrencyCode } from "@/lib/currency"

/**
 * Схема валюты для входных данных tRPC (V29 «Валюты»): ровно три латинские
 * буквы, нормализация в верхний регистр ("usd" → "USD"). Раньше было
 * z.string() — в БД уходила любая строка, она попадала в formatMoney,
 * а сводки складывали разные валюты как числа.
 */
export const currencySchema = z
  .string()
  .regex(CURRENCY_CODE, "Валюта — трёхбуквенный код ISO (RUB, USD, EUR)")
  .transform(normalizeCurrencyCode)

export const defaultCurrencySchema = currencySchema.default("RUB")
