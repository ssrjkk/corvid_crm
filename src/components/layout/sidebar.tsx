import { Suspense } from "react"
import { CommandMenu } from "@/components/command-menu"
import { Brand } from "@/components/layout/brand"
import {
  SidebarNav,
  SidebarNavFallback,
} from "@/components/layout/sidebar-nav"
import { SidebarFooter } from "@/components/layout/sidebar-footer"

/**
 * Общее содержимое сайдбара: и для постоянной колонки на десктопе,
 * и для выдвижного меню на телефоне. Один источник разметки — без копий.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-5 pb-3">
        <Brand className="text-sidebar-foreground" onNavigate={onNavigate} />
      </div>
      <div className="px-3 pb-1">
        <CommandMenu onNavigate={onNavigate} />
      </div>
      <Suspense fallback={<SidebarNavFallback />}>
        <SidebarNav onNavigate={onNavigate} />
      </Suspense>
      <SidebarFooter />
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden border-r border-sidebar-border lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
      <SidebarContent />
    </aside>
  )
}
