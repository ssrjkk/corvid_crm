/**
 * Генерация номера счёта, устойчивая к гонке (V26 «Целостность»).
 *
 * Номер = INV-0001 по количеству уже существующих счетов. Два одновременных
 * create читают одинаковый count → одинаковый номер → UNIQUE-конфликт (P2002).
 * SQLite сериализует запись, поэтому ретрай с ПЕРЕСЧЁТОМ номера после
 * коммита конкурента корректно выдаёт следующий свободный номер.
 */

/** INV-0001 по количеству существующих счетов. */
export function formatInvoiceNumber(count: number): string {
  return `INV-${String(count + 1).padStart(4, "0")}`
}

/**
 * Уникальное нарушение Prisma (P2002), определяемое без импорта класса
 * ошибки (duck-typing по полю code) — устойчиво к версии Prisma.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  )
}

/**
 * Создаёт счёт с ретраем на гонке номера. `nextNumber` вызывается ЗАНОВО
 * на каждой попытке (пересчитывает count); `create` получает готовый номер.
 * Не-уникальные ошибки пробрасываются сразу, исчерпание попыток — последняя.
 */
export async function createInvoiceWithNumber<T>(
  attempts: number,
  nextNumber: () => Promise<string>,
  create: (number: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await create(await nextNumber())
    } catch (error) {
      lastError = error
      if (!isUniqueViolation(error)) throw error
    }
  }
  throw lastError
}
