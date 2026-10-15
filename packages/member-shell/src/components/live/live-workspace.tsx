'use client'
import type {
  LiveActivityReport,
  LiveRoomView,
  LiveStudioConfig,
  LiveWorkspaceUpdate,
  LiveWorkspaceView,
} from '@sistemazero/core/live'
import type {
  Project,
  StudioHandle,
  StudioPersistenceAdapter,
  StudioShareAdapter,
} from '@sistemazero/studio'
import { createLocalPersistenceAdapter } from '@sistemazero/studio/local-persistence'
import { Button, Dialog } from '@sistemazero/ui'
import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { Maximize2, Minimize2, Save, Volume2, VolumeX } from 'lucide-react'
import dynamic from 'next/dynamic'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { dataUrlBase64ToBlob } from '../../lib/data-url'
import { useReportActivityExpanded } from '../../lib/lesson-activity-expansion'
import { liveRequest } from '../../lib/live/client'
import { cursorAnchor } from '../../lib/live/cursor'
import type { LiveLessonWorkspace } from '../../lib/live/lesson-slot'
import { createLivePreviewAdapter } from '../../lib/live/preview'
import { isTransientLiveFailure, sameLiveProject } from '../../lib/live/workspace-compare'
import { type LiveDraft, LiveDraftJournal, liveDraftScope } from '../../lib/live/workspace-drafts'
import { sessionFetch as fetch } from '../../lib/session-fetch'
import { EXPANDED_EXIT_ATTR, EXPANDED_EXIT_EDITOR, LessonVideoToggle } from '../lesson-video-float'
import { LiveAssistanceCursor } from './live-assistance-cursor'

const StudioEditor = dynamic(
  () => import('@sistemazero/studio/editor').then((module) => module.StudioEditor),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-6">
        Preparando seu Estúdio…
      </p>
    ),
  },
)
const SAVE_RETRY_MS = [2_000, 4_000, 8_000, 15_000]
// Constantes para o editor memorizado não receber um objeto novo a cada render.
const LEARNER_MODES: ('blocks' | 'bridge' | 'code')[] = ['blocks']
const LEARNER_FEATURES = { terminal: false, ai: false, extensions: false }
const TEACHER_FEATURES = { terminal: false, ai: false, extensions: true }

/** Uma cópia do projeto que a criança guarda no próprio computador. */
function downloadProject(project: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(project)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'meu-projeto.json'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
type WorkspaceContext = Pick<LiveRoomView, 'actorId' | 'role'> & {
  session: { id: string }
  library?: boolean
}
/** Reuses the canonical project after a lesson expires; Members checks subscription access. */
export function LiveContinuedWorkspace({
  workspace,
  deviceId,
  onError,
}: {
  workspace: LiveWorkspaceView
  deviceId: string
  onError?: (message: string) => void
}) {
  const [claimed, setClaimed] = useState<LiveWorkspaceView | null>(null)
  useEffect(() => {
    let active = true
    void liveRequest<LiveWorkspaceView>(`/api/live/workspaces/${workspace.id}/claim`, {
      deviceId,
      takeover: false,
    })
      .then((value) => {
        if (active) setClaimed(value)
      })
      .catch((cause) => {
        if (active) {
          setClaimed(workspace)
          onError?.(cause instanceof Error ? cause.message : 'O projeto já está aberto.')
        }
      })
    return () => {
      active = false
    }
  }, [workspace, deviceId, onError])
  if (!claimed) return <p role="status">Abrindo seu projeto…</p>
  return (
    <WorkspaceEditor
      key={workspace.id}
      initial={claimed}
      room={{
        session: { id: workspace.contextSessionId ?? workspace.sessionId },
        actorId: workspace.learnerId,
        role: 'learner',
        library: true,
      }}
      deviceId={deviceId}
      onError={onError}
    />
  )
}
export function LiveWorkspace({
  room,
  deviceId,
  onError,
  selectedLearnerId,
  onSelectedLearnerChange,
  onSaveStateChange,
  wide,
  onWideChange,
  onNeedsAttention,
}: {
  room: LiveRoomView
  deviceId: string
  onError?: (message: string) => void
  selectedLearnerId?: string
  onSelectedLearnerChange?(id: string): void
  onSaveStateChange?(state: LiveActivityReport['saveState']): void
  /** O Estúdio ampliado ocupa a largura da sala (blocos e jogo lado a lado). */
  wide?: boolean
  onWideChange?(wide: boolean): void
  /** A professora pediu para ajudar: no celular a sala troca para "Criar". */
  onNeedsAttention?(): void
}) {
  const [ownSelected, setOwnSelected] = useState('')
  const selected = selectedLearnerId ?? ownSelected
  const setSelected = onSelectedLearnerChange ?? setOwnSelected
  const [workspace, setWorkspace] = useState<LiveWorkspaceView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const teacher = room.role === 'teacher'
  const learnerId = teacher ? selected : room.actorId
  const currentKey = `${room.session.id}:${learnerId}`
  const [loadedKey, setLoadedKey] = useState('')
  useEffect(() => {
    if (!room.access.canOpen || !learnerId || !deviceId) return
    const controller = new AbortController()
    setError(null)
    void liveRequest<LiveWorkspaceView>(
      `/api/live/sessions/${room.session.id}/workspace`,
      { learnerId },
      'POST',
      controller.signal,
    )
      .then(async (opened) => {
        if (!teacher) {
          try {
            opened = await liveRequest<LiveWorkspaceView>(
              `/api/live/workspaces/${opened.id}/claim?sessionId=${room.session.id}`,
              { deviceId, takeover: false },
              'POST',
              controller.signal,
            )
          } catch (cause) {
            if (!controller.signal.aborted)
              setError(cause instanceof Error ? cause.message : 'O projeto já está aberto.')
          }
        }
        if (!controller.signal.aborted) {
          setWorkspace(opened)
          setLoadedKey(currentKey)
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          const message =
            cause instanceof Error ? cause.message : 'Não foi possível abrir o projeto.'
          setError(message)
          onError?.(message)
        }
      })
    return () => controller.abort()
  }, [room.session.id, room.access.canOpen, learnerId, teacher, deviceId, currentKey, onError])
  if (!room.access.canOpen) return null
  return (
    <section className="min-w-0 space-y-3" aria-label="Projeto da oficina">
      {teacher && (
        <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          Acompanhar projeto
          <select
            className="min-h-11 rounded-xl border bg-background px-3"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Escolha uma criança</option>
            {room.occurrence?.participants
              .filter((p) => p.admission === 'admitted')
              .map((p) => (
                <option key={p.learnerId} value={p.learnerId}>
                  {p.displayName}
                </option>
              ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert" className="rounded-xl border p-3 text-sm">
          {error}
        </p>
      )}
      {workspace && loadedKey === currentKey ? (
        <WorkspaceEditor
          key={workspace.id}
          initial={workspace}
          room={room}
          deviceId={deviceId}
          onError={onError}
          onSaveStateChange={onSaveStateChange}
          curation={room.plan?.studio}
          wide={wide}
          onWideChange={onWideChange}
          onNeedsAttention={onNeedsAttention}
        />
      ) : (
        <p className="rounded-2xl border bg-card p-6 text-muted-foreground">
          {teacher
            ? 'Escolha um projeto para acompanhar. O jogo da criança não será executado no seu painel.'
            : 'Abrindo o projeto guardado deste encontro…'}
        </p>
      )}
    </section>
  )
}
/** A curadoria do bloco Estúdio da aula (os mesmos campos do `StudioBlock`). */
export type LiveBlockCuration = LiveStudioConfig

/**
 * O BLOCO ESTÚDIO de uma aula de curso ao vivo (14/10/2026, "um projeto só"): o projeto ao vivo da
 * criança para o bloco (`GET /members/live/workspaces?sessionId=&blockId=`; chave = curso +
 * criança + `chain` do bloco ou o id dele; semente e curadoria vêm do bloco PUBLICADO), com lease,
 * revisões e a ajuda da professora. Não há "Enviar para a equipe": a professora vê o projeto ao
 * vivo. Publicar no Mural continua (prova do projeto ao vivo).
 *
 * Amplia como os editores da aula (sobreposição `fixed`, a saída marcada para o flutuante), e
 * avisa a aula pelo `useReportActivityExpanded`: é o que faz a transmissão virar o flutuante.
 */
export const LiveBlockWorkspace = memo(function LiveBlockWorkspace({
  workspace: context,
  blockId,
  curation,
  title,
  fillHeight = false,
}: {
  workspace: LiveLessonWorkspace
  blockId: string
  curation?: LiveBlockCuration | null
  /** O título da barra do bloco (o `estudio.titulo` do `LessonCopy`). */
  title: string
  fillHeight?: boolean
}) {
  const teacher = context.role === 'teacher'
  const learnerId = teacher ? (context.learnerId ?? '') : context.actorId
  const key = `${context.sessionId}:${blockId}:${learnerId}`
  const [opened, setOpened] = useState<{ key: string; view: LiveWorkspaceView } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const onError = context.onError
  useEffect(() => {
    if (!learnerId || !context.deviceId) return
    const controller = new AbortController()
    setError(null)
    const query = new URLSearchParams({ sessionId: context.sessionId, blockId })
    if (teacher) query.set('learnerId', learnerId)
    void liveRequest<LiveWorkspaceView>(
      `/api/live/workspaces?${query}`,
      undefined,
      'GET',
      controller.signal,
    )
      .then(async (view) => {
        let next = view
        if (!teacher && !view.readOnly) {
          try {
            next = await liveRequest<LiveWorkspaceView>(
              `/api/live/workspaces/${view.id}/claim?sessionId=${context.sessionId}`,
              { deviceId: context.deviceId, takeover: false },
              'POST',
              controller.signal,
            )
          } catch (cause) {
            if (!controller.signal.aborted)
              setError(cause instanceof Error ? cause.message : 'O projeto já está aberto.')
          }
        }
        if (!controller.signal.aborted) setOpened({ key, view: next })
      })
      .catch((cause) => {
        if (controller.signal.aborted) return
        const message = cause instanceof Error ? cause.message : 'Não foi possível abrir o projeto.'
        setError(message)
        onError?.(message)
      })
    return () => controller.abort()
  }, [key, learnerId, teacher, blockId, context.sessionId, context.deviceId, onError])
  // Esc reduz, como no Estúdio da aula (salvo com um menu ou diálogo aberto: o Esc é deles).
  useEffect(() => {
    if (!expanded) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (document.querySelector('[role="menu"],[role="dialog"]')) return
      setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])
  // A professora abriu uma parte sem este bloco: a aula o esconde (`display: none`) e a tela vai
  // junto com a turma. Ampliado e escondido, ele seguiria avisando "atividade ampliada" e a
  // transmissão ficaria flutuando sobre nada.
  useEffect(() => {
    const element = root.current
    if (!expanded || !element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (element.getClientRects().length === 0) setExpanded(false)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [expanded])
  useBodyScrollLock(expanded)
  useReportActivityExpanded(expanded)
  const view = opened?.key === key ? opened.view : null
  return (
    <div
      ref={root}
      className={cn(
        'sz-live-block-workspace flex flex-col gap-3 rounded-lg border border-border bg-card p-4',
        expanded && 'fixed inset-0 z-50 rounded-none',
        fillHeight && !expanded && 'min-h-0 flex-1',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="sz-display text-base">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <LessonVideoToggle expanded={expanded} size="sm" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((value) => !value)}
            disabled={!view}
            {...(expanded ? { [EXPANDED_EXIT_ATTR]: EXPANDED_EXIT_EDITOR } : {})}
          >
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            {expanded ? 'Reduzir' : 'Expandir'}
          </Button>
        </div>
      </div>
      {teacher ? (
        <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          Acompanhar projeto
          <select
            className="min-h-11 rounded-xl border bg-background px-3"
            value={learnerId}
            onChange={(event) => context.onSelectLearner?.(event.target.value)}
          >
            <option value="">Escolha uma criança</option>
            {(context.learners ?? []).map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl border p-3 text-sm">
          {error}
        </p>
      ) : null}
      {view ? (
        <WorkspaceEditor
          key={view.id}
          initial={view}
          room={{
            session: { id: context.sessionId },
            actorId: context.actorId,
            role: context.role,
          }}
          deviceId={context.deviceId}
          onError={onError}
          onSaveStateChange={context.onSaveStateChange}
          curation={curation}
          onNeedsAttention={context.onNeedsAttention}
          fill={expanded || fillHeight}
          publishToMural={context.publishToMural === true}
        />
      ) : (
        // A altura do editor já reservada: ele chega sem empurrar a aula.
        <p
          className={cn(
            'grid place-items-center rounded-2xl border bg-card p-6 text-center text-muted-foreground',
            expanded || fillHeight ? 'min-h-[420px] flex-1' : 'h-[min(72vh,820px)] min-h-[420px]',
          )}
        >
          {teacher && !learnerId
            ? 'Escolha um projeto para acompanhar. O jogo da criança não será executado no seu painel.'
            : 'Abrindo o projeto guardado deste encontro…'}
        </p>
      )}
    </div>
  )
})

function WorkspaceEditor({
  initial,
  room,
  deviceId,
  onError,
  onSaveStateChange,
  curation,
  wide = false,
  onWideChange,
  onNeedsAttention,
  fill = false,
  publishToMural = true,
}: {
  initial: LiveWorkspaceView
  room: WorkspaceContext
  deviceId: string
  onError?: (message: string) => void
  onSaveStateChange?(state: LiveActivityReport['saveState']): void
  /** A curadoria do Estúdio que o roteiro da oficina define (mesmo formato do bloco das aulas). */
  curation?: LiveStudioConfig | null
  wide?: boolean
  onWideChange?(wide: boolean): void
  onNeedsAttention?(): void
  /** O editor ocupa a altura do pai (o bloco ampliado). */
  fill?: boolean
  /** "Compartilhar" no Mural: só no Kids (a comunidade adulta não tem o Mural). */
  publishToMural?: boolean
}) {
  const [workspace, setWorkspace] = useState(initial)
  const latest = useRef(initial)
  const editor = useRef<StudioHandle>(null)
  const initialProject = useRef(initial.project as unknown as Project)
  const [editing, setEditing] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Projeto guardado na sua conta')
  const [muted, setMuted] = useState(true)
  const [recovery, setRecovery] = useState<Project | null>(null)
  const recoveryRevision = useRef<number | null>(null)
  const recoveryDraft = useRef<LiveDraft | null>(null)
  const [drafts, setDrafts] = useState<LiveDraft[]>([])
  const [journal, setJournal] = useState<LiveDraftJournal | null>(null)
  const staged = useRef<{ draft: LiveDraft; saved: Promise<void> } | null>(null)
  // Queda curta de rede: a criança segue criando, o projeto fica neste aparelho e tentamos de novo.
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryAttempt = useRef(0)
  // Recuperação causada por conexão (e não por troca de autoria) tenta se resolver sozinha.
  const autoRecover = useRef(false)
  const lastAutoRecover = useRef(0)
  const recoverRef = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => {
    onSaveStateChange?.(
      recovery || error
        ? 'offline'
        : !ready
          ? 'not-open'
          : status === 'Projeto guardado na sua conta'
            ? 'saved'
            : status === 'Guardando o projeto…'
              ? 'saving'
              : 'offline',
    )
    return () => onSaveStateChange?.('not-open')
  }, [status, ready, recovery, error, onSaveStateChange])
  const queue = useRef<Promise<void>>(Promise.resolve())
  const writingBlocked = useRef(false)
  const mounted = useRef(true)
  const lastCursor = useRef(0)
  const editorRoot = useRef<HTMLDivElement>(null)
  const lastApplied = useRef<string | null>(null)
  const workspaceRequest = useCallback(
    <T,>(path: string, body?: unknown, method?: string, signal?: AbortSignal) =>
      liveRequest<T>(
        room.library
          ? path
          : `${path}${path.includes('?') ? '&' : '?'}sessionId=${room.session.id}`,
        body,
        method,
        signal,
      ),
    [room.session.id, room.library],
  )
  const base = `/api/live/workspaces/${workspace.id}`
  const adminBase = `/api/admin/live/workspaces/${workspace.id}`
  const teacher = room.role === 'teacher'
  useEffect(() => {
    let active = true
    let opened: LiveDraftJournal | undefined
    void LiveDraftJournal.open(
      liveDraftScope(initial.id, initial.learnerId, room.actorId),
      deviceId,
    )
      .then(async (value) => {
        opened = value
        const pending = await value.list()
        if (!active) {
          value.close()
          return
        }
        const remaining: LiveDraft[] = []
        for (const draft of pending) {
          if (sameLiveProject(draft.project, latest.current.project))
            await value.confirm(draft, latest.current.revision)
          else remaining.push(draft)
        }
        if (!active) {
          value.close()
          return
        }
        if (remaining[0]) {
          writingBlocked.current = true
          recoveryDraft.current = remaining[0]
          recoveryRevision.current = remaining[0].revision
          setRecovery(remaining[0].project)
          setDrafts(remaining)
        }
        setJournal(value)
      })
      .catch(() => {
        if (active)
          setError(
            'Não foi possível preparar o rascunho neste aparelho. Libere o armazenamento do navegador e reabra a sala.',
          )
      })
    return () => {
      active = false
      // Studio's unmount flush must open its local transaction before the connection closes.
      setTimeout(() => opened?.close(), 0)
    }
  }, [initial.id, initial.learnerId, room.actorId, deviceId])
  const previewAdapter = useMemo(
    () => createLivePreviewAdapter(room.session.id, workspace.id),
    [room.session.id, workspace.id],
  )
  const publication = useRef<{ key: string; id: string } | null>(null)
  const [share] = useState<StudioShareAdapter | undefined>(() =>
    teacher || !publishToMural
      ? undefined
      : {
          async publish(input) {
            if (writingBlocked.current)
              throw new Error('Recupere o salvamento antes de compartilhar.')
            // Flush pending Blockly/Monaco edits before requesting the server's canonical snapshot.
            await editor.current?.save()
            await queue.current
            const current = latest.current
            const key = JSON.stringify([
              current.revision,
              input.title,
              input.description,
              input.coverDataUrl,
            ])
            if (publication.current?.key !== key)
              publication.current = { key, id: crypto.randomUUID() }
            const form = new FormData()
            form.set('liveWorkspaceId', current.id)
            form.set('liveRevision', String(current.revision))
            form.set('title', input.title)
            form.set('description', input.description)
            form.set('clientIdempotencyKey', publication.current.id)
            if (input.coverDataUrl)
              form.set('cover', dataUrlBase64ToBlob(input.coverDataUrl), 'capa.png')
            const response = await fetch('/api/studio/publish-standalone', {
              method: 'POST',
              body: form,
              signal: AbortSignal.timeout(60_000),
            })
            const result = await response.json()
            if (!response.ok)
              throw new Error(
                result.error?.message ??
                  'Não foi possível publicar. Seu projeto continua guardado.',
              )
            return { muralUrl: result.muralUrl, playUrl: result.playUrl }
          },
        },
  )
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [])
  // A consulta do projeto (a cada 1 s) devolve um objeto novo mesmo sem nada novo: só vira estado
  // (e re-render) quando muda o que a tela usa. O Estúdio, esse, nem com isso re-renderiza (ver o
  // elemento memorizado abaixo).
  const remember = useCallback((next: LiveWorkspaceView) => {
    const previous = latest.current
    latest.current = next
    if (!mounted.current) return
    if (
      previous.id === next.id &&
      previous.revision === next.revision &&
      previous.writerEpoch === next.writerEpoch &&
      previous.writerId === next.writerId &&
      previous.writerDeviceId === next.writerDeviceId &&
      previous.leaseExpiresAt === next.leaseExpiresAt &&
      previous.readOnly === next.readOnly &&
      previous.project === next.project &&
      JSON.stringify(previous.assistance) === JSON.stringify(next.assistance)
    )
      return
    setWorkspace(next)
  }, [])
  const fail = useCallback(
    (cause: unknown) => {
      const message =
        cause instanceof Error ? cause.message : 'Não foi possível confirmar a gravação.'
      if (mounted.current) {
        setError(message)
        onError?.(message)
      }
    },
    [onError],
  )
  const apply = useCallback(
    async (next: LiveWorkspaceView) => {
      const handle = editor.current
      if (!handle) return
      const previous = latest.current
      // Prazo vencido sem continuação no Estúdio: só ver e baixar (o servidor recusa escritas).
      const own =
        !next.readOnly &&
        next.writerId === room.actorId &&
        next.writerDeviceId === deviceId &&
        next.leaseExpiresAt !== null &&
        Date.parse(next.leaseExpiresAt) > Date.now()
      const appliedKey = `${next.revision}:${next.writerEpoch}`
      if (
        previous.writerEpoch !== next.writerEpoch ||
        (!own && lastApplied.current !== appliedKey) ||
        (own && !editing) ||
        lastApplied.current === null
      ) {
        const local = await handle.prepareHandoff()
        if (
          local &&
          previous.writerId === room.actorId &&
          previous.writerDeviceId === deviceId &&
          !sameLiveProject(local, previous.project) &&
          !sameLiveProject(local, next.project)
        ) {
          if (!journal) throw new Error('Aguarde a preparação do rascunho.')
          const retained = journal.stage(local, previous.revision, previous.writerEpoch)
          await retained.saved
          staged.current = retained
          recoveryDraft.current = retained.draft
          recoveryRevision.current = previous.revision
          writingBlocked.current = true
          setRecovery(local)
          setDrafts((items) => [
            retained.draft,
            ...items.filter((item) => item.id !== retained.draft.id),
          ])
        }
        await handle.applyObservedRevision(next.project as unknown as Project, next.revision)
        lastApplied.current = appliedKey
        if (own && !writingBlocked.current) {
          handle.resumeAuthorship(next.revision)
          setEditing(true)
        } else setEditing(false)
      }
      remember(next)
    },
    [deviceId, editing, remember, room.actorId, journal],
  )
  useEffect(() => {
    if (!ready) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const update = await workspaceRequest<LiveWorkspaceUpdate>(
          `${base}?revision=${latest.current.revision}`,
        )
        let next: LiveWorkspaceView = {
          ...update,
          project: update.project ?? latest.current.project,
        }
        if (stopped) return
        if (
          teacher &&
          next.assistance?.status === 'active' &&
          next.writerId === room.actorId &&
          next.writerDeviceId === null
        )
          next = await workspaceRequest<LiveWorkspaceView>(`${adminBase}/attach`, { deviceId })
        // Serialize remote application after local saves; a stale poll cannot roll back an acknowledged commit.
        await queue.current
        if (
          stopped ||
          next.revision < latest.current.revision ||
          next.writerEpoch < latest.current.writerEpoch
        )
          return
        await apply(next)
        if (mounted.current && !writingBlocked.current) setError(null)
        if (autoRecover.current && Date.now() - lastAutoRecover.current > 5_000) {
          lastAutoRecover.current = Date.now()
          void recoverRef.current?.()
        }
        if (!teacher && next.assistance?.status === 'returning') {
          const returned = await workspaceRequest<LiveWorkspaceView>(`${base}/acknowledge`, {
            revision: next.revision,
            deviceId,
          })
          await apply(returned)
        }
      } catch (cause) {
        if (!stopped) fail(cause)
      } finally {
        if (!stopped) timer = setTimeout(() => void poll(), 1000)
      }
    }
    void poll()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [ready, base, adminBase, deviceId, teacher, room.actorId, apply, fail, workspaceRequest])
  // biome-ignore lint/correctness/useExhaustiveDependencies: scheduleRetry só lê e grava refs; nas dependências o efeito reiniciaria a cada render.
  useEffect(() => {
    if (!editing) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    async function renew() {
      try {
        const next = await workspaceRequest<LiveWorkspaceView>(`${base}/renew`, {
          deviceId,
          writerEpoch: latest.current.writerEpoch,
        })
        if (
          !stopped &&
          next.revision >= latest.current.revision &&
          next.writerEpoch === latest.current.writerEpoch
        ) {
          remember(next)
          // A rede voltou: o que ficou só neste aparelho sobe agora.
          if (staged.current && !retryTimer.current) {
            retryAttempt.current = 0
            scheduleRetry()
          }
        }
      } catch (cause) {
        const lease = latest.current.leaseExpiresAt
        if (
          !stopped &&
          isTransientLiveFailure(cause) &&
          lease &&
          Date.parse(lease) - Date.now() > 3_000
        ) {
          // Ainda dá tempo: tenta renovar de novo logo, sem tirar a edição da criança.
          if (mounted.current) setStatus('Sem internet agora: guardado neste aparelho')
          clearTimeout(timer)
          timer = setTimeout(() => void renew(), 3_000)
          return
        }
        if (!stopped) {
          autoRecover.current = isTransientLiveFailure(cause)
          writingBlocked.current = true
          recoveryRevision.current = latest.current.revision
          setEditing(false)
          const snapshot = await editor.current?.prepareHandoff()
          if (snapshot && journal) {
            const retained = journal.stage(
              snapshot,
              latest.current.revision,
              latest.current.writerEpoch,
            )
            staged.current = retained
            recoveryDraft.current = retained.draft
            setRecovery(snapshot)
            await retained.saved.catch(fail)
          }
          fail(cause)
        }
      }
      if (!stopped) timer = setTimeout(() => void renew(), 10_000)
    }
    timer = setTimeout(() => void renew(), 10_000)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [editing, base, deviceId, remember, fail, journal, workspaceRequest])
  function commit(project: Project): Promise<void> {
    const authority = latest.current
    // A later save may already be staged while an earlier remote save is in flight.
    const retained = staged.current ?? stageSnapshot(project)
    const receipt = sameLiveProject(retained.draft.project, project)
      ? retained.draft
      : { ...retained.draft, token: crypto.randomUUID(), project }
    const operation = queue.current.then(async () => {
      await retained.saved
      if (writingBlocked.current)
        throw new Error('Guarde seu rascunho antes de recuperar a conexão.')
      const current = latest.current
      if (
        current.writerId !== room.actorId ||
        current.writerDeviceId !== deviceId ||
        current.writerEpoch !== authority.writerEpoch
      )
        throw new Error('A autoria mudou. Seu rascunho está preservado neste aparelho.')
      if (current.revision > 0 && sameLiveProject(current.project, project)) {
        await journal?.confirm(receipt, current.revision)
        if (staged.current?.draft.token === receipt.token) staged.current = null
        if (mounted.current)
          setStatus(staged.current ? 'Guardando o projeto…' : 'Projeto guardado na sua conta')
        return
      }
      const body = {
        project,
        deviceId,
        writerEpoch: current.writerEpoch,
        expectedRevision: current.revision,
        mutationId: crypto.randomUUID(),
      }
      setStatus('Guardando o projeto…')
      try {
        const saved = await workspaceRequest<LiveWorkspaceView>(`${base}/commits`, body)
        remember(saved)
        await journal?.confirm(receipt, saved.revision)
        if (staged.current?.draft.token === receipt.token) staged.current = null
        else if (staged.current?.draft.writerEpoch === receipt.writerEpoch)
          staged.current.draft.revision = saved.revision
        retryAttempt.current = 0
        if (mounted.current)
          setStatus(staged.current ? 'Guardando o projeto…' : 'Projeto guardado na sua conta')
      } catch (cause) {
        const lease = latest.current.leaseExpiresAt
        if (isTransientLiveFailure(cause) && lease && Date.parse(lease) > Date.now()) {
          // O rascunho já está no aparelho (journal). Não trava a edição: tenta de novo depois.
          if (mounted.current) setStatus('Sem internet agora: guardado neste aparelho')
          scheduleRetry()
          return
        }
        autoRecover.current = isTransientLiveFailure(cause)
        writingBlocked.current = true
        recoveryRevision.current = current.revision
        setEditing(false)
        const snapshot = (await editor.current?.prepareHandoff().catch(() => null)) ?? project
        const preserved = journal?.stage(snapshot, current.revision, current.writerEpoch)
        if (preserved) {
          staged.current = preserved
          recoveryDraft.current = preserved.draft
          await preserved.saved.catch(fail)
        }
        setRecovery(snapshot)
        setStatus('Este rascunho ainda precisa ser guardado')
        fail(cause)
        throw cause
      }
    })
    queue.current = operation.catch(() => {})
    return operation
  }
  function scheduleRetry() {
    if (retryTimer.current) return
    const wait = SAVE_RETRY_MS[Math.min(retryAttempt.current, SAVE_RETRY_MS.length - 1)]!
    retryAttempt.current += 1
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null
      const pending = staged.current?.draft.project as Project | undefined
      if (!pending || writingBlocked.current || !mounted.current) return
      void saveImplementation.current(pending).catch(() => {})
    }, wait)
  }
  function stageSnapshot(project: Project) {
    if (!journal) throw new Error('Aguarde a preparação do rascunho.')
    const current = latest.current
    const retained = journal.stage(project, current.revision, current.writerEpoch)
    staged.current = retained
    return retained
  }
  const saveImplementation = useRef(commit)
  saveImplementation.current = commit
  const persistence = useMemo<StudioPersistenceAdapter | null>(
    () =>
      journal
        ? {
            scopeIdentity: journal.scope,
            load: async () => null,
            stage: async (project) => {
              const current = latest.current
              if (
                current.writerId !== room.actorId ||
                current.writerDeviceId !== deviceId ||
                writingBlocked.current
              )
                return
              const retained = journal.stage(project, current.revision, current.writerEpoch)
              staged.current = retained
              if (mounted.current) setStatus('Guardando o projeto…')
              await retained.saved
            },
            save: (project) => saveImplementation.current(project),
          }
        : null,
    [journal, room.actorId, deviceId],
  )
  async function act(action: 'request' | 'cancel' | 'accept' | 'revoke' | 'return' | 'claim') {
    setBusy(true)
    setError(null)
    try {
      await queue.current
      let next: LiveWorkspaceView
      if (action === 'request') next = await workspaceRequest(`${adminBase}/assistance`, {})
      else if (action === 'cancel')
        next = await workspaceRequest(`${adminBase}/cancel-assistance`, {
          requestId: latest.current.assistance?.id,
        })
      else if (action === 'claim')
        next = await workspaceRequest(`${base}/claim`, { deviceId, takeover: true })
      else if (action === 'revoke') next = await workspaceRequest(`${base}/revoke`, { deviceId })
      else {
        const snapshot = await editor.current?.prepareHandoff()
        setEditing(false)
        if (!snapshot) throw new Error('Aguarde o projeto abrir.')
        await queue.current
        const current = latest.current
        const body = {
          project: snapshot,
          deviceId,
          writerEpoch: current.writerEpoch,
          expectedRevision: current.revision,
          mutationId: crypto.randomUUID(),
          ...(action === 'accept' ? { requestId: current.assistance?.id } : {}),
        }
        next = await workspaceRequest(
          action === 'accept' ? `${base}/accept` : `${adminBase}/return`,
          body,
        )
      }
      if (action === 'claim' || action === 'revoke') writingBlocked.current = false
      await apply(next)
    } catch (cause) {
      fail(cause)
    } finally {
      setBusy(false)
    }
  }
  recoverRef.current = recoverConnection
  async function recoverConnection() {
    if (!recovery || teacher || busy) return
    setBusy(true)
    setError(null)
    try {
      await queue.current
      const current = await workspaceRequest<LiveWorkspaceView>(base)
      const alreadySaved = sameLiveProject(current.project, recovery)
      if (!alreadySaved && current.revision !== recoveryRevision.current)
        throw new Error(
          'Há uma revisão mais recente na conta. Baixe seu rascunho para preservar as duas versões.',
        )
      let recovered = await workspaceRequest<LiveWorkspaceView>(`${base}/claim`, {
        deviceId,
        takeover: false,
      })
      // Recheck after the atomic claim: another writer may have saved between reads.
      if (recovered.revision !== current.revision)
        throw new Error(
          'O projeto mudou durante a reconexão. Baixe seu rascunho antes de continuar.',
        )
      if (!alreadySaved)
        recovered = await workspaceRequest<LiveWorkspaceView>(`${base}/commits`, {
          deviceId,
          writerEpoch: recovered.writerEpoch,
          expectedRevision: recovered.revision,
          mutationId: crypto.randomUUID(),
          project: recovery,
        })
      if (recoveryDraft.current) await journal?.confirm(recoveryDraft.current, recovered.revision)
      const remaining = (await journal?.list()) ?? []
      writingBlocked.current = false
      await apply(recovered)
      staged.current = null
      setRecovery(null)
      recoveryDraft.current = null
      setDrafts(remaining)
      recoveryRevision.current = null
      autoRecover.current = false
      setStatus('Projeto guardado na sua conta')
    } catch (cause) {
      // Revisão mais nova na conta: aí a escolha é da criança, não tentamos sozinhos de novo.
      if (
        !isTransientLiveFailure(cause) ||
        (cause instanceof Error && /revisão|mudou/.test(cause.message))
      )
        autoRecover.current = false
      fail(cause)
    } finally {
      setBusy(false)
    }
  }
  const assistance = workspace.assistance
  const interruptedHelp =
    assistance?.status === 'returning' ||
    (assistance?.status === 'active' &&
      (!workspace.leaseExpiresAt || Date.parse(workspace.leaseExpiresAt) <= Date.now()))
  const cursor = assistance?.cursor
  const cursorVisible =
    !teacher &&
    assistance?.status === 'active' &&
    cursor &&
    Date.parse(cursor.expiresAt) > Date.now()
  const learner = !teacher
  const asking = learner && assistance?.status === 'requested'
  const askingId = asking ? assistance?.id : null
  // biome-ignore lint/correctness/useExhaustiveDependencies: avisa uma vez por pedido.
  useEffect(() => {
    if (askingId) onNeedsAttention?.()
  }, [askingId])
  const saving = status === 'Guardando o projeto…'
  const offline = status.startsWith('Sem internet')
  // ⭐ O ESTÚDIO memorizado: a barra de status, a ajuda e a consulta re-renderizam este componente,
  // e o editor (Blockly, código, prévia) só re-renderiza quando muda o que ele recebe.
  const onStudioReady = useCallback(() => setReady(true), [])
  const onStudioError = useCallback(
    (cause: { message: string }) => fail(new Error(cause.message)),
    [fail],
  )
  const shareDisabledReason = assistance
    ? 'Conclua a ajuda antes de compartilhar.'
    : !editing
      ? 'Continue neste aparelho antes de compartilhar.'
      : undefined
  const curationLevel = curation?.level
  const curationBlocks = curation?.allowBlocks
  const curationCategories = curation?.allowCategories
  const curationModes = curation?.allowedModes
  const curationReveal = curation?.allowLevelReveal
  const studioElement = useMemo(
    () =>
      persistence ? (
        <StudioEditor
          ref={editor}
          initialProject={initialProject.current}
          persistence={persistence}
          editingAccess={editing ? 'author' : 'observer'}
          autoRun={false}
          requireIsolatedPreview
          previewOriginAdapter={previewAdapter}
          projectMuted={muted}
          share={share}
          shareDisabledReason={shareDisabledReason}
          onReady={onStudioReady}
          onError={onStudioError}
          // A curadoria (como no bloco do Estúdio das aulas). Sem ela, a criança via a paleta
          // inteira, os modos Ponte e Código e instalava qualquer extensão.
          level={curationLevel as never}
          allowBlocks={curationBlocks}
          allowCategories={curationCategories}
          allowedModes={curationModes ?? (teacher ? undefined : LEARNER_MODES)}
          allowLevelReveal={curationReveal ?? false}
          features={teacher ? TEACHER_FEATURES : LEARNER_FEATURES}
        />
      ) : (
        <p role="status" className="p-6">
          Preparando seu rascunho…
        </p>
      ),
    [
      persistence,
      editing,
      previewAdapter,
      muted,
      share,
      shareDisabledReason,
      onStudioReady,
      onStudioError,
      curationLevel,
      curationBlocks,
      curationCategories,
      curationModes,
      curationReveal,
      teacher,
    ],
  )
  return (
    <div className={cn('space-y-2.5', fill && 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-2.5">
        <span
          className={`mr-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-bold text-sm ${offline || recovery ? 'bg-amber-100 text-amber-950' : 'text-muted-foreground'}`}
          role="status"
        >
          {assistance?.status === 'active'
            ? learner
              ? `${assistance.teacherName} está mexendo no seu projeto. Você acompanha aqui.`
              : `${assistance.teacherName} está ajudando no projeto`
            : recovery
              ? 'Seu projeto está guardado neste computador'
              : saving
                ? 'Guardando…'
                : offline
                  ? status
                  : learner
                    ? 'Guardado na sua conta'
                    : status}
        </span>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => setMuted((value) => !value)}
          aria-pressed={!muted}
        >
          {muted ? <VolumeX size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
          {muted ? 'Som do jogo desligado' : 'Som do jogo ligado'}
        </Button>
        {onWideChange ? (
          <Button
            variant="outline"
            className="hidden min-h-11 lg:inline-flex"
            aria-pressed={wide}
            onClick={() => onWideChange(!wide)}
          >
            {wide ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
            {wide ? 'Diminuir' : 'Ampliar'}
          </Button>
        ) : null}
        {teacher && !assistance && (
          <Button className="min-h-11" disabled={busy} onClick={() => void act('request')}>
            Pedir para ajudar
          </Button>
        )}
        {teacher && assistance?.status === 'requested' && assistance.teacherId === room.actorId && (
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => void act('cancel')}
          >
            Cancelar pedido de ajuda
          </Button>
        )}
        {learner && assistance && assistance.status !== 'requested' && (
          <Button className="min-h-11" disabled={busy} onClick={() => void act('revoke')}>
            Parar ajuda
          </Button>
        )}
        {teacher && assistance?.teacherId === room.actorId && interruptedHelp && (
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => void act('cancel')}
          >
            Encerrar ajuda interrompida
          </Button>
        )}
        {teacher && assistance?.status === 'active' && !interruptedHelp && (
          <Button className="min-h-11" disabled={busy} onClick={() => void act('return')}>
            Devolver o projeto
          </Button>
        )}
        {editing && (
          <Button
            data-live-target="studio-save"
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => void editor.current?.save().catch(fail)}
          >
            <Save size={16} aria-hidden /> Guardar
          </Button>
        )}
      </div>
      {workspace.readOnly && ready ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3.5">
          <p className="font-semibold">
            {learner
              ? 'O prazo para mexer neste projeto terminou. Você ainda pode ver e baixar uma cópia.'
              : 'O prazo desta criança terminou: o projeto agora é só para ver.'}
          </p>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => downloadProject(editor.current?.getProject() ?? workspace.project)}
          >
            Baixar uma cópia
          </Button>
        </div>
      ) : null}
      {learner && !editing && !assistance && !recovery && ready && !workspace.readOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-amber-50 p-3.5">
          <p className="font-semibold">Seu projeto está aberto em outro computador ou aba.</p>
          <Button className="min-h-11" disabled={busy} onClick={() => void act('claim')}>
            Continuar aqui
          </Button>
        </div>
      ) : null}
      {teacher && assistance?.status === 'active' && (
        <p className="text-sm text-muted-foreground">
          Fora da gravação · A turma continua ouvindo.
        </p>
      )}
      {busy && teacher && (
        <p role="status" className="text-sm">
          Confirmando o salvamento e a autoria…
        </p>
      )}
      {error && !recovery && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          {error}
        </p>
      )}
      {!recovery && drafts.length > 0 && (
        <details className="rounded-2xl border p-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Cópias guardadas neste computador ({drafts.length})
          </summary>
          <p className="py-2">Você pode baixar uma cópia para guardar.</p>
          {drafts.map((draft) => (
            <Button
              key={draft.id}
              variant="outline"
              className="m-1 min-h-11"
              onClick={() => downloadProject(draft.project)}
            >
              Baixar a cópia de {new Date(draft.savedAt).toLocaleString('pt-BR')}
            </Button>
          ))}
        </details>
      )}
      {recovery && (
        <div className="space-y-3 rounded-2xl border-2 border-amber-300 bg-card p-4">
          <p className="font-bold">
            {learner
              ? 'A internet caiu por um tempo, mas nada se perdeu: seu projeto ficou guardado neste computador.'
              : 'Há um rascunho preservado neste aparelho que ainda precisa ser guardado na conta.'}
          </p>
          {error ? (
            <p role="alert" className="text-sm text-muted-foreground">
              {error}
            </p>
          ) : null}
          {drafts.length > 1 && (
            <label className="block text-sm">
              Qual versão guardar
              <select
                className="ml-2 min-h-11 rounded-lg border bg-background p-2"
                value={recoveryDraft.current?.id ?? ''}
                onChange={(event) => {
                  const draft = drafts.find((item) => item.id === event.target.value)
                  if (draft) {
                    recoveryDraft.current = draft
                    recoveryRevision.current = draft.revision
                    setRecovery(draft.project)
                  }
                }}
              >
                {drafts.map((draft) => (
                  <option key={draft.id} value={draft.id}>
                    {new Date(draft.savedAt).toLocaleString('pt-BR')}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            {learner && (
              <Button className="min-h-11" disabled={busy} onClick={() => void recoverConnection()}>
                {busy ? 'Guardando…' : 'Guardar na minha conta'}
              </Button>
            )}
            <Button
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const current = await workspaceRequest<LiveWorkspaceView>(base)
                  setDrafts((await journal?.list()) ?? [])
                  writingBlocked.current = false
                  autoRecover.current = false
                  await apply(current)
                  setRecovery(null)
                  setError(null)
                  setStatus('Projeto guardado na sua conta')
                } catch (cause) {
                  writingBlocked.current = true
                  fail(cause)
                } finally {
                  setBusy(false)
                }
              }}
            >
              Usar a versão da conta
            </Button>
            <Button variant="ghost" className="min-h-11" onClick={() => downloadProject(recovery)}>
              Baixar uma cópia
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={Boolean(asking)}
        onClose={() => {}}
        title={`${assistance?.teacherName ? `A professora ${assistance.teacherName}` : 'A professora'} quer ajudar no seu projeto`}
        description="Enquanto ela mexe, você acompanha aqui. Você pode parar a ajuda quando quiser."
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => void act('revoke')}
          >
            Agora não
          </Button>
          <Button className="min-h-11" disabled={busy} onClick={() => void act('accept')}>
            Sim, pode ajudar
          </Button>
        </div>
      </Dialog>
      <div
        className={`relative overflow-hidden rounded-2xl border ${fill ? 'min-h-[420px] flex-1' : wide ? 'h-[calc(100dvh-13rem)] min-h-[480px]' : 'h-[min(72vh,820px)] min-h-[420px]'}`}
        ref={editorRoot}
        onPointerMove={(event) => {
          if (
            !teacher ||
            !editing ||
            assistance?.status !== 'active' ||
            Date.now() - lastCursor.current < 500
          )
            return
          lastCursor.current = Date.now()
          const anchor = cursorAnchor(
            event.currentTarget,
            event.target instanceof Element ? event.target : null,
          )
          const box = anchor?.rect
          void workspaceRequest(`${adminBase}/cursor`, {
            deviceId,
            writerEpoch: latest.current.writerEpoch,
            target: anchor?.target ?? null,
            revision: latest.current.revision,
            x: box?.width ? Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) : 0,
            y: box?.height ? Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) : 0,
          }).catch(() => {})
        }}
      >
        {studioElement}
        {cursorVisible && (
          <LiveAssistanceCursor
            root={editorRoot}
            assistance={assistance}
            revision={workspace.revision}
          />
        )}
      </div>
    </div>
  )
}
/** This isolated page contains only the teacher's explanation project. */
export function LiveDemonstration({ room }: { room: LiveRoomView }) {
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [persistence] = useState(() =>
    createLocalPersistenceAdapter({
      namespace: `live-demonstration:${room.actorId}:${room.session.id}`,
    }),
  )
  const previewAdapter = useMemo(() => createLivePreviewAdapter(room.session.id), [room.session.id])
  useEffect(() => {
    if (room.role !== 'teacher') return
    let active = true
    void liveRequest<{ project: Project }>(`/api/live/sessions/${room.session.id}/demonstration`)
      .then(async (template) => {
        // Authorize this teacher before reading a draft retained on this computer.
        const saved = await persistence.load(room.session.id)
        if (active) setProject(saved ?? template.project)
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : 'Não foi possível abrir a demonstração.',
          )
      })
    return () => {
      active = false
    }
  }, [room.role, room.session.id, persistence])
  useEffect(() => {
    const media = navigator.mediaDevices as MediaDevices & {
      setCaptureHandleConfig?: (config: {
        handle: string
        exposeOrigin: boolean
        permittedOrigins: string[]
      }) => void
    }
    media?.setCaptureHandleConfig?.({
      handle: `sz-live-demo:${room.session.id}`,
      exposeOrigin: true,
      permittedOrigins: [location.origin],
    })
    return () =>
      media?.setCaptureHandleConfig?.({ handle: '', exposeOrigin: false, permittedOrigins: [] })
  }, [room.session.id])
  if (room.role !== 'teacher') return <p>A demonstração pertence à professora desta turma.</p>
  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="border-b p-3">
        <h1 className="font-semibold">{room.plan?.title} · Demonstração</h1>
        <p className="text-sm text-muted-foreground">
          Projeto de explicação · Rascunho guardado neste aparelho.
        </p>
      </header>
      <div className="min-h-0 flex-1">
        {error ? (
          <p role="alert" className="p-6">
            {error}
          </p>
        ) : project ? (
          <StudioEditor
            initialProject={project}
            persistence={persistence}
            autoRun={false}
            requireIsolatedPreview
            previewOriginAdapter={previewAdapter}
            features={{ terminal: false, ai: false }}
          />
        ) : (
          <p role="status" className="p-6">
            Preparando a demonstração…
          </p>
        )}
      </div>
    </main>
  )
}
