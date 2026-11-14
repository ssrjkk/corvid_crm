import type { MetadataRoute } from "next"

/**
 * robots.txt (V30 «Визитка»): открытая лендинг-страница индексируется,
 * приватная зона (за 307-редиректом на вход) и API — нет.
 */
const disallow = [
  "/dashboard",
  "/deals",
  "/pipeline",
  "/invoices",
  "/contacts",
  "/companies",
  "/activities",
  "/tasks",
  "/calendar",
  "/projects",
  "/settings",
  "/sign-in",
  "/sign-up",
  "/api",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
  }
}
