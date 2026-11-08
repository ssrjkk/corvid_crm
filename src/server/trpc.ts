import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import type { UserRole } from "@/generated/prisma"
import type { Context } from "./context"

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

type SessionUser = NonNullable<Context["user"]> & { role?: UserRole }

const requireUser = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Требуется авторизация",
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user as SessionUser,
    },
  })
})

const enforceWriteAccess = t.middleware(({ ctx, type, next }) => {
  const role = (ctx.user as SessionUser).role ?? "VIEWER"

  if (type === "mutation" && role === "VIEWER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Пользователь с ролью VIEWER может только читать данные",
    })
  }

  return next({ ctx: { ...ctx, role } })
})

// Every read requires a session; mutations additionally require MANAGER or ADMIN.
export const protectedProcedure = t.procedure.use(requireUser).use(enforceWriteAccess)

// Имя publicProcedure удалено намеренно: оно звучало как "без авторизации",
// хотя всегда требовало сессию. Читать/писать могут только залогиненные;
// мутации — только MANAGER/ADMIN (см. enforceWriteAccess выше).
export const authedProcedure = protectedProcedure

// Destructive operations are reserved for administrators.
export const adminProcedure = t.procedure.use(requireUser).use(({ ctx, next }) => {
  const role = (ctx.user as SessionUser).role ?? "VIEWER"

  if (role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Только администратор может выполнять это действие",
    })
  }

  return next({ ctx: { ...ctx, role } })
})

export const router = t.router
export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router
export const mergeRouters = t.mergeRouters
export const middleware = t.middleware
export const procedure = t.procedure
