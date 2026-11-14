import { roundMoney } from "./money"

/**
 * Валюты (V29): коды ISO-4217 — ровно три латинские буквы, хранятся в верхнем
 * регистре. Сводки НЕ смешивают валюты: рубли и доллары складываются только
 * внутри своей валюты (раньше getSummary и сводки счетов складывали value
 * разных валют как числа).
 */

export const CURRENCY_CODE = /^[a-zA-Z]{3}$/

export function normalizeCurrencyCode(raw: string): string {
  return raw.toUpperCase()
}

export type MoneyWithCurrency = { amount: number; currency: string }

export type CurrencyTotal = { currency: string; total: number }

/**
 * Сумма по валютам: группирует, приводит к копейкам (правило V26),
 * сортирует по убыванию суммы (основная валюта первой), при равенстве —
 * лексикографически по коду (стабильный порядок для UI).
 */
export function sumByCurrency(items: readonly MoneyWithCurrency[]): CurrencyTotal[] {
  const map = new Map<string, number>()
  for (const { amount, currency } of items) {
    const key = normalizeCurrencyCode(currency)
    map.set(key, roundMoney((map.get(key) ?? 0) + amount))
  }
  return [...map.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total || a.currency.localeCompare(b.currency))
}
