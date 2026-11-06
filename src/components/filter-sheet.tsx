"use client"

import type { ReactNode } from "react"
import { SlidersHorizontal, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function FilterSheet({
  children,
  activeCount,
  onReset,
  title = "Фильтры",
  description = "Отфильтруйте список по нужным параметрам",
}: {
  children: ReactNode
  activeCount: number
  onReset: () => void
  title?: string
  description?: string
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        <SlidersHorizontal className="mr-2 h-4 w-4" />
        Фильтры
        {activeCount > 0 && <Badge className="ml-2">{activeCount}</Badge>}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4">{children}</div>
        <SheetFooter className="flex-row justify-between">
          <Button variant="outline" onClick={onReset}>
            <X className="mr-2 h-4 w-4" />
            Сбросить
          </Button>
          <SheetClose render={<Button />}>Готово</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
