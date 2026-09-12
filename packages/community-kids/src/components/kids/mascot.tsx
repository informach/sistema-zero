import { cn } from '@/lib/cn'

export type MascotExpression = 'happy' | 'celebrating' | 'thinking' | 'sleeping' | 'speaking'

/** Um sprite do Zappy por expressão (snapshots 3D, WebP com fundo transparente). */
/** Exportado para o teste de conformidade dos assets (ver tests/mascot-assets). */
export const ZAPPY_SRC: Record<MascotExpression, string> = {
  happy: '/zappy/happy.webp',
  celebrating: '/zappy/celebrating.webp',
  thinking: '/zappy/thinking.webp',
  sleeping: '/zappy/sleeping.webp',
  // Acenando: pose do balão de diálogo, no mesmo canvas 300x300 das outras.
  speaking: '/zappy/speaking.webp',
}

interface KidsMascotProps {
  expression?: MascotExpression
  className?: string
}

/**
 * Mascote oficial do Sistema Zero Kids: o vagalume **Zappy**. Um `<img>` por
 * expressão (WebP transparente 1:1 em `public/zappy/`), server-safe — a
 * className controla o tamanho (`size-12` por padrão) e herda as animações
 * de movimento da marca (`kid-float`/`kid-wiggle`/`animate-pulse`). Drop-in da
 * estrela-faísca anterior: mesma API `expression`/`className`.
 * Decorativo por definição: o texto ao lado dá o significado (aria-hidden).
 */
export function KidsMascot({ expression = 'happy', className }: KidsMascotProps) {
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
