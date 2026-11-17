import { createAuthClient } from "better-auth/react"

/**
 * V33 «Универсальность»: baseURL не задаём — better-auth берёт
 * window.location.origin. Приложение работает на любом адресе, на котором
 * открыто (localhost, 127.0.0.1, IP локальной сети, прод-домен). Жёсткий URL
 * из переменной ломал CSP connect-src 'self' на любом другом origin:
 * страница с 127.0.0.1 не могла позвать auth на localhost.
 */
export const authClient = createAuthClient()
