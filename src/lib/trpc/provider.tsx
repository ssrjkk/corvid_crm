"use client"

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "./client"
import superjson from "superjson"

function getBaseUrl() {
  if (typeof window !== "undefined") return ""
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          // Протухшая сессия: proxy пропускает по наличию cookie, но API отвечает
          // UNAUTHORIZED — вместо вечной «Загрузки…» отправляем на вход.
          onError: (error) => {
            const code = (error as { data?: { code?: string } }).data?.code
            if (code === "UNAUTHORIZED" && typeof window !== "undefined") {
              router.push("/sign-in")
            }
          },
        }),
      })
  )
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
