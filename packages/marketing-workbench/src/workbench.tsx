'use client'
import {
  analysisFreshness,
  type Handoff,
  type Project,
  type ProjectView,
  type projectCreateSchema,
  type TeamMember,
  teamMemberSchema,
  WORKSPACE_POLL_INTERVAL_MS,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { AnalysisNextPiece } from './analysis-next-piece'
import { ApprovalPanel } from './approval-panel'
import { EvidenceAttachments } from './asset-file-actions'
import { AssetPreview } from './asset-preview'
import { BatchReview } from './batch-review'
import { ConflictResolution } from './conflict-resolution'
import { CopyReview } from './copy-review'
import { EditorialForm, formatLabels } from './editorial-form'
import { ImportInventoryPanel } from './import-inventory-panel'
import { KnowledgeForm } from './knowledge-form'
import { LocalStorageDialog } from './local-storage-dialog'
import { MediaLibrary } from './media-library'
import { MonitoringOverviewDialog } from './monitoring-overview'
import { MonitoringPanel } from './monitoring-panel'
import { ObservationReadout } from './observation-readout'
import { PendingActions } from './pending-actions'
import { errorMessage, type WorkbenchPort } from './port'
import { ProductionReportDialog } from './production-report'
import { ProjectAnalyticsDialog } from './project-analytics'
import { type EditorialEntry, entryStatus, projectEntries, searchableText } from './projection'
import { ReferenceImportDialog } from './reference-import-dialog'
import { RequestPanel } from './request-panel'
import { ResolvedDrafts } from './resolved-drafts'
import { RevisionComments } from './revision-comments'
import { RevisionHistory } from './revision-history'
import { TeamPanel } from './team-panel'

const empty: ProjectView = {
  items: [],
  pending: [],
  pendingBatches: [],
  report: { phase: 'idle', message: 'Selecione um projeto', pending: 0, confirmedAt: null },
}
const ArtPreview = lazy(() => import('./art-preview'))
const VideoPreview = lazy(() => import('./video-preview'))
type Section = 'pieces' | 'calendar' | 'direction' | 'evidence' | 'analysis' | 'watchlist'
export function Workbench({ port }: { port: WorkbenchPort }) {
  const fieldId = useId()
  const [projects, setProjects] = useState<Project[]>([]),
    [projectId, setProjectId] = useState(''),
    [view, setView] = useState(empty),
    [selection, setSelection] = useState('')
  const [section, setSection] = useState<Section>('pieces'),
    [search, setSearch] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{
      kind: 'piece' | 'direction' | 'evidence'
      entry?: EditorialEntry
      initialEvidenceIds?: string[]
    } | null>(null),
    [newProject, setNewProject] = useState(false),
    [history, setHistory] = useState(false)
  const [importing, setImporting] = useState(false)
  const [mediaLibrary, setMediaLibrary] = useState(false)
  const [localStorage, setLocalStorage] = useState(false)
  const [inventory, setInventory] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [productionReport, setProductionReport] = useState(false)
  const [monitoringOverview, setMonitoringOverview] = useState(false)
  const [team, setTeam] = useState<TeamMember[]>([]),
    [teamError, setTeamError] = useState('')
  const refreshTeam = useCallback(async () => {
    if (!projectId) return
    const id = projectId
    try {
      const value = z.array(teamMemberSchema).parse(await port.request(`/projects/${id}/members`))
      if (currentProject.current === id) {
        setTeam(value)
        setTeamError('')
      }
    } catch (error) {
      if (currentProject.current === id) setTeamError(errorMessage(error))
    }
  }, [projectId, port])
  useEffect(() => {
    setTeam([])
    setTeamError('')
    void refreshTeam()
    const timer = setInterval(() => void refreshTeam(), 30000)
    return () => clearInterval(timer)
  }, [refreshTeam])
  const [knowledgeForm, setKnowledgeForm] = useState<{
    kind: 'analysis' | 'watchlist'
    entry?: EditorialEntry
  } | null>(null)
  const [weekFilter, setWeekFilter] = useState('all')
  const [requestScope, setRequestScope] = useState<'component' | 'representation' | 'piece'>(
    'component',
  )
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const currentProject = useRef(projectId)
  const refreshVersion = useRef(0)
  const resolvedHandoff = useRef<Handoff | null>(null)
  currentProject.current = projectId
  const refresh = useCallback(async () => {
    const id = currentProject.current
    const version = ++refreshVersion.current
    const current = () => version === refreshVersion.current && currentProject.current === id
    try {
      const list = await port.projects()
      if (!current()) return
      setProjects(list)
      if (id && !list.some((item) => item.id === id)) {
        setProjectId('')
        setView(empty)
        setSelection('')
        throw new Error(
          'Você não tem mais acesso a este projeto. Os rascunhos locais foram preservados.',
        )
      }
      if (!id) {
        setProjectId(list[0]?.id ?? '')
        setLoading(false)
        return
      }
      const next = await port.view(id)
      if (current()) {
        setView(next)
        setError('')
      }
    } catch (error) {
      if (current()) setError(errorMessage(error))
    } finally {
      if (current()) setLoading(false)
    }
  }, [port])
  useEffect(() => {
    let live = true,
      running = false
    async function update() {
      if (running || !live) return
      running = true
      try {
        await refresh()
      } finally {
        running = false
      }
    }
    void port
      .synchronize()
      .then(update)
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    void update()
    const reconnect = () => {
      void port
        .synchronize()
        .then(update)
        .catch((error) => {
          if (live) setError(errorMessage(error))
        })
    }
    window.addEventListener('online', reconnect)
    const unsubscribe = port.subscribe(() => void update()),
      timer = setInterval(() => void update(), WORKSPACE_POLL_INTERVAL_MS)
    return () => {
      live = false
      refreshVersion.current++
      unsubscribe()
      clearInterval(timer)
      window.removeEventListener('online', reconnect)
    }
  }, [port, refresh])
  useEffect(() => {
    setView(empty)
    setSelection('')
    setForm(null)
    setKnowledgeForm(null)
    setImporting(false)
    setMediaLibrary(false)
    setLocalStorage(false)
    setHistory(false)
    setRepresentationId('')
    setComponentId('')
    setRequestScope('component')
    setLoading(Boolean(projectId))
    void refresh()
  }, [projectId, refresh])
  useEffect(
    () =>
      port.onHandoff?.(
        (value) => {
          setHandoff(value)
          setProjectId(value.projectId)
          setSelection(value.entityId)
          setSection('pieces')
        },
        (error) => setError(errorMessage(error)),
      ),
    [port],
  )
  const entries = useMemo(() => projectEntries(view), [view]),
    available = entries.filter((item) => !item.archived)
  const project = projects.find((item) => item.id === projectId),
    editable = project?.permissions.includes('edit') ?? false
  const normalized = search
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  const listed = available
    .filter(
      (item) =>
        item.document.kind === (section === 'pieces' || section === 'calendar' ? 'piece' : section),
    )
    .filter((item) => searchableText(item).includes(normalized))
    .filter(
      (item) =>
        section !== 'calendar' ||
        weekFilter === 'all' ||
        (item.document.kind === 'piece' && String(item.document.week ?? 'none') === weekFilter),
    )
    .sort((a, b) => {
      if (a.document.kind === 'piece' && b.document.kind === 'piece')
        return (
          (section === 'calendar'
            ? (a.document.editorialDate ?? '9999').localeCompare(b.document.editorialDate ?? '9999')
            : 0) ||
          (a.document.week ?? 105) - (b.document.week ?? 105) ||
          a.document.position - b.document.position
        )
      return a.document.title.localeCompare(b.document.title, 'pt-BR')
    })
  const selected = available.find((item) => item.id === selection) ?? listed[0]
  const piece = selected?.document.kind === 'piece' ? selected : undefined
  const representations =
    piece?.document.kind === 'piece'
      ? piece.document.representationIds.flatMap(
          (id) => available.find((item) => item.id === id) ?? [],
        )
      : []
  const [representationId, setRepresentationId] = useState(''),
    [componentId, setComponentId] = useState('')
  const [componentSlot, setComponentSlot] = useState({ representationId: '', index: 0 })
  const representation =
    representations.find((item) => item.id === representationId) ?? representations[0]
  const components =
    representation?.document.kind === 'representation'
      ? representation.document.componentIds.flatMap(
          (id) => available.find((item) => item.id === id) ?? [],
        )
      : []
  const component =
    components.find((item) => item.id === componentId) ??
    (componentSlot.representationId === representation?.id
      ? components[componentSlot.index]
      : undefined) ??
    components[0]
  const componentIndex = component ? components.indexOf(component) : 0
  const activeRepresentationId = representation?.id,
    activeComponentId = component?.id
  useEffect(() => {
    if (!activeRepresentationId || !activeComponentId) return
    setComponentSlot((previous) =>
      previous.representationId === activeRepresentationId && previous.index === componentIndex
        ? previous
        : { representationId: activeRepresentationId, index: componentIndex },
    )
    setComponentId(activeComponentId)
  }, [activeRepresentationId, activeComponentId, componentIndex])
  const scopedTarget =
    requestScope === 'piece'
      ? piece
      : requestScope === 'representation'
        ? representation
        : component
  const target =
    (handoff ? available.find((item) => item.id === handoff.entityId) : undefined) ??
    scopedTarget ??
    selected
  useEffect(() => {
    if (!handoff || handoff.projectId !== projectId || resolvedHandoff.current === handoff) return
    const target = view.items.find((item) => item.id === handoff.entityId)
    if (!target) return
    resolvedHandoff.current = handoff
    const document = target.document
    const representation =
      document.kind === 'component' || document.kind === 'video'
        ? view.items.find((item) => item.id === document.representationId)
        : target.document.kind === 'representation'
          ? target
          : undefined
    const pieceId =
      representation?.document.kind === 'representation'
        ? representation.document.pieceId
        : target.id
    setSelection(pieceId)
    setRepresentationId(representation?.id ?? '')
    setComponentId(
      ['component', 'video'].includes(target.document.kind)
        ? target.id
        : (handoff.selection[0] ?? ''),
    )
    if (
      target.kind === 'direction' ||
      target.kind === 'evidence' ||
      target.kind === 'analysis' ||
      target.kind === 'watchlist'
    )
      setSection(target.kind)
  }, [handoff, projectId, view.items])
  function showHistory() {
    if (target) setHistory(true)
  }
  return (
    <div className="space-y-5" data-marketing-workbench>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Marketing · produção
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Bancada editorial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Da direção à próxima revisão, com o contexto da equipe.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label htmlFor={`${fieldId}-1`} className="text-xs font-medium">
            Projeto
            <Select
              id={`${fieldId}-1`}
              aria-label="Projeto atual"
              value={projectId}
              onChange={(event) => {
                setHandoff(null)
                setProjectId(event.target.value)
              }}
              className="mt-1 min-w-48"
            >
              <option value="" disabled>
                Escolha um projeto
              </option>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <Button variant="outline" onClick={() => setNewProject(true)}>
            Novo projeto
          </Button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
        <p role="status" className="text-sm">
          {loading ? 'Carregando o acervo…' : view.report.message}
          {view.report.pending ? ` · ${view.report.pending} pendência(s)` : ''}
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            void port
              .synchronize()
              .then(refresh)
              .catch((error) => setError(errorMessage(error)))
          }
        >
          Sincronizar agora
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-card p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {project ? (
        <PendingActions
          key={`${port.identity}:${port.userId}:${project.id}`}
          port={port}
          projectId={project.id}
          onChanged={refresh}
        />
      ) : null}
      {!project && !loading ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Comece pelo contexto</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Crie um projeto para reunir posicionamento, fontes, pautas e peças. Cada projeto mantém
            seu próprio histórico.
          </p>
          <Button className="mt-5" onClick={() => setNewProject(true)}>
            Criar projeto
          </Button>
        </div>
      ) : project ? (
        <>
          <nav aria-label="Áreas da bancada" className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMonitoringOverview(true)}>
              Novidades observadas
            </Button>
            {monitoringOverview ? (
              <MonitoringOverviewDialog
                key={project.id}
                port={port}
                projectId={project.id}
                onClose={() => setMonitoringOverview(false)}
                onOpen={async (kind, id) => {
                  await port.synchronize()
                  await refresh()
                  if (currentProject.current !== project.id)
                    throw new Error('O projeto aberto mudou. Confira a seleção.')
                  setMonitoringOverview(false)
                  setSearch('')
                  setSection(kind)
                  setSelection(id)
                  setHandoff(null)
                }}
              />
            ) : null}
            <Button variant="outline" onClick={() => setProductionReport(true)}>
              Processo produtivo
            </Button>
            {productionReport ? (
              <ProductionReportDialog
                key={project.id}
                port={port}
                projectId={project.id}
                editable={editable}
                onClose={() => setProductionReport(false)}
              />
            ) : null}
            <Button variant="outline" onClick={() => setAnalytics(true)}>
              Resultados do projeto
            </Button>
            {analytics ? (
              <ProjectAnalyticsDialog
                key={project.id}
                port={port}
                projectId={project.id}
                onClose={() => setAnalytics(false)}
                onOpenPiece={(id) => {
                  setAnalytics(false)
                  setSearch('')
                  setSection('pieces')
                  setSelection(id)
                  setHandoff(null)
                }}
              />
            ) : null}
            <Button variant="outline" onClick={() => setMediaLibrary(true)}>
              Arquivos do projeto
            </Button>
            <Button variant="outline" onClick={() => setInventory(true)}>
              Importar acervo
            </Button>
            {port.localStorage ? (
              <Button variant="outline" onClick={() => setLocalStorage(true)}>
                Espaço neste computador
              </Button>
            ) : null}
            {(
              [
                { id: 'pieces', label: 'Peças' },
                { id: 'calendar', label: 'Planejamento' },
                { id: 'direction', label: 'Direção' },
                { id: 'evidence', label: 'Fontes e referências' },
                { id: 'analysis', label: 'Resumos e decisões' },
                { id: 'watchlist', label: 'Perfis e temas' },
              ] as const
            ).map((item) => (
              <Button
                key={item.id}
                variant={section === item.id ? 'default' : 'ghost'}
                aria-pressed={section === item.id}
                onClick={() => {
                  setSection(item.id)
                  setSelection('')
                }}
              >
                {item.label}
              </Button>
            ))}
          </nav>
          {mediaLibrary ? (
            <MediaLibrary
              key={`media:${project.id}`}
              port={port}
              project={project}
              target={component ?? selected}
              onClose={() => setMediaLibrary(false)}
              onChanged={refresh}
            />
          ) : null}
          {localStorage && port.localStorage ? (
            <LocalStorageDialog
              key={`storage:${project.id}`}
              storage={port.localStorage}
              project={project}
              onClose={() => setLocalStorage(false)}
            />
          ) : null}
          {inventory ? (
            <ImportInventoryPanel
              key={`import:${project.id}`}
              port={port}
              project={project}
              onClose={() => setInventory(false)}
              onOpenSource={(id, kind) => {
                setSection(kind === 'piece' ? 'pieces' : 'evidence')
                setSelection(id)
                setRepresentationId('')
                setComponentId('')
                setHandoff(null)
                setInventory(false)
                void refresh()
              }}
            />
          ) : null}
          {editable ? (
            <ResolvedDrafts port={port} projectId={project.id} view={view} onChanged={refresh} />
          ) : null}
          <TeamPanel
            key={`team:${project.id}`}
            port={port}
            project={project}
            team={team}
            error={teamError}
            onChanged={refreshTeam}
          />
          {editable && project.permissions.includes('execute') ? (
            <BatchReview
              key={`batch:${project.id}`}
              port={port}
              project={project}
              entries={available}
              onChanged={refresh}
            />
          ) : null}
          {editable ? (
            <ConflictResolution
              port={port}
              projectId={project.id}
              view={view}
              onChanged={refresh}
            />
          ) : null}
          {section === 'calendar' ? (
            <div className="rounded-xl border bg-card p-4">
              <label htmlFor={`${fieldId}-week`} className="text-sm font-medium">
                Semana editorial
                <Select
                  id={`${fieldId}-week`}
                  className="mt-2 max-w-xs"
                  value={weekFilter}
                  onChange={(event) => setWeekFilter(event.target.value)}
                >
                  <option value="all">Todas as semanas</option>
                  <option value="none">Sem semana definida</option>
                  {[
                    ...new Set(
                      available.flatMap((item) =>
                        item.document.kind === 'piece' && item.document.week
                          ? [item.document.week]
                          : [],
                      ),
                    ),
                  ]
                    .sort((a, b) => a - b)
                    .map((week) => (
                      <option key={week} value={week}>
                        Semana {week}
                      </option>
                    ))}
                </Select>
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                Ordem de produção e datas editoriais. Nenhuma publicação é agendada por este
                calendário.
              </p>
            </div>
          ) : null}
          <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-xl border bg-card">
              <div className="space-y-3 border-b p-4">
                <label htmlFor={`${fieldId}-2`} className="block text-xs font-medium">
                  Buscar no projeto
                  <Input
                    id={`${fieldId}-2`}
                    className="mt-1"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Título, texto ou semana"
                  />
                </label>
                {editable && section === 'evidence' ? (
                  <Button
                    className="w-full"
                    size="sm"
                    variant="ghost"
                    onClick={() => setImporting(true)}
                  >
                    Importar CSV ou JSON
                  </Button>
                ) : null}
                {editable ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      if (section === 'analysis' || section === 'watchlist')
                        setKnowledgeForm({ kind: section })
                      else
                        setForm({
                          kind:
                            section === 'direction'
                              ? 'direction'
                              : section === 'evidence'
                                ? 'evidence'
                                : 'piece',
                        })
                    }}
                  >
                    {section === 'analysis'
                      ? 'Registrar resumo ou decisão'
                      : section === 'watchlist'
                        ? 'Adicionar perfil ou tema'
                        : section === 'direction'
                          ? 'Nova direção'
                          : section === 'evidence'
                            ? 'Adicionar fonte'
                            : 'Nova pauta'}
                  </Button>
                ) : null}
              </div>
              <div className="max-h-[65vh] overflow-y-auto p-2">
                {listed.length ? (
                  listed.map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      aria-pressed={selected?.id === entry.id}
                      onClick={() => {
                        setSelection(entry.id)
                        setRepresentationId('')
                        setComponentId('')
                        setHandoff(null)
                      }}
                      className={`mb-1 w-full rounded-lg border p-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?.id === entry.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'}`}
                    >
                      <span className="block font-medium">{entry.document.title}</span>
                      {entry.document.kind === 'piece' ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {entry.document.editorialDate ?? 'Sem data'}
                          {entry.document.week ? ` · Semana ${entry.document.week}` : ''}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {entryStatus(entry)}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    {search
                      ? 'Nenhum resultado para esta busca.'
                      : 'Ainda não há itens nesta área.'}
                  </p>
                )}
              </div>
            </aside>
            <section className="min-w-0 space-y-4" aria-label="Trabalho selecionado">
              {selected ? (
                <>
                  <div className="rounded-xl border bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold">{selected.document.title}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entryStatus(selected)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {editable &&
                        (selected.document.kind === 'analysis' ||
                          selected.document.kind === 'watchlist') ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={Boolean(selected.pending.length)}
                            onClick={() => {
                              const kind = selected.document.kind
                              if (kind === 'analysis' || kind === 'watchlist')
                                setKnowledgeForm({ kind, entry: selected })
                            }}
                          >
                            Revisar registro
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => void showHistory()}>
                          Histórico
                        </Button>
                        {editable &&
                        ['piece', 'direction', 'evidence'].includes(selected.document.kind) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={Boolean(selected.pending.length)}
                            onClick={() => {
                              const kind = selected.document.kind
                              if (kind === 'piece' || kind === 'direction' || kind === 'evidence')
                                setForm({ kind, entry: selected })
                            }}
                          >
                            Informações
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {selected.conflict || selected.error ? (
                      <p role="alert" className="mt-3 text-sm text-destructive">
                        {selected.error ??
                          'Há uma revisão concorrente. Seu rascunho está preservado.'}
                      </p>
                    ) : null}
                    {selected.document.kind === 'piece' ? (
                      <>
                        <details className="mt-4 text-sm">
                          <summary className="cursor-pointer font-medium">
                            Briefing e notas de origem
                          </summary>
                          <p className="mt-3 whitespace-pre-wrap leading-relaxed">
                            {selected.document.brief}
                          </p>
                        </details>
                        {selected.document.cta ? (
                          <p className="mt-3 text-sm">
                            <strong>Chamada para ação:</strong> {selected.document.cta}
                          </p>
                        ) : null}
                        <fieldset
                          className="mt-5 flex flex-wrap gap-2"
                          aria-label="Formatos da peça"
                        >
                          {representations.map((item) => (
                            <Button
                              key={item.id}
                              variant={representation?.id === item.id ? 'secondary' : 'ghost'}
                              aria-pressed={representation?.id === item.id}
                              onClick={() => {
                                setHandoff(null)
                                setRepresentationId(item.id)
                                setComponentId('')
                              }}
                            >
                              {item.document.kind === 'representation'
                                ? `${item.document.title} · ${item.document.purpose === 'direct' ? 'Mensagens' : formatLabels[item.document.format]}`
                                : item.document.title}
                            </Button>
                          ))}
                        </fieldset>
                        <fieldset className="mt-3 flex flex-wrap gap-2" aria-label="Componentes">
                          {components.map((item) => (
                            <Button
                              key={item.id}
                              size="sm"
                              variant={component?.id === item.id ? 'outline' : 'ghost'}
                              onClick={() => {
                                setHandoff(null)
                                setComponentId(item.id)
                              }}
                            >
                              {item.document.title}
                            </Button>
                          ))}
                        </fieldset>
                        <article
                          data-editorial-component={component?.id}
                          className="mt-4 min-h-48 rounded-lg border bg-background p-6"
                        >
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {component?.document.title ?? 'Prévia'}
                          </p>
                          {component?.document.kind === 'video' ? (
                            <Suspense fallback={<p>Carregando vídeo…</p>}>
                              <VideoPreview
                                port={port}
                                projectId={project.id}
                                timeline={component.document.timeline}
                                preparations={component.document.preparations}
                              />
                            </Suspense>
                          ) : component?.document.kind === 'component' &&
                            component.document.composition ? (
                            <Suspense fallback={<p>Carregando prévia…</p>}>
                              <ArtPreview
                                port={port}
                                projectId={project.id}
                                composition={component.document.composition}
                                title={component.document.title}
                                body={component.document.body}
                              />
                            </Suspense>
                          ) : component?.document.kind === 'component' ? (
                            component.document.assetIds.map((assetId) => (
                              <AssetPreview
                                key={assetId}
                                port={port}
                                projectId={project.id}
                                assetId={assetId}
                                mediaType="auto"
                                alt={
                                  component.document.kind === 'component'
                                    ? (component.document.alt ?? component.document.title)
                                    : ''
                                }
                              />
                            ))
                          ) : null}
                          <p className="whitespace-pre-wrap text-base leading-relaxed">
                            {component?.document.kind === 'component'
                              ? component.document.body ||
                                (component.document.componentType === 'scene'
                                  ? 'Este componente não tem texto de fala. Confira as orientações de produção.'
                                  : 'O texto desta peça ainda será produzido. Descreva o que você precisa no pedido abaixo.')
                              : component?.document.kind === 'video'
                                ? ''
                                : 'Selecione um componente para conferir.'}
                          </p>
                        </article>
                        {component?.document.kind === 'component' &&
                        component.document.productionNotes ? (
                          <details className="rounded-lg border p-3 text-sm">
                            <summary className="cursor-pointer font-medium">
                              Orientações de produção da origem
                            </summary>
                            <p className="mt-2 whitespace-pre-wrap">
                              {component.document.productionNotes}
                            </p>
                          </details>
                        ) : null}
                        {component?.document.kind === 'component' ? (
                          <CopyReview
                            text={component.document.body}
                            protectedText={component.document.protectedText}
                          />
                        ) : null}
                      </>
                    ) : (
                      <>
                        <DocumentReadout entry={selected} items={view.items} />
                        {selected.document.kind === 'watchlist' &&
                        selected.confirmed &&
                        !selected.pending.length ? (
                          <MonitoringPanel
                            key={selected.confirmed.revisionId}
                            port={port}
                            watchlist={selected.confirmed}
                            items={view.items}
                            editable={editable}
                            onOpenEvidence={async (id) => {
                              await port.synchronize()
                              await refresh()
                              setSearch('')
                              setSection('evidence')
                              setSelection(id)
                              setHandoff(null)
                            }}
                          />
                        ) : null}
                        {selected.document.kind === 'analysis' &&
                        selected.confirmed &&
                        !selected.pending.length &&
                        editable ? (
                          <AnalysisNextPiece
                            key={selected.confirmed.revisionId}
                            port={port}
                            analysis={selected.confirmed}
                            onOpenPiece={async (id) => {
                              await port.synchronize()
                              await refresh()
                              setSearch('')
                              setSection('pieces')
                              setSelection(id)
                              setHandoff(null)
                            }}
                          />
                        ) : null}
                        {selected.document.kind === 'evidence' &&
                        selected.document.assetIds?.length ? (
                          <EvidenceAttachments
                            key={selected.id}
                            port={port}
                            projectId={project.id}
                            assetIds={selected.document.assetIds}
                          />
                        ) : null}
                        {selected.document.kind === 'evidence' && editable ? (
                          <Button
                            className="mt-4"
                            variant="outline"
                            disabled={Boolean(selected.pending.length)}
                            onClick={() =>
                              setForm({ kind: 'piece', initialEvidenceIds: [selected.id] })
                            }
                          >
                            Criar variação desta referência
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                  {representation?.document.kind === 'representation' &&
                  representation.document.purpose === 'direct' ? (
                    <p className="rounded-lg border p-4 text-sm">
                      Mensagens de direct: revise o texto e os botões com a IA. A configuração e o
                      envio da automação não são feitos por esta tela.
                    </p>
                  ) : representation?.confirmed ? (
                    <ApprovalPanel
                      key={`${port.identity}:${representation.id}`}
                      port={port}
                      project={project}
                      representationId={representation.id}
                      pending={entries.some((item) => item.pending.length > 0 || item.conflict)}
                      onChanged={refresh}
                      onOpenAnalysis={async (id) => {
                        await port.synchronize()
                        await refresh()
                        setSearch('')
                        setSection('analysis')
                        setSelection(id)
                        setHandoff(null)
                      }}
                    />
                  ) : null}
                  {target ? (
                    <>
                      {piece ? (
                        <label htmlFor={`${fieldId}-scope`} className="block text-sm font-medium">
                          Escopo do pedido
                          <Select
                            id={`${fieldId}-scope`}
                            className="mt-2"
                            value={requestScope}
                            onChange={(event) => {
                              const value = event.target.value
                              if (
                                value === 'component' ||
                                value === 'representation' ||
                                value === 'piece'
                              ) {
                                setHandoff(null)
                                setRequestScope(value)
                              }
                            }}
                          >
                            <option value="component">Componente selecionado</option>
                            <option value="representation">Todo este formato</option>
                            <option value="piece">Toda a peça</option>
                          </Select>
                        </label>
                      ) : null}
                      <RequestPanel
                        key={`${port.identity}:${target.id}`}
                        port={port}
                        project={project}
                        target={target}
                        handoff={handoff}
                        onChanged={refresh}
                        entries={available}
                        team={team}
                      />
                      <RevisionComments
                        team={team}
                        key={`comments:${target.id}:${target.confirmed?.revisionId}`}
                        port={port}
                        projectId={project.id}
                        target={target}
                        entries={available}
                        editable={editable}
                        onChanged={refresh}
                      />
                    </>
                  ) : null}
                </>
              ) : (
                <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
                  Selecione um item ou adicione o primeiro para começar.
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
      {form && project ? (
        <EditorialForm
          key={form.entry?.id ?? form.kind}
          {...form}
          projectId={project.id}
          port={port}
          evidence={available.filter((item) => item.document.kind === 'evidence')}
          onClose={() => setForm(null)}
          onSaved={(id) => {
            setForm(null)
            if (form.kind === 'piece') setSection('pieces')
            setSelection(id)
            void refresh()
          }}
        />
      ) : null}
      {importing && project ? (
        <ReferenceImportDialog
          port={port}
          projectId={project.id}
          onClose={() => setImporting(false)}
          onSaved={() => {
            setImporting(false)
            void refresh()
          }}
        />
      ) : null}
      {knowledgeForm && project ? (
        <KnowledgeForm
          {...knowledgeForm}
          port={port}
          projectId={project.id}
          entries={entries}
          onClose={() => setKnowledgeForm(null)}
          onSaved={(id) => {
            setKnowledgeForm(null)
            setSelection(id)
            void refresh()
          }}
        />
      ) : null}
      {newProject ? (
        <ProjectForm
          port={port}
          onClose={() => setNewProject(false)}
          onSaved={(value) => {
            setNewProject(false)
            setProjects((previous) => [...previous.filter((item) => item.id !== value.id), value])
            setProjectId(value.id)
          }}
        />
      ) : null}
      {history && target ? (
        <RevisionHistory
          key={`${projectId}:${target.id}`}
          port={port}
          projectId={projectId}
          target={target}
          entries={entries}
          team={team}
          editable={editable}
          onClose={() => setHistory(false)}
          onRestored={refresh}
        />
      ) : null}
    </div>
  )
}
function DocumentReadout({ entry, items }: { entry: EditorialEntry; items: ProjectView['items'] }) {
  const doc = entry.document
  return (
    <section aria-label="Documento selecionado" className="mt-5 space-y-4 text-sm leading-relaxed">
      {'body' in doc ? <p className="whitespace-pre-wrap">{doc.body}</p> : null}
      {doc.kind === 'evidence' && doc.observation ? (
        <ObservationReadout value={doc.observation} />
      ) : null}
      {doc.kind === 'direction' ? (
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold">Situação</dt>
            <dd>
              {
                {
                  current: 'Direção vigente',
                  draft: 'Proposta para revisão',
                  historical: 'Direção histórica',
                }[doc.status ?? 'current']
              }
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Objetivo</dt>
            <dd>{doc.objective || 'Ainda não definido'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Público</dt>
            <dd>{doc.audience || 'Ainda não definido'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Tom de voz</dt>
            <dd>{doc.voice || 'Ainda não definido'}</dd>
          </div>
        </dl>
      ) : null}
      {doc.kind === 'analysis' ? (
        <div className="rounded-lg border p-4">
          <p className="font-semibold">
            {
              { research: 'Pesquisa', summary: 'Resumo', decision: 'Decisão' }[
                doc.analysisType ?? 'research'
              ]
            }
          </p>
          <p role="status">
            {
              {
                current: 'Base atual',
                stale:
                  'Base alterada — revise antes de reutilizar. Este registro saiu do contexto automático.',
                untracked: 'Sem revisões de origem vinculadas',
              }[analysisFreshness(doc, items)]
            }
          </p>
          {doc.hypothesis ? (
            <p className="mt-2">
              <strong>Hipótese:</strong> {doc.hypothesis}
            </p>
          ) : null}
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {doc.basis?.map((source) => (
              <li key={`${source.entityId}:${source.revisionId}`}>
                {items.find((item) => item.id === source.entityId)?.document.title ??
                  'Fonte arquivada ou indisponível'}{' '}
                · revisão {source.revisionId.slice(0, 8)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {doc.kind === 'watchlist' ? (
        <div className="rounded-lg border p-4">
          <p>
            {doc.subjectType === 'profile' ? 'Perfil' : 'Tema'} ·{' '}
            {doc.enabled ? 'Em acompanhamento' : 'Pausado'}
          </p>
          <p>
            <strong>Objetivo:</strong> {doc.objective}
          </p>
          <p>
            <strong>Origem:</strong> {doc.source.label}
          </p>
          {doc.url ? (
            <a className="text-primary underline" href={doc.url} target="_blank" rel="noreferrer">
              Consultar referência
            </a>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Use o pedido abaixo para uma pesquisa pontual com fontes.
          </p>
        </div>
      ) : null}
      {doc.kind === 'evidence' ? (
        <div className="rounded-lg border bg-muted p-4">
          <p>
            <strong>Natureza:</strong>{' '}
            {
              {
                fact: 'Fato documentado',
                interpretation: 'Interpretação',
                hypothesis: 'Hipótese',
                reference: 'Referência',
              }[doc.classification]
            }
          </p>
          <p>
            <strong>Origem:</strong> {doc.source.label}
          </p>
          <p>
            <strong>Validade:</strong>{' '}
            {
              { current: 'Atual', historical: 'Histórica', unverified: 'Ainda não verificada' }[
                doc.validity
              ]
            }
          </p>
          {doc.source.observedAt ? (
            <p>Observada em {new Date(doc.source.observedAt).toLocaleDateString('pt-BR')}</p>
          ) : null}
          {doc.source.url ? (
            <a
              className="mt-2 inline-block text-primary underline"
              href={doc.source.url}
              target="_blank"
              rel="noreferrer"
            >
              Consultar fonte
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
function ProjectForm({
  port,
  onClose,
  onSaved,
}: {
  port: WorkbenchPort
  onClose: () => void
  onSaved: (project: Project) => void
}) {
  const fieldId = useId()
  const [name, setName] = useState(''),
    [product, setProduct] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const input = useRef<z.infer<typeof projectCreateSchema> | null>(null)
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Novo projeto"
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          if (!input.current || input.current.name !== name || input.current.product !== product)
            input.current = {
              schemaVersion: 1,
              operationId: crypto.randomUUID(),
              id: crypto.randomUUID(),
              name,
              product,
            }
          void port
            .createProject(input.current)
            .then(onSaved)
            .catch((error) => setError(errorMessage(error)))
            .finally(() => setBusy(false))
        }}
      >
        <label htmlFor={`${fieldId}-3`} className="block space-y-1 text-sm font-medium">
          Nome
          <Input
            id={`${fieldId}-3`}
            required
            maxLength={300}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label htmlFor={`${fieldId}-4`} className="block space-y-1 text-sm font-medium">
          Produto
          <Input
            id={`${fieldId}-4`}
            required
            maxLength={300}
            value={product}
            onChange={(event) => setProduct(event.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Criando…' : 'Criar projeto'}
        </Button>
      </form>
    </Dialog>
  )
}
