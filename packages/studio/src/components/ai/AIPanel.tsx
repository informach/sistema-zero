import type { JSX } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { type InstalledExtension, t } from '#core'
import { Badge, Button } from '#ui'
import { OpenRouterError } from '../../ai/providers/openRouterProvider'
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
/** Texto exibido quando a IA conclui com sucesso mas sem conteúdo algum. */
const AI_EMPTY_RESPONSE_PLACEHOLDER = 'A IA não retornou conteúdo. Tente novamente.'
const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []
/** Folga (px) dentro da qual consideramos o aluno "no fim" do transcript. */
const STICKY_BOTTOM_THRESHOLD_PX = 48
/**
 * Intervalo mínimo (ms) entre dois envios disparados pela criança. As ações já
 * são serializadas por `busy`, mas um pré-envio termina rápido e o `busy` cai —
 * uma criança "metralhando" os botões poderia drenar a chave BYOK. Este espaço
 * é um amortecedor amigável, NUNCA um erro.
 */
const MIN_REQUEST_INTERVAL_MS = 1500
/** Aviso gentil quando o aluno tenta enviar rápido demais (cooldown). */
const COOLDOWN_MESSAGE = 'Calma! Espere um instante antes de perguntar de novo.'

/**
 * Resultado de {@link describeAIError}: texto amigável em PT + se devemos
 * oferecer abrir as configurações de IA (chave inválida).
 */
export interface FriendlyAIError {
  /** Mensagem calma e legível para criança, sempre com um próximo passo. */
  text: string
  /** Quando true, o painel oferece um botão "Configurar IA". */
  offerSettings: boolean
}

/**
 * Traduz um erro do provider para uma mensagem calma em PT-BR COM próximo passo.
 * Mapeia por `status`/`name` (NÃO por texto da mensagem) — nunca vaza JSON cru
 * do upstream para a criança. Pura: testável sem renderizar o painel.
 */
export function describeAIError(err: unknown): FriendlyAIError {
  if (err instanceof OpenRouterError) {
    if (err.status === 401 || err.status === 403) {
      return {
        text: 'Sua chave de IA parece inválida. Toque em "Configurar IA" para revisar a chave.',
        offerSettings: true,
      }
    }
    if (err.status === 429) {
      return {
        text: 'Muitas perguntas seguidas. Tente de novo em instantes.',
        offerSettings: false,
      }
    }
  }
  if (err instanceof Error && err.name === 'TimeoutError') {
    return { text: 'A IA demorou demais. Tenta de novo.', offerSettings: false }
  }
  return {
    text: 'Não consegui falar com a IA agora. Respira fundo e tenta de novo em instantes.',
    offerSettings: false,
  }
}

/**
 * Decide se o auto-scroll deve grudar no rodapé: só quando o leitor já estava
 * perto do fim. Lido acima (rolou pra trás) NÃO é puxado de volta. Geometria
 * vem do elemento de scroll do transcript. Extraído como função pura p/ teste.
 */
export function shouldStickToBottom(geometry: {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}): boolean {
  const distanceFromBottom = geometry.scrollHeight - geometry.scrollTop - geometry.clientHeight
  return distanceFromBottom <= STICKY_BOTTOM_THRESHOLD_PX
}

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

  // Inicializador LAZY: a função (e o `nextId++`) roda só na 1ª render. Com o
  // array inline, `nextId++` era avaliado a CADA render (React descarta o valor,
  // mas o efeito colateral no contador persistia, abrindo buracos nos ids).
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
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
  // Quando o último erro foi "chave inválida", oferecemos um atalho p/ abrir as
  // configurações de IA. Limpo a cada novo envio bem-sucedido/tentativa.
  const [offerSettingsFix, setOfferSettingsFix] = useState(false)
  // Carimbo do último envio disparado, p/ o cooldown leve (anti-mash). Ref, não
  // estado: não precisa re-renderizar e o valor tem que ser lido de forma síncrona.
  const lastSendAtRef = useRef(0)
  const activeRequestRef = useRef(0)
  const activeAbortRef = useRef<AbortController | null>(null)
  const streamBufferRef = useRef<{ messageId: number; text: string } | null>(null)
  const streamFlushTimerRef = useRef<number | null>(null)
  const transcriptRef = useRef<HTMLDivElement | null>(null)

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

  // Auto-scroll grudado no rodapé: tokens em streaming e mensagens novas se
  // acumulavam abaixo da dobra. Usamos scrollTop = scrollHeight (não
  // scrollIntoView, que mexeria no scroll do host). Só "puxamos" se o aluno já
  // estava perto do fim — assim ler o histórico mais acima não dá solavanco.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `messages` é só o GATILHO (o corpo lê apenas refs/função pura)
  useEffect(() => {
    const el = transcriptRef.current
    if (!el) return
    if (shouldStickToBottom(el)) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

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
      // Cooldown leve (anti-mash): se o último envio foi há menos de
      // MIN_REQUEST_INTERVAL_MS, NÃO dispara a request — só um aviso gentil.
      // Protege a chave BYOK de uma criança metralhando os botões. Nunca um erro.
      const now = Date.now()
      if (now - lastSendAtRef.current < MIN_REQUEST_INTERVAL_MS) {
        setMessages((m) =>
          appendChatMessages(m, { id: nextId++, who: 'ia', text: COOLDOWN_MESSAGE }),
        )
        return
      }
      lastSendAtRef.current = now
      setOfferSettingsFix(false)
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
        setMessages((m) =>
          updateChatMessage(m, id, (msg) => ({
            ...msg,
            streaming: false,
            // Sucesso sem conteúdo (stream vazio / resposta vazia) renderizava
            // uma bolha em branco — substitui por um aviso amigável.
            text: msg.text.trim() ? msg.text : AI_EMPTY_RESPONSE_PLACEHOLDER,
          })),
        )
      } catch (err) {
        if (activeRequestRef.current !== requestId) return
        if (abortController.signal.aborted) return
        flushStreamBuffer()
        // Erro traduzido para PT-BR calmo COM próximo passo (mapeado por
        // status/name, nunca por texto cru). Se já chegou algum token, mantemos
        // o que veio; senão exibimos a mensagem amigável.
        const friendly = describeAIError(err)
        setOfferSettingsFix(friendly.offerSettings)
        setMessages((m) =>
          updateChatMessage(m, id, (msg) => ({
            ...msg,
            streaming: false,
            text: msg.text || friendly.text,
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
        {/* role="log" + aria-live="polite": leitores de tela anunciam as mensagens
            que chegam (inclusive a resposta da IA em streaming). "polite" coalesce
            as atualizações e só fala quando o usuário está ocioso, evitando inundar
            a cada token. Sem isto a resposta da IA aparecia sem nenhum aviso ao SR. */}
        <div
          ref={transcriptRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          className="flex-1 overflow-auto px-3 py-2 text-xs"
        >
          {messages.map((m) => (
            <ChatMessageItem key={m.id} message={m} />
          ))}
        </div>
        {/* Atalho contextual: quando o último erro foi "chave inválida" (401/403),
            oferecemos abrir as configurações de IA — sem becos sem saída. */}
        {offerSettingsFix && (
          <div className="flex items-center justify-between gap-2 border-t border-sz-border-soft bg-sz-panel-soft px-3 py-1.5 text-xs text-sz-fg-mute">
            <span>Precisa revisar sua chave de IA?</span>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                setOfferSettingsFix(false)
                setSettingsOpen(true)
              }}
            >
              Configurar IA
            </Button>
          </div>
        )}
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
