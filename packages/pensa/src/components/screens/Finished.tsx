import type { PensaIdea } from '@sistemazero/core/pensa'
import { usePensaUi } from '../context'
import { PlayIcon } from '../icons'
import { Mascot } from '../ui'

/**
 * O jogo pronto (Canvas "Jogo pronto"): a comemoração quando o servidor diz que todas as missões
 * foram conferidas, e as ideias guardadas para virar a próxima parte.
 */
export function Finished({
  name,
  done,
  total,
  ideas,
  onOpenGame,
  onChange,
  onUseIdea,
  onNewGame,
}: {
  name: string
  done: number
  total: number
  ideas: readonly PensaIdea[]
  onOpenGame: () => void
  onChange: () => void
  onUseIdea: (idea: PensaIdea) => void
  onNewGame: () => void
}) {
  const { copy, readOnly } = usePensaUi()
  return (
    <div className="pz-finished">
      <section className="pz-card pz-party" aria-labelledby="pz-party-title">
        <span aria-hidden="true" className="pz-confetti is-1" />
        <span aria-hidden="true" className="pz-confetti is-2" />
        <span aria-hidden="true" className="pz-confetti is-3" />
        <span aria-hidden="true" className="pz-confetti is-4" />
        <span aria-hidden="true" className="pz-confetti is-5" />
        <Mascot pose="celebrating" size={190} alt="O Zappy comemorando" className="pz-anim-party" />
        <span className="pz-chip pz-chip--mint pz-chip--lg">
          {done} de {total} missões conferidas
        </span>
        <h2 id="pz-party-title" className="pz-title pz-title--party">
          O seu jogo está pronto
        </h2>
        <p>{copy.finishedText(name)}</p>
        <ol className="pz-squares" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative squares, one per mission.
            <li key={index} className={index === total - 1 ? 'is-final' : undefined} />
          ))}
        </ol>
        <div className="pz-row pz-row--center">
          <button type="button" className="pz-btn pz-btn--action pz-btn--lg" onClick={onOpenGame}>
            <PlayIcon size={18} />
            Abrir meu jogo
          </button>
          {!readOnly ? (
            <button type="button" className="pz-btn pz-btn--card pz-btn--lg" onClick={onChange}>
              Mudar uma parte do jogo
            </button>
          ) : null}
        </div>
      </section>
      {ideas.length ? (
        <section className="pz-card pz-later" aria-labelledby="pz-later-title">
          <h2 id="pz-later-title" className="pz-title pz-title--md">
            {ideas.length === 1
              ? 'Você guardou 1 ideia para depois'
              : `Você guardou ${ideas.length} ideias para depois`}
          </h2>
          <p className="pz-muted">
            Escolha uma para virar a próxima parte do jogo. O Zappy prepara a mudança e você confere
            antes.
          </p>
          <ul className="pz-later__list">
            {ideas.map((idea) => (
              <li key={idea.id}>
                <span>{idea.text}</span>
                {!readOnly ? (
                  <button
                    type="button"
                    className="pz-btn pz-btn--card pz-btn--sm"
                    aria-label={`Colocar no jogo: ${idea.text}`}
                    onClick={() => onUseIdea(idea)}
                  >
                    Colocar no jogo
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <button type="button" className="pz-link-btn pz-self-start" onClick={onNewGame}>
            Começar outro jogo
          </button>
        </section>
      ) : null}
    </div>
  )
}
