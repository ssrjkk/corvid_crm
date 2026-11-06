import { router, protectedProcedure } from "../trpc"

export const usersRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    const user = ctx.user as typeof ctx.user & {
      role?: "ADMIN" | "MANAGER" | "VIEWER"
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role ?? "VIEWER",
    }
  }),
})
