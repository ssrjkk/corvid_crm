import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function BrandMark({
  size = 36,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <Image
      src="/corvid-logo.svg"
      alt="Corvid"
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
}: {
  size?: number
  className?: string
}) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="font-heading text-xl font-bold tracking-tight">Corvid</span>
    </Link>
  )
}
