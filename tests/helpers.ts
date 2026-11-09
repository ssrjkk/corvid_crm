import { prisma } from "@/lib/prisma"
import { createCallerFactory, type Context } from "@/server/trpc"
import { appRouter } from "@/server/routers/_app"
import type { UserRole } from "@/generated/prisma/client"

/** Очищает бизнес-таблицы в порядке, безопасном по внешним ключам. */
export async function resetDb() {
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.pipelineStage.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.company.deleteMany()
}

/** Стандартные этапы воронки, как в рабочей базе. */
export async function seedStages() {
  const stages = ["Новая", "Переговоры", "Договор", "Выиграна", "Проиграна"]
  for (const [index, name] of stages.entries()) {
    await prisma.pipelineStage.create({
      data: { name, order: index, color: "#94a3b8" },
    })
  }
  return prisma.pipelineStage.findMany({ orderBy: { order: "asc" } })
}

export async function seedCompany() {
  return prisma.company.create({
    data: { name: "ООО Тест", email: "test@example.com" },
  })
}

const baseUser = {
  id: "test-user",
  name: "Тест Пользователь",
  email: "user@test.local",
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

/**
 * Вызывает роутер от имени пользователя с заданной ролью.
 * Контент-то же самое, что выдаёт createContext для живой сессии.
 */
export function makeCaller(role: UserRole | "ANON" = "ADMIN") {
  const factory = createCallerFactory(appRouter)
  if (role === "ANON") return factory({ user: null } as unknown as Context)
  return factory({
    user: { ...baseUser, role },
  } as unknown as Context)
}
