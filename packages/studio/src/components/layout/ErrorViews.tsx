import type { JSX } from 'react'
import type { ErrorBoundaryFallbackProps } from '#ui'
import { Button } from '#ui'

/**
 * Fallbacks temáticos para os `ErrorBoundary`. `RootErrorFallback` cobre a tela
 * inteira (último recurso); `SectionErrorFallback` cabe dentro de um painel/modo
 * e oferece "tentar de novo" sem derrubar o resto da IDE.
 */

export function RootErrorFallback({
  error,
  reset,
  onExit,
}: ErrorBoundaryFallbackProps & { onExit?: () => void }): JSX.Element {
  return (
    <div
      role="alert"
      className="flex h-full min-h-screen w-full flex-col items-center justify-center gap-4 bg-sz-bg p-6 text-center text-sz-fg"
    >
      <div className="max-w-md rounded-lg border border-sz-border bg-sz-panel p-6 shadow-lg">
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-sz-fg-soft">
          A IDE encontrou um erro inesperado. Seu trabalho recente é salvo automaticamente. Tente
          recarregar; se persistir, volte à lista de projetos.
        </p>
        {/* Detalhe técnico SECUNDÁRIO: a mensagem crua costuma vir em inglês.
            Fica clara como "opcional" (rótulo + texto apagado) para a criança não
            confundir com o recado principal — mas continua aqui para copiar/colar
            numa IA ou busca. */}
        {error.message && (
          <details className="mt-3 text-left">
            <summary className="cursor-pointer text-xs text-sz-fg-mute">Detalhe técnico</summary>
            <p className="mt-1 break-words rounded bg-sz-bg p-2 font-mono text-xs text-sz-fg-mute">
              {error.message}
            </p>
          </details>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="primary" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
          {/* Navegação é do host (callbacks) — sem onExit, o botão some (espelha a Topbar). */}
          {onExit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                reset()
                onExit()
              }}
            >
              Voltar aos projetos
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function SectionErrorFallback({
  error,
  reset,
  title = 'Não foi possível carregar esta área',
}: ErrorBoundaryFallbackProps & { title?: string }): JSX.Element {
  return (
    <div
      role="alert"
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-sz-bg p-6 text-center text-sz-fg"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-sz-fg-soft">
        Pode ter sido uma falha de rede ao baixar este recurso. Verifique a conexão e tente de novo.
      </p>
      {/* Detalhe técnico SECUNDÁRIO (igual ao fallback de tela cheia): rótulo +
          texto apagado, recolhível, para não competir com o recado principal —
          mas disponível para copiar/colar numa IA ou busca. */}
      {error.message && (
        <details className="max-w-sm text-left">
          <summary className="cursor-pointer text-xs text-sz-fg-mute">Detalhe técnico</summary>
          <p className="mt-1 break-words rounded bg-sz-panel p-2 font-mono text-xs text-sz-fg-mute">
            {error.message}
          </p>
        </details>
      )}
      <Button size="sm" variant="primary" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  )
}
