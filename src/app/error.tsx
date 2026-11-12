"use client"

import { useEffect } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Глобальная граница ошибок: краш рендера любого маршрута вместо белого
 * экрана даёт брендированную карточку с кнопкой повтора (App Router
 * вызывает reset() — перерисовку сегмента без перезагрузки страницы).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // В консоль — полный стек для отладки; пользователю — только человеческий текст.
    console.error(error)
  }, [error])

  return (
    <main className="container mx-auto flex max-w-7xl flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Что-то сломалось</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ошибка на стороне приложения, не в ваших данных. Попробуйте снова — если не
            поможет, перезагрузите страницу.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
