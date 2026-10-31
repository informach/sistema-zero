import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import type { ZappyFalaInfo } from '@sistemazero/member-shell/components/zappy-fala-context'
import { cn } from '@/lib/cn'

export type MascotExpression = 'happy' | 'celebrating' | 'thinking' | 'sleeping' | 'speaking'
export const ZAPPY_POSE_DA_FALA: MascotExpression = 'speaking'
export const ZAPPY_SRC: Record<MascotExpression, string> = {
  happy: BUILTIN_ART.happy.poster.url,
  celebrating: BUILTIN_ART.celebrating.poster.url,
  thinking: BUILTIN_ART.thinking.poster.url,
  sleeping: BUILTIN_ART.sleeping.poster.url,
  speaking: BUILTIN_ART.speaking.poster.url,
}

export function tocandoDoZappy(
  expression: MascotExpression,
  fala: ZappyFalaInfo | null,
): boolean | undefined {
  if (!fala?.podeFalar || expression !== ZAPPY_POSE_DA_FALA) return undefined
  return fala.falando
}

/** Export-derived static pose. No player or animation clock is loaded. */
export function KidsMascot({
  expression = 'happy',
  className,
}: {
  expression?: MascotExpression
  className?: string
}) {
  return (
    <img
      src={ZAPPY_SRC[expression]}
      alt=""
      width={48}
      height={48}
      aria-hidden="true"
      draggable={false}
      className={cn('size-12 shrink-0 select-none object-contain', className)}
    />
  )
}
