import { cn } from '@/lib/cn'

interface ZappyCoinProps {
  className?: string
}

/**
 * Moeda **Zappy** — a moeda oficial da gamificação kids (substitui o ícone
 * genérico `Coins` do lucide). WebP transparente em `public/zappy/coin.webp`;
 * a className controla o tamanho (`size-4` por padrão). Decorativa: o número e
 * o aria-label ao lado dão o significado (aria-hidden).
 */
export function ZappyCoin({ className }: ZappyCoinProps) {
  return (
    <img
      src="/zappy/coin.webp"
      alt=""
      width={16}
      height={16}
      aria-hidden="true"
      draggable={false}
      className={cn('size-4 shrink-0 select-none object-contain', className)}
    />
  )
}
