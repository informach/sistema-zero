'use client'
import {
  batchResultSchema,
  type Delivery,
  metricKeys,
  type PublicationMetricsSnapshot,
  publicationMetricsPageSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useCallback, useEffect, useState } from 'react'
import { workspaceAction } from './action-journal'
import { errorMessage, type WorkbenchPort } from './port'

const labels = {
  views: 'Visualizações',
  likes: 'Curtidas',
  comments: 'Comentários',
  shares: 'Compartilhamentos',
  saves: 'Salvamentos',
}
const number = new Intl.NumberFormat('pt-BR')
export function DeliveryMetrics({
  port,
  delivery,
  onOpenAnalysis,
}: {
  port: WorkbenchPort
  delivery: Delivery
  onOpenAnalysis?: (id: string) => Promise<void>
}) {
  const [snapshots, setSnapshots] = useState<PublicationMetricsSnapshot[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false)
  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSnapshots(
        publicationMetricsPageSchema.parse(
          await port.request(`/projects/${delivery.projectId}/deliveries/${delivery.id}/metrics`),
        ).snapshots,
      )
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [port, delivery.projectId, delivery.id])
  useEffect(() => {
    void refresh()
  }, [refresh])
  const latest = snapshots[0]
  return (
    <section className="space-y-3 border-t pt-3" aria-label="Resultados desta edição">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-sm font-semibold">Resultados desta edição</h5>
        <Button variant="ghost" size="sm" disabled={loading} onClick={() => void refresh()}>
          Atualizar resultados
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Dados acumulados da publicação vinculada a esta entrega. Uma nova edição ou repostagem
        conserva seus próprios resultados.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!latest && !loading ? (
        <p className="text-sm">
          {delivery.externalPostId
            ? 'Ainda não há uma coleta disponível para esta publicação.'
            : 'O link foi registrado. As métricas dependem da identificação do post pela conta conectada.'}
        </p>
      ) : null}
      {latest ? (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {metricKeys.map((key) => (
              <div key={key} className="rounded-lg border p-2">
                <dt className="text-xs text-muted-foreground">{labels[key]}</dt>
                <dd className="text-lg font-semibold">
                  {latest[key] === null ? '—' : number.format(latest[key])}
                </dd>
                {latest.availability[key] !== 'observed' ? (
                  <p className="text-[10px] text-muted-foreground">
                    {latest.availability[key] === 'legacy-unknown'
                      ? 'Zero histórico não confirmado'
                      : 'Dado não fornecido'}
                  </p>
                ) : null}
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            Coleta: {new Date(latest.capturedAt).toLocaleString('pt-BR')}. Zero é exibido somente
            quando foi observado; ausência não indica falta de resultado.
          </p>
          {onOpenAnalysis ? (
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setLoading(true)
                setError('')
                void (async () => {
                  const result = await workspaceAction(
                    port,
                    `/projects/${delivery.projectId}/deliveries/${delivery.id}/analysis`,
                    {
                      schemaVersion: 1,
                      snapshotId: latest.id,
                      expectedHash: delivery.editionHash,
                      objective:
                        'Analisar os resultados desta edição, separar observações de hipóteses e propor um experimento para a próxima peça.',
                    },
                    batchResultSchema,
                  )
                  if (result.status === 'conflict')
                    throw new Error('A análise mudou. Atualize o projeto para conferi-la.')
                  const analysis = result.items.find((item) => item.document.kind === 'analysis')
                  if (!analysis) throw new Error('O servidor não confirmou a análise')
                  await onOpenAnalysis(analysis.id)
                })()
                  .catch((error) => setError(errorMessage(error)))
                  .finally(() => setLoading(false))
              }}
            >
              Preparar análise com IA a partir desta coleta
            </Button>
          ) : null}
          {snapshots.length > 1 ? (
            <details className="text-xs">
              <summary>Coletas anteriores</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left">
                  <caption className="sr-only">
                    Evolução dos contadores acumulados desta publicação
                  </caption>
                  <thead>
                    <tr>
                      <th className="p-2">Coletado em</th>
                      {metricKeys.map((key) => (
                        <th className="p-2" key={key}>
                          {labels[key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.slice(1).map((row) => (
                      <tr key={row.id}>
                        <th className="p-2 font-normal" scope="row">
                          {new Date(row.capturedAt).toLocaleString('pt-BR')}
                        </th>
                        {metricKeys.map((key) => (
                          <td className="p-2" key={key}>
                            {row[key] === null ? '—' : number.format(row[key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
