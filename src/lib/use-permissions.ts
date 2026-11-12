"use client"

import { trpc } from "@/lib/trpc/client"

export type Role = "ADMIN" | "MANAGER" | "VIEWER"

export type Permissions = {
  canWrite: boolean
  canDelete: boolean
  isViewer: boolean
}

/**
 * Чистая матрица прав по роли — единый источник для UI-гейтов.
 * ADMIN: всё; MANAGER: пишет, не удаляет; VIEWER: только читает.
 */
export function permissionsFor(role: Role | null): Permissions {
  return {
    canWrite: role === "ADMIN" || role === "MANAGER",
    canDelete: role === "ADMIN",
    isViewer: role === "VIEWER",
  }
}

/**
 * Reads the current user's role from the server. The role itself is never
 * stored client-side; the server resolves it from the database for every
 * request, so changing a role takes effect without a re-login.
 */
export function usePermissions() {
  const { data, isLoading } = trpc.users.me.useQuery(undefined, {
    staleTime: 60_000,
  })

  const role: Role | null = data?.role ?? null

  return {
    role,
    isLoading,
    ...permissionsFor(role),
  }
}
