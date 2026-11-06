import { z } from "zod"
import { router, publicProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"

const itemSchema = z.object({
  name: z.string().min(1),
  qty: z.number().positive().default(1),
  price: z.number().nonnegative().default(0),
})

export const invoicesRouter = router({
  getAll: publicProcedure.query(async () => {
    return prisma.invoice.findMany({
      include: {
        items: true,
        company: true,
        contact: true,
        deal: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.invoice.findUnique({
        where: { id: input.id },
        include: {
          items: { orderBy: { position: "asc" } },
          company: true,
          contact: true,
          deal: true,
        },
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        companyId: z.string().optional(),
        contactId: z.string().optional(),
        dealId: z.string().optional(),
        dueDate: z.string().optional(),
        currency: z.string().default("RUB"),
        note: z.string().optional(),
        items: z.array(itemSchema).min(1),
      })
    )
    .mutation(async ({ input }) => {
      // Номер: INV-0001 по количеству уже существующих счетов.
      const count = await prisma.invoice.count()
      const number = `INV-${String(count + 1).padStart(4, "0")}`
      return prisma.invoice.create({
        data: {
          number,
          currency: input.currency,
          note: input.note,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          companyId: input.companyId,
          contactId: input.contactId,
          dealId: input.dealId,
          items: {
            create: input.items.map((item, index) => ({
              name: item.name,
              qty: item.qty,
              price: item.price,
              position: index,
            })),
          },
        },
        include: { items: true, company: true, contact: true, deal: true },
      })
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "SENT", "PAID", "CANCELLED"]),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.invoice.update({
        where: { id: input.id },
        data: {
          status: input.status,
          paidAt: input.status === "PAID" ? new Date() : null,
        },
      })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.invoice.delete({ where: { id: input.id } })
    }),
})
