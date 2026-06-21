import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/**
 * Bloco "esqueleto" — placeholder animado no formato do conteúdo, no lugar de um
 * "Carregando…" solto (mais elegante e dá sensação de velocidade). Primitivo PURO:
 * molde por `className` (altura/largura/raio) e componha p/ montar cards/linhas/
 * listas — ex.: `<Skeleton className="h-4 w-32" />`. Usa o token `bg-muted` (existe
 * nos dois temas de todos os apps). `aria-hidden` — é só pista visual, o leitor de
 * tela ouve o estado de carregamento da região (`aria-busy`/texto sr-only do app).
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}
