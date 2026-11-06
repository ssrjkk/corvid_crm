import type { inferRouterOutputs } from "@trpc/server"
import { router } from "../trpc"
import { dealsRouter } from "./deals"
import { contactsRouter } from "./contacts"
import { companiesRouter } from "./companies"
import { tasksRouter } from "./tasks"
import { projectsRouter } from "./projects"
import { activitiesRouter } from "./activities"
import { pipelineRouter } from "./pipeline"
import { analyticsRouter } from "./analytics"
import { usersRouter } from "./users"
import { invoicesRouter } from "./invoices"

export const appRouter = router({
  deals: dealsRouter,
  contacts: contactsRouter,
  companies: companiesRouter,
  tasks: tasksRouter,
  projects: projectsRouter,
  activities: activitiesRouter,
  pipeline: pipelineRouter,
  analytics: analyticsRouter,
  users: usersRouter,
  invoices: invoicesRouter,
})

export type AppRouter = typeof appRouter
export type RouterOutputs = inferRouterOutputs<AppRouter>
