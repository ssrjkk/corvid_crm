import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function BrandMark({
  size = 36,
  className,
  alt = "Corvid",
}: {
  size?: number
  className?: string
  /** Внутри ссылки-бренда логотип декоративен (alt=""), иначе — имя ссылки дублируется. */
  alt?: string
}) {
  return (
    <Image
      src="/corvid-logo.svg"
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0", className)}
    />
  )
}

export function Brand({
  size = 36,
  className,
  onNavigate,
}: {
  size?: number
  className?: string
  /** Закрыть мобильное меню после перехода по бренду. */
  onNavigate?: () => void
}) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className={cn("flex items-center gap-2.5", className)}
    >
      <BrandMark size={size} alt="" />
      <span className="font-heading text-xl font-bold tracking-tight">Corvid</span>
    </Link>
  )
}
