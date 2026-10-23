'use client'

import type {
  AutomationDiagnostics,
  AutomationEvaluation,
  AutomationPolicy,
  AutomationPolicyView,
} from '@sistemazero/helpdesk-contracts'
import { HANDOFF_REASONS, type HandoffReason } from '@sistemazero/helpdesk-contracts'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Textarea } from '@sistemazero/ui/textarea'
import { useEffect, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '@/lib/api'

type PolicyResponse = AutomationPolicyView & {
  evaluationContext: {
    model: string | null
    policyHash: string
    promptVersion: string
    indexVersion: number
  }
}
const labels: Record<string, string> = {
  pilot_p50_ms: 'Tempo total do piloto p50 (ms)',
  pilot_p95_ms: 'Tempo total do piloto p95 (ms)',
  pilot_samples: 'Respostas publicadas na amostra',
  gap_resolution_p95_seconds: 'Correção de lacuna p95 (segundos)',
  human_response_samples: 'Transferências com resposta humana',
  human_response_p95_seconds: 'Primeira resposta humana após transferência p95 (segundos)',
  active_jobs: 'Trabalhos ativos',
  overdue_jobs: 'Prazo excedido',
  expired_leases: 'Execuções interrompidas',
  oldest_job_seconds: 'Maior espera (segundos)',
  failed_indexes: 'Índices com falha',
  pending_indexes: 'Índices pendentes',
  expired_sources: 'Fontes vencidas',
  notification_retries: 'Avisos aguardando nova tentativa',
  started: 'Ciclos de piloto iniciados',
  awaiting_confirmation: 'Aguardando confirmação',
  confirmed: 'Resoluções confirmadas',
  reopened: 'Reaberturas',
  matured: 'Confirmações com 7 dias completos',
  durable: 'Confirmadas sem reabertura em 7 dias',
  inserted: 'Rascunhos inseridos',
  rejected: 'Rascunhos rejeitados',
  sent: 'Respostas enviadas com copiloto',
  edited: 'Respostas editadas antes de enviar',
}
const themes = [
  ['curso_acesso', 'Acesso a cursos'],
  ['problema_tecnico', 'Problemas técnicos'],
  ['studio', 'Estúdio'],
] as const

export function AutomationCard() {
  const [view, setView] = useState<PolicyResponse | null>(null)
  const [draft, setDraft] = useState<AutomationPolicy | null>(null)
  const [reports, setReports] = useState<AutomationEvaluation[]>([])
  const [diagnostics, setDiagnostics] = useState<AutomationDiagnostics | null>(null)
  const [reportText, setReportText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  async function load() {
    const [policy, evaluations, health] = await Promise.all([
      apiGet<PolicyResponse>('/api/helpdesk/settings/automation'),
      apiGet<AutomationEvaluation[]>('/api/helpdesk/settings/automation/evaluations'),
      apiGet<AutomationDiagnostics>('/api/helpdesk/settings/automation/diagnostics'),
    ])
    setView(policy)
    setDraft(policy.policy)
    setReports(evaluations)
    setDiagnostics(health)
  }
  useEffect(() => {
    let alive = true
    Promise.all([
      apiGet<PolicyResponse>('/api/helpdesk/settings/automation'),
      apiGet<AutomationEvaluation[]>('/api/helpdesk/settings/automation/evaluations'),
      apiGet<AutomationDiagnostics>('/api/helpdesk/settings/automation/diagnostics'),
    ])
      .then(([policy, evaluations, health]) => {
        if (alive) {
          setView(policy)
          setDraft(policy.policy)
          setReports(evaluations)
          setDiagnostics(health)
        }
      })
      .catch(() => {
        if (alive) setError('Não foi possível carregar a automação.')
      })
    return () => {
      alive = false
    }
  }, [])
  async function save(off = false) {
    if (!draft || !view || busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await apiSend('/api/helpdesk/settings/automation', 'PATCH', {
        version: view.version,
        policy: { ...draft, mode: off ? 'off' : draft.mode },
      })
      await load()
      setNotice(
        off
          ? 'Automação desligada. Os atendimentos pendentes serão transferidos para a equipe.'
          : 'Política salva. Mudanças invalidam trabalhos anteriores.',
      )
    } catch (reason) {
      const failure = reason as ApiError
      setError(
        failure.status === 409
          ? 'Outra pessoa alterou a política. Atualize antes de salvar novamente.'
          : (failure.message ?? 'Não foi possível salvar.'),
      )
    } finally {
      setBusy(false)
    }
  }
  async function record() {
    setBusy(true)
    setError(null)
    try {
      const body: unknown = JSON.parse(reportText)
      await apiSend('/api/helpdesk/settings/automation/evaluations', 'POST', body)
      setReports(await apiGet('/api/helpdesk/settings/automation/evaluations'))
      setReportText('')
      setNotice('Avaliação registrada. Selecione o relatório ao configurar o piloto.')
    } catch (reason) {
      setError((reason as ApiError).message ?? 'Relatório JSON inválido.')
    } finally {
      setBusy(false)
    }
  }
  const number = (
    key: 'cohortPercent' | 'accountDailyLimit' | 'dailyBudgetMicros' | 'attemptReserveMicros',
    label: string,
    max: number,
    usd = false,
  ) =>
    draft ? (
      <label htmlFor={`automation-${key}`} className="space-y-1 text-sm">
        {label}
        <Input
          id={`automation-${key}`}
          type="number"
          min={0}
          max={max}
          step={usd ? 0.001 : 1}
          value={usd ? draft[key] / 1000000 : draft[key]}
          onChange={(e) =>
            setDraft({ ...draft, [key]: Math.round(Number(e.target.value) * (usd ? 1000000 : 1)) })
          }
        />
      </label>
    ) : null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistente de atendimento</CardTitle>
        <CardDescription>
          O assistente responde somente nos portais, usando fontes publicadas. A equipe pode assumir
          a qualquer momento. O modo sombra registra respostas para revisão sem enviá-las ao
          cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm">
            {notice}
          </p>
        ) : null}
        {!draft || !view ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void load().catch(() => setError('Não foi possível atualizar.'))}
          >
            Carregar automação
          </Button>
        ) : (
          <>
            <p className="text-sm">
              Modo atual:{' '}
              <strong>
                {view.policy.mode === 'off'
                  ? 'Desligado'
                  : view.policy.mode === 'shadow'
                    ? 'Sombra'
                    : 'Piloto'}
              </strong>
              . Consumo de hoje (UTC): US$ {(view.usage.knownMicros / 1000000).toFixed(4)} conhecido
              + US$ {(view.usage.reservedMicros / 1000000).toFixed(4)} reservado em{' '}
              {view.usage.unknownAttempts} tentativas sem custo confirmado.
            </p>
            <fieldset disabled={busy} className="space-y-4">
              <label className="block text-sm">
                Modo
                <select
                  className="ml-2 rounded border bg-background p-2"
                  value={draft.mode}
                  onChange={(e) =>
                    setDraft({ ...draft, mode: e.target.value as AutomationPolicy['mode'] })
                  }
                >
                  <option value="off">Desligado</option>
                  <option value="shadow">Sombra</option>
                  <option value="pilot">Piloto</option>
                </select>
              </label>
              <fieldset className="flex flex-wrap gap-4">
                <legend className="mb-2 text-sm">Temas permitidos</legend>
                {themes.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.categories.includes(value)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          categories: e.target.checked
                            ? [...draft.categories, value]
                            : draft.categories.filter((c) => c !== value),
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                {number('cohortPercent', 'Contas participantes (%)', 100)}
                {number('accountDailyLimit', 'Tentativas por conta/dia', 100)}
                {number('dailyBudgetMicros', 'Orçamento diário (US$)', 1000, true)}
                {number('attemptReserveMicros', 'Reserva por tentativa (US$)', 10, true)}
              </div>
              <label className="block text-sm">
                Avaliação do piloto
                <select
                  className="mt-1 block w-full rounded border bg-background p-2"
                  value={draft.evaluationId ?? ''}
                  onChange={(e) => setDraft({ ...draft, evaluationId: e.target.value || null })}
                >
                  <option value="">Selecione uma avaliação</option>
                  {reports.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.datasetVersion} · {report.correctResponses}/{report.reviewedResponses}{' '}
                      corretas · {report.model}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-muted-foreground">
                O piloto exige 100 respostas revisadas, qualidade de 95%, recuperação de 90%, zero
                erro crítico e p95 de até 30 segundos. Modelo, prompt, índice e parâmetros devem
                corresponder à avaliação, com validade de 30 dias.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void save()}>Salvar política</Button>
                <Button variant="outline" onClick={() => void save(true)}>
                  Desligar automação
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void load().catch(() => setError('Não foi possível atualizar.'))}
                >
                  Atualizar dados
                </Button>
              </div>
            </fieldset>
            <details className="rounded border p-3">
              <summary className="cursor-pointer font-medium">Registrar avaliação revisada</summary>
              <p className="my-3 text-sm">
                Use o relatório gerado pela avaliação e conferido pela equipe. Salve antes os
                parâmetros pretendidos em modo desligado ou sombra. O registro identifica o
                administrador responsável.
              </p>
              <pre className="overflow-auto rounded bg-muted p-3 text-xs">
                {JSON.stringify(view.evaluationContext, null, 2)}
              </pre>
              <label className="mt-3 block text-sm" htmlFor="automation-report">
                Relatório JSON
              </label>
              <Textarea
                id="automation-report"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={8}
                maxLength={20000}
              />
              <Button
                className="mt-3"
                disabled={busy || !reportText.trim()}
                onClick={() => void record()}
              >
                Registrar relatório
              </Button>
            </details>
          </>
        )}
        {diagnostics ? (
          <div className="space-y-4">
            <h3 className="font-medium">
              Operação e resultados · últimos {diagnostics.windowDays} dias
            </h3>
            <p className="text-xs text-muted-foreground">
              Fila, índices e espera são o estado atual. Resolução exige confirmação explícita;
              durabilidade considera apenas confirmações com sete dias completos. Silêncio permanece
              pendente.
            </p>
            {[diagnostics.health, diagnostics.cycles, diagnostics.copilot, diagnostics.latency].map(
              (group, index) => (
                <dl
                  key={['health', 'cycles', 'copilot', 'latency'][index]}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {Object.entries(group).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between gap-3 rounded border p-2 text-sm"
                    >
                      <dt>{labels[key] ?? key}</dt>
                      <dd>{Math.round(value)}</dd>
                    </div>
                  ))}
                </dl>
              ),
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="mb-2 text-left">
                  Inferência por finalidade, sem misturar teste e piloto
                </caption>
                <thead>
                  <tr>
                    <th>Finalidade</th>
                    <th>Execuções</th>
                    <th>US$ conhecido</th>
                    <th>Custo desconhecido</th>
                    <th>p95 por tentativa</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.usage.map((row) => (
                    <tr key={row.purpose}>
                      <td>
                        {(
                          {
                            copilot: 'Copiloto',
                            test: 'Teste',
                            shadow: 'Sombra',
                            automatic: 'Piloto',
                            classification: 'Classificação',
                          } as Record<string, string>
                        )[row.purpose] ?? row.purpose}
                      </td>
                      <td>{row.runs}</td>
                      <td>{Number(row.known_usd).toFixed(4)}</td>
                      <td>{row.unknown_attempts}</td>
                      <td>{Math.round(Number(row.p95_ms))} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {diagnostics.handoffs.map((row) => (
              <p key={row.reason} className="text-sm">
                Transferências ({HANDOFF_REASONS[row.reason as HandoffReason] ?? row.reason}):{' '}
                {row.count}; p95 {Math.round(row.p95Ms)} ms
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
