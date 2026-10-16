'use client'
import {
  engagementSummarySchema,
  pieceCommercialReportSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import type { z } from 'zod'
import { localDate } from './conversation-editor'
import { EngagementField, outcomeLabels, topicLabels } from './engagement-ui'
import { errorMessage, type WorkbenchPort } from './port'
export function EngagementMetrics({
  port,
  projectId,
  pieceId,
}: {
  port: WorkbenchPort
  projectId: string
  pieceId: string
}) {
  const [from, setFrom] = useState(() =>
      localDate(new Date(Date.now() - 14 * 86400000).toISOString()).slice(0, 10),
    ),
    [to, setTo] = useState(() => localDate(new Date().toISOString()).slice(0, 10))
  const [summary, setSummary] = useState<z.infer<typeof engagementSummarySchema> | null>(null),
    [commercial, setCommercial] = useState<z.infer<typeof pieceCommercialReportSchema> | null>(null)
  const [issue, setIssue] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <details className="space-y-3 border-t pt-4">
      <summary className="cursor-pointer font-medium">Resultados observados</summary>
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          let range: URLSearchParams
          try {
            const start = new Date(`${from}T00:00:00`)
            const end = new Date(`${to}T00:00:00`)
            if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start)
              throw new Error('Selecione um período válido')
            // Queries use an exclusive upper bound; include the entire final local calendar day.
            end.setDate(end.getDate() + 1)
            range = new URLSearchParams({ from: start.toISOString(), to: end.toISOString() })
          } catch (error) {
            setIssue(errorMessage(error))
            return
          }
          setBusy(true)
          setIssue('')
          setSummary(null)
          setCommercial(null)
          const base = `/projects/${projectId}/pieces/${pieceId}/engagement`
          void Promise.allSettled([
            port
              .request(`${base}/summary?${range}`)
              .then((v) => setSummary(engagementSummarySchema.parse(v))),
            port
              .request(`${base}/commercial?${range}`)
              .then((v) => setCommercial(pieceCommercialReportSchema.parse(v))),
          ])
            .then((results) =>
              setIssue(
                results
                  .filter((r) => r.status === 'rejected')
                  .map((r) => errorMessage(r.reason))
                  .join(' · '),
              ),
            )
            .finally(() => setBusy(false))
        }}
      >
        <EngagementField label="De" type="date" value={from} onChange={setFrom} />
        <EngagementField label="Até" type="date" value={to} onChange={setTo} />
        <Button type="submit" variant="outline" disabled={busy}>
          Consultar período
        </Button>
      </form>
      {summary ? (
        <>
          <p className="text-sm">
            Jornadas iniciadas no período selecionado; estados consultados agora. Aceite da Meta não
            comprova leitura.
          </p>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {(
              [
                ['Jornadas', summary.journeys],
                ['Aberturas aceitas', summary.openingAccepted],
                ['Interações no botão', summary.interacted],
                ['Apresentações aceitas', summary.offerAccepted],
                ['Em atendimento', summary.human],
                ['Jornadas de contatos suprimidos', summary.suppressed],
                ['Envios pendentes', summary.pending],
                ['Resultados incertos', summary.uncertain],
                ['Envios recusados', summary.failed],
              ] as const
            ).map(([name, value]) => (
              <div key={name} className="rounded-lg bg-muted p-3">
                <dt>{name}</dt>
                <dd className="text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
      {summary ? (
        <p className="text-sm">
          Classificação atual por conversa, escolhida pela equipe:{' '}
          {summary.topics.map((t) => `${topicLabels[t.topic]}: ${t.count}`).join(' · ') ||
            'nenhum tema registrado'}
          . Desfechos:{' '}
          {summary.outcomes.map((o) => `${outcomeLabels[o.outcome]}: ${o.count}`).join(' · ') ||
            'nenhum registrado'}
          .
        </p>
      ) : null}
      {commercial?.reports.map((r) => (
        <div key={`${r.campaign}:${r.content}`} className="space-y-2 rounded-lg border p-3 text-sm">
          <p className="font-medium">
            Funil · {r.campaign} / {r.content}
          </p>
          <p>
            Sessões com coleta observada: {r.sessions ?? 'indisponível'}. Novos leads atribuídos:{' '}
            {r.newLeads}. Compras iniciais confirmadas: {r.paidPurchases}.
          </p>
          <p>
            Valor conhecido das compras iniciais:{' '}
            {(r.knownRevenueCents / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
            . Compras sem valor: {r.missingRevenue}. Confirmações sem identidade de cobrança:{' '}
            {r.missingPaymentIdentity}.
          </p>
          <p>
            Leads ligados às sessões, mas antigos ou de outra origem: {r.oldOrOtherSourceLeads}.
            Último evento observado:{' '}
            {r.lastEvent ? new Date(r.lastEvent).toLocaleString('pt-BR') : 'nenhum'}.
          </p>
          <p className="text-muted-foreground">
            Atribuição inicial de sessão e lead preservada separadamente. Conversão: até sete dias
            da criação do lead. Valores não incluem renovações nem descontam reembolsos. Períodos
            recentes ainda podem receber confirmações. Ausência de coleta não equivale a ausência de
            visitas.
          </p>
        </div>
      ))}
      {commercial?.unavailable.map((r) => (
        <p role="status" className="text-sm" key={`${r.campaign}:${r.content}`}>
          {r.content}: {r.reason}
        </p>
      ))}
      {commercial && !commercial.reports.length && !commercial.unavailable.length ? (
        <p className="text-sm">
          Esta peça ainda não tem origem de uma ativação registrada para consultar no funil.
        </p>
      ) : null}
      {issue ? (
        <p role="alert" className="text-sm text-destructive">
          {issue}
        </p>
      ) : null}
    </details>
  )
}
