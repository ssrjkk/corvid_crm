/**
 * Русские сообщения для ошибок better-auth в тостах форм входа/регистрации.
 *
 * better-auth не имеет локализаций; APIError строит тело ответа
 * { message, code } (BASE_ERROR_CODES — английские), клиент better-fetch
 * добавляет в объект ошибки status/statusText. Дефолтные message —
 * английские («Invalid email or password» — закреплялось даже в e2e,
 * регресс V25). Здесь: map code → русский текст.
 *
 * Неизвестный код → общий русский текст; оригинальный message/code
 * пишет в консоль вызывающий код (pages) — отладке ничего не теряется.
 */
const RU_BY_CODE: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Неверная почта или пароль",
  INVALID_PASSWORD: "Неверный пароль",
  INVALID_EMAIL: "Некорректная почта",
  USER_NOT_FOUND: "Пользователь с такой почтой не найден",
  USER_ALREADY_EXISTS: "Пользователь с такой почтой уже зарегистрирован",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Пользователь с такой почтой уже зарегистрирован",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Неверная почта или пароль",
  PASSWORD_TOO_SHORT: "Слишком короткий пароль",
  PASSWORD_TOO_LONG: "Слишком длинный пароль",
  EMAIL_NOT_VERIFIED: "Почта не подтверждена. Проверьте входящие письма",
  EMAIL_ALREADY_VERIFIED: "Почта уже подтверждена",
  SESSION_EXPIRED: "Сессия истекла. Войдите заново",
  MISSING_FIELD: "Заполните все поля",
  VALIDATION_ERROR: "Проверьте корректность полей",
  INVALID_ORIGIN: "Недопустимый источник запроса (проверьте BETTER_AUTH_URL)",
  CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: "Запрос заблокирован защитой. Откройте сайт напрямую",
}

const RATE_LIMIT_MESSAGE = "Слишком много попыток. Подождите немного"
const FALLBACK_MESSAGE = "Ошибка аутентификации. Попробуйте ещё раз"

export function ruAuthError(error: {
  code?: unknown
  status?: unknown
}): string {
  if (typeof error.code === "string" && RU_BY_CODE[error.code]) {
    return RU_BY_CODE[error.code]
  }

  // Rate-limiter better-auth отдаёт 429 БЕЗ code (проверено в исходниках:
  // body { message: "Too many requests..." }) — только по статусу.
  if (error.status === 429) {
    return RATE_LIMIT_MESSAGE
  }

  return FALLBACK_MESSAGE
}
