"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Brand } from "@/components/layout/brand"
import { SidebarContent } from "@/components/layout/sidebar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * Мобильная оболочка: липкая шапка с меню и выдвижной сайдбар.
 * На десктопе скрыта целиком (lg:hidden), постоянный сайдбар — в layout.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="no-print sticky top-0 z-40 flex h-14 items-center gap-1 border-b bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Открыть меню"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Brand size={28} />
        <div className="ml-auto">
          <ThemeToggle className="text-foreground/70 hover:bg-muted hover:text-foreground" />
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="data-[side=left]:w-[min(18rem,85vw)] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Навигация</SheetTitle>
          <SheetDescription className="sr-only">
            Разделы Corvid CRM
          </SheetDescription>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Закрыть меню"
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground absolute top-3 right-3 z-10"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
