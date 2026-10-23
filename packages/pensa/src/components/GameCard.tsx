import type { PensaGameDefinition, PensaPlan } from '@sistemazero/core/pensa'
import { type ReactNode, useId } from 'react'
import { DESTINATION_NAMES } from '../core/copy'
import { slotDestination } from '../core/planView'
import { usePensaUi } from './context'
import { CheckIcon } from './icons'
import { Chip, Mascot } from './ui'

/**
 * A carta do jogo (a definição aceita ou proposta): resumo, como se joga, o que o jogo precisa
 * ter, os elementos com a oficina de cada um e o que fica para escolher durante a construção.
 */
export function GameCard({
  definition,
  plan,
  listen,
  headingLevel = 2,
}: {
  definition: PensaGameDefinition
  plan: PensaPlan | null
  listen?: ReactNode
  headingLevel?: 2 | 3
}) {
  const { copy } = usePensaUi()
  const titleId = useId()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article className="pz-card pz-carta" aria-labelledby={titleId}>
      <div className="pz-carta__band">
        <span>A carta do jogo</span>
        <Chip tone="yellow">{definition.dimension === '3d' ? '3D' : '2D'}</Chip>
      </div>
      <div className="pz-carta__body">
        <div>
          <Heading id={titleId} className="pz-title pz-title--xl">
            {definition.title}
          </Heading>
          <p className="pz-carta__summary">{definition.summary}</p>
          {listen}
        </div>
        <div className="pz-carta__facts">
          <div className="pz-fact">
            <strong>Como se joga</strong>
            <span>{definition.playerExperience}</span>
          </div>
          <div className="pz-fact">
            <strong>A ideia que você contou</strong>
            <span className="pz-clamp">{definition.originalIntent}</span>
          </div>
        </div>
        <div className="pz-carta__group">
          <strong>O que o jogo precisa ter</strong>
          <ul className="pz-checklist">
            {definition.requirements.map((requirement) => (
              <li key={requirement.id}>
                <CheckIcon size={20} />
                <span>
                  {requirement.text}
                  {requirement.origin === 'suggestion' ? (
                    <>
                      {' '}
                      <Chip tone="yellow" size="sm">
                        {copy.suggestion}
                      </Chip>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {definition.assetSlots.length ? (
          <div className="pz-carta__group">
            <strong>Elementos do jogo</strong>
            <ul className="pz-elements">
              {definition.assetSlots.map((slot) => {
                const where = plan ? slotDestination(definition, plan, slot.id) : null
                return (
                  <li key={slot.id} className={`pz-element is-${where ?? 'none'}`}>
                    <span aria-hidden="true" className="pz-element__dot" />
                    {slot.name}
                    {slot.source === 'existing'
                      ? ' · criação já guardada'
                      : where === 'studio'
                        ? ' · preparar no Estúdio'
                        : where
                          ? ` · criar no ${DESTINATION_NAMES[where]}`
                          : ''}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
        {definition.openChoices.length ? (
          <div className="pz-carta__open">
            <strong>Você escolhe durante a construção</strong>
            <ul>
              {definition.openChoices.map((choice) => (
                <li key={choice.id}>{choice.text}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  )
}

/** "Uma parte precisou de outro jeito": as adaptações explicadas, antes ou depois do aceite. */
export function Adaptations({ definition }: { definition: PensaGameDefinition }) {
  if (!definition.adaptations.length) return null
  return (
    <aside className="pz-adaptations" aria-label="Partes que precisaram de outro jeito">
      <Mascot pose="thinking" size={72} />
      <div className="pz-adaptations__body">
        <strong className="pz-title pz-title--sm">
          {definition.adaptations.length === 1
            ? 'Uma parte precisou de outro jeito'
            : 'Algumas partes precisaram de outro jeito'}
        </strong>
        {definition.adaptations.map((adaptation) => (
          <dl key={adaptation.id} className="pz-adaptation">
            <dt>Você pediu</dt>
            <dd>{adaptation.originalIntent}</dd>
            <dt>Por enquanto</dt>
            <dd>{adaptation.limitation}</dd>
            <dt>No lugar</dt>
            <dd>{adaptation.alternative}</dd>
            <dt>Continua</dt>
            <dd>{adaptation.preserved}</dd>
          </dl>
        ))}
      </div>
    </aside>
  )
}

/** A carta resumida do projeto, com o botão para ler a carta inteira. */
export function GameCardSummary({
  definition,
  onOpen,
}: {
  definition: PensaGameDefinition
  onOpen(): void
}) {
  return (
    <article className="pz-card pz-carta pz-carta--summary">
      <div className="pz-carta__band is-small">
        <span>A carta do jogo</span>
      </div>
      <div className="pz-carta__body">
        <strong className="pz-title pz-title--sm">{definition.title}</strong>
        <p className="pz-carta__summary">
          {definition.playerExperience} {definition.summary}
        </p>
        <button type="button" className="pz-btn pz-btn--card pz-carta__more" onClick={onOpen}>
          Ver a carta inteira
        </button>
      </div>
    </article>
  )
}
