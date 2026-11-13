/**
 * Деньги — единственный источник денежной арифметики (V26 «Целостность»).
 *
 * Float-артефакты (0.1 × 3 = 0.30000000000000004) не должны гулять по
 * сводкам, строкам счёта и экспорту: `roundMoney` приводит сумму к копейкам.
 * Отображение рублей и так округляет Intl (formatMoney из @/lib/labels),
 * но суммы строк, итоги, сравнения и CSV-экспорт считаются только отсюда —
 * чтобы Итого на печати был ровно суммой напечатанных строк.
 */

/** Округление до копеек (2 знака). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export type MoneyItem = { qty: number; price: number }

/** Сумма строки счёта: qty × price, приведённая к копейкам. */
export function lineTotal(item: MoneyItem): number {
  return roundMoney(item.qty * item.price)
}

/** Итого счёта = сумма приведённых к копейкам строк (стандарт печатных счетов). */
export function invoiceTotal(items: readonly MoneyItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + lineTotal(item), 0))
}
