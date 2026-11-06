"use client"

import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Handshake, CheckSquare, Users, FolderKanban } from "lucide-react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

export default function DashboardPage() {
  const { data: deals } = trpc.deals.getAll.useQuery()
  const { data: tasks } = trpc.tasks.getAll.useQuery()
  const { data: contacts } = trpc.contacts.getAll.useQuery()
  const { data: projects } = trpc.projects.getAll.useQuery()
  const { data: funnel } = trpc.analytics.getFunnel.useQuery()
  const { data: revenue } = trpc.analytics.getRevenueByMonth.useQuery()
  const { data: taskWidgets } = trpc.analytics.getTaskWidgets.useQuery()

  const totalDeals = deals?.length || 0
  const totalValue = deals?.reduce((sum, deal) => sum + Number(deal.value || 0), 0) || 0
  const openTasks = tasks?.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED").length || 0
  const totalContacts = contacts?.length || 0
  const activeProjects = projects?.filter((p) => p.status === "IN_PROGRESS").length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Обзор вашей CRM</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Сделки</CardTitle><Handshake className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalDeals}</div><p className="text-xs text-muted-foreground">На сумму {totalValue.toLocaleString()} ₽</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Активные задачи</CardTitle><CheckSquare className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{openTasks}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Контакты</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalContacts}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Проекты в работе</CardTitle><FolderKanban className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{activeProjects}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Воронка продаж</CardTitle></CardHeader>
          <CardContent className="h-64">
            {funnel && funnel.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--chart-1)" name="Сделок" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Нет данных</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Выручка по месяцам</CardTitle></CardHeader>
          <CardContent className="h-64">
            {revenue && revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis />
                  <Tooltip formatter={(v) => `${Number(v).toLocaleString()} ₽`} />
                  <Line type="monotone" dataKey="total" stroke="var(--chart-3)" strokeWidth={2} name="Выручка" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Нет закрытых сделок</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Задачи на сегодня</CardTitle></CardHeader>
          <CardContent>
            {taskWidgets?.todayTasks?.length ? (
              <div className="space-y-2">
                {taskWidgets.todayTasks.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href={t.deal ? `/deals/${t.deal.id}` : "/tasks"}
                    className="flex items-center justify-between rounded border p-2 text-sm hover:bg-accent"
                  >
                    <span>{t.title}</span>
                    <span className="text-muted-foreground">{t.status}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Нет задач на сегодня</p>
            )}
            <Link href="/tasks" className="mt-3 inline-block text-sm text-primary hover:underline">Перейти к задачам</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Просроченные задачи</CardTitle></CardHeader>
          <CardContent>
            {taskWidgets?.overdueTasks?.length ? (
              <div className="space-y-2">
                {taskWidgets.overdueTasks.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href={t.deal ? `/deals/${t.deal.id}` : "/tasks"}
                    className="flex items-center justify-between rounded border border-red-200 bg-red-50 p-2 text-sm hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40"
                  >
                    <span>{t.title}</span>
                    <span className="text-red-600">{t.status}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Нет просроченных задач</p>
            )}
            <Link href="/tasks" className="mt-3 inline-block text-sm text-primary hover:underline">Перейти к задачам</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
