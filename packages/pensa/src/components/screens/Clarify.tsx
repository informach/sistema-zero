import { PENSA_LIMITS, type PensaPendingChoice } from '@sistemazero/core/pensa'
import type { ReactNode } from 'react'
import type { Composer } from '../ChatPanel'
import { usePensaUi } from '../context'
import { Mascot } from '../ui'
import { YouSaid } from './Generating'
import { ScreenHeader } from './ScreenHeader'

/**
 * A pergunta do Zappy (Canvas "Pergunta do Zappy"): uma escolha de cada vez, em cartões, ou a
 * resposta do jeito da criança. Escolher manda a opção para o servidor, que segue o plano.
 */
export function ClarifyQuestion({
  choice,
  assistantText,
  composer,
  disabled,
  exhausted = false,
  exhaustedCard = null,
  onAnswerInChat,
  onChoose,
}: {
  choice: PensaPendingChoice
  assistantText: string | null
  composer: Composer
  disabled: boolean
  /** As ideias (ou créditos) acabaram: as opções esperam e o cartão explica o porquê. */
  exhausted?: boolean
  exhaustedCard?: ReactNode
  /**
   * No projeto aceito a conversa já está ao lado (ou na aba Conversa): a resposta livre vai
   * para o campo dela, sem um segundo campo com o mesmo id.
   */
  onAnswerInChat?: () => void
  onChoose(option: { id: string; label: string }): void
}) {
  const { adapter, readOnly, kids } = usePensaUi()
  const tooLong = composer.text.length > PENSA_LIMITS.messageChars
  const voice =
    readOnly || onAnswerInChat
      ? null
      : adapter.renderVoiceInput?.({
          value: composer.text,
          onChange: composer.setText,
          onBusyChange: composer.setVoiceBusy,
          disabled,
          textareaId: composer.inputId,
        })
  return (
    <div className="pz-clarify">
      <div className="pz-clarify__ask">
        <Mascot pose="speaking" size={72} />
        <div className="pz-card pz-says">
          <span className="pz-says__who">Zappy</span>
          <p>
            {assistantText ??
              (kids
                ? 'Para montar o plano, preciso saber uma coisa:'
                : 'Para montar o plano, o Zappy precisa saber uma coisa:')}
          </p>
          <h2 className="pz-title pz-title--question">{choice.question}</h2>
        </div>
      </div>
      <div className="pz-clarify__indent">
        <fieldset className="pz-options">
          <legend className="pz-sr-only">Escolha uma resposta</legend>
          {choice.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="pz-option"
              disabled={disabled}
              onClick={() => onChoose(option)}
            >
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </button>
          ))}
        </fieldset>
        {exhausted && !readOnly ? exhaustedCard : null}
        {onAnswerInChat ? (
          readOnly ? null : (
            <button type="button" className="pz-link-btn pz-self-start" onClick={onAnswerInChat}>
              Responder do meu jeito na conversa
            </button>
          )
        ) : (
          <form
            className="pz-card pz-answer"
            onSubmit={(event) => {
              event.preventDefault()
              composer.onSend()
            }}
          >
            <label htmlFor={composer.inputId} className="pz-label">
              Ou responda do seu jeito
            </label>
            <textarea
              id={composer.inputId}
              ref={composer.textareaRef}
              className="pz-input pz-textarea"
              rows={2}
              placeholder="Escreva a sua resposta"
              value={composer.text}
              disabled={composer.voiceBusy || readOnly}
              onChange={(event) => composer.setText(event.target.value)}
            />
            {tooLong ? (
              <p role="status" className="pz-small">
                O seu texto tem {composer.text.length} caracteres. Cada mensagem pode ter até 4.000;
                guarde uma parte para mandar depois.
              </p>
            ) : null}
            <div className="pz-answer__actions">
              {voice}
              <button
                type="submit"
                className="pz-btn pz-btn--action"
                disabled={composer.blocked || !composer.text.trim() || tooLong}
              >
                Responder
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function Clarify({
  name,
  userText,
  onBack,
  ...question
}: Parameters<typeof ClarifyQuestion>[0] & {
  name: string
  userText: string | null
  onBack(): void
}) {
  return (
    <div className="pz-screen">
      <ScreenHeader
        titleAs="strong"
        title={name}
        back={{ label: 'Voltar aos meus jogos', onClick: onBack }}
      />
      <div className="pz-column pz-column--860">
        {userText ? <YouSaid text={userText} /> : null}
        <ClarifyQuestion {...question} />
      </div>
    </div>
  )
}
