import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { cn } from '@/lib/cn'

export const CHEST_CLOSED_FALLBACK_SRC = BUILTIN_ART.chest.poster.url
export const CHEST_OPEN_FALLBACK_SRC = BUILTIN_ART.chestOpen.poster.url

/** Both static poses come from the same editable chest, rendered by ediSVG. */
export function ChestIcon({ open = false, className }: { open?: boolean; className?: string }) {
  return (
    <img
      src={open ? CHEST_OPEN_FALLBACK_SRC : CHEST_CLOSED_FALLBACK_SRC}
      alt=""
      aria-hidden="true"
      width={32}
      height={32}
      className={cn('size-7 object-contain', className)}
    />
  )
}
export function ChestClosedFallback({ className }: { className?: string }) {
  return <ChestIcon className={cn('size-8', className)} />
}
