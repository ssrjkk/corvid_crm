"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export function SidebarFooter() {
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const signOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Вы вышли из аккаунта")
          router.push("/sign-in")
        },
        onError: (ctx) => {
          toast.error(ctx.error.message)
        },
      },
    })
  }

  return (
    <div className="mt-auto border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {session?.user?.name ?? "…"}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {session?.user?.email ?? ""}
          </p>
        </div>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Выйти"
          onClick={signOut}
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
