import type { PensaMessage, PensaMission, PensaOperationView } from '@sistemazero/core/pensa'
import { PENSA_LIMITS } from '@sistemazero/core/pensa'
import { type ReactNode, type RefObject, useEffect, useRef } from 'react'
import { usePensaUi } from './context'
import { CloseIcon, SendIcon } from './icons'
import { PensaMessageText } from './PensaMessageText'
import { OperationFailed } from './States'
import { Mascot } from './ui'

export interface Composer {
  text: string
  setText(value: string): void
  kind: 'planning' | 'help'
  helpMission: PensaMission | null
  inputId: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  voiceBusy: boolean
  setVoiceBusy(busy: boolean): void
  /** Mandar está desligado (gravando, operação em andamento, pausa, ideias, suporte). */
  blocked: boolean
  onSend(): void
}

/**
 * A conversa com o Zappy (Canvas "Projeto", coluna da direita; no celular, a aba Conversa).
 * Cada mensagem é um pedido ao servidor; a resposta chega pela operação acompanhada no app.
 */
export function ChatPanel({
  projectId,
  messages,
  composer,
  operation,
  busy,
  exhausted,
  exhaustedCard,
  changeReady,
  narrow,
  stripLabel,
  onAskHelp,
  onAskChange,
  onClearHelp,
  onCancelOperation,
  onRetryOperation,
  onReviewChange,
}: {
  projectId: string
  messages: readonly PensaMessage[]
  composer: Composer
  operation: PensaOperationView | null
  busy: boolean
  exhausted: boolean
  exhaustedCard: ReactNode
  changeReady: boolean
  narrow: boolean
  stripLabel: string | null
  onAskHelp: (() => void) | null
  onAskChange(): void
  onClearHelp(): void
  onCancelOperation(): void
  onRetryOperation(): void
  onReviewChange(): void
}) {
  const { adapter, copy, readOnly, kids } = usePensaUi()
  const list = useRef<HTMLOListElement>(null)
  const running = Boolean(operation && ['queued', 'running'].includes(operation.status))
  const failed = operation?.status === 'failed'
  // biome-ignore lint/correctness/useExhaustiveDependencies: keeps the newest message in view.
  useEffect(() => {
    const element = list.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages.length, running])
  const tooLong = composer.text.length > PENSA_LIMITS.messageChars
  const voice = readOnly
    ? null
    : adapter.renderVoiceInput?.({
        value: composer.text,
        onChange: composer.setText,
        onBusyChange: composer.setVoiceBusy,
        disabled: busy || running,
        textareaId: composer.inputId,
      })
  const label = composer.kind === 'help' ? 'Sua dúvida' : 'Mensagem para o Zappy'
  return (
    <aside
      className={`pz-chat${narrow ? ' is-narrow' : ' pz-card'}`}
      aria-label="Conversa com o Zappy"
    >
      {narrow ? (
        stripLabel ? (
          <div className="pz-chat__strip">
            <span>{stripLabel}</span>
            <span>{copy.messageCost}</span>
          </div>
        ) : null
      ) : (
        <div className="pz-chat__head">
          <Mascot pose="speaking" size={48} />
          <div>
            <strong className="pz-title pz-title--sm">Zappy</strong>
            <span>{copy.messageCost}</span>
          </div>
        </div>
      )}
      <ol className="pz-chat__messages" ref={list}>
        {messages.length === 0 ? (
          <li className="pz-bubble is-assistant">
            {kids ? <Mascot pose="speaking" size={36} className="pz-bubble__face" /> : null}
            <div className="pz-bubble__text">
              <p>{copy.chatEmpty}</p>
            </div>
          </li>
        ) : null}
        {messages.map((message) => (
          <li key={message.id} className={`pz-bubble is-${message.role}`}>
            {message.role === 'assistant' && narrow ? (
              <Mascot pose="speaking" size={36} className="pz-bubble__face" />
            ) : null}
            <div className="pz-bubble__text">
              <span className="pz-sr-only">{message.role === 'user' ? 'Você:' : 'Zappy:'}</span>
              <PensaMessageText text={message.text} />
              {message.role === 'assistant'
                ? adapter.renderListen?.({
                    origin: 'pensa_message',
                    projectId,
                    messageId: message.id,
                    messageRevision: message.revision,
                  })
                : null}
            </div>
          </li>
        ))}
        {changeReady ? (
          <li className="pz-bubble is-assistant">
            <div className="pz-bubble__text">
              <p>{copy.changePrepared}</p>
              <button
                type="button"
                className="pz-btn pz-btn--card pz-btn--sm"
                onClick={onReviewChange}
              >
                Ver o que muda
              </button>
            </div>
          </li>
        ) : null}
        {running ? (
          <li className="pz-bubble is-assistant is-thinking" aria-live="polite">
            <div className="pz-bubble__text">
              <p>
                <span className="pz-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>{' '}
                O Zappy está pensando
              </p>
              {!readOnly ? (
                <button type="button" className="pz-text-btn" onClick={onCancelOperation}>
                  Parar
                </button>
              ) : null}
            </div>
          </li>
        ) : null}
      </ol>
      {failed ? (
        <div className="pz-chat__state">
          <OperationFailed
            kind={
              operation?.kind === 'help'
                ? 'help'
                : operation?.kind === 'planning'
                  ? 'planning'
                  : 'other'
            }
            busy={busy}
            onRetry={onRetryOperation}
          />
        </div>
      ) : null}
      {exhausted && !readOnly ? <div className="pz-chat__state">{exhaustedCard}</div> : null}
      {readOnly ? (
        <p className="pz-chat__readonly">
          As mensagens aparecem para leitura. O campo de mensagem e a fala ficam desligados nesta
          visão.
        </p>
      ) : (
        <>
          {!exhausted ? (
            <div className="pz-chat__chips">
              {onAskHelp ? (
                <button type="button" className="pz-chip-btn" onClick={onAskHelp}>
                  Tenho uma dúvida nesta missão
                </button>
              ) : null}
              <button type="button" className="pz-chip-btn" onClick={onAskChange}>
                Mudar uma parte do jogo
              </button>
            </div>
          ) : null}
          <form
            className="pz-chat__form"
            onSubmit={(event) => {
              event.preventDefault()
              composer.onSend()
            }}
          >
            {composer.kind === 'help' ? (
              <p className="pz-chat__context">
                <span>
                  Dúvida sobre <strong>{composer.helpMission?.title ?? 'o jogo'}</strong>
                </span>
                <button
                  type="button"
                  className="pz-icon-btn is-small"
                  aria-label="Voltar a conversar sobre o jogo"
                  onClick={onClearHelp}
                >
                  <CloseIcon size={16} />
                </button>
              </p>
            ) : null}
            <label htmlFor={composer.inputId} className="pz-sr-only">
              {label}
            </label>
            <textarea
              id={composer.inputId}
              ref={composer.textareaRef}
              value={composer.text}
              rows={narrow ? 1 : 3}
              placeholder={composer.kind === 'help' ? 'Conte a sua dúvida' : 'Escreva para o Zappy'}
              disabled={composer.voiceBusy}
              onChange={(event) => composer.setText(event.target.value)}
            />
            {tooLong ? (
              <p role="status" className="pz-small">
                O seu texto tem {composer.text.length} caracteres. Cada mensagem pode ter até 4.000;
                guarde uma parte para mandar depois.
              </p>
            ) : null}
            <div className="pz-chat__send">
              {voice}
              {exhausted ? (
                <span className="pz-small">
                  {kids ? 'As ideias acabaram por agora.' : 'Os créditos acabaram por agora.'}
                </span>
              ) : narrow ? (
                <button
                  type="submit"
                  className="pz-btn pz-btn--action pz-btn--round"
                  aria-label="Enviar"
                  disabled={composer.blocked || !composer.text.trim() || tooLong}
                >
                  <SendIcon size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="pz-btn pz-btn--action"
                  disabled={composer.blocked || !composer.text.trim() || tooLong}
                >
                  Enviar
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </aside>
  )
}
