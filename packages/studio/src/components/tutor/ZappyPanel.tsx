import { resolveAiCredits } from '@sistemazero/core/ai-credits'
import type { FormEvent, JSX } from 'react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { cn, IconSparkles } from '#ui'
import { ProAssistanceSummaryTooLarge } from '../../core/proAssistance'
import { useDiagnosticsStore } from '../../state/diagnosticsStore'
import { glossErrorMessage } from '../../state/errorGloss'
import { useHighlightStore } from '../../state/highlightStore'
import { ERROR_LOG_KINDS, useLogsStore } from '../../state/logsStore'
import { flushProjectOperations } from '../../state/projectOperations'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useStudioLayout } from '../../studio/layoutContext'
import {
  buildStudioTutorRequest,
  type StudioTutorAskInput,
  type StudioTutorBlockReference,
  type StudioTutorFileReference,
  type StudioTutorHelpReference,
  type StudioTutorHistoryMessage,
  type StudioTutorIntent,
  type StudioTutorLessonReference,
  type StudioTutorResponse,
  type StudioTutorSelection,
  useStudioTutor,
} from '../../studio/tutor'
import { studioTutorContextHint, studioTutorModeViolation } from '../../studio/tutorMode'
import { ProAssistancePanel } from './ProAssistancePanel'
import type { ProBuilderDraft } from './ProBuilderPanel'
import { ProLearningRecipes } from './ProLearningRecipes'
import { useTutorCredits } from './useTutorCredits'
import { ZappyCredits } from './ZappyCredits'

const MAX_QUESTION_CHARS = 1_000
const ProBuilderPanel = lazy(() => import('./ProBuilderPanel'))

function friendlyError(error: unknown): string {
  if (error instanceof ProAssistanceSummaryTooLarge) return error.message
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''
  // ⚠️ NÃO existe ramo de quota aqui: a recusa por limite volta 200, como uma
  // mensagem de `scope: 'quota'` no fluxo da conversa (ver `isQuota` abaixo).
  // Os códigos ZAPPY_QUOTA_* que ficavam neste ponto eram código morto.
  if (code === 'RATE_LIMITED') return 'Uma pergunta de cada vez! Espera só um pouquinho.'
  if (code === 'ZAPPY_IN_PROGRESS')
    return 'Ainda estou terminando essa resposta. Tente novamente em instantes.'
  if (code === 'IMPERSONATION_READONLY') return 'O Zappy não conversa durante o acesso de suporte.'
  if (code === 'ZAPPY_NOT_ENABLED') return 'O Zappy ainda não está liberado para esta conta.'
  return 'O Zappy foi tomar um lanchinho. Tenta de novo em instantes!'
}

/**
 * ⚠️ ÚNICA porta de entrada da resposta AO VIVO no estado — e por isso o lugar
 * certo de garantir a forma.
 *
 * O caminho do HISTÓRICO já normaliza no servidor (`toResponse`, no repositório
 * do members: `Array.isArray(x) ? x : []`). O caminho ao vivo espalhava o
 * payload como veio. Essa assimetria é exatamente o sintoma que a dona relatou
 * em 08/2026: a conversa derrubava a IDE ao chegar, e depois de recarregar a
 * MESMA resposta aparecia certinha — porque só a segunda passava por um
 * normalizador. Aqui o cliente passa a ter a mesma tolerância que o servidor.
 */
function normalizeResponse(response: StudioTutorResponse): StudioTutorResponse {
  const list = <T,>(value: unknown): T[] | undefined =>
    Array.isArray(value) ? (value as T[]) : undefined
  return {
    ...response,
    blockReferences: list<StudioTutorBlockReference>(response.blockReferences) ?? [],
    fileReferences: list<StudioTutorFileReference>(response.fileReferences),
    // Opcionais seguem OPCIONAIS: presente-e-inválido vira ausente (a UI já sabe
    // lidar com ausente), em vez de virar um array vazio que mente "buscamos e
    // não achou".
    ...(response.lessonReferences !== undefined
      ? { lessonReferences: list<StudioTutorLessonReference>(response.lessonReferences) }
      : {}),
    ...(response.helpReferences !== undefined
      ? { helpReferences: list<StudioTutorHelpReference>(response.helpReferences) }
      : {}),
    ...(response.suggestions !== undefined
      ? { suggestions: list<string>(response.suggestions) }
      : {}),
  }
}

function responseMessage(
  response: StudioTutorHistoryMessage['response'],
): StudioTutorHistoryMessage {
  if (!response) throw new Error('Resposta do Zappy ausente')
  const safe = normalizeResponse(response)
  return {
    id: safe.id,
    role: 'assistant',
    text: safe.text,
    createdAt: safe.createdAt,
    response: safe,
  }
}

export function ZappyPanel({ embedded = false }: { embedded?: boolean }): JSX.Element | null {
  const { config, open, setOpen, proEditor, proNavigate, proCapture, proRequest, clearProRequest } =
    useStudioTutor()
  const store = useProjectStoreApi()
  const project = useProjectStore((s) => s.project)
  const setMode = useProjectStore((s) => s.setMode)
  const selectedBlockId = useHighlightStore((s) => s.selectedBlockId)
  const focusTutorReference = useHighlightStore((s) => s.focusTutorReference)
  // ⚠️ Antes filtrava só `kind === 'error'` (console.error explícito, raríssimo no
  // código gerado) e deixava passar `runtimeError`/`unhandledRejection` — os que
  // carregam o erro que a criança realmente vê, com stack. A régua canônica é a
  // mesma do Console. A dica em PT-BR vai junto: o gloss já existe e só era usado
  // na hora de pintar a linha.
  const lastError = useLogsStore((s) => {
    for (let i = s.entries.length - 1; i >= 0; i -= 1) {
      const entry = s.entries[i]
      if (!entry || !ERROR_LOG_KINDS.has(entry.kind)) continue
      const gloss = glossErrorMessage(entry.text)
      const local = entry.errorLine != null ? ` (linha ${entry.errorLine} do script.js)` : ''
      return `${entry.errorStack || entry.text}${local}${gloss ? `\n${gloss}` : ''}`
    }
    return null
  })
  // O editor já sabe o que nunca roda e o que está semanticamente errado.
  const draftBlockIds = useDiagnosticsStore((s) => s.draftBlockIds)
  const semanticIssues = useDiagnosticsStore((s) => s.semanticIssues)
  const { isNarrow } = useStudioLayout()
  const [messages, setMessages] = useState<StudioTutorHistoryMessage[]>([])
  const [question, setQuestion] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [building, setBuilding] = useState(false)
  const [builderOpened, setBuilderOpened] = useState(false)
  const [intent, setIntent] = useState<StudioTutorIntent>('explain')
  const [selection, setSelection] = useState<StudioTutorSelection | undefined>()
  const [builderDraft, setBuilderDraft] = useState<ProBuilderDraft | undefined>()
  const [loading, setLoading] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [nextHistoryCursor, setNextHistoryCursor] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Semeado pelo host (Server Component) e atualizado por cada resposta que
  // consumiu de verdade. `null` = não sei → o medidor não aparece.
  const { credits, acceptCredits, refreshCredits } = useTutorCredits(
    config,
    project?.id ?? null,
    open,
  )
  const creditsMeter = resolveAiCredits(credits)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const pendingAttemptRef = useRef<StudioTutorAskInput | null>(null)
  const operationGenerationRef = useRef(0)

  const projectId = project?.id ?? null
  // biome-ignore lint/correctness/useExhaustiveDependencies: mudanças de sessão invalidam todas as continuações assíncronas anteriores
  useEffect(() => {
    operationGenerationRef.current += 1
    pendingAttemptRef.current = null
    setConfirmingDelete(false)
    setNextHistoryCursor(null)
    setBusy(false)
    setLoadingEarlier(false)
    if (!open) {
      setLoading(false)
      setError(null)
    }
  }, [projectId, open, config])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rascunhos pertencem ao projeto e ao adapter da sessão atual.
  useEffect(() => {
    setBuilding(false)
    setBuilderOpened(false)
    setBuilderDraft(undefined)
    setIntent('explain')
    setSelection(undefined)
    setQuestion('')
    setHistorySearch('')
  }, [projectId, config])

  useEffect(() => {
    if (!proRequest || proRequest.projectId !== projectId || !open) return
    if (proRequest.intent === 'change') {
      const selected = proRequest.selection
      setBuilderDraft({
        id: proRequest.id,
        objective: proRequest.question,
        request: {
          version: 1,
          intent: 'change',
          scope: 'selection',
          criteria: [],
          ...(selected
            ? {
                selection: {
                  path: selected.path,
                  startLine: selected.startLine,
                  endLine:
                    selected.endLine > selected.startLine && selected.endColumn === 1
                      ? selected.endLine - 1
                      : selected.endLine,
                  sourceHash: selected.sourceHash,
                },
              }
            : {}),
        },
      })
      setBuilderOpened(true)
      setBuilding(true)
      clearProRequest(proRequest.id)
      return
    }
    setIntent(proRequest.intent)
    setSelection(proRequest.selection)
    setQuestion(proRequest.question)
    setBuilding(false)
    pendingAttemptRef.current = null
    clearProRequest(proRequest.id)
    inputRef.current?.focus()
  }, [proRequest, projectId, open, clearProRequest])

  useEffect(() => {
    if (!open || !config || !projectId) return
    let active = true
    const historyScope = captureProjectStorageScope()
    const valid = () => active && captureProjectStorageScope() === historyScope
    setLoading(true)
    setError(null)
    setMessages([])
    setNextHistoryCursor(null)
    config.adapter
      .loadHistory(projectId)
      .then((page) => {
        if (valid()) {
          setMessages(page.messages)
          setNextHistoryCursor(page.nextCursor)
        }
      })
      .catch(() => {
        if (valid()) setError('Não consegui carregar a conversa agora.')
      })
      .finally(() => {
        if (valid()) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, config, projectId])

  useEffect(() => {
    if (!open) return
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    inputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (!panelRef.current?.contains(document.activeElement)) return
      if (event.key === 'Escape') setOpen(false)
      if (event.key !== 'Tab' || !isNarrow) return
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const visible = [...focusable].filter((element) => !element.closest('[hidden], [inert]'))
      const first = visible[0]
      const last = visible[visible.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [open, setOpen, isNarrow])

  // biome-ignore lint/correctness/useExhaustiveDependencies: mensagens e estado de envio são os gatilhos intencionais para rolar até o fim
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages, busy])

  useEffect(() => {
    if (!open) return
    const current = Date.now()
    if (cooldownUntil <= current) {
      if (now < cooldownUntil) setNow(current)
      return
    }
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(1_000, cooldownUntil - current),
    )
    return () => window.clearTimeout(timer)
  }, [open, cooldownUntil, now])

  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1_000))
  const canAsk = Boolean(
    question.trim() &&
      question.length <= MAX_QUESTION_CHARS &&
      !voiceBusy &&
      !loading &&
      !busy &&
      cooldownSeconds === 0 &&
      project &&
      config,
  )

  // Chips que PREENCHEM o campo (a criança revisa e envia — padrão do Pensa):
  // fixos no estado vazio, e as continuações sugeridas da ÚLTIMA resposta.
  const starterQuestions =
    project?.kind !== 'pro'
      ? [
          'Como faço meu personagem pular?',
          'Deu um erro no meu jogo',
          'O que posso adicionar agora?',
        ]
      : ['O que este código faz?', 'Deu um erro no meu jogo', 'O que posso adicionar agora?']
  let lastAssistantResponse: StudioTutorHistoryMessage['response'] | undefined
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role === 'assistant' && message.response) {
      lastAssistantResponse = message.response
      break
    }
  }
  const followUpSuggestions =
    busy ||
    loading ||
    (lastAssistantResponse?.kind &&
      lastAssistantResponse.kind !== (project?.kind === 'pro' ? 'pro' : 'classic'))
      ? []
      : (lastAssistantResponse?.suggestions ?? []).filter(
          (suggestion) =>
            !studioTutorModeViolation(suggestion, project?.kind === 'pro' ? 'pro' : 'classic'),
        )
  const pickSuggestion = (suggestion: string) => {
    pendingAttemptRef.current = null
    setBuilding(false)
    setQuestion(suggestion)
    inputRef.current?.focus()
  }

  const prepareChange = (draft?: ProBuilderDraft) => {
    setBuilderDraft(draft)
    setBuilderOpened(true)
    setBuilding(true)
  }

  const handleAsk = async (event: FormEvent) => {
    event.preventDefault()
    const text = question.trim()
    if (!canAsk || !project || !config) return
    const operationGeneration = operationGenerationRef.current
    const scope = captureProjectStorageScope()
    const valid = () =>
      operationGenerationRef.current === operationGeneration &&
      captureProjectStorageScope() === scope &&
      store.getState().project?.id === project.id
    let clientMessageId: string | undefined
    setError(null)
    setBusy(true)
    try {
      const previous = pendingAttemptRef.current
      let input =
        previous?.question === text &&
        previous.projectId === project.id &&
        previous.context.kind === (project.kind === 'pro' ? 'pro' : 'classic') &&
        (project.kind !== 'pro' || previous.context.pro?.intent === intent)
          ? previous
          : null
      if (!input) {
        let synchronization: 'ready' | 'conflict' = 'ready'
        if (project.kind === 'pro') {
          try {
            await flushProjectOperations(store, project.id)
          } catch {
            synchronization = 'conflict'
          }
        }
        if (!valid()) return
        const fresh = store.getState().project!
        const editor = proCapture.current?.() ?? proEditor.current
        const request = buildStudioTutorRequest({
          project: fresh,
          question: text,
          proEditor: editor
            ? {
                ...editor,
                synchronization:
                  synchronization === 'conflict' || editor.synchronization === 'conflict'
                    ? 'conflict'
                    : 'ready',
              }
            : synchronization === 'conflict'
              ? { projectId: fresh.id, synchronization }
              : undefined,
          proSelection: selection,
          intent,
          selectedBlockId,
          lastError,
          draftBlockIds,
          semanticIssues,
        })
        input = { projectId: fresh.id, clientMessageId: crypto.randomUUID(), ...request }
      }
      if (!valid()) return
      clientMessageId = input.clientMessageId
      pendingAttemptRef.current = input
      setQuestion('')
      setMessages((current) => [
        ...current,
        { id: input.clientMessageId, role: 'user', text, createdAt: new Date().toISOString() },
      ])
      const result = await config.adapter.ask(input)
      if (!valid()) return
      pendingAttemptRef.current = null
      // Saldo ausente = nada foi consumido agora (resposta pronta, replay):
      // mantém o número que já estava na tela em vez de zerar.
      if (result.credits) acceptCredits(result.credits)
      setMessages((current) => [...current, responseMessage(result.response)])
      const until = Date.now() + Math.max(0, config.cooldownMs ?? 1_500)
      setCooldownUntil(until)
      setNow(Date.now())
    } catch (cause) {
      if (!valid()) return
      setMessages((current) => current.filter((message) => message.id !== clientMessageId))
      setQuestion(text)
      setError(friendlyError(cause))
    } finally {
      if (valid()) setBusy(false)
    }
  }

  const deleteHistory = async () => {
    if (!config || !projectId || busy) return
    const operationGeneration = operationGenerationRef.current + 1
    const operationScope = captureProjectStorageScope()
    operationGenerationRef.current = operationGeneration
    setBusy(true)
    setLoadingEarlier(false)
    setError(null)
    try {
      await config.adapter.deleteHistory(projectId)
      if (
        operationGenerationRef.current !== operationGeneration ||
        captureProjectStorageScope() !== operationScope
      )
        return
      pendingAttemptRef.current = null
      setMessages([])
      setNextHistoryCursor(null)
      setConfirmingDelete(false)
    } catch {
      if (
        operationGenerationRef.current !== operationGeneration ||
        captureProjectStorageScope() !== operationScope
      )
        return
      setError('Não consegui apagar a conversa agora.')
    } finally {
      if (
        operationGenerationRef.current === operationGeneration &&
        captureProjectStorageScope() === operationScope
      )
        setBusy(false)
    }
  }

  const loadEarlierHistory = async () => {
    if (!config || !projectId || !nextHistoryCursor || loadingEarlier) return
    const operationGeneration = operationGenerationRef.current
    const operationScope = captureProjectStorageScope()
    const historyCursor = nextHistoryCursor
    setLoadingEarlier(true)
    setError(null)
    try {
      const page = await config.adapter.loadHistory(projectId, historyCursor)
      if (
        operationGenerationRef.current !== operationGeneration ||
        captureProjectStorageScope() !== operationScope
      )
        return
      setMessages((current) => {
        const existingIds = new Set(current.map((message) => message.id))
        return [...page.messages.filter((message) => !existingIds.has(message.id)), ...current]
      })
      setNextHistoryCursor(page.nextCursor)
    } catch {
      if (
        operationGenerationRef.current !== operationGeneration ||
        captureProjectStorageScope() !== operationScope
      )
        return
      setError('Não consegui carregar as mensagens anteriores agora.')
    } finally {
      if (
        operationGenerationRef.current === operationGeneration &&
        captureProjectStorageScope() === operationScope
      )
        setLoadingEarlier(false)
    }
  }

  const sendFeedback = async (responseId: string, useful: boolean) => {
    if (!config || !projectId) return
    const operationGeneration = operationGenerationRef.current
    const operationScope = captureProjectStorageScope()
    try {
      await config.adapter.feedback({ projectId, responseId, useful })
    } catch {
      if (
        operationGenerationRef.current !== operationGeneration ||
        captureProjectStorageScope() !== operationScope
      )
        return
      setError('Não consegui registrar sua avaliação agora.')
    }
  }

  const goToBlock = (reference: StudioTutorBlockReference) => {
    if (project?.kind !== 'pro') setMode('blocks')
    focusTutorReference({
      ...(reference.blockId ? { blockId: reference.blockId } : {}),
      blockType: reference.blockType,
      category: reference.category,
      ...(reference.subcategory ? { subcategory: reference.subcategory } : {}),
    })
    if (isNarrow) setOpen(false)
  }

  const titleId = 'sz-zappy-title'
  if (!config || !project || (!open && project.kind !== 'pro')) return null
  const panelAttributes =
    project.kind === 'pro' && !isNarrow
      ? { role: 'complementary' as const }
      : { role: 'dialog' as const, 'aria-modal': isNarrow }

  const body = (
    <aside
      ref={panelRef}
      id="sz-zappy-panel"
      {...panelAttributes}
      hidden={!open}
      aria-labelledby={titleId}
      // No largo o painel começa logo abaixo da barra do editor, que mede 68px (4.25rem) desde a
      // tela-modelo de 11/09/2026; no estreito a barra tem 52px e o painel desce 16px além dela.
      className={cn(
        'z-[75] flex flex-col border-sz-border bg-sz-panel text-sz-fg motion-reduce:transition-none',
        !open && '!hidden',
        embedded && !isNarrow ? 'relative h-full w-full min-h-0' : 'absolute shadow-2xl',
        embedded && !isNarrow
          ? ''
          : embedded && isNarrow
            ? 'inset-2 rounded-2xl border'
            : isNarrow
              ? 'inset-x-2 bottom-2 top-[4.25rem] rounded-2xl border'
              : 'bottom-0 right-0 top-[4.25rem] w-[min(26rem,42%)] border-l',
      )}
    >
      <header className="flex items-center gap-3 border-b border-sz-border px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sz-accent/15 text-sz-accent">
          <IconSparkles size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-bold text-base">
            {project.kind === 'pro' ? 'Zappy Pro' : 'Zappy'}
          </h2>
          <p className="truncate text-sz-fg-mute text-xs">
            {project.kind === 'pro' && building
              ? 'Construir, testar e revisar juntos'
              : 'Uma dúvida por vez, sem mexer no projeto'}
          </p>
        </div>
        {confirmingDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void deleteHistory()}
              disabled={busy}
              className="rounded-lg bg-sz-error/15 px-2 py-1 font-semibold text-sz-error text-xs hover:bg-sz-error/25 disabled:opacity-40"
            >
              Confirmar exclusão
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy}
              className="rounded-lg px-2 py-1 text-sz-fg-mute text-xs hover:bg-sz-bg disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy || messages.length === 0}
            className="rounded-lg px-2 py-1 text-sz-fg-mute text-xs hover:bg-sz-bg disabled:opacity-40"
          >
            Apagar
          </button>
        )}
        <button
          type="button"
          aria-label="Fechar Zappy"
          onClick={() => setOpen(false)}
          className="grid h-9 w-9 place-items-center rounded-xl text-xl text-sz-fg-soft hover:bg-sz-bg"
        >
          ×
        </button>
      </header>

      {/* ⚠️ O botão "Perguntar" NÃO é desabilitado quando o saldo zera: o servidor
          é a autoridade, e um saldo velho numa aba aberta desde ontem trancaria a
          criança de graça. O aviso explica; a recusa real vem do BFF. */}
      <ZappyCredits credits={credits} />

      {project.kind === 'pro' && (
        <fieldset className="flex gap-2 border-b border-sz-border p-2">
          <legend className="sr-only">Ações do Zappy</legend>
          <button
            type="button"
            aria-pressed={!building && intent === 'explain'}
            onClick={() => {
              setBuilding(false)
              setIntent('explain')
            }}
            className="rounded-lg px-3 py-2 text-sm hover:bg-sz-bg"
          >
            Conversar
          </button>
          <button
            type="button"
            aria-pressed={!building && intent === 'investigate'}
            onClick={() => {
              setBuilding(false)
              setIntent('investigate')
            }}
            className="rounded-lg px-3 py-2 text-sm hover:bg-sz-bg"
          >
            Investigar
          </button>
          {config.adapter.builder && (
            <button
              type="button"
              aria-pressed={building}
              onClick={() => prepareChange()}
              className="rounded-lg px-3 py-2 text-sm hover:bg-sz-bg"
            >
              Construir
            </button>
          )}
        </fieldset>
      )}

      <div aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {project.kind === 'pro' && (
          <>
            <ProAssistancePanel key={project.id} projectId={project.id} />
            <ProLearningRecipes
              templateId={project.proMeta?.templateId}
              tree={project.tree}
              onAsk={(value, nextIntent) => {
                setIntent(nextIntent)
                pickSuggestion(value)
              }}
              onBuild={
                config.adapter.builder
                  ? (objective) => prepareChange({ id: crypto.randomUUID(), objective })
                  : undefined
              }
            />
          </>
        )}
        {loading ? (
          <p className="text-center text-sz-fg-mute text-sm">Carregando conversa…</p>
        ) : null}
        {!loading && messages.length === 0 ? (
          <div className="rounded-2xl bg-sz-bg p-4 text-sm leading-relaxed">
            <p>Oi! {studioTutorContextHint(project.kind === 'pro' ? 'pro' : 'classic')}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {starterQuestions.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => pickSuggestion(starter)}
                  className="rounded-full border border-sz-accent/40 bg-sz-accent/10 px-2.5 py-1.5 font-semibold text-sz-accent text-xs hover:bg-sz-accent/20"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {!loading && nextHistoryCursor ? (
          <div className="text-center">
            <button
              type="button"
              onClick={() => void loadEarlierHistory()}
              disabled={loadingEarlier}
              className="rounded-lg border border-sz-border px-3 py-1.5 text-sz-fg-soft text-xs hover:border-sz-accent hover:text-sz-accent disabled:opacity-40"
            >
              {loadingEarlier ? 'Carregando…' : 'Carregar mensagens anteriores'}
            </button>
          </div>
        ) : null}
        {project.kind === 'pro' && messages.length > 0 && (
          <label className="block text-xs">
            Buscar nas mensagens carregadas
            <input
              type="search"
              maxLength={120}
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-lg border border-sz-border bg-sz-bg px-3 text-sm"
            />
          </label>
        )}
        {messages
          .filter(
            (message) =>
              !historySearch.trim() ||
              message.text
                .toLocaleLowerCase('pt-BR')
                .includes(historySearch.trim().toLocaleLowerCase('pt-BR')),
          )
          .map((message) => {
            // Aviso de LIMITE não é aula: ganha cara de recado (âmbar) e perde os
            // botões de avaliar — pedir "isso ajudou?" para "acabou a ajuda" é cruel,
            // e o polegar viraria feedback de qualidade sobre um aviso operacional.
            const isQuota = message.response?.scope === 'quota'
            const incompatible =
              message.role === 'assistant' &&
              ((message.response?.kind &&
                message.response.kind !== (project.kind === 'pro' ? 'pro' : 'classic')) ||
                studioTutorModeViolation(message.text, project.kind === 'pro' ? 'pro' : 'classic'))
            if (incompatible)
              return (
                <details
                  key={message.id}
                  className="rounded-2xl border border-sz-border p-3 text-sm text-sz-fg-mute"
                >
                  <summary>Conversa anterior: orientação de outro modo</summary>
                  <p className="mt-2">Esta orientação não se aplica ao modo atual.</p>
                  <p className="mt-2 whitespace-pre-wrap">{message.text}</p>
                </details>
              )
            return (
              <article
                key={message.id}
                className={cn(
                  'max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'ml-auto bg-sz-accent text-sz-bg'
                    : isQuota
                      ? 'mr-auto border border-sz-warn/40 bg-sz-warn/10 text-sz-fg'
                      : 'mr-auto border border-sz-border bg-sz-bg text-sz-fg',
                )}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.role === 'assistant' && project
                  ? config?.renderListen?.(project.id, message.id)
                  : null}
                {!isQuota && project.kind === 'pro' && message.response?.fileReferences?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {message.response.sourceRevision !== undefined &&
                    message.response.sourceRevision !== project.updatedAt ? (
                      <p className="w-full text-xs text-sz-fg-mute">
                        O projeto mudou desde esta resposta; as linhas podem ter mudado.
                      </p>
                    ) : null}
                    {message.response.fileReferences.map((reference) => (
                      <button
                        key={`${reference.path}:${reference.startLine}:${reference.endLine}`}
                        type="button"
                        disabled={project.tree?.[reference.path]?.kind !== 'file'}
                        onClick={() => proNavigate.current?.(reference)}
                        className="rounded-lg border border-sz-accent/40 bg-sz-accent/10 px-2.5 py-1 text-xs text-sz-accent hover:bg-sz-accent/20 disabled:opacity-40"
                      >
                        {reference.path}
                        {reference.startLine !== undefined ? `:${reference.startLine}` : ''}
                        {reference.startLine !== undefined &&
                        reference.endLine !== reference.startLine
                          ? `–${reference.endLine}`
                          : ''}
                      </button>
                    ))}
                  </div>
                ) : null}
                {!isQuota && project.kind !== 'pro' && message.response?.blockReferences?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {message.response.blockReferences.map((reference) => {
                      // O caminho da paleta é a verdade; o par categoria/subcategoria
                      // fica só como compat de resposta antiga do histórico.
                      const trail = reference.palettePath?.length
                        ? reference.palettePath.join(' › ')
                        : reference.subcategory && reference.subcategory !== reference.category
                          ? `${reference.category} › ${reference.subcategory}`
                          : reference.category
                      return (
                        <button
                          key={`${reference.blockType}:${reference.blockId ?? 'catalog'}`}
                          type="button"
                          onClick={() => goToBlock(reference)}
                          className="flex flex-col items-start rounded-lg border border-sz-accent/40 bg-sz-accent/10 px-2.5 py-1 text-left text-sz-accent hover:bg-sz-accent/20"
                          title={`${trail} · ${reference.area}`}
                        >
                          <span className="font-semibold text-xs">{reference.name}</span>
                          <span className="text-[0.6875rem] text-sz-accent/70">{trail}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
                {config?.openLesson &&
                message.response?.lessonReferences?.some((reference) => reference.courseSlug) ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {message.response.lessonReferences.map((reference) =>
                      reference.courseSlug ? (
                        <button
                          key={`${reference.courseId}:${reference.lessonId}`}
                          type="button"
                          onClick={() => config.openLesson?.(reference)}
                          className="rounded-full border border-sz-border bg-sz-surface px-2.5 py-1 font-semibold text-sz-fg-soft text-xs hover:border-sz-accent hover:text-sz-accent"
                          title="Abrir a fase em nova aba"
                        >
                          Fase: {reference.title} ↗
                        </button>
                      ) : null,
                    )}
                  </div>
                ) : null}
                {config?.openHelp && message.response?.helpReferences?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {message.response.helpReferences.map((reference) => (
                      <button
                        key={reference.slug}
                        type="button"
                        onClick={() => config.openHelp?.(reference)}
                        className="rounded-full border border-sz-border bg-sz-surface px-2.5 py-1 font-semibold text-sz-fg-soft text-xs hover:border-sz-accent hover:text-sz-accent"
                        title="Abrir o passo a passo em nova aba"
                      >
                        Passo a passo: {reference.title} ↗
                      </button>
                    ))}
                  </div>
                ) : null}
                {message.role === 'assistant' && message.response && !isQuota ? (
                  <div className="mt-2 flex gap-1 text-sz-fg-mute text-xs">
                    <span>Isso ajudou?</span>
                    <button
                      type="button"
                      aria-label="A resposta ajudou"
                      onClick={() => void sendFeedback(message.response?.id ?? message.id, true)}
                      className="hover:text-sz-success"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      aria-label="A resposta não ajudou"
                      onClick={() => void sendFeedback(message.response?.id ?? message.id, false)}
                      className="hover:text-sz-error"
                    >
                      👎
                    </button>
                  </div>
                ) : null}
                {message.role === 'assistant' &&
                  !isQuota &&
                  project.kind === 'pro' &&
                  config.adapter.builder &&
                  !incompatible && (
                    <button
                      type="button"
                      className="mt-3 rounded-lg border border-sz-border px-3 py-2 text-xs"
                      onClick={() => {
                        const references = message.response?.fileReferences
                        const origin = references?.length === 1 ? references[0] : undefined
                        prepareChange({
                          id: crypto.randomUUID(),
                          objective: '',
                          request: {
                            version: 1,
                            intent: 'change',
                            scope: 'part',
                            criteria: [],
                            sourceMessageId: message.id,
                            diagnostic: message.text.slice(0, 2000),
                            ...(origin?.sourceHash && origin.startLine && origin.endLine
                              ? {
                                  selection: {
                                    path: origin.path,
                                    startLine: origin.startLine,
                                    endLine: origin.endLine,
                                    sourceHash: origin.sourceHash,
                                  },
                                }
                              : {}),
                          },
                        })
                      }}
                    >
                      Preparar alteração a partir desta resposta
                    </button>
                  )}
              </article>
            )
          })}
        {busy ? <p className="text-sz-fg-mute text-sm">Zappy está pensando…</p> : null}
        {error ? (
          <p className="rounded-xl bg-sz-error/10 p-3 text-sz-error text-sm">{error}</p>
        ) : null}
        {project.kind === 'pro' && builderOpened && config.adapter.builder && (
          <Suspense fallback={<p role="status">Preparando o construtor…</p>}>
            <ProBuilderPanel
              key={project.id}
              adapter={config.adapter.builder}
              projectId={project.id}
              draft={builderDraft}
              draftOpen={building}
              onUsageChange={refreshCredits}
            />
          </Suspense>
        )}
        {project.kind === 'pro' && building && !config.adapter.builder && (
          <p role="status" className="rounded-lg bg-sz-bg p-3 text-sm">
            O construtor não está disponível neste ambiente. Seu trecho está guardado neste painel;
            você pode voltar a Explicar ou Investigar sem alterar o código.
          </p>
        )}
        <div ref={endRef} />
      </div>

      {!building && followUpSuggestions.length > 0 ? (
        <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 border-sz-border border-t p-0 px-3 pt-2">
          <legend className="sr-only">Sugestões do Zappy</legend>
          {followUpSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => pickSuggestion(suggestion)}
              className="rounded-full border border-sz-accent/40 bg-sz-accent/10 px-2.5 py-1.5 font-semibold text-sz-accent text-xs hover:bg-sz-accent/20"
            >
              {suggestion}
            </button>
          ))}
        </fieldset>
      ) : null}

      <form
        hidden={building}
        onSubmit={(event) => void handleAsk(event)}
        className="border-t border-sz-border p-3"
      >
        <label htmlFor="sz-zappy-question" className="sr-only">
          Sua dúvida para o Zappy
        </label>
        {pendingAttemptRef.current && !busy && (
          <div className="mb-2 text-xs">
            <p>
              A última resposta não foi confirmada. Enviar novamente consulta a mesma pergunta com o
              contexto original, incluindo o código e as notas enviados naquela tentativa.
            </p>
            {project.kind === 'pro' && (
              <button
                type="button"
                className="mt-1 rounded-lg border border-sz-border px-2 py-1"
                onClick={() => {
                  pendingAttemptRef.current = null
                  setError(
                    'O próximo envio será um novo pedido com o código e as notas atuais e poderá usar mais IA.',
                  )
                }}
              >
                Usar código e notas atuais em um novo pedido
              </button>
            )}
          </div>
        )}
        <textarea
          ref={inputRef}
          id="sz-zappy-question"
          name="zappy-question"
          autoComplete="off"
          value={question}
          rows={3}
          onChange={(event) => {
            const next = event.target.value
            if (pendingAttemptRef.current?.question !== next.trim()) {
              pendingAttemptRef.current = null
            }
            setQuestion(next)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder={
            intent === 'investigate' && project.kind === 'pro'
              ? 'O que deveria acontecer e o que aconteceu?'
              : 'Qual é a sua dúvida?'
          }
          className="w-full resize-none rounded-xl border border-sz-border bg-sz-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sz-accent/60"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          {config?.renderVoiceInput?.({
            value: question,
            onChange: (value) => {
              pendingAttemptRef.current = null
              setQuestion(value)
            },
            onBusyChange: setVoiceBusy,
            textareaId: 'sz-zappy-question',
            disabled: busy || loading,
          })}
          <span className="text-sz-fg-mute text-xs">
            {cooldownSeconds > 0
              ? `Respira… ${cooldownSeconds}s`
              : (credits?.studioSource !== 'openrouter' &&
                  creditsMeter.state === 'exhausted' &&
                  creditsMeter.renews) ||
                'Enter envia · Shift+Enter pula linha'}
          </span>
          <button
            type="submit"
            disabled={!canAsk}
            className="rounded-xl bg-sz-accent px-4 py-2 font-bold text-sz-bg text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Perguntar
          </button>
        </div>
        {question.length > MAX_QUESTION_CHARS ? (
          <p role="alert" className="mt-2 text-sm">
            A fala ficou longa. Divida em duas mensagens; seu texto continua inteiro aqui.
          </p>
        ) : null}
      </form>
    </aside>
  )

  return (
    <>
      <button
        type="button"
        aria-label="Fechar Zappy"
        tabIndex={-1}
        hidden={!isNarrow || !open}
        className="absolute inset-0 z-[74] bg-black/45"
        onClick={() => setOpen(false)}
      />
      {body}
    </>
  )
}
