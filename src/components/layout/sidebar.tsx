import { Suspense } from "react"
import { CommandMenu } from "@/components/command-menu"
import { Brand } from "@/components/layout/brand"
import {
  SidebarNav,
  SidebarNavFallback,
} from "@/components/layout/sidebar-nav"
import { SidebarFooter } from "@/components/layout/sidebar-footer"

export function Sidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-64 h-screen sticky top-0 flex flex-col">
      <div className="p-5 pb-3">
        <Brand className="text-sidebar-foreground" />
      </div>
      <div className="px-3 pb-1">
        <CommandMenu />
      </div>
      <Suspense fallback={<SidebarNavFallback />}>
        <SidebarNav />
      </Suspense>
      <SidebarFooter />
    </aside>
  )
}
