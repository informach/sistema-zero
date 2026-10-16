'use client'
import { type MonitoringOverview, monitoringOverviewSchema } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useEffect, useState } from 'react'
import { monitoringStates } from './monitoring-panel'
import { errorMessage, type WorkbenchPort } from './port'
export function MonitoringOverviewDialog({
  port,
  projectId,
  onClose,
  onOpen,
}: {
  port: WorkbenchPort
  projectId: string
  onClose: () => void
  onOpen: (kind: 'watchlist' | 'evidence', id: string) => Promise<void>
}) {
  const [value, setValue] = useState<MonitoringOverview | null>(null),
    [error, setError] = useState('')
  const [actionError, setActionError] = useState(''),
    [busy, setBusy] = useState(false)
  function open(kind: 'watchlist' | 'evidence', id: string) {
    setBusy(true)
    setActionError('')
    void onOpen(kind, id)
      .catch((error) => setActionError(errorMessage(error)))
      .finally(() => setBusy(false))
  }
  useEffect(() => {
    let live = true,
      flight = false
    async function refresh() {
      if (flight) return
      flight = true
      try {
        const result = monitoringOverviewSchema.parse(
          await port.request(`/projects/${projectId}/monitors/overview`),
        )
        if (live) {
          setValue(result)
          setError('')
        }
      } catch (error) {
        if (live) setError(errorMessage(error))
      } finally {
        flight = false
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 15000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [port, projectId])
  return (
    <Dialog open title="Novidades observadas" onClose={onClose}>
      <section className="space-y-4 p-5" aria-label="Novidades do projeto">
        <p className="text-sm text-muted-foreground">
          Novas referências e mudanças encontradas nas fontes acompanhadas. A consulta não confirma
          as alegações da fonte nem altera a estratégia. A equipe confere antes de preparar uma
          variação.
        </p>
        {actionError || error ? (
          <p role="alert" className="text-sm text-destructive">
            {actionError || error}
          </p>
        ) : null}
        {!value ? (
          <p role="status">Consultando acompanhamentos…</p>
        ) : (
          <>
            <h3 className="font-semibold">Situação das fontes</h3>
            {!value.sources.length ? (
              <p className="text-sm">
                Abra um perfil ou tema em “Perfis e temas” para configurar um acompanhamento.
              </p>
            ) : null}
            {value.sources.map((source) => (
              <article key={source.monitor.watchlistId} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{source.title}</p>
                <p>{monitoringStates[source.monitor.state]}</p>
                <p className="text-xs text-muted-foreground">
                  Última consulta válida:{' '}
                  {source.monitor.lastCollectedAt
                    ? new Date(source.monitor.lastCollectedAt).toLocaleString('pt-BR')
                    : 'ainda não realizada'}
                </p>
                {source.monitor.error ? (
                  <p className="text-xs text-amber-700">{source.monitor.error}</p>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => open('watchlist', source.monitor.watchlistId)}
                >
                  Abrir acompanhamento
                </Button>
              </article>
            ))}
            {value.sourcesTruncated ? (
              <p className="text-xs">
                Mostrando 100 acompanhamentos. Todos permanecem em Perfis e temas.
              </p>
            ) : null}
            <h3 className="font-semibold">Observações recentes</h3>
            {!value.entries.length ? (
              <p className="text-sm">Nenhuma novidade registrada até agora.</p>
            ) : null}
            {value.entries.map((entry) => (
              <article key={entry.id} className="space-y-1 rounded-lg border p-3 text-sm">
                <p className="font-medium">{entry.title}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.change === 'new' ? 'Nova observação' : 'Conteúdo alterado'} ·{' '}
                  {entry.sourceType === 'public' ? 'Fonte pública' : 'Importado'} · consultado em{' '}
                  {new Date(entry.observedAt).toLocaleString('pt-BR')}.
                </p>
                <p className="text-xs text-muted-foreground">
                  Publicado na fonte:{' '}
                  {entry.publishedAt
                    ? new Date(entry.publishedAt).toLocaleString('pt-BR')
                    : 'data não informada'}
                  .
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => open('evidence', entry.evidenceId)}
                >
                  Conferir fonte e preparar variação
                </Button>
              </article>
            ))}
            {value.entriesTruncated ? (
              <p className="text-xs">
                Mostrando as 50 observações mais recentes. O histórico paginado continua em cada
                acompanhamento.
              </p>
            ) : null}
          </>
        )}
      </section>
    </Dialog>
  )
}
