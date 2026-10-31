import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import type * as React from 'react'
import { cn } from '@/lib/cn'

/**
 * Os estados das listas da sala da equipe (23/10/2026): o vazio depois de trabalhar mostra o
 * Zappy comemorando, o vazio do começo convida a criar, e o erro de carga diz que a lista não
 * carregou (nunca finge que está vazia). Sem emoji: o Zappy faz esse papel.
 */
const ZAPPY = {
  celebrating: BUILTIN_ART.celebrating.poster.url,
  happy: BUILTIN_ART.happy.poster.url,
  thinking: BUILTIN_ART.thinking.poster.url,
} as const

export function EmptyState({
  title,
  description,
  zappy,
  action,
  className,
}: {
  title: string
  description?: React.ReactNode
  /** O Zappy ao lado da frase: comemorando (fila zerada), feliz (começo) ou pensando (erro). */
  zappy?: keyof typeof ZAPPY
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-10 text-center',
        className,
      )}
    >
      {zappy ? (
        // Arte estática do public/: `<img>` simples, que também roda nos testes sem o
        // otimizador do Next (o `next/image` quebrava sob o happy-dom sem URL de página).
        // biome-ignore lint/performance/noImgElement: arte estática pequena, sem otimização a ganhar
        <img src={ZAPPY[zappy]} alt="" width={96} height={96} className="h-auto w-24" />
      ) : null}
      <p className="font-display text-xl font-bold">{title}</p>
      {description ? (
        <p className="max-w-md text-[15px] text-muted-foreground">{description}</p>
      ) : null}
      {action ?? null}
    </div>
  )
}

/** A lista não carregou: diz isso, sem fingir que está vazia, e oferece tentar de novo. */
export function LoadError({
  what,
  onRetry,
  className,
}: {
  /** O que não carregou, no plural da frase ("os projetos", "as conversas"). */
  what: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <EmptyState
      zappy="thinking"
      title={`Não conseguimos carregar ${what}`}
      description="Isso não quer dizer que a lista está vazia. Tente de novo em instantes."
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center rounded-full border border-border bg-card px-5 text-[15px] font-bold"
          >
            Tentar de novo
          </button>
        ) : null
      }
      className={className}
    />
  )
}
