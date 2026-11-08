"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BrandMark } from "@/components/layout/brand"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await authClient.signUp.email(
      { name, email, password },
      {
        onSuccess: () => router.push("/dashboard"),
        onError: (ctx) => {
          toast.error(ctx.error.message)
          setLoading(false)
        },
      }
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandMark size={72} />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Регистрация</h1>
            <p className="text-muted-foreground">Создайте аккаунт</p>
          </div>
        </div>
        <Input
          type="text"
          placeholder="Имя"
          aria-label="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Пароль"
          aria-label="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/sign-in" className="underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  )
}
