import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export const createContext = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // Better Auth does not expose custom user columns by default, so read the
  // role from the database instead of trusting anything supplied by the client.
  const role = session?.user
    ? (
        await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        })
      )?.role ?? "VIEWER"
    : null

  return {
    prisma,
    session,
    user: session?.user ? { ...session.user, role } : null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
