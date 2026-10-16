'use client'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useEffect, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'

const size = (bytes: number) => {
  const unit = bytes >= 1024 ** 3 ? 3 : bytes >= 1024 ** 2 ? 2 : bytes >= 1024 ? 1 : 0
  return `${(bytes / 1024 ** unit).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${['bytes', 'KB', 'MB', 'GB'][unit]}`
}
export function LocalStorageDialog({
  storage,
  project,
  onClose,
}: {
  storage: NonNullable<WorkbenchPort['localStorage']>
  project: { id: string; name: string }
  onClose: () => void
}) {
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof storage.usage>> | null>(null)
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    void storage
      .usage()
      .then((value) => {
        if (live) setUsage(value)
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    return () => {
      live = false
    }
  }, [storage])
  return (
    <Dialog
      open
      title="Espaço neste computador"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className="space-y-4 p-5 text-sm">
        <p>
          Projeto: <strong>{project.name}</strong>
        </p>
        {usage ? (
          <dl className="grid grid-cols-2 gap-2">
            <dt>Cópias locais do app</dt>
            <dd>{size(usage.used)}</dd>
            <dt>Limite do app</dt>
            <dd>{size(usage.limit)}</dd>
            <dt>Espaço livre no computador</dt>
            <dd>{size(usage.available)}</dd>
          </dl>
        ) : (
          <p>Consultando o armazenamento…</p>
        )}
        <p>
          Libere cópias deste projeto já confirmadas no servidor. Elas serão baixadas novamente
          quando precisar. Arquivos pendentes e usados em trabalhos em andamento ficam neste
          computador.
        </p>
        <p className="text-muted-foreground">
          A limpeza também libera trechos intermediários de render, que podem ser gerados novamente.
          Para as mídias sincronizadas, prioriza arquivos maiores e para ao liberar cerca de 1 GB.
          Os originais nas pastas de importação e o conteúdo da equipe permanecem preservados.
        </p>
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError('')
            setMessage('')
            try {
              const result = await storage.clearConfirmed(project.id)
              setMessage(
                `${size(result.freedBytes)} liberados em ${result.removed} arquivo(s). ${result.preserved} arquivo(s) protegidos por trabalho pendente. ${result.unavailable} arquivo(s) mantidos porque não há cópia disponível no servidor.`,
              )
            } catch (error) {
              setError(errorMessage(error))
            } finally {
              try {
                setUsage(await storage.usage())
              } catch (error) {
                setError((previous) => [previous, errorMessage(error)].filter(Boolean).join(' '))
              }
              setBusy(false)
            }
          }}
        >
          {busy ? 'Conferindo cópias e liberando espaço…' : 'Liberar cópias locais'}
        </Button>
      </div>
    </Dialog>
  )
}
