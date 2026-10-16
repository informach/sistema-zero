'use client'
import {
  type AnalyticsDimensions,
  groupAnalytics,
  metricKeys,
  type ProjectAnalytics,
  projectAnalyticsSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useId, useMemo, useState } from 'react'
import { formatLabels } from './editorial-form'
import { ObservationReadout } from './observation-readout'
import { errorMessage, type WorkbenchPort } from './port'

const dimensions = {
  objective: 'Objetivo',
  audienceNeed: 'Necessidade do público',
  series: 'Série editorial',
  format: 'Formato',
} as const
const labels = {
  views: 'Visualizações',
  likes: 'Curtidas',
  comments: 'Comentários',
  shares: 'Compartilhamentos',
  saves: 'Salvamentos',
}
const ages = {
  'under-48h': 'menos de 48 horas',
  '2-14d': 'de 2 a 14 dias',
  '14-90d': 'de 14 a 90 dias',
  'over-90d': '90 dias ou mais',
  unavailable: 'sem coleta válida',
}
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
export function ProjectAnalyticsDialog({
  port,
  projectId,
  onClose,
  onOpenPiece,
}: {
  port: WorkbenchPort
  projectId: string
  onClose: () => void
  onOpenPiece: (id: string) => void
}) {
  const id = useId()
  const [query, setQuery] = useState({ days: '90' }),
    [dimension, setDimension] = useState<keyof AnalyticsDimensions>('objective')
  const [value, setValue] = useState<ProjectAnalytics | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setValue(null)
    void port
      .request(`/projects/${projectId}/analytics?days=${query.days}`)
      .then((raw) => {
        const result = projectAnalyticsSchema.parse(raw)
        if (active) setValue(result)
      })
      .catch((error) => {
        if (active) setError(errorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [port, projectId, query])
  const groups = useMemo(() => groupAnalytics(value?.rows ?? [], dimension), [value, dimension])
  return (
    <Dialog open title="Resultados do projeto" onClose={onClose}>
      <section className="space-y-4 p-5" aria-label="Análise das edições publicadas">
        <p className="text-sm text-muted-foreground">
          Resultados das edições publicadas, com o objetivo, a necessidade e a série registrados na
          aprovação. Alterar um rascunho hoje não muda a classificação do resultado anterior.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium" htmlFor={`${id}-days`}>
            Publicadas nos últimos
            <Select
              id={`${id}-days`}
              value={query.days}
              onChange={(event) => setQuery({ days: event.target.value })}
            >
              {[7, 28, 90, 365].map((day) => (
                <option key={day} value={day}>
                  {day} dias
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium" htmlFor={`${id}-dimension`}>
            Agrupar por
            <Select
              id={`${id}-dimension`}
              value={dimension}
              onChange={(event) => {
                const next = event.target.value
                if (
                  next === 'objective' ||
                  next === 'audienceNeed' ||
                  next === 'series' ||
                  next === 'format'
                )
                  setDimension(next)
              }}
            >
              {Object.entries(dimensions).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setQuery((old) => ({ ...old }))}
        >
          Atualizar resultados
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {loading ? <p role="status">Consultando as edições publicadas…</p> : null}
        {value ? (
          <>
            <p className="text-xs text-muted-foreground">
              {value.coverage.included} publicação(ões) incluída(s).{' '}
              {value.coverage.truncated
                ? 'A amostra atingiu 500 publicações; reduza o período para conferir a cobertura.'
                : 'Todas as entregas vinculadas no período estão incluídas.'}{' '}
              Consulta em {new Date(value.until).toLocaleString('pt-BR')}.
            </p>
            <p className="text-xs text-muted-foreground">
              Cada grupo separa rede, formato, idade na coleta e definição das métricas. Os
              contadores são acumulados até a coleta, não ganhos apenas no período. Amostras
              pequenas e idades diferentes não comprovam causalidade. Referências públicas e relatos
              importados continuam identificados nas fontes do projeto.
            </p>
            {!groups.length ? (
              <p className="text-sm">
                Ainda não há entregas publicadas e vinculadas a edições neste período.
              </p>
            ) : null}
            {groups.map((group) => (
              <article key={group.key} className="space-y-2 rounded-xl border p-4">
                <h3 className="font-semibold">
                  {dimension === 'format'
                    ? (formatLabels[group.label as keyof typeof formatLabels] ?? group.label)
                    : group.label}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {group.network} ·{' '}
                  {formatLabels[group.format as keyof typeof formatLabels] ?? group.format} ·{' '}
                  {group.posts} publicação(ões) · {ages[group.ageBand]}.{' '}
                  {group.sourceType === 'connected-account'
                    ? 'Post identificado na conta conectada.'
                    : 'Vínculo de conta não disponível.'}
                </p>
                {group.ageHours ? (
                  <p className="text-xs text-muted-foreground">
                    Idade efetiva na coleta: {number.format(group.ageHours.min)} a{' '}
                    {number.format(group.ageHours.max)} horas.
                  </p>
                ) : null}
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {metricKeys.map((key) => (
                    <div key={key}>
                      <dt className="text-xs text-muted-foreground">{labels[key]}</dt>
                      <dd className="text-lg font-semibold">
                        {group.metrics[key].total === null
                          ? '—'
                          : number.format(group.metrics[key].total)}
                      </dd>
                      <p className="text-xs text-muted-foreground">
                        Observado em {group.metrics[key].observed}/{group.posts}
                      </p>
                    </div>
                  ))}
                </dl>
                <p className="text-sm">
                  Salvamentos por visualização:{' '}
                  {group.savesPerView.value === null
                    ? 'indisponível'
                    : `${number.format(group.savesPerView.value * 100)}%`}
                  . Base pareada: {group.savesPerView.posts} post(s),{' '}
                  {number.format(group.savesPerView.views)} visualizações.
                </p>
              </article>
            ))}
            {value.rows.length ? (
              <details className="space-y-2 text-sm">
                <summary className="cursor-pointer font-medium">
                  Conferir publicações e suas edições
                </summary>
                <ul className="mt-2 space-y-3">
                  {value.rows.map((row) => (
                    <li key={row.publicationId} className="rounded-lg border p-3">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Publicada em {new Date(row.publishedAt).toLocaleString('pt-BR')}.{' '}
                        {row.metrics
                          ? `Coleta em ${new Date(row.metrics.capturedAt).toLocaleString('pt-BR')}.`
                          : 'Sem coleta disponível.'}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">
                        Edição: {row.editionId} · Publicação: {row.publicationId}
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => onOpenPiece(row.pieceId)}>
                        Abrir peça e entregas
                      </Button>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {value.observations.length ? (
              <section className="space-y-3" aria-label="Referências públicas e dados importados">
                <h3 className="font-semibold">Referências públicas e dados importados</h3>
                <p className="text-xs text-muted-foreground">
                  {value.observations.length} observação(ões) coletadas no período.{' '}
                  {value.coverage.observationsTruncated
                    ? 'Limite de 200; reduza o período para conferir as demais.'
                    : ''}{' '}
                  Essas fontes não são somadas às contas conectadas. Compare somente definições,
                  unidades, amostras e janelas equivalentes; engajamento não comprova conversão.
                </p>
                {value.observations.map((row) => (
                  <article key={row.evidenceId} className="space-y-2">
                    <h4 className="font-medium">
                      {row.title} · {row.observation.dimensions[dimension] || 'Não informado'}
                    </h4>
                    <ObservationReadout value={row.observation} />
                    <p className="break-all text-xs text-muted-foreground">
                      Fonte {row.evidenceId} · revisão {row.revisionId}
                    </p>
                  </article>
                ))}
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </Dialog>
  )
}
