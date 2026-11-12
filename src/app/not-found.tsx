import Link from "next/link"
import { Bird } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Брендированная 404: несуществующие маршруты (в том числе под /dashboard)
 * вместо дефолтной страницы Next.
 */
export default function NotFound() {
  return (
    <main className="container mx-auto flex max-w-7xl flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <Bird className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-xl font-semibold">Страница не найдена</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ворон здесь нет. Проверьте адрес или вернитесь к работе.
          </p>
        </CardContent>
        <CardFooter className="justify-center gap-2">
          <Button render={<Link href="/dashboard" />}>К дашборду</Button>
          <Button variant="outline" render={<Link href="/" />}>
            На главную
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
