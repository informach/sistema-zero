'use client'
import {
  type ProductionActivityReport,
  type ProductionRecord,
  type ProductionRun,
  productionActivityReportSchema,
  productionRecordSchema,
  recordProductionSchema,
  summarizeProduction,
  voidProductionResultSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useEffect, useId, useState } from 'react'
import { workspaceAction } from './action-journal'
import { capabilityLabels, executionStateLabels } from './execution-labels'
import { errorMessage, type WorkbenchPort } from './port'

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const activities = {
  planning: 'Planejamento',
  production: 'Produção',
  review: 'Revisão',
  rework: 'Retrabalho',
}
const verdicts = { useful: 'Útil', discarded: 'Descartado', rework: 'Exige retrabalho' }
function localDate(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
type Editor = { kind: 'time'; record?: ProductionRecord } | { kind: 'review'; run: ProductionRun }
export function ProductionReportDialog({
  port,
  projectId,
  editable,
  onClose,
}: {
  port: WorkbenchPort
  projectId: string
  editable: boolean
  onClose: () => void
}) {
  const id = useId()
  const [query, setQuery] = useState({ days: '28' })
  const [report, setReport] = useState<ProductionActivityReport | null>(null)
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<Editor | null>(null),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    setLoading(true)
    setReport(null)
    setError('')
    void port
      .request(`/projects/${projectId}/production?days=${query.days}`)
      .then((raw) => {
        const value = productionActivityReportSchema.parse(raw)
        if (live) setReport(value)
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [port, projectId, query])
  const refresh = () => {
    setEditor(null)
    setQuery((old) => ({ ...old }))
  }
  const groups = summarizeProduction(report?.runs ?? [])
  const human = report?.timeRecords.reduce(
    (sum, row) =>
      row.body.kind !== 'human-time'
        ? sum
        : sum +
          Math.max(
            0,
            Math.min(Date.parse(row.body.endedAt), Date.parse(report.until)) -
              Math.max(Date.parse(row.body.startedAt), Date.parse(report.since)),
          ),
    0,
  )
  async function voidRecord(record: ProductionRecord) {
    setBusy(true)
    setError('')
    try {
      await workspaceAction(
        port,
        `/projects/${projectId}/production-records/void`,
        { recordId: record.id },
        voidProductionResultSchema,
      )
      refresh()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open title="Processo produtivo" onClose={onClose}>
      <section className="space-y-4 p-5" aria-label="Análise de produção">
        <p className="text-sm text-muted-foreground">
          Pedidos e tentativas registrados no app. Consumo é o informado nos resultados confirmados
          e não representa saldo da assinatura ou custo em dinheiro. Tentativas interrompidas sem
          resultado confirmado não entram na soma; o total pode ser parcial. Retomar o envio do
          mesmo resultado não duplica seu consumo. Ausência de informação permanece indisponível.
        </p>
        <label className="block text-sm font-medium" htmlFor={`${id}-days`}>
          Pedidos criados nos últimos
          <Select
            id={`${id}-days`}
            value={query.days}
            disabled={Boolean(editor)}
            onChange={(event) => setQuery({ days: event.target.value })}
          >
            {[7, 28, 90, 365].map((days) => (
              <option key={days} value={days}>
                {days} dias
              </option>
            ))}
          </Select>
        </label>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {loading ? <p role="status">Consultando o histórico de produção…</p> : null}
        {editor ? (
          <ProductionRecordForm
            key={editor.kind === 'review' ? editor.run.id : (editor.record?.id ?? 'new')}
            editor={editor}
            port={port}
            projectId={projectId}
            onSaved={refresh}
            onCancel={() => setEditor(null)}
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={loading || busy} onClick={refresh}>
                Atualizar produção
              </Button>
              {editable ? (
                <Button size="sm" onClick={() => setEditor({ kind: 'time' })}>
                  Registrar tempo de trabalho
                </Button>
              ) : null}
            </div>
            {report ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {report.runs.length} pedido(s).{' '}
                  {report.coverage.runsTruncated
                    ? 'Amostra limitada aos 500 pedidos mais recentes; reduza o período.'
                    : 'Todos os pedidos criados no período incluídos.'}{' '}
                  As tentativas e avaliações desses pedidos são consideradas até a consulta de{' '}
                  {new Date(report.until).toLocaleString('pt-BR')}.
                </p>
                <article className="rounded-xl border p-4">
                  <h3 className="font-semibold">Tempo humano declarado</h3>
                  <p className="text-xl font-semibold">
                    {report.timeRecords.length
                      ? `${number.format((human ?? 0) / 60000)} min`
                      : 'Não registrado'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {report.timeRecords.length} registro(s), limitados à janela consultada. Não mede
                    tempo automaticamente, nem inclui espera pela IA. Uma pessoa não pode registrar
                    intervalos sobrepostos, mesmo em projetos diferentes.{' '}
                    {report.coverage.timeTruncated
                      ? 'Cobertura parcial: limite de 1.000 registros; reduza o período.'
                      : ''}
                  </p>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer">Conferir e corrigir registros</summary>
                    {report.timeRecords.map((record) =>
                      record.body.kind === 'human-time' ? (
                        <div key={record.id} className="mt-2 rounded-lg border p-3">
                          <p>
                            {activities[record.body.activity]} ·{' '}
                            {new Date(record.body.startedAt).toLocaleString('pt-BR')} até{' '}
                            {new Date(record.body.endedAt).toLocaleString('pt-BR')}
                          </p>
                          <p className="whitespace-pre-wrap">{record.body.note}</p>
                          {editable && record.actorId === port.userId ? (
                            <div className="mt-2 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => setEditor({ kind: 'time', record })}
                              >
                                Corrigir registro
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => void voidRecord(record)}
                              >
                                Anular registro
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : null,
                    )}
                  </details>
                </article>
                <p className="text-xs text-muted-foreground">
                  Retomadas recuperadas: pedidos concluídos após tentativa interrompida. Avaliação
                  de descarte e retrabalho é uma decisão humana registrada; ausência de aplicação
                  não equivale a descarte. Corrigir ou anular um registro preserva o histórico e não
                  altera o conteúdo.
                </p>
                {!groups.length ? (
                  <p className="text-sm">Ainda não há pedidos de IA neste período.</p>
                ) : null}
                {groups.map((group) => (
                  <article
                    key={`${group.provider}:${group.capability}`}
                    className="space-y-2 rounded-xl border p-4 text-sm"
                  >
                    <h3 className="font-semibold">
                      {group.provider === 'codex' ? 'Codex' : 'Claude Code'} ·{' '}
                      {capabilityLabels[group.capability]}
                    </h3>
                    <p>
                      {group.requests} pedidos · {group.attempts} tentativas · {group.succeeded}{' '}
                      concluídos · {group.recovered} recuperados · {group.undone} desfeitos.
                    </p>
                    <p>
                      {group.reviewed} avaliados · {group.discarded} descartados · {group.rework}{' '}
                      exigem retrabalho.
                    </p>
                    <p>
                      Duração de execução informada:{' '}
                      {group.durationMs === null
                        ? 'indisponível'
                        : `${number.format(group.durationMs / 60000)} min`}{' '}
                      ({group.durations}/{group.attempts} tentativas).
                    </p>
                    <p>
                      Tokens de entrada:{' '}
                      {group.inputTokens === null
                        ? 'indisponível'
                        : number.format(group.inputTokens)}{' '}
                      ({group.inputCoverage}/{group.attempts}). Saída:{' '}
                      {group.outputTokens === null
                        ? 'indisponível'
                        : number.format(group.outputTokens)}{' '}
                      ({group.outputCoverage}/{group.attempts}).
                    </p>
                  </article>
                ))}
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">
                    Avaliar resultados dos pedidos
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">
                    A avaliação descreve a utilidade do resultado. Aplicar, escolher uma alternativa
                    e desfazer continuam na peça original.
                  </p>
                  {report.runs.map((run) => (
                    <article key={run.id} className="mt-2 space-y-2 rounded-lg border p-3">
                      <p className="font-medium">{run.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {run.provider === 'codex' ? 'Codex' : 'Claude Code'} ·{' '}
                        {capabilityLabels[run.capability]} ·{' '}
                        {new Date(run.createdAt).toLocaleString('pt-BR')} ·{' '}
                        {executionStateLabels[run.state]}
                      </p>
                      {run.review?.body.kind === 'generation-review' ? (
                        <p>
                          {verdicts[run.review.body.verdict]}: {run.review.body.note}
                        </p>
                      ) : (
                        <p>Sem avaliação registrada.</p>
                      )}
                      {editable && run.state === 'succeeded' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditor({ kind: 'review', run })}
                        >
                          {run.review ? 'Reavaliar resultado' : 'Avaliar resultado'}
                        </Button>
                      ) : null}
                      {editable && run.review ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            if (run.review) void voidRecord(run.review)
                          }}
                        >
                          Anular avaliação
                        </Button>
                      ) : null}
                    </article>
                  ))}
                </details>
              </>
            ) : null}
          </>
        )}
      </section>
    </Dialog>
  )
}

function ProductionRecordForm({
  editor,
  port,
  projectId,
  onSaved,
  onCancel,
}: {
  editor: Editor
  port: WorkbenchPort
  projectId: string
  onSaved: () => void
  onCancel: () => void
}) {
  const id = useId(),
    record = editor.kind === 'time' ? editor.record : editor.run.review
  const body = record?.body
  const [start, setStart] = useState(body?.kind === 'human-time' ? localDate(body.startedAt) : '')
  const [end, setEnd] = useState(body?.kind === 'human-time' ? localDate(body.endedAt) : '')
  const [activity, setActivity] = useState(
    body?.kind === 'human-time' ? body.activity : 'production',
  )
  const [verdict, setVerdict] = useState(
    body?.kind === 'generation-review' ? body.verdict : 'useful',
  )
  const [note, setNote] = useState(body?.note ?? ''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
          const input = recordProductionSchema.omit({ operationId: true }).parse({
            replacesId: record?.id ?? null,
            body:
              editor.kind === 'time'
                ? {
                    kind: 'human-time',
                    startedAt: new Date(start).toISOString(),
                    endedAt: new Date(end).toISOString(),
                    activity,
                    entityId: body?.kind === 'human-time' ? body.entityId : null,
                    note,
                  }
                : { kind: 'generation-review', runId: editor.run.id, verdict, note },
          })
          await workspaceAction(
            port,
            `/projects/${projectId}/production-records`,
            input,
            productionRecordSchema,
          )
          onSaved()
        } catch (error) {
          setError(errorMessage(error))
        } finally {
          setBusy(false)
        }
      }}
    >
      <h3 className="font-semibold">
        {editor.kind === 'time' ? 'Registrar trabalho realizado' : `Avaliar: ${editor.run.title}`}
      </h3>
      {editor.kind === 'time' ? (
        <>
          <p className="text-xs text-muted-foreground">
            Informe seu trabalho ativo, sem espera pela IA. Horários no fuso deste computador:{' '}
            {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </p>
          <label className="block text-sm" htmlFor={`${id}-start`}>
            Início
            <Input
              id={`${id}-start`}
              type="datetime-local"
              required
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label className="block text-sm" htmlFor={`${id}-end`}>
            Fim
            <Input
              id={`${id}-end`}
              type="datetime-local"
              required
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
          <label className="block text-sm" htmlFor={`${id}-activity`}>
            Atividade
            <Select
              id={`${id}-activity`}
              value={activity}
              onChange={(event) => {
                const value = event.target.value
                if (
                  value === 'planning' ||
                  value === 'production' ||
                  value === 'review' ||
                  value === 'rework'
                )
                  setActivity(value)
              }}
            >
              {Object.entries(activities).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        </>
      ) : (
        <label className="block text-sm" htmlFor={`${id}-verdict`}>
          Utilidade do resultado
          <Select
            id={`${id}-verdict`}
            value={verdict}
            onChange={(event) => {
              const value = event.target.value
              if (value === 'useful' || value === 'discarded' || value === 'rework')
                setVerdict(value)
            }}
          >
            {Object.entries(verdicts).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </label>
      )}
      <label className="block text-sm" htmlFor={`${id}-note`}>
        Observação
        <Textarea
          id={`${id}-note`}
          required
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar registro'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Voltar
        </Button>
      </div>
    </form>
  )
}
