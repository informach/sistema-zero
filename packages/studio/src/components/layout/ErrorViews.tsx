import type { JSX } from 'react'
import type { ErrorBoundaryFallbackProps } from '#ui'
import { Button } from '#ui'

/**
 * Fallbacks temáticos para os `ErrorBoundary`. `RootErrorFallback` cobre a tela
 * inteira (último recurso); `SectionErrorFallback` cabe dentro de um painel/modo
 * e oferece "tentar de novo" sem derrubar o resto da IDE.
 */

export function RootErrorFallback({ error, reset }: ErrorBoundaryFallbackProps): JSX.Element {
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
        {error.message && (
          <p className="mt-3 break-words rounded bg-sz-bg p-2 text-left font-mono text-xs text-sz-fg-soft">
            {error.message}
          </p>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="primary" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              reset()
              window.location.assign('/')
            }}
          >
            Voltar aos projetos
          </Button>
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
      {error.message && (
        <p className="max-w-sm break-words rounded bg-sz-panel p-2 font-mono text-xs text-sz-fg-soft">
          {error.message}
        </p>
      )}
      <Button size="sm" variant="primary" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  )
}
