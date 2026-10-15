import {
  parseStudioProAssistanceRequest,
  type StudioProAssistanceRequest,
} from '@sistemazero/core/studio/pro-assistance'
import type {
  StudioProBuilderAdapter,
  StudioProBuilderView,
} from '@sistemazero/core/studio/pro-builder'
import { studioProBuildEnvelopeIssue } from '@sistemazero/core/studio/pro-runtime-capabilities'
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { digestProAssistance, getProAssistance } from '../../core/proAssistance'
import { flushProjectOperations, projectPersistence } from '../../state/projectOperations'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import {
  applyProProposal,
  captureProRevisionPayload,
  listProApplications,
  listProSessionApplications,
  type ProApplicationReceipt,
  type ProApplicationRecord,
  retryProApplication,
  undoProApplication,
} from '../../state/proRevision'
import { useProCandidatePreview } from '../../studio/pro-candidate-preview'
import { useStudioTutor } from '../../studio/tutor'
import { studioTutorSourceHash } from '../../studio/tutorSafety'

const RevisionDiff = lazy(() => import('./ProRevisionDiff'))

const active = (job: StudioProBuilderView) =>
  ['queued', 'generating', 'validating'].includes(job.phase)
const phases = {
  queued: 'Preparando a próxima etapa',
  generating: 'Zappy está preparando a proposta',
  validating: 'Verificando tipos e testando o jogo',
  review: 'Proposta pronta para revisar',
  failed: 'A construção precisa de atenção',
  cancelled: 'Construção cancelada',
}
const button =
  'rounded-lg border border-sz-border px-3 py-2 text-sm font-semibold hover:bg-sz-bg disabled:opacity-40'

export interface ProBuilderDraft {
  id: string
  objective: string
  request?: StudioProAssistanceRequest
}

type BuilderNotice = string | { action: 'apply' | 'undo' | 'retry'; receipt: ProApplicationReceipt }

function applicationNotice(
  action: 'apply' | 'undo' | 'retry',
  receipt: ProApplicationReceipt,
): string {
  if (action === 'undo')
    return receipt.status === 'pending'
      ? 'A alteração foi desfeita na sessão, mas o salvamento está pendente.'
      : 'A revisão anterior foi restaurada.'
  if (action === 'retry')
    return receipt.status === 'saved'
      ? 'Alteração salva neste aparelho.'
      : `O salvamento continua pendente. ${receipt.error ?? ''}`
  return receipt.status === 'saved'
    ? 'Alterações aplicadas e salvas neste aparelho. Confira o jogo; a sincronização com a nuvem tem seu próprio indicador.'
    : receipt.status === 'pending'
      ? `Alterações aplicadas na sessão; o salvamento está pendente. ${receipt.error ?? ''}`
      : 'Alterações aplicadas nesta sessão. Este host não fornece histórico local recuperável; salve pelo Studio.'
}

/** Loaded only after choosing Construir, scoped to the current Studio store and adapter. */
export default function ProBuilderPanel({
  adapter,
  projectId,
  draft,
  draftOpen = true,
}: {
  adapter: StudioProBuilderAdapter
  projectId: string
  draft?: ProBuilderDraft
  draftOpen?: boolean
}) {
  const store = useProjectStoreApi()
  const isDirty = useProjectStore((state) => state.isDirty)
  const preview = useProCandidatePreview()
  const { proCapture } = useStudioTutor()
  const inputId = useId()
  const scope = useRef(captureProjectStorageScope())
  const [objective, setObjective] = useState('')
  const [job, setJob] = useState<StudioProBuilderView | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(
    null,
  )
  const [checkingAvailability, setCheckingAvailability] = useState(Boolean(adapter.availability))
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<BuilderNotice | null>(null)
  const [applications, setApplications] = useState<ProApplicationRecord[]>([])
  const [receipt, setReceipt] = useState<ProApplicationReceipt | null>(null)
  const [request, setRequest] = useState<StudioProAssistanceRequest>({
    version: 1,
    intent: 'change',
    scope: 'part',
    criteria: [],
  })
  const [criteria, setCriteria] = useState('')
  const [history, setHistory] = useState<StudioProBuilderView[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState('')
  const [showDiff, setShowDiff] = useState(false)
  const generation = useRef(0)
  const mounted = useRef(false)
  const running = useRef<AbortController | null>(null)
  const pendingCreate = useRef<Parameters<StudioProBuilderAdapter['create']>[0] | null>(null)
  const consumedDraft = useRef<string | null>(null)
  useEffect(() => {
    mounted.current = true
    scope.current = captureProjectStorageScope()
    const profileScope = scope.current
    generation.current++
    const controller = new AbortController()
    let activeEffect = true
    const initialized = () =>
      mounted.current && activeEffect && captureProjectStorageScope() === profileScope
    setJob(null)
    setError(null)
    setReceipt(null)
    setApplications([])
    setHistory([])
    setNextCursor(null)
    setLoading(true)
    setBusy(false)
    setAvailability(null)
    setCheckingAvailability(Boolean(adapter.availability))
    if (adapter.availability)
      void adapter
        .availability(store.getState().project?.proMeta?.templateId ?? '', controller.signal)
        .then((value) => {
          if (initialized()) setAvailability(value)
        })
        .catch(() => {
          if (!controller.signal.aborted && initialized())
            setAvailability({
              available: false,
              reason:
                'Não foi possível consultar o construtor. Reabra o painel para tentar novamente; seus arquivos estão preservados.',
            })
        })
        .finally(() => {
          if (initialized()) setCheckingAvailability(false)
        })
    pendingCreate.current = null
    if (adapter.list)
      void adapter
        .list({ projectId }, controller.signal)
        .then((page) => {
          if (initialized()) {
            setHistory(page.jobs)
            setNextCursor(page.nextCursor)
          }
        })
        .catch(() => {
          if (!controller.signal.aborted && initialized())
            setError(
              'Não foi possível consultar as propostas anteriores. Use Consultar estado para tentar novamente.',
            )
        })
    const localScope = projectPersistence(store)?.localScope
    if (localScope)
      void listProApplications(localScope, projectId)
        .then((records) => {
          if (initialized()) setApplications(records)
        })
        .catch(() => {
          if (!controller.signal.aborted && initialized())
            setError('O histórico local não pôde ser lido. Consulte novamente antes de aplicar.')
        })
    adapter
      .latest(projectId, controller.signal)
      .then((state) => {
        if (initialized()) setJob(state)
      })
      .catch((cause) => {
        if (!controller.signal.aborted && initialized())
          setError(
            cause instanceof Error ? cause.message : 'Não foi possível recuperar a construção.',
          )
      })
      .finally(() => {
        if (initialized()) setLoading(false)
      })
    return () => {
      mounted.current = false
      activeEffect = false
      generation.current++
      controller.abort()
      // Closing a panel is not cancellation. The bounded server step may still checkpoint.
    }
  }, [adapter, projectId, store])
  useEffect(() => {
    if (!draft || draft.id === consumedDraft.current || busy || loading) return
    if ((job && active(job)) || pendingCreate.current) {
      setNotice(
        'Há uma tarefa em andamento. Você pode continuar conversando; o novo pedido ficará disponível depois de encerrá-la.',
      )
      return
    }
    consumedDraft.current = draft.id
    setObjective(draft.objective)
    setRequest(draft.request ?? { version: 1, intent: 'change', scope: 'part', criteria: [] })
    setCriteria(draft.request?.criteria.join('\n') ?? '')
  }, [draft, busy, loading, job])
  const current = (version: number) =>
    mounted.current &&
    generation.current === version &&
    captureProjectStorageScope() === scope.current &&
    store.getState().project?.id === projectId
  const advance = async (initial: StudioProBuilderView, version: number) => {
    let state: StudioProBuilderView | null = initial
    const controller = new AbortController()
    running.current = controller
    try {
      // At most three model calls plus three validations; each server step owns a lease.
      for (let step = 0; state && active(state) && step < 6 && current(version); step++) {
        state = await adapter.advance({ id: state.id, projectId }, controller.signal)
        if (!current(version)) return
        setJob(state)
        if (state?.leaseUntil) {
          setNotice(
            'Esta etapa continua no servidor. Use Consultar estado para ver o resultado. Continuar execução autoriza as etapas seguintes.',
          )
          break
        }
      }
    } finally {
      if (running.current === controller) running.current = null
    }
  }
  const execute = async (work: (version: number) => Promise<void>) => {
    if (scope.current !== captureProjectStorageScope()) {
      setError('O perfil mudou. Reabra o construtor no projeto deste perfil.')
      return
    }
    const version = ++generation.current
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await work(version)
    } catch (cause) {
      if (current(version))
        setError(cause instanceof Error ? cause.message : 'A execução não pôde continuar.')
    } finally {
      if (current(version)) setBusy(false)
    }
  }
  const create = () =>
    execute(async (version) => {
      if (checkingAvailability || availability?.available === false)
        throw new Error(availability?.reason ?? 'Aguarde a verificação do construtor.')
      const scope = captureProjectStorageScope()
      if (!pendingCreate.current) {
        await flushProjectOperations(store, projectId)
        const project = store.getState().project
        if (project?.id !== projectId || project.kind !== 'pro')
          throw new Error('O projeto aberto mudou.')
        const payload = await captureProRevisionPayload(project)
        const meta = getProAssistance(project)
        const summary = [
          meta.briefing,
          ...(meta.decisions ?? []).filter((item) => item.confirmed).map((item) => item.text),
          ...(meta.questions ?? [])
            .filter((item) => item.status === 'answered')
            .map((item) => `${item.text} ${item.answer}`),
        ]
          .filter(Boolean)
          .join('\n')
        // Never silently shorten a decision that the learner expects the builder to respect.
        if (summary.length > 2000)
          throw new Error(
            'As decisões selecionadas ultrapassam o limite deste pedido. Resuma as notas do projeto antes de continuar.',
          )
        const editor = proCapture.current?.()
        const selected =
          request.scope === 'selection' && !request.selection ? editor?.selection : undefined
        if (request.scope === 'selection' && !selected && !request.selection)
          throw new Error('Selecione um trecho no editor antes de preparar a proposta.')
        const selectedRequest = selected
          ? {
              path: selected.path,
              startLine: selected.startLine,
              endLine:
                selected.endLine > selected.startLine && selected.endColumn === 1
                  ? selected.endLine - 1
                  : selected.endLine,
              sourceHash: selected.sourceHash,
            }
          : request.selection
        if (selectedRequest) {
          const node = project.tree?.[selectedRequest.path]
          if (
            node?.kind !== 'file' ||
            studioTutorSourceHash(node.content) !== selectedRequest.sourceHash
          )
            throw new Error('O trecho mudou. Selecione novamente o código para este pedido.')
        }
        const diagnostics = (editor?.diagnostics ?? [])
          .filter((item) => {
            const node = project.tree?.[item.path]
            return (
              node?.kind === 'file' &&
              item.sourceHash &&
              studioTutorSourceHash(node.content) === item.sourceHash
            )
          })
          .slice(0, 6)
          .map((item) => ({
            path: item.path,
            line: item.line,
            message: item.message.slice(0, 400),
            sourceHash: item.sourceHash!,
          }))
        const assistance = parseStudioProAssistanceRequest({
          ...request,
          criteria: criteria
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
          ...(selectedRequest ? { selection: selectedRequest } : {}),
          ...(diagnostics.length
            ? { baseline: { revisionHash: payload.base.hash, source: 'typescript', diagnostics } }
            : {}),
          decisions: {
            hash: await digestProAssistance(meta),
            summary: summary || 'Sem decisões adicionais; preserve o projeto fora do pedido.',
          },
        })
        const issue = studioProBuildEnvelopeIssue({
          files: payload.base.files,
          binaries: payload.binaries,
          templateId: payload.base.templateId,
          executionId: `builder-${'0'.repeat(32)}`,
          parentOrigin: location.origin,
          validate: true,
        })
        if (issue) throw new Error(issue)
        if (
          captureProjectStorageScope() !== scope ||
          !current(version) ||
          store.getState().project !== project
        )
          throw new Error('O projeto mudou durante a preparação. Suas edições estão preservadas.')
        pendingCreate.current = {
          id: crypto.randomUUID(),
          objective: objective.trim(),
          request: assistance,
          ...payload,
        }
      }
      const state = await adapter.create(pendingCreate.current)
      if (!current(version)) return
      pendingCreate.current = null
      setJob(state)
      setReceipt(null)
      await advance(state, version)
    })
  const resume = () =>
    execute(async (version) => {
      if (checkingAvailability || availability?.available === false)
        throw new Error(availability?.reason ?? 'Aguarde a verificação do construtor.')
      const state =
        job && adapter.get
          ? await adapter.get({ id: job.id, projectId })
          : await adapter.latest(projectId)
      if (!current(version)) return
      setJob(state)
      if (state) await advance(state, version)
    })
  const cancel = () =>
    execute(async (version) => {
      if (!job) return
      const controller = running.current
      const state = await adapter.cancel({ id: job.id, projectId })
      controller?.abort()
      if (current(version)) setJob(state)
    })
  const refresh = (before?: string) =>
    execute(async (version) => {
      const state =
        job && adapter.get
          ? await adapter.get({ id: job.id, projectId })
          : await adapter.latest(projectId)
      if (!current(version)) return
      setJob(state)
      if (adapter.list) {
        const page = await adapter.list({ projectId, ...(before ? { before } : {}) })
        if (!current(version)) return
        setHistory((previous) =>
          before
            ? [
                ...previous,
                ...page.jobs.filter((item) => !previous.some((old) => old.id === item.id)),
              ]
            : page.jobs,
        )
        setNextCursor(page.nextCursor)
      }
      const localScope = projectPersistence(store)?.localScope
      if (localScope) {
        const records = await listProApplications(localScope, projectId)
        if (current(version)) setApplications(records)
      }
    })
  const effectiveReceipt = (value: ProApplicationReceipt | null | undefined) => {
    if (value?.status !== 'pending') return value
    const durable = applications.find(
      (item) =>
        item.operationId === value.operationId &&
        item.beforeHash === value.beforeHash &&
        item.afterHash === value.afterHash,
    )
    if (!durable) return value
    const saved = { ...value, status: 'saved' as const }
    delete saved.error
    return saved
  }
  const sessionApplications = listProSessionApplications(store, projectId).map((item) => ({
    ...item,
    receipt: effectiveReceipt(item.receipt)!,
  }))
  const localApplications = [...applications, ...sessionApplications.map((item) => item.record)]
  const application = job
    ? localApplications.find((item) => item.jobId === job.id && !item.undoOf)
    : undefined
  const currentReceipt =
    sessionApplications.find((item) => item.receipt.operationId === receipt?.operationId)
      ?.receipt ??
    effectiveReceipt(receipt) ??
    sessionApplications.find((item) => item.record.jobId === job?.id && !item.record.undoOf)
      ?.receipt
  const pendingReceipt =
    sessionApplications.find(
      (item) => item.record.jobId === job?.id && item.receipt.status === 'pending',
    )?.receipt ?? (currentReceipt?.status === 'pending' ? currentReceipt : undefined)
  const undone = application
    ? localApplications.some((item) => item.undoOf === application.operationId)
    : false
  const discarded = job?.assistance?.disposition === 'discarded'
  const noticeReceipt =
    notice && typeof notice !== 'string'
      ? (sessionApplications.find((item) => item.receipt.operationId === notice.receipt.operationId)
          ?.receipt ?? effectiveReceipt(notice.receipt))
      : undefined
  const noticeText =
    typeof notice === 'string'
      ? notice
      : notice && noticeReceipt
        ? applicationNotice(notice.action, noticeReceipt)
        : null
  const apply = () =>
    execute(async (version) => {
      if (job?.phase !== 'review' || !job.result || discarded) return
      if (adapter.checkApplication) {
        const check = await adapter.checkApplication({ id: job.id, projectId })
        if (!current(version)) return
        if (!check.allowed)
          throw new Error(
            check.reason ?? 'Esta proposta não pode mais ser aplicada. Prepare um novo pedido.',
          )
      }
      if (!current(version)) return
      const saved = await applyProProposal(store, projectId, {
        operationId: `apply:${job.id}`,
        jobId: job.id,
        change: job.result.change,
        ...(job.assistance?.request.sourceMessageId
          ? { requestId: job.assistance.request.sourceMessageId }
          : {}),
        ...(job.assistance?.request.decisions
          ? { decisionsHash: job.assistance.request.decisions.hash }
          : {}),
      })
      if (current(version)) {
        setReceipt(saved)
        const localScope = projectPersistence(store)?.localScope
        if (localScope) {
          const records = await listProApplications(localScope, projectId)
          if (!current(version)) return
          setApplications(records)
        }
        preview.select('current')
        setNotice({ action: 'apply', receipt: saved })
      }
    })
  const undo = () =>
    execute(async (version) => {
      const operationId = currentReceipt?.operationId ?? application?.operationId
      if (!operationId) return
      const result = await undoProApplication(store, projectId, operationId)
      if (current(version)) {
        setReceipt(result)
        const localScope = projectPersistence(store)?.localScope
        if (localScope) {
          const records = await listProApplications(localScope, projectId)
          if (!current(version)) return
          setApplications(records)
        }
        setNotice({ action: 'undo', receipt: result })
      }
    })
  const retrySave = () =>
    execute(async (version) => {
      if (!pendingReceipt) return
      const saved = await retryProApplication(store, projectId, pendingReceipt.operationId)
      if (current(version)) {
        setReceipt(saved)
        setNotice({ action: 'retry', receipt: saved })
      }
    })
  const discard = () =>
    execute(async (version) => {
      if (!job || !adapter.discard) return
      const state = await adapter.discard({ id: job.id, projectId, version: job.version })
      if (!current(version)) return
      setJob(state)
      if (preview.candidate?.jobId === job.id) preview.close()
      setNotice('Proposta descartada. O código e o consumo já realizado permanecem registrados.')
    })
  const refreshPreview = () =>
    execute(async (version) => {
      if (!job || !adapter.refreshPreview) return
      const state = await adapter.refreshPreview({ id: job.id, projectId })
      if (!current(version)) return
      setJob(state)
      if (state?.result?.preview)
        preview.show({ projectId, jobId: state.id, ...state.result.preview })
    })
  const patches = job?.result?.change.patches ?? []
  const selected = patches.find((patch) => patch.path === selectedPath) ?? patches[0]
  const capture = job?.result?.evidence.find(
    (item) => item.kind === 'capture' && item.status === 'passed',
  )
  return (
    <section
      className="space-y-4 rounded-xl border border-sz-border p-3"
      aria-label="Construir com Zappy"
    >
      <p hidden={!draftOpen} className="text-sm text-sz-fg-soft">
        Descreva uma melhoria. Zappy prepara uma proposta, testa o jogo e mostra as alterações para
        você revisar.
      </p>
      {availability?.available === false && (
        <p role="status" className="text-sm text-sz-fg-soft">
          {availability.reason}
        </p>
      )}
      <form
        hidden={!draftOpen}
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
        className="space-y-2"
      >
        <label htmlFor={`${inputId}-scope`} className="block text-sm font-semibold">
          Tamanho do pedido
        </label>
        <select
          id={`${inputId}-scope`}
          className="w-full rounded-lg border border-sz-border bg-sz-bg p-2 text-sm"
          value={request.scope}
          disabled={busy || Boolean(pendingCreate.current)}
          onChange={(event) =>
            setRequest((value) => ({
              ...value,
              scope: event.target.value as StudioProAssistanceRequest['scope'],
            }))
          }
        >
          <option value="part">Uma parte do projeto</option>
          <option value="selection">Trecho selecionado</option>
          <option value="game">O jogo inteiro</option>
        </select>
        <label htmlFor={`${inputId}-objective`} className="block text-sm font-semibold">
          O que vamos construir?
        </label>
        <textarea
          id={`${inputId}-objective`}
          rows={3}
          maxLength={1000}
          value={objective}
          disabled={busy || Boolean(job && active(job)) || Boolean(pendingCreate.current)}
          onChange={(event) => setObjective(event.target.value)}
          className="w-full rounded-lg border border-sz-border bg-sz-bg p-2 text-sm"
          placeholder="Ex.: mostrar a energia do personagem e avisar quando estiver baixa"
        />
        {request.diagnostic && (
          <p className="text-xs text-sz-fg-mute">
            Resumo da resposta anexado como observação, não como causa comprovada. Descreva a
            mudança que deseja; preparar uma proposta usa IA.
          </p>
        )}
        {request.selection && (
          <p className="text-xs">
            Trecho de origem: {request.selection.path}:{request.selection.startLine}–
            {request.selection.endLine}. Sua revisão será conferida antes do pedido.
          </p>
        )}
        {(request.selection || request.scope === 'selection') && (
          <button
            type="button"
            className={button}
            disabled={busy || Boolean(pendingCreate.current)}
            onClick={() => {
              const selected = proCapture.current?.()?.selection
              if (!selected) {
                setError('Selecione um trecho no editor primeiro.')
                return
              }
              setRequest((value) => ({
                ...value,
                selection: {
                  path: selected.path,
                  startLine: selected.startLine,
                  endLine:
                    selected.endLine > selected.startLine && selected.endColumn === 1
                      ? selected.endLine - 1
                      : selected.endLine,
                  sourceHash: selected.sourceHash,
                },
              }))
              setNotice(
                'O novo pedido usará a seleção atual. O diagnóstico anterior continua sendo uma observação da conversa.',
              )
            }}
          >
            Usar seleção atual neste pedido
          </button>
        )}
        <label htmlFor={`${inputId}-criteria`} className="block text-sm">
          Como você vai conferir o resultado? · opcional
        </label>
        <textarea
          id={`${inputId}-criteria`}
          rows={2}
          maxLength={1805}
          value={criteria}
          disabled={busy || Boolean(pendingCreate.current)}
          onChange={(event) => setCriteria(event.target.value)}
          className="w-full rounded-lg border border-sz-border bg-sz-bg p-2 text-sm"
          placeholder="Até 6 critérios, um por linha"
        />
        {request.scope === 'game' && (
          <p className="text-xs">
            Este pedido tem até 3 chamadas de IA e 3 verificações. Se o jogo precisar de mais
            etapas, você decide quando continuar em uma nova proposta.
          </p>
        )}
        <button
          type="submit"
          className={button}
          disabled={
            loading ||
            checkingAvailability ||
            availability?.available === false ||
            busy ||
            (!objective.trim() && !pendingCreate.current) ||
            Boolean(job && active(job))
          }
        >
          {pendingCreate.current ? 'Recuperar solicitação' : 'Preparar proposta'}
        </button>
        <p className="text-xs text-sz-fg-mute">
          A execução usa os limites de IA da família. Você revisa antes de aplicar.
        </p>
      </form>
      <button
        type="button"
        className={button}
        disabled={busy || loading}
        onClick={() => void refresh()}
      >
        Consultar estado
      </button>
      {history.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm">
            Propostas anteriores ({history.length})
          </summary>
          <p className="my-2 text-xs text-sz-fg-mute">
            Disponíveis por até 7 dias, com limite de 10 por conta. Consultar não usa IA.
          </p>
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${button} text-left`}
                  disabled={busy}
                  onClick={() => {
                    setJob(item)
                    setReceipt(null)
                    setNotice(null)
                    setError(null)
                  }}
                >
                  {item.objective} ·{' '}
                  {item.assistance?.disposition === 'discarded' ? 'Descartada' : phases[item.phase]}
                </button>
              </li>
            ))}
          </ul>
          {nextCursor && (
            <button
              type="button"
              className={`${button} mt-2`}
              disabled={busy}
              onClick={() => void refresh(nextCursor)}
            >
              Carregar propostas anteriores
            </button>
          )}
        </details>
      )}
      {loading && <p role="status">Consultando a última construção…</p>}
      {job && (
        <div className="space-y-3 rounded-xl border border-sz-border p-3">
          <p role="status" className="font-semibold text-sm">
            {discarded
              ? 'Proposta descartada'
              : undone
                ? 'Alteração desfeita'
                : application || receipt
                  ? 'Proposta aplicada neste aparelho'
                  : phases[job.phase]}
          </p>
          <p className="text-sm">{job.objective}</p>
          {application && isDirty && (
            <p className="text-xs text-sz-fg-mute">
              Há alterações no projeto aguardando salvamento. O estado da aplicação aparece abaixo.
            </p>
          )}
          <p className="text-xs text-sz-fg-mute">
            {job.modelCalls}/3 chamadas de IA · {job.validationCalls}/3 verificações
          </p>
          {job.cost && (
            <p className="text-xs">
              Fonte: {job.cost.source === 'openrouter' ? 'OpenRouter do responsável' : 'assinatura'}{' '}
              · Custo confirmado: US$ {(job.cost.confirmedMicroUsd / 1_000_000).toFixed(6)}
              {job.cost.uncertain ? ' · Há consumo aguardando confirmação.' : ''}
            </p>
          )}
          {job.error && <p className="whitespace-pre-wrap text-sm text-sz-error">{job.error}</p>}
          {active(job) && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={button}
                disabled={busy || checkingAvailability || availability?.available === false}
                onClick={() => void resume()}
              >
                Continuar execução
              </button>
              <button type="button" className={button} onClick={() => void cancel()}>
                Cancelar construção
              </button>
            </div>
          )}
          {job.result && (
            <>
              <p className="text-sm">{job.result.change.summary}</p>
              {Boolean(job.assistance?.request.criteria.length) && (
                <div className="text-sm">
                  <p className="font-semibold">Critérios para você conferir</p>
                  <ul className="list-disc pl-4">
                    {job.assistance?.request.criteria.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-sz-fg-mute">
                    Estes critérios são manuais. As verificações automáticas abaixo não comprovam
                    todos eles.
                  </p>
                </div>
              )}
              {job.result.preview && (
                <p className="text-xs text-sz-fg-mute">
                  Verificações vinculadas a esta proposta · perfil{' '}
                  {job.result.preview.validation.profileVersion} · revisão{' '}
                  {job.result.preview.revisionHash.slice(0, 12)}
                </p>
              )}
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {job.result.plan.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <ul className="space-y-2 text-xs">
                {job.result.evidence.map((item) => (
                  <li key={item.kind}>
                    <strong>
                      {
                        {
                          types: 'Tipos',
                          build: 'Compilação',
                          playtest: 'Teste do jogo',
                          capture: 'Captura',
                        }[item.kind]
                      }
                      :{' '}
                      {item.status === 'passed'
                        ? 'verificado'
                        : item.status === 'failed'
                          ? 'falhou'
                          : 'indisponível'}
                    </strong>
                    <p>{item.detail}</p>
                  </li>
                ))}
              </ul>
              {capture?.artifactUrl && (
                <figure>
                  <img
                    src={capture.artifactUrl}
                    alt="Captura do jogo na revisão proposta"
                    loading="lazy"
                    className="w-full rounded-lg border border-sz-border"
                  />
                  <figcaption className="text-xs text-sz-fg-mute">
                    Confira o enquadramento, o texto e os controles. A captura fica disponível por
                    24 horas.
                  </figcaption>
                </figure>
              )}
              {selected && (
                <div className="space-y-2">
                  <label className="block text-sm" htmlFor={`${inputId}-file`}>
                    Comparar arquivos ({patches.length})
                  </label>
                  <select
                    id={`${inputId}-file`}
                    value={selected.path}
                    onChange={(event) => setSelectedPath(event.target.value)}
                    className="w-full rounded-lg border border-sz-border bg-sz-bg p-2 text-sm"
                  >
                    {patches.map((patch) => (
                      <option key={patch.path} value={patch.path}>
                        {patch.path} ·{' '}
                        {patch.before === null
                          ? 'novo'
                          : patch.content === null
                            ? 'excluir'
                            : 'alterar'}
                      </option>
                    ))}
                  </select>
                  <label className="block text-xs">
                    Antes
                    <textarea
                      readOnly
                      value={job.beforeFiles[selected.path] ?? '(arquivo não existia)'}
                      rows={7}
                      className="mt-1 w-full rounded border border-sz-border bg-sz-bg p-2 font-mono text-xs"
                    />
                  </label>
                  <label className="block text-xs">
                    Depois
                    <textarea
                      readOnly
                      value={selected.content ?? '(arquivo excluído)'}
                      rows={7}
                      className="mt-1 w-full rounded border border-sz-border bg-sz-bg p-2 font-mono text-xs"
                    />
                  </label>
                  <button
                    type="button"
                    className={button}
                    onClick={() => setShowDiff((value) => !value)}
                  >
                    {showDiff ? 'Fechar diferenças destacadas' : 'Destacar diferenças'}
                  </button>
                  {showDiff && (
                    <Suspense fallback={<p role="status">Carregando comparação…</p>}>
                      <RevisionDiff
                        before={job.beforeFiles[selected.path] ?? ''}
                        after={selected.content ?? ''}
                      />
                    </Suspense>
                  )}
                </div>
              )}
              {job.phase === 'review' && !discarded && (
                <div className="flex flex-wrap gap-2">
                  {job.result.preview && (
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() => {
                        if (
                          job.result?.preview &&
                          !preview.show({ projectId, jobId: job.id, ...job.result.preview })
                        )
                          setError('A prévia não está disponível neste ambiente.')
                      }}
                    >
                      Experimentar proposta
                    </button>
                  )}
                  {adapter.refreshPreview &&
                    (!job.result.preview ||
                      job.result.preview.artifact.expiresAt <= Date.now() ||
                      (preview.candidate?.jobId === job.id &&
                        ['expired', 'unavailable'].includes(preview.candidate.status))) && (
                      <button
                        type="button"
                        className={button}
                        disabled={
                          busy ||
                          checkingAvailability ||
                          availability?.available === false ||
                          (job.assistance?.previewRefreshes ?? 0) >= 3
                        }
                        onClick={() => void refreshPreview()}
                      >
                        Gerar nova prévia · sem IA
                      </button>
                    )}
                  <button
                    type="button"
                    className={button}
                    disabled={busy || Boolean(application || currentReceipt)}
                    onClick={() => void apply()}
                  >
                    Aplicar alterações
                  </button>
                  {(currentReceipt || application) && !undone && (
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() => void undo()}
                    >
                      Desfazer alterações
                    </button>
                  )}
                  {adapter.discard && !application && !receipt && (
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() => void discard()}
                    >
                      Descartar proposta
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          {pendingReceipt && (
            <div className="space-y-2">
              <p role="status" className="text-sm">
                Esta alteração ainda não foi salva neste aparelho. {pendingReceipt.error}
              </p>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => void retrySave()}
              >
                Tentar salvar alteração pendente
              </button>
            </div>
          )}
          {job.assistance?.previewError && (
            <p role="status" className="text-sm">
              {job.assistance.previewError}
            </p>
          )}
          {job.assistance && (
            <details>
              <summary className="cursor-pointer text-xs">Etapas registradas</summary>
              <ol className="mt-2 space-y-1 text-xs">
                {job.assistance.events.map((event) => (
                  <li key={event.sequence}>
                    {new Date(event.at).toLocaleString()} ·{' '}
                    {
                      {
                        created: 'Pedido recebido',
                        generating: 'Preparando proposta',
                        validating: 'Verificando proposta',
                        queued: 'Aguardando continuação',
                        review: 'Pronto para revisar',
                        failed: 'Precisa de atenção',
                        cancelled: 'Cancelado',
                        discarded: 'Descartado',
                        preview: 'Prévia recuperada',
                        'preview-failed': 'Prévia indisponível',
                      }[event.kind]
                    }
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
      {noticeText && (
        <p role="status" className="text-sm">
          {noticeText}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-sz-error">
          {error}
        </p>
      )}
    </section>
  )
}
