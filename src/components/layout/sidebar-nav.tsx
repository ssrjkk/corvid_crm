"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Handshake,
  Users,
  Building2,
  CheckSquare,
  FolderKanban,
  Activity,
  KanbanSquare,
  ListTodo,
  CalendarDays,
  ReceiptText,
  Settings,
} from "lucide-react"

const navGroups = [
  {
    label: "Обзор",
    items: [{ href: "/dashboard", label: "Дашборд", icon: LayoutDashboard }],
  },
  {
    label: "Продажи",
    items: [
      { href: "/pipeline", label: "Воронка", icon: KanbanSquare },
      { href: "/deals", label: "Сделки", icon: Handshake },
      { href: "/invoices", label: "Счета", icon: ReceiptText },
    ],
  },
  {
    label: "Клиенты",
    items: [
      { href: "/contacts", label: "Контакты", icon: Users },
      { href: "/companies", label: "Компании", icon: Building2 },
      { href: "/activities", label: "Активности", icon: Activity },
    ],
  },
  {
    label: "Работа",
    items: [
      { href: "/tasks", label: "Задачи", icon: CheckSquare },
      { href: "/tasks/board", label: "Доска задач", icon: ListTodo },
      { href: "/calendar", label: "Календарь", icon: CalendarDays },
      { href: "/projects", label: "Проекты", icon: FolderKanban },
    ],
  },
  {
    label: "Система",
    items: [{ href: "/settings", label: "Настройки", icon: Settings }],
  },
]

function NavGroups({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-3">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pt-4 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname !== null &&
                (pathname === item.href || pathname.startsWith(item.href + "/"))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function SidebarNav() {
  const pathname = usePathname()
  return <NavGroups pathname={pathname} />
}

/**
 * Идентичный по разметке фолбэк для prerender-а: все пункты неактивны,
 * подсветка активного пункта применяется после гидрации — без сдвига макета.
 */
export function SidebarNavFallback() {
  return <NavGroups pathname={null} />
}
