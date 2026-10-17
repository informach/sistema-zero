import type { PensaGameDefinition } from '@sistemazero/core/pensa'
import { type ReactNode, useId } from 'react'

export function GameDefinition({
  definition,
  listen,
}: {
  definition: PensaGameDefinition
  listen?: ReactNode
}) {
  const titleId = useId()
  return (
    <section className="pensa-journey-card" aria-labelledby={titleId}>
      <p className="sz-tool-kicker">Seu jogo</p>
      <h2 id={titleId} className="pensa-journey-card__title">
        {definition.title}
      </h2>
      <p className="pensa-journey-lead">{definition.summary}</p>
      <p>{definition.playerExperience}</p>
      {listen}
      <ul className="pensa-definition-requirements">
        {definition.requirements.map((requirement) => (
          <li key={requirement.id}>
            {requirement.text}
            {requirement.origin === 'suggestion' ? <small> · Sugestão do Zappy</small> : null}
          </li>
        ))}
      </ul>
      {definition.assetSlots.length ? (
        <details>
          <summary>Elementos do jogo</summary>
          <ul>
            {definition.assetSlots.map((slot) => (
              <li key={slot.id}>
                <strong>{slot.name}</strong> · {slot.description}
                <small>
                  {' '}
                  ·{' '}
                  {slot.source === 'create'
                    ? 'Vamos criar'
                    : slot.source === 'existing'
                      ? 'Criação já guardada'
                      : 'Vamos preparar no Estúdio'}
                </small>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {definition.openChoices.length ? (
        <details>
          <summary>Você pode escolher durante a construção</summary>
          <ul>
            {definition.openChoices.map((choice) => (
              <li key={choice.id}>{choice.text}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {definition.adaptations.length ? (
        <details>
          <summary>
            {definition.adaptations.every((item) => item.acceptedAt)
              ? 'Escolhas que fizemos para este jogo'
              : 'Alternativas para seu jogo'}
          </summary>
          {definition.adaptations.map((adaptation) => (
            <div key={adaptation.id}>
              <p>{adaptation.limitation}</p>
              <p>{adaptation.alternative}</p>
              <p>{adaptation.preserved}</p>
              {!adaptation.acceptedAt ? (
                <small>Veja esta alternativa antes de escolher seu caminho.</small>
              ) : null}
            </div>
          ))}
        </details>
      ) : null}
    </section>
  )
}
