import type {
  PensaMission,
  PensaMissionAvailability,
  PensaMissionProgress,
  PensaPlan,
} from '@sistemazero/core/pensa'
import { useId } from 'react'

export function ProjectPlan({
  plan,
  progress,
  currentMissionId,
  onOpen,
  availability = [],
}: {
  plan: PensaPlan
  progress: PensaMissionProgress[]
  currentMissionId: string | null
  onOpen(mission: PensaMission): void
  availability?: readonly PensaMissionAvailability[]
}) {
  const titleId = useId()
  return (
    <section className="pensa-journey-card" aria-labelledby={titleId}>
      <h2 className="pensa-journey-card__title" id={titleId}>
        Meu caminho
      </h2>
      {plan.stages.map((stage) => (
        <details
          key={stage.id}
          open={plan.missions.some(
            (mission) => mission.stageId === stage.id && mission.id === currentMissionId,
          )}
        >
          <summary>{stage.title}</summary>
          <ol className="pensa-functional-path">
            {plan.missions
              .filter((mission) => mission.stageId === stage.id)
              .map((mission) => {
                const state = progress.find((item) => item.missionId === mission.id)
                const access = availability.find((item) => item.missionId === mission.id)
                const label =
                  access?.reason === 'not_applicable'
                    ? 'Não precisa mais'
                    : state?.validity === 'needs_review'
                      ? 'Conferir de novo'
                      : state?.status === 'completed'
                        ? 'Pronta'
                        : state?.status === 'in_progress'
                          ? 'Fazendo'
                          : 'Por fazer'
                return (
                  <li
                    key={mission.id}
                    aria-current={mission.id === currentMissionId ? 'step' : undefined}
                  >
                    <div>
                      <strong>{mission.title}</strong>
                      <span>{label}</span>
                    </div>
                    <p>{mission.objective}</p>
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--outline"
                      onClick={() => onOpen(mission)}
                    >
                      Ver missão
                    </button>
                  </li>
                )
              })}
          </ol>
        </details>
      ))}
    </section>
  )
}
