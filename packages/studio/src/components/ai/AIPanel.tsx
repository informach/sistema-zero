import type { JSX } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { type InstalledExtension, t } from '#core'
import { Badge, Button } from '#ui'
import { useAIProvider } from '../../state/aiAdapter'
import { useHighlightStore } from '../../state/highlightStore'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import { useSourcemapStore } from '../../state/sourcemapStore'
import { SettingsDrawer } from '../settings/SettingsDrawer'
import {
  appendChatMessages,
  appendChatMessageText,
  type ChatMessage,
  finishStreamingMessages,
  updateChatMessage,
} from './aiMessages'

let nextId = 0
const AI_RESPONSE_MAX_TOKENS = 900
const AI_STREAM_FLUSH_MS = 50
const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []

// Memoizado: durante o streaming só a mensagem em andamento muda de props, então
// as mensagens anteriores não re-renderizam (e não re-disparam o `animate-pulse`).
const ChatMessageItem = memo(function ChatMessageItem({ message }: { message: ChatMessage }) {
  return (
    <div
      className={[
        'mb-2 max-w-prose rounded-md px-2 py-1.5 whitespace-pre-wrap',
        message.who === 'ia' ? 'bg-sz-panel-soft text-sz-fg' : 'bg-sz-accent/10 text-sz-fg',
      ].join(' ')}
    >
      <strong className="mr-1 text-xs uppercase text-sz-fg-mute">{message.who}</strong>
      {message.text}
      {message.streaming && <span className="ml-1 animate-pulse text-sz-accent">▌</span>}
    </div>
  )
})

export function AIPanel(): JSX.Element {
  const { projectName, projectIR, installedExtensions } = useProjectStore(
    useShallow((s) => ({
      projectName: s.project?.name ?? '',
      projectIR: s.project?.ir ?? null,
      installedExtensions: s.project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
    })),
  )
  const selectedBlockId = useHighlightStore((s) => s.selectedBlockId)
  const sourceMap = useSourcemapStore((s) => s.map)
  const lastErrorLog = useLogsStore((s) =>
    [...s.entries].reverse().find((e) => e.kind === 'error' || e.kind === 'runtimeError'),
  )
  const { provider, isReal, mode } = useAIProvider()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId++,
      who: 'ia',
      text: isReal
        ? 'Pronta. Pergunte qualquer coisa sobre seu projeto ou peça uma sugestão.'
        : t('ai.placeholder'),
    },
  ])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const activeRequestRef = useRef(0)
  const activeAbortRef = useRef<AbortController | null>(null)
  const streamBufferRef = useRef<{ messageId: number; text: string } | null>(null)
  const streamFlushTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      activeAbortRef.current?.abort()
      if (streamFlushTimerRef.current !== null) {
        window.clearTimeout(streamFlushTimerRef.current)
        streamFlushTimerRef.current = null
      }
      streamBufferRef.current = null
    }
  }, [])

  const ctx = useMemo(
    () => ({
      projectName,
      mode,
      ir: projectIR,
      installedExtensions: installedExtensions.map((e) => e.id),
    }),
    [projectName, mode, projectIR, installedExtensions],
  )

  const flushStreamBuffer = useCallback(() => {
    const buffer = streamBufferRef.current
    streamBufferRef.current = null
    if (streamFlushTimerRef.current !== null) {
      window.clearTimeout(streamFlushTimerRef.current)
      streamFlushTimerRef.current = null
    }
    if (!buffer) return
    setMessages((current) => appendChatMessageText(current, buffer.messageId, buffer.text))
  }, [])

  const queueStreamToken = useCallback(
    (messageId: number, token: string) => {
      if (!token) return
      const buffer = streamBufferRef.current
      if (buffer && buffer.messageId === messageId) {
        buffer.text += token
      } else {
        flushStreamBuffer()
        streamBufferRef.current = { messageId, text: token }
      }
      if (streamFlushTimerRef.current !== null) return
      streamFlushTimerRef.current = window.setTimeout(() => {
        streamFlushTimerRef.current = null
        flushStreamBuffer()
      }, AI_STREAM_FLUSH_MS)
    },
    [flushStreamBuffer],
  )

  const streamResponse = useCallback(
    async (
      call: (options: {
        onToken: (token: string) => void
        signal: AbortSignal
        maxTokens: number
      }) => Promise<string>,
    ) => {
      flushStreamBuffer()
      activeAbortRef.current?.abort()
      const abortController = new AbortController()
      activeAbortRef.current = abortController
      const requestId = activeRequestRef.current + 1
      activeRequestRef.current = requestId

      setBusy(true)
      const id = nextId++
      setMessages((m) =>
        appendChatMessages(finishStreamingMessages(m), {
          id,
          who: 'ia',
          text: '',
          streaming: true,
        }),
      )
      try {
        await call({
          signal: abortController.signal,
          maxTokens: AI_RESPONSE_MAX_TOKENS,
          onToken: (token) => {
            if (activeRequestRef.current !== requestId) return
            if (abortController.signal.aborted) return
            queueStreamToken(id, token)
          },
        })
        if (activeRequestRef.current !== requestId) return
        flushStreamBuffer()
        setMessages((m) => updateChatMessage(m, id, (msg) => ({ ...msg, streaming: false })))
      } catch (err) {
        if (activeRequestRef.current !== requestId) return
        if (abortController.signal.aborted) return
        flushStreamBuffer()
        const message = err instanceof Error ? err.message : String(err)
        setMessages((m) =>
          updateChatMessage(m, id, (msg) => ({
            ...msg,
            streaming: false,
            text: msg.text || `Erro: ${message}`,
          })),
        )
      } finally {
        if (activeRequestRef.current === requestId) {
          activeAbortRef.current = null
          setBusy(false)
        }
      }
    },
    [flushStreamBuffer, queueStreamToken],
  )

  const handleSend = useCallback(async () => {
    if (!draft.trim()) return
    const userMsg: ChatMessage = { id: nextId++, who: 'aluno', text: draft.trim() }
    setMessages((m) => appendChatMessages(m, userMsg))
    const question = draft.trim()
    setDraft('')
    if (!isReal) {
      const reply = await provider.suggestNextStep(ctx)
      setMessages((m) => appendChatMessages(m, { id: nextId++, who: 'ia', text: reply }))
      return
    }
    await streamResponse(({ onToken, signal, maxTokens }) =>
      provider.ask({ question, context: ctx, onToken, signal, maxTokens }),
    )
  }, [draft, isReal, provider, ctx, streamResponse])

  const handleExplainBlock = useCallback(() => {
    if (!selectedBlockId) return
    void streamResponse(async ({ onToken, signal, maxTokens }) => {
      const text = await provider.explainSelectedBlock(
        { blockId: selectedBlockId, sourceMapEntry: sourceMap[selectedBlockId] ?? null },
        ctx.mode,
        { signal, maxTokens },
      )
      onToken(text)
      return text
    })
  }, [selectedBlockId, sourceMap, provider, ctx.mode, streamResponse])

  const handleExplainError = useCallback(() => {
    if (!lastErrorLog) return
    void streamResponse(async ({ onToken, signal, maxTokens }) => {
      const text = await provider.explainError(
        { message: lastErrorLog.text, stack: lastErrorLog.errorStack },
        { signal, maxTokens },
      )
      onToken(text)
      return text
    })
  }, [lastErrorLog, provider, streamResponse])

  const handleSuggest = useCallback(() => {
    void streamResponse(async ({ onToken, signal, maxTokens }) => {
      const text = await provider.suggestNextStep(ctx, { signal, maxTokens })
      onToken(text)
      return text
    })
  }, [provider, ctx, streamResponse])

  const handleChallenge = useCallback(() => {
    void streamResponse(async ({ onToken, signal, maxTokens }) => {
      const text = await provider.generateChallenge('iniciante', { signal, maxTokens })
      onToken(text)
      return text
    })
  }, [provider, streamResponse])

  return (
    <>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-sz-border-soft px-3 py-1.5">
          <span className="flex items-center gap-2 text-xs text-sz-fg">
            {t('ai.title')}
            <Badge tone={isReal ? 'success' : 'warn'}>{isReal ? 'real' : 'mock'}</Badge>
            {isReal && (
              <Badge tone="neutral">
                modo {mode === 'blocks' ? 'Blocos' : mode === 'bridge' ? 'Ponte' : 'Código'}
              </Badge>
            )}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleSuggest} disabled={busy}>
              Sugerir próximo passo
            </Button>
            <Button size="sm" variant="ghost" onClick={handleChallenge} disabled={busy}>
              Gerar desafio
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleExplainBlock}
              disabled={busy || !selectedBlockId}
            >
              Explicar bloco
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleExplainError}
              disabled={busy || !lastErrorLog}
            >
              Explicar último erro
            </Button>
            <Button size="sm" variant="subtle" onClick={() => setSettingsOpen(true)}>
              Configurar IA
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto px-3 py-2 text-xs">
          {messages.map((m) => (
            <ChatMessageItem key={m.id} message={m} />
          ))}
        </div>
        <footer className="flex items-center gap-2 border-t border-sz-border-soft px-3 py-2">
          <input
            name="ai-message"
            aria-label="Mensagem para a IA"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder={
              isReal
                ? 'Pergunte algo sobre o seu projeto…'
                : 'Configure uma chave OpenRouter para conversar de verdade.'
            }
            disabled={!isReal || busy}
            className="flex-1 rounded border border-sz-border bg-sz-bg px-2 py-1 text-xs text-sz-fg placeholder:text-sz-fg-mute disabled:cursor-not-allowed"
          />
          <Button
            size="sm"
            onClick={() => {
              if (!isReal) setSettingsOpen(true)
              else void handleSend()
            }}
            disabled={busy || (isReal && !draft.trim())}
          >
            {isReal ? 'Enviar' : 'Configurar IA'}
          </Button>
        </footer>
        {!isReal && (
          <div className="border-t border-sz-border-soft bg-sz-panel-soft px-3 py-1.5 text-xs text-sz-fg-mute">
            Sem chave configurada — usando respostas mock. O painel funciona em modo demonstração
            até você adicionar uma chave OpenRouter em "Configurar IA".
          </div>
        )}
      </div>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
