import type { PensaPendingChoice } from '@sistemazero/core/pensa'
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
  onChoose,
}: {
  choice: PensaPendingChoice
  assistantText: string | null
  composer: Composer
  disabled: boolean
  onChoose(option: { id: string; label: string }): void
}) {
  const { adapter, readOnly } = usePensaUi()
  const voice = readOnly
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
          <p>{assistantText ?? 'Para montar o plano, preciso saber uma coisa:'}</p>
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
          <div className="pz-answer__actions">
            {voice}
            <button
              type="submit"
              className="pz-btn pz-btn--action"
              disabled={composer.blocked || !composer.text.trim()}
            >
              Responder
            </button>
          </div>
        </form>
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
