import { errorMessage } from '@sistemazero/marketing-workbench'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useState } from 'react'
import type { DesktopUpdate } from '../shared/updates'

export function DesktopUpdateControls() {
  const [status, setStatus] = useState<DesktopUpdate | null>(null)
  const [error, setError] = useState('')
  const [restarting, setRestarting] = useState(false)
  useEffect(() => {
    let live = true
    const unsubscribe = window.marketing.onUpdate((value) => {
      if (live) setStatus(value)
    })
    void window.marketing
      .updateStatus()
      .then((value) => {
        if (live) setStatus(value)
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    return () => {
      live = false
      unsubscribe()
    }
  }, [])
  if (!status)
    return error ? (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    ) : null
  const labels = {
    unavailable: 'Atualização indisponível',
    idle: 'Atualizações',
    checking: 'Verificando atualização…',
    available: `Nova versão ${status.version}`,
    downloading: `Baixando atualização · ${status.progress ?? 0}%`,
    ready: `Versão ${status.version} pronta`,
    installing: 'Reiniciando…',
    error: 'Atualização não concluída',
  }
  return (
    <section
      aria-label="Atualização do aplicativo"
      className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
    >
      <span>Sistema Zero Marketing · {status.currentVersion}</span>
      <span role="status">{labels[status.state]}</span>
      {status.message ? (
        <span className="text-xs text-muted-foreground">{status.message}</span>
      ) : null}
      {['idle', 'error'].includes(status.state) ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setError('')
            void window.marketing
              .checkUpdate()
              .then(setStatus)
              .catch((error) => setError(errorMessage(error)))
          }}
        >
          Verificar atualização
        </Button>
      ) : null}
      {status.state === 'available' ? (
        <Button
          size="sm"
          onClick={() => {
            setError('')
            void window.marketing
              .downloadUpdate()
              .then(setStatus)
              .catch((error) => setError(errorMessage(error)))
          }}
        >
          Baixar atualização
        </Button>
      ) : null}
      {status.state === 'downloading' ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            void window.marketing.cancelUpdate().catch((error) => setError(errorMessage(error)))
          }
        >
          Cancelar download
        </Button>
      ) : null}
      {status.state === 'ready' ? (
        <Button
          size="sm"
          disabled={restarting}
          onClick={() => {
            setRestarting(true)
            setError('')
            void window.marketing.installUpdate().catch((error) => {
              setError(errorMessage(error))
              setRestarting(false)
            })
          }}
        >
          Reiniciar e atualizar
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
