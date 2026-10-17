import type { PensaMission } from '@sistemazero/core/pensa'
import { PensaMissionContent } from '@sistemazero/ui/pensa-mission-content'
import type { ComponentProps } from 'react'

const destinations = { studio: 'Estúdio', pinta: 'Pinta', molda: 'Molda' }

export function MissionCard({
  mission,
  mode,
  blockedReason,
  onOpen,
  onHelp,
  renderListen,
}: {
  mission: PensaMission
  mode: 'build' | 'reconfirm'
  blockedReason: string | null
  onOpen(): void
  onHelp(): void
  renderListen?: ComponentProps<typeof PensaMissionContent>['renderListen']
}) {
  return (
    <section
      className="pensa-journey-card pensa-journey-mission"
      aria-labelledby="pensa-mission-title"
    >
      <p className="sz-tool-kicker">
        {mode === 'reconfirm' ? 'Vamos conferir de novo' : 'Sua próxima missão'}
      </p>
      <h2 className="pensa-journey-card__title" id="pensa-mission-title">
        {mission.title}
      </h2>
      <PensaMissionContent mission={mission} renderListen={renderListen} />
      {blockedReason ? (
        <p className="pensa-journey-warn" role="status">
          {blockedReason}
        </p>
      ) : null}
      <div className="pensa-journey-actions">
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--primary"
          disabled={Boolean(blockedReason)}
          onClick={onOpen}
        >
          {mode === 'reconfirm' ? 'Conferir' : 'Continuar'} no {destinations[mission.destination]}
        </button>
        <button type="button" className="sz-tool-pill sz-tool-pill--outline" onClick={onHelp}>
          Preciso de ajuda
        </button>
      </div>
    </section>
  )
}
