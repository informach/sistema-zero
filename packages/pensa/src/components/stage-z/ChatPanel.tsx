/**
 * Painel de conversa da etapa Z: bolhas (Zappy à esquerda com avatar, criança
 * à direita), rolagem automática, indicador de "pensando", bolha de streaming
 * ao vivo (linha SUGESTÕES: sempre oculta), CHIPS clicáveis (clicar ENVIA o
 * texto como mensagem) + chip fixo "Quero escrever" que foca o input, erro
 * gentil com retry e boas-vindas LOCAL quando a conversa está vazia (só UI —
 * nunca vai ao servidor como assistant).
 */
import { clsx } from 'clsx'
import type { FormEvent, JSX, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { hideChipLines, splitChips } from '../../core/chips'
import type { PensaMascotPose } from '../../core/types'
import type { PensaChatStore } from '../../state/chatStore'
import { usePensaApp } from '../appContext'
import { ZappyImage } from '../common/ZappyImage'

const MESSAGE_MAX = 2000

function ZappyAvatar({ pose = 'happy' }: { pose?: PensaMascotPose }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pz-accent/15"
    >
      <ZappyImage pose={pose} fallbackEmoji="⚡" className="h-8 w-8 object-contain text-lg" />
    </span>
  )
}

function AssistantRow({
  name,
  children,
  busy,
}: {
  name: string
  children: ReactNode
  busy?: boolean
}): JSX.Element {
  return (
    <div className="flex items-end gap-2">
      <ZappyAvatar pose={busy ? 'thinking' : 'happy'} />
      <div
        aria-busy={busy || undefined}
        className="max-w-[80%] rounded-2xl rounded-bl-md border-2 border-pz-border bg-pz-surface px-4 py-2.5 text-pz-text"
      >
        <span className="sr-only">{name}: </span>
        <p className="whitespace-pre-wrap">{children}</p>
      </div>
    </div>
  )
}

function UserRow({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-pz-accent px-4 py-2.5 text-pz-accent-fg">
        <span className="sr-only">Você: </span>
        <p className="whitespace-pre-wrap">{children}</p>
      </div>
    </div>
  )
}

export function ChatPanel({
  store,
  projectId,
  footer,
}: {
  store: PensaChatStore
  projectId: string
  /** Renderizado como ÚLTIMO item do log (o autoscroll o traz à vista). */
  footer?: ReactNode
}): JSX.Element {
  const { copy } = usePensaApp()
  const messages = useStore(store, (s) => s.messages)
  const streamingText = useStore(store, (s) => s.streamingText)
  const sending = useStore(store, (s) => s.sending)
  const chatError = useStore(store, (s) => s.chatError)
  const chips = useStore(store, (s) => s.chips)
  const send = useStore(store, (s) => s.send)
  const retry = useStore(store, (s) => s.retry)

  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputId = useId()

  // Rolagem automática pro fim a cada mensagem/delta (instantânea; nada a
  // suavizar aqui, então reduced-motion não é afetado).
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [])
  const lastSignature = `${messages.length}:${streamingText.length}:${String(sending)}:${String(Boolean(footer))}`
  const previousSignature = useRef(lastSignature)
  useEffect(() => {
    if (previousSignature.current === lastSignature) return
    previousSignature.current = lastSignature
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [lastSignature])

  const conversationEmpty = messages.length === 0
  const liveText = hideChipLines(streamingText)
  const thinking = sending && liveText === ''
  // Chips só entre turnos (nunca durante o envio nem sobre um erro pendente).
  const visibleChips =
    sending || chatError ? [] : conversationEmpty ? copy.chat.starterChips : chips

  const sendMessage = (text: string): void => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    send(projectId, trimmed)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (!draft.trim()) return
    sendMessage(draft)
    setDraft('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        ref={listRef}
        role="log"
        aria-label={`Conversa com ${copy.chat.assistantName}`}
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-3xl border-2 border-pz-border bg-pz-bg p-4"
      >
        {conversationEmpty ? (
          <AssistantRow name={copy.chat.assistantName}>{copy.chat.welcome}</AssistantRow>
        ) : null}
        {messages.map((message, index) => {
          const key = `${message.at}-${index}`
          if (message.role === 'user') return <UserRow key={key}>{message.content}</UserRow>
          return (
            <AssistantRow key={key} name={copy.chat.assistantName}>
              {splitChips(message.content).display}
            </AssistantRow>
          )
        })}
        {sending && liveText !== '' ? (
          <AssistantRow name={copy.chat.assistantName} busy>
            {liveText}
          </AssistantRow>
        ) : null}
        {thinking ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-pz-muted">
            <ZappyAvatar pose="thinking" />
            <span aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
              💭
            </span>
            <span aria-busy="true">{copy.chat.thinking}</span>
          </div>
        ) : null}
        {!sending ? footer : null}
      </div>

      {chatError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-pz-warn bg-pz-surface px-4 py-3">
          <p role="alert" className="font-semibold text-pz-warn">
            {chatError}
          </p>
          <button
            type="button"
            onClick={() => retry(projectId)}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
          >
            {copy.errors.retry}
          </button>
        </div>
      ) : null}

      {visibleChips.length > 0 || !sending ? (
        <div className="flex flex-wrap gap-2">
          {visibleChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => sendMessage(chip)}
              className="min-h-11 rounded-full border-2 border-pz-accent/40 bg-pz-surface px-4 text-sm font-semibold text-pz-accent transition hover:border-pz-accent hover:bg-pz-accent/10"
            >
              {chip}
            </button>
          ))}
          {!sending ? (
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="min-h-11 rounded-full border-2 border-dashed border-pz-border bg-pz-surface px-4 text-sm font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-accent"
            >
              <span aria-hidden="true">✏️ </span>
              {copy.chat.writeChip}
            </button>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex items-stretch gap-2">
        <label htmlFor={inputId} className="sr-only">
          {copy.chat.inputLabel}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.chat.inputPlaceholder}
          maxLength={MESSAGE_MAX}
          autoComplete="off"
          className="min-h-12 w-full min-w-0 flex-1 rounded-2xl border-2 border-pz-border bg-pz-surface px-4 text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent"
        />
        <button
          type="submit"
          disabled={sending}
          aria-busy={sending || undefined}
          className={clsx(
            'min-h-12 shrink-0 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition',
            'hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {copy.chat.send}
        </button>
      </form>
    </div>
  )
}
