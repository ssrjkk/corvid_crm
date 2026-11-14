"use client"

import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/labels"
import { Handshake, CheckSquare, Users, FolderKanban } from "lucide-react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

export default function DashboardPage() {
  // V27 «Ресурсы»: сводка одним lightweight-запросом (count/aggregate на сервере),
  // а не четыре getAll с полными связями — ради пяти чисел на карточках.
  const { data: summary } = trpc.analytics.getSummary.useQuery()
  const { data: funnel } = trpc.analytics.getFunnel.useQuery()
  const { data: revenue } = trpc.analytics.getRevenueByMonth.useQuery()
  const { data: taskWidgets } = trpc.analytics.getTaskWidgets.useQuery()

  const totalDeals = summary?.totalDeals ?? 0
  // Валюты не смешиваются: каждая сумма форматируется своим кодом (V29).
  const valueLine =
    summary && summary.valueByCurrency.length > 0
      ? summary.valueByCurrency.map(({ currency, total }) => formatMoney(total, currency)).join(" · ")
      : formatMoney(0)
  const openTasks = summary?.openTasks ?? 0
  const totalContacts = summary?.totalContacts ?? 0
  const activeProjects = summary?.activeProjects ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Обзор вашей CRM</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Сделки</CardTitle><Handshake className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold tabular-nums">{totalDeals}</div><p className="text-xs text-muted-foreground tabular-nums">На сумму {valueLine}</p></CardContent></Card>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" fontSize={12} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis allowDecimals={false} fontSize={12} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} width={32} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px" }} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" fontSize={12} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis fontSize={12} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} width={48} />
                  <Tooltip formatter={(v) => formatMoney(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px" }} />
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
                    className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm hover:bg-accent"
                  >
                    <span className="min-w-0 truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t.status}</span>
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
                    className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm hover:bg-destructive/15"
                  >
                    <span className="min-w-0 truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-destructive">{t.status}</span>
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
