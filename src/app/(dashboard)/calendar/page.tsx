"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ru } from "date-fns/locale"
import { CalendarDays, CheckSquare, ChevronLeft, ChevronRight, FolderKanban } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { taskStatusLabels } from "@/lib/labels"

type CalendarEvent = {
  id: string
  title: string
  date: Date
  kind: "task" | "project"
  href: string
  status: string
}

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

export default function CalendarPage() {
  // The current date is only known on the client, so initialise it after mount.
  // This keeps the page prerenderable under Cache Components.
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null)
  const { data: tasks = [], isLoading: tasksLoading } = trpc.tasks.getAll.useQuery()
  const { data: projects = [], isLoading: projectsLoading } = trpc.projects.getAll.useQuery()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the calendar can only know "today" on the client; this keeps the page prerenderable
    setCurrentMonth(new Date())
  }, [])

  const events = useMemo(() => {
    const list: CalendarEvent[] = []
    for (const task of tasks) {
      if (!task.dueDate) continue
      list.push({
        id: `task-${task.id}`,
        title: task.title,
        date: new Date(task.dueDate),
        kind: "task",
        href: task.dealId ? `/deals/${task.dealId}` : "/tasks",
        status: taskStatusLabels[task.status] ?? task.status,
      })
    }
    for (const project of projects) {
      if (!project.deadline) continue
      list.push({
        id: `project-${project.id}`,
        title: project.name,
        date: new Date(project.deadline),
        kind: "project",
        href: `/projects/${project.id}`,
        status: "Дедлайн проекта",
      })
    }
    return list.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [tasks, projects])

  const days = useMemo(() => {
    if (!currentMonth) return []
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
    })
  }, [currentMonth])

  const isLoading = tasksLoading || projectsLoading

  if (!currentMonth || isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Загрузка календаря...</div>
  }

  const today = new Date()
  const monthEvents = events.filter((event) => isSameMonth(event.date, currentMonth))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Календарь</h1>
          <p className="text-muted-foreground">
            Задачи и дедлайны проектов · событий в месяце: {monthEvents.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth((month) => (month ? subMonths(month, 1) : month))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
            Сегодня
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth((month) => (month ? addMonths(month, 1) : month))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 capitalize">
            <CalendarDays className="h-5 w-5" />
            {format(currentMonth, "LLLL yyyy", { locale: ru })}
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Задачи
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-chart-4" />
              Проекты
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
            {weekDays.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Загрузка календаря...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => {
                const dayEvents = events.filter((event) => isSameDay(event.date, day))
                const isToday = isSameDay(day, today)
                const inMonth = isSameMonth(day, currentMonth)

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-28 rounded-lg border p-2 ${
                      inMonth ? "bg-background" : "bg-muted/40 text-muted-foreground"
                    } ${isToday ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <Badge variant="secondary" className="px-1 text-[10px]">
                          {dayEvents.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <Link
                          key={event.id}
                          href={event.href}
                          className={`flex items-start gap-1 rounded px-1 py-0.5 text-[11px] leading-tight hover:bg-accent ${
                            event.kind === "task" ? "text-primary" : "text-chart-4"
                          }`}
                          title={`${event.title} · ${event.status}`}
                        >
                          {event.kind === "task" ? (
                            <CheckSquare className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                          ) : (
                            <FolderKanban className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                          )}
                          <span className="line-clamp-2">{event.title}</span>
                        </Link>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="px-1 text-[10px] text-muted-foreground">
                          +{dayEvents.length - 3} ещё
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
