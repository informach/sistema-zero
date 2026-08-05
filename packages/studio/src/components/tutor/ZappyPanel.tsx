import type { FormEvent, JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { cn, IconSparkles } from '#ui'
import { useHighlightStore } from '../../state/highlightStore'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import { useStudioLayout } from '../../studio/layoutContext'
import {
  buildStudioTutorContext,
  type StudioTutorBlockReference,
  type StudioTutorHistoryMessage,
  useStudioTutor,
} from '../../studio/tutor'

const MAX_QUESTION_CHARS = 1_000

function friendlyError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''
  if (code === 'ZAPPY_QUOTA_DAY') return 'Por hoje a gente já estudou bastante! Amanhã tem mais 🤖'
  if (code === 'ZAPPY_QUOTA_MONTH') return 'A ajuda deste mês acabou. No mês que vem tem mais 🤖'
  if (code === 'RATE_LIMITED') return 'Uma pergunta de cada vez! Espera só um pouquinho.'
  if (code === 'ZAPPY_IN_PROGRESS')
    return 'Ainda estou terminando essa resposta. Tente novamente em instantes.'
  if (code === 'IMPERSONATION_READONLY') return 'O Zappy não conversa durante o acesso de suporte.'
  if (code === 'ZAPPY_NOT_ENABLED') return 'O Zappy ainda não está liberado para esta conta.'
  return 'O Zappy foi tomar um lanchinho. Tenta de novo em instantes!'
}

function responseMessage(
  response: StudioTutorHistoryMessage['response'],
): StudioTutorHistoryMessage {
  if (!response) throw new Error('Resposta do Zappy ausente')
  return {
    id: response.id,
    role: 'assistant',
    text: response.text,
    createdAt: response.createdAt,
    response,
  }
}

export function ZappyPanel(): JSX.Element | null {
  const { config, open, setOpen } = useStudioTutor()
  const project = useProjectStore((s) => s.project)
  const setMode = useProjectStore((s) => s.setMode)
  const selectedBlockId = useHighlightStore((s) => s.selectedBlockId)
  const focusTutorReference = useHighlightStore((s) => s.focusTutorReference)
  const lastError = useLogsStore((s) => {
    for (let i = s.entries.length - 1; i >= 0; i -= 1) {
      const entry = s.entries[i]
      if (entry?.kind === 'error') return entry.errorStack || entry.text
    }
    return null
  })
  const { isNarrow } = useStudioLayout()
  const [messages, setMessages] = useState<StudioTutorHistoryMessage[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [nextHistoryCursor, setNextHistoryCursor] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const pendingAttemptRef = useRef<{ question: string; clientMessageId: string } | null>(null)
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

  useEffect(() => {
    if (!open || !config || !projectId) return
    let active = true
    setLoading(true)
    setError(null)
    setMessages([])
    setNextHistoryCursor(null)
    config.adapter
      .loadHistory(projectId)
      .then((page) => {
        if (active) {
          setMessages(page.messages)
          setNextHistoryCursor(page.nextCursor)
        }
      })
      .catch(() => {
        if (active) setError('Não consegui carregar a conversa agora.')
      })
      .finally(() => {
        if (active) setLoading(false)
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
      if (event.key === 'Escape') setOpen(false)
      if (event.key !== 'Tab' || !isNarrow) return
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
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
    question.trim() && !loading && !busy && cooldownSeconds === 0 && project && config,
  )

  const handleAsk = async (event: FormEvent) => {
    event.preventDefault()
    const text = question.trim()
    if (!canAsk || !project || !config) return
    const operationGeneration = operationGenerationRef.current
    const pendingAttempt = pendingAttemptRef.current
    const clientMessageId =
      pendingAttempt?.question === text ? pendingAttempt.clientMessageId : crypto.randomUUID()
    pendingAttemptRef.current = { question: text, clientMessageId }
    const createdAt = new Date().toISOString()
    const userMessage: StudioTutorHistoryMessage = {
      id: clientMessageId,
      role: 'user',
      text,
      createdAt,
    }
    setQuestion('')
    setError(null)
    setBusy(true)
    setMessages((current) => [...current, userMessage])
    try {
      const response = await config.adapter.ask({
        projectId: project.id,
        clientMessageId,
        question: text,
        context: buildStudioTutorContext({ project, selectedBlockId, lastError }),
      })
      if (operationGenerationRef.current !== operationGeneration) return
      pendingAttemptRef.current = null
      setMessages((current) => [...current, responseMessage(response)])
      const until = Date.now() + Math.max(0, config.cooldownMs ?? 1_500)
      setCooldownUntil(until)
      setNow(Date.now())
    } catch (cause) {
      if (operationGenerationRef.current !== operationGeneration) return
      setMessages((current) => current.filter((message) => message.id !== clientMessageId))
      setQuestion(text)
      setError(friendlyError(cause))
    } finally {
      if (operationGenerationRef.current === operationGeneration) setBusy(false)
    }
  }

  const deleteHistory = async () => {
    if (!config || !projectId || busy) return
    const operationGeneration = operationGenerationRef.current + 1
    operationGenerationRef.current = operationGeneration
    setBusy(true)
    setLoadingEarlier(false)
    setError(null)
    try {
      await config.adapter.deleteHistory(projectId)
      if (operationGenerationRef.current !== operationGeneration) return
      pendingAttemptRef.current = null
      setMessages([])
      setNextHistoryCursor(null)
      setConfirmingDelete(false)
    } catch {
      if (operationGenerationRef.current !== operationGeneration) return
      setError('Não consegui apagar a conversa agora.')
    } finally {
      if (operationGenerationRef.current === operationGeneration) setBusy(false)
    }
  }

  const loadEarlierHistory = async () => {
    if (!config || !projectId || !nextHistoryCursor || loadingEarlier) return
    const operationGeneration = operationGenerationRef.current
    const historyCursor = nextHistoryCursor
    setLoadingEarlier(true)
    setError(null)
    try {
      const page = await config.adapter.loadHistory(projectId, historyCursor)
      if (operationGenerationRef.current !== operationGeneration) return
      setMessages((current) => {
        const existingIds = new Set(current.map((message) => message.id))
        return [...page.messages.filter((message) => !existingIds.has(message.id)), ...current]
      })
      setNextHistoryCursor(page.nextCursor)
    } catch {
      if (operationGenerationRef.current !== operationGeneration) return
      setError('Não consegui carregar as mensagens anteriores agora.')
    } finally {
      if (operationGenerationRef.current === operationGeneration) setLoadingEarlier(false)
    }
  }

  const sendFeedback = async (responseId: string, useful: boolean) => {
    if (!config || !projectId) return
    const operationGeneration = operationGenerationRef.current
    try {
      await config.adapter.feedback({ projectId, responseId, useful })
    } catch {
      if (operationGenerationRef.current !== operationGeneration) return
      setError('Não consegui registrar sua avaliação agora.')
    }
  }

  const goToBlock = (reference: StudioTutorBlockReference) => {
    if (project?.kind !== 'pro') setMode('blocks')
    focusTutorReference({
      ...(reference.blockId ? { blockId: reference.blockId } : {}),
      blockType: reference.blockType,
      category: reference.category,
    })
    if (isNarrow) setOpen(false)
  }

  const titleId = 'sz-zappy-title'
  if (!config || !open || !project) return null

  const body = (
    <aside
      ref={panelRef}
      id="sz-zappy-panel"
      role="dialog"
      aria-modal={isNarrow}
      aria-labelledby={titleId}
      className={cn(
        'absolute z-[75] flex flex-col border-sz-border bg-sz-panel text-sz-fg shadow-2xl motion-reduce:transition-none',
        isNarrow
          ? 'inset-x-2 bottom-2 top-[4.25rem] rounded-2xl border'
          : 'bottom-0 right-0 top-[3.25rem] w-[min(26rem,42%)] border-l',
      )}
    >
      <header className="flex items-center gap-3 border-b border-sz-border px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sz-accent/15 text-sz-accent">
          <IconSparkles size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-bold text-base">
            Zappy do Studio
          </h2>
          <p className="truncate text-sz-fg-mute text-xs">
            Uma dúvida por vez, sem mexer no projeto
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

      <div aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-sz-fg-mute text-sm">Carregando conversa…</p>
        ) : null}
        {!loading && messages.length === 0 ? (
          <div className="rounded-2xl bg-sz-bg p-4 text-sm leading-relaxed">
            Oi! Selecione um bloco ou rode o jogo e me conte onde você travou.
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
        {messages.map((message) => (
          <article
            key={message.id}
            className={cn(
              'max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed',
              message.role === 'user'
                ? 'ml-auto bg-sz-accent text-sz-bg'
                : 'mr-auto border border-sz-border bg-sz-bg text-sz-fg',
            )}
          >
            <p className="whitespace-pre-wrap">{message.text}</p>
            {project.kind !== 'pro' && message.response?.blockReferences.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {message.response.blockReferences.map((reference) => {
                  const trail =
                    reference.subcategory && reference.subcategory !== reference.category
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
                      title="Abrir aula em nova aba"
                    >
                      Aula: {reference.title} ↗
                    </button>
                  ) : null,
                )}
              </div>
            ) : null}
            {message.role === 'assistant' && message.response ? (
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
          </article>
        ))}
        {busy ? <p className="text-sz-fg-mute text-sm">Zappy está pensando…</p> : null}
        {error ? (
          <p className="rounded-xl bg-sz-error/10 p-3 text-sz-error text-sm">{error}</p>
        ) : null}
        <div ref={endRef} />
      </div>

      <form onSubmit={(event) => void handleAsk(event)} className="border-t border-sz-border p-3">
        <label htmlFor="sz-zappy-question" className="sr-only">
          Sua dúvida para o Zappy
        </label>
        <textarea
          ref={inputRef}
          id="sz-zappy-question"
          value={question}
          maxLength={MAX_QUESTION_CHARS}
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
          placeholder="Qual é a sua dúvida?"
          className="w-full resize-none rounded-xl border border-sz-border bg-sz-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sz-accent/60"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sz-fg-mute text-xs">
            {cooldownSeconds > 0
              ? `Respira… ${cooldownSeconds}s`
              : 'Enter envia · Shift+Enter pula linha'}
          </span>
          <button
            type="submit"
            disabled={!canAsk}
            className="rounded-xl bg-sz-accent px-4 py-2 font-bold text-sz-bg text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Perguntar
          </button>
        </div>
      </form>
    </aside>
  )

  return isNarrow ? (
    <>
      <button
        type="button"
        aria-label="Fechar Zappy"
        tabIndex={-1}
        className="absolute inset-0 z-[74] bg-black/45"
        onClick={() => setOpen(false)}
      />
      {body}
    </>
  ) : (
    body
  )
}
