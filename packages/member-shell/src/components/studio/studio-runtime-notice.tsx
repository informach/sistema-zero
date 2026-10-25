'use client'

import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { CodeXml, RefreshCw } from 'lucide-react'

/** Runtime preparation uses the host theme while the caller retains the project's edit buffers. */
export function StudioRuntimeNotice({
  theme,
  projectName,
  error,
  onRetry,
  onExit,
}: {
  theme: 'light' | 'dark'
  projectName: string
  error?: string
  onRetry: () => void
  onExit: () => void
}) {
  return (
    <div
      data-sz-theme={theme}
      className="grid min-h-0 flex-1 place-items-center overflow-y-auto bg-background p-4 text-foreground sm:p-8"
    >
      <section
        role={error ? 'alert' : 'status'}
        aria-atomic="true"
        className="flex w-full max-w-lg flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-sm sm:p-8"
      >
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {error ? <CodeXml aria-hidden="true" className="size-8" /> : <Spinner />}
        </div>
        <div className="space-y-2">
          <p className="break-words text-muted-foreground text-sm">{projectName}</p>
          <h2 className="sz-display text-xl sm:text-2xl">
            {error ? 'Não foi possível abrir o Python agora' : 'Preparando Python…'}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {error ?? 'Estamos preparando o ambiente para você continuar criando.'}
          </p>
          {error && (
            <p className="text-muted-foreground text-sm">Seu projeto continua salvo na galeria.</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
          {error && (
            <Button className="min-h-11" onClick={onRetry}>
              <RefreshCw aria-hidden="true" className="size-4" />
              Tentar novamente
            </Button>
          )}
          <Button variant="outline" className="min-h-11" onClick={onExit}>
            Voltar à galeria
          </Button>
        </div>
      </section>
    </div>
  )
}
