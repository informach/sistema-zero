'use client'
import {
  type EditorialItem,
  type MonitoringConfig,
  type MonitoringStatus,
  type MonitoringView,
  monitoringConfigSchema,
  monitoringStatusSchema,
  monitoringViewSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useId, useMemo, useState } from 'react'
import { workspaceAction } from './action-journal'
import { errorMessage, type WorkbenchPort } from './port'

export const monitoringStates = {
  scheduled: 'Próxima consulta agendada',
  running: 'Consultando a fonte',
  retry: 'Nova tentativa agendada',
  budget: 'Aguardando renovação do orçamento',
  'waiting-local': 'Aguardando pesquisa do responsável',
  paused: 'Precisa de revisão para retomar',
  disabled: 'Acompanhamento pausado',
}
function date(value: string | null, timeZone: string) {
  return value ? new Date(value).toLocaleString('pt-BR', { timeZone }) : 'Ainda não coletado'
}
export function MonitoringPanel({
  port,
  watchlist,
  items,
  editable,
  onOpenEvidence,
}: {
  port: WorkbenchPort
  watchlist: EditorialItem
  items: EditorialItem[]
  editable: boolean
  onOpenEvidence: (id: string) => Promise<void>
}) {
  const id = useId()
  const [status, setStatus] = useState<MonitoringStatus | null>(null),
    [readError, setReadError] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [page, setPage] = useState<{ before?: string }>({}),
    [settings, setSettings] = useState<{ monitor: MonitoringView | null } | null>(null)
  const [search, setSearch] = useState(''),
    [evidenceId, setEvidenceId] = useState(''),
    [sourceType, setSourceType] = useState<'public' | 'imported'>('public')
  const path = `/projects/${watchlist.projectId}/monitors/${watchlist.id}`
  useEffect(() => {
    let active = true,
      flight = false
    async function refresh() {
      if (flight) return
      flight = true
      try {
        const result = monitoringStatusSchema.parse(
          await port.request(`${path}${page.before ? `?before=${page.before}` : ''}`),
        )
        if (active) {
          setStatus(result)
          setReadError('')
        }
      } catch (error) {
        if (active) setReadError(errorMessage(error))
      } finally {
        flight = false
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [port, path, page])
  const evidence = useMemo(
    () =>
      items
        .filter(
          (item) =>
            !item.archived &&
            item.kind === 'evidence' &&
            (!search ||
              item.document.title
                .toLocaleLowerCase('pt-BR')
                .includes(search.toLocaleLowerCase('pt-BR'))),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 50),
    [items, search],
  )
  const monitor = status?.monitor,
    timeZone = monitor?.config.timeZone ?? 'America/Sao_Paulo'
  return (
    <section className="space-y-3 rounded-xl border p-4" aria-label="Acompanhamento recorrente">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Acompanhamento recorrente</h3>
        {editable ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!status}
            onClick={() => setSettings({ monitor: monitor ?? null })}
          >
            {monitor ? 'Configurar ou pausar' : 'Configurar acompanhamento'}
          </Button>
        ) : null}
      </div>
      {error || readError ? (
        <p role="alert" className="text-sm text-destructive">
          {error || readError}
        </p>
      ) : null}
      {monitor ? (
        <>
          <p role="status" className="text-sm font-medium">
            {monitoringStates[monitor.state]}
          </p>
          <p className="text-xs text-muted-foreground">
            Última coleta válida: {date(monitor.lastCollectedAt, timeZone)}. Próxima referência da
            agenda: {date(monitor.nextAt, timeZone)} ({timeZone}).
          </p>
          <p className="text-xs text-muted-foreground">
            {monitor.config.mode === 'feed'
              ? `O servidor consulta o feed mesmo com o desktop desligado. Consultas no dia: ${monitor.callsToday}/${monitor.config.dailyCallBudget}.`
              : monitor.config.mode === 'local-ai'
                ? 'A pesquisa usa a assinatura pessoal no desktop. A agenda aguarda o responsável; o servidor não executa sua IA.'
                : 'A agenda aguarda uma observação conferida ou importada pela equipe.'}
          </p>
          {monitor.error ? (
            <p className="text-sm text-amber-700">
              {monitor.error} A última observação válida permanece disponível.
            </p>
          ) : null}
          {monitor.truncated ? (
            <p className="text-xs text-amber-700">
              Cobertura parcial: a fonte retornou {monitor.observedEntries} itens; esta coleta
              preserva até 25 entradas com identificação utilizável. Falta de entrada não indica
              queda de atividade.
            </p>
          ) : null}
          {monitor.config.mode === 'local-ai' && editable ? (
            <a className="text-sm text-primary underline" href={`#request-${watchlist.id}`}>
              Preparar pesquisa com minha assinatura
            </a>
          ) : null}
          {monitor.config.mode !== 'feed' && monitor.config.enabled && editable ? (
            <details className="rounded-lg border p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Registrar o resultado da pesquisa ou importação
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Após conferir e guardar as fontes da pesquisa no projeto, vincule a evidência. Sua
                revisão fica preservada; a próxima consulta entra na agenda.
              </p>
              <label className="mt-3 block" htmlFor={`${id}-search`}>
                Buscar evidência
                <Input
                  id={`${id}-search`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="mt-3 block" htmlFor={`${id}-evidence`}>
                Evidência confirmada
                <Select
                  id={`${id}-evidence`}
                  value={evidenceId}
                  onChange={(event) => setEvidenceId(event.target.value)}
                >
                  <option value="">Selecionar entre as 50 mais recentes da busca</option>
                  {evidence.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.document.title}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="mt-3 block" htmlFor={`${id}-source`}>
                Origem
                <Select
                  id={`${id}-source`}
                  value={sourceType}
                  onChange={(event) => {
                    if (event.target.value === 'public' || event.target.value === 'imported')
                      setSourceType(event.target.value)
                  }}
                >
                  <option value="public">Fonte pública pesquisada</option>
                  <option value="imported">Dados importados ou fornecidos</option>
                </Select>
              </label>
              <Button
                className="mt-3"
                size="sm"
                disabled={busy || !evidenceId}
                onClick={() => {
                  const selected = evidence.find((item) => item.id === evidenceId)
                  if (!selected) return
                  setBusy(true)
                  setError('')
                  void workspaceAction(
                    port,
                    `${path}/observations`,
                    {
                      schemaVersion: 1,
                      expectedVersion: monitor.version,
                      evidenceId: selected.id,
                      expectedRevisionId: selected.revisionId,
                      sourceType,
                    },
                    monitoringViewSchema,
                  )
                    .then(() => {
                      setEvidenceId('')
                      setPage({})
                    })
                    .catch((error) => setError(errorMessage(error)))
                    .finally(() => setBusy(false))
                }}
              >
                Vincular observação conferida
              </Button>
            </details>
          ) : null}
        </>
      ) : status ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma consulta recorrente está ativada. Você pode consultar feeds públicos no servidor,
          agendar pesquisas no desktop ou registrar observações da equipe.
        </p>
      ) : (
        <p role="status">Consultando acompanhamento…</p>
      )}
      {status?.entries.length ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Novidades e alterações observadas</h4>
          <ul className="space-y-2">
            {status.entries.map((entry) => (
              <li key={entry.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{entry.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.change === 'new' ? 'Nova observação' : 'Conteúdo alterado'} ·{' '}
                  {entry.sourceType === 'public' ? 'Fonte pública' : 'Importado'} ·{' '}
                  {date(entry.observedAt, timeZone)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Publicado na fonte:{' '}
                  {entry.publishedAt ? date(entry.publishedAt, timeZone) : 'data não informada'}. A
                  data de observação é a data da consulta.
                </p>
                <p className="text-xs text-muted-foreground">
                  Revisão preservada: {entry.evidenceRevisionId.slice(0, 8)}. Confira o histórico se
                  a fonte já foi editada.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    void onOpenEvidence(entry.evidenceId)
                      .catch((error) => setError(errorMessage(error)))
                      .finally(() => setBusy(false))
                  }}
                >
                  Conferir fonte e preparar variação
                </Button>
              </li>
            ))}
          </ul>
          {status.more ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage({ before: status.entries.at(-1)!.id })}
            >
              Observações anteriores
            </Button>
          ) : null}
          {page.before ? (
            <Button variant="ghost" size="sm" onClick={() => setPage({})}>
              Voltar às mais recentes
            </Button>
          ) : null}
        </div>
      ) : null}
      {settings ? (
        <MonitoringSettings
          port={port}
          watchlist={watchlist}
          initial={settings.monitor}
          onClose={() => setSettings(null)}
          onSaved={() => {
            setSettings(null)
            setPage({})
          }}
        />
      ) : null}
    </section>
  )
}
function MonitoringSettings({
  port,
  watchlist,
  initial,
  onClose,
  onSaved,
}: {
  port: WorkbenchPort
  watchlist: EditorialItem
  initial: MonitoringView | null
  onClose: () => void
  onSaved: () => void
}) {
  const id = useId(),
    [config, setConfig] = useState<MonitoringConfig>(
      initial?.config ?? {
        mode: 'local-ai',
        feedUrl: null,
        intervalHours: 24,
        timeZone: 'America/Sao_Paulo',
        dailyCallBudget: 24,
        enabled: true,
      },
    ),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <Dialog
      open
      title="Configurar acompanhamento"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          void (async () => {
            const parsed = monitoringConfigSchema.parse(config)
            await workspaceAction(
              port,
              `/projects/${watchlist.projectId}/monitors/${watchlist.id}/configure`,
              {
                schemaVersion: 1,
                expectedRevisionId: watchlist.revisionId,
                expectedVersion: initial?.version ?? 0,
                config: parsed,
              },
              monitoringViewSchema,
            )
            onSaved()
          })()
            .catch((error) => setError(errorMessage(error)))
            .finally(() => setBusy(false))
        }}
      >
        <label className="block text-sm font-medium" htmlFor={`${id}-mode`}>
          Como acompanhar
          <Select
            id={`${id}-mode`}
            value={config.mode}
            onChange={(event) => {
              const mode = event.target.value
              if (mode === 'feed' || mode === 'local-ai' || mode === 'manual')
                setConfig((old) => ({ ...old, mode, feedUrl: mode === 'feed' ? '' : null }))
            }}
          >
            <option value="local-ai">Pesquisa com minha IA no desktop</option>
            <option value="feed">Feed público no servidor (RSS ou Atom)</option>
            <option value="manual">Observação conferida ou importada</option>
          </Select>
        </label>
        {config.mode === 'feed' ? (
          <label className="block text-sm font-medium" htmlFor={`${id}-url`}>
            Endereço HTTPS do feed
            <Input
              id={`${id}-url`}
              type="url"
              required
              value={config.feedUrl ?? ''}
              onChange={(event) => setConfig((old) => ({ ...old, feedUrl: event.target.value }))}
              placeholder="https://exemplo.com/feed.xml"
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Use o feed oferecido pela fonte. Um perfil do Instagram não é um feed; pesquise esses
              perfis com sua IA no desktop. A coleta não contrata serviços externos.
            </span>
          </label>
        ) : null}
        <label className="block text-sm font-medium" htmlFor={`${id}-interval`}>
          Intervalo em horas
          <Input
            id={`${id}-interval`}
            type="number"
            min={1}
            max={720}
            required
            value={config.intervalHours}
            onChange={(event) =>
              setConfig((old) => ({ ...old, intervalHours: Number(event.target.value) }))
            }
          />
        </label>
        <label className="block text-sm font-medium" htmlFor={`${id}-zone`}>
          Fuso horário
          <Input
            id={`${id}-zone`}
            required
            value={config.timeZone}
            onChange={(event) => setConfig((old) => ({ ...old, timeZone: event.target.value }))}
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Define o dia do orçamento e os horários exibidos. O intervalo usa horas decorridas,
            inclusive na mudança de horário de verão.
          </span>
        </label>
        {config.mode === 'feed' ? (
          <label className="block text-sm font-medium" htmlFor={`${id}-budget`}>
            Máximo de consultas por dia
            <Input
              id={`${id}-budget`}
              type="number"
              min={0}
              max={100}
              required
              value={config.dailyCallBudget}
              onChange={(event) =>
                setConfig((old) => ({ ...old, dailyCallBudget: Number(event.target.value) }))
              }
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Inclui novas tentativas. Zero pausa as consultas por orçamento. Erros transitórios
              admitem até três tentativas; depois exigem revisão.
            </span>
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => setConfig((old) => ({ ...old, enabled: event.target.checked }))}
          />
          Ativar este acompanhamento
        </label>
        <p className="text-xs text-muted-foreground">
          Você fica responsável pela agenda. Outra pessoa com permissão pode assumir salvando uma
          nova configuração. A coleta registra referências para revisão e não altera direção, mídia
          paga ou publicações.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar configuração'}
        </Button>
      </form>
    </Dialog>
  )
}
