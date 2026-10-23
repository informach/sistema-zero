import type {
  PensaMission,
  PensaMissionAvailability,
  PensaMissionProgress,
  PensaPlan,
} from '@sistemazero/core/pensa'
import { Fragment, useId, useState } from 'react'
import {
  DESTINATION_NAMES,
  MISSION_STATE_LABELS,
  type MissionState,
  missionState,
} from '../core/copy'
import { isFinalTest, orderedMissions, stagesWithMissions } from '../core/planView'
import { CheckIcon, FlagIcon } from './icons'
import { Chip, DestinationChip, ProgressBar } from './ui'

interface MapProps {
  plan: PensaPlan
  progress: readonly PensaMissionProgress[]
  availability: readonly PensaMissionAvailability[]
  currentMissionId: string | null
  onOpen(mission: PensaMission): void
}

function useStates({ plan, progress, availability }: MapProps) {
  const numbers = new Map(orderedMissions(plan).map((mission, index) => [mission.id, index + 1]))
  const stateOf = (mission: PensaMission): MissionState =>
    missionState(
      progress.find((item) => item.missionId === mission.id),
      availability.find((item) => item.missionId === mission.id),
    )
  const applicable = plan.missions.filter((mission) => stateOf(mission) !== 'skip')
  const done = applicable.filter((mission) => stateOf(mission) === 'done').length
  return { numbers, stateOf, done, total: applicable.length }
}

function pinLabel(number: number, mission: PensaMission, state: MissionState, current: boolean) {
  return `Missão ${number}, ${mission.title}. ${MISSION_STATE_LABELS[state]}${current ? '. Você está aqui' : ''}`
}

/** O mapa das missões do projeto: uma trilha por etapa, como na Jornada. */
export function MissionMap(props: MapProps) {
  const { plan, currentMissionId, onOpen } = props
  const titleId = useId()
  const { numbers, stateOf, done, total } = useStates(props)
  return (
    <section className="pz-card pz-map" aria-labelledby={titleId} id="pensa-mapa">
      <div className="pz-map__head">
        <h2 id={titleId} className="pz-title pz-title--md">
          O mapa das missões
        </h2>
        <div className="pz-map__progress">
          <span>
            {done} de {total} prontas
          </span>
          <ProgressBar value={done} total={total} />
        </div>
      </div>
      <div className="pz-map__stages">
        {stagesWithMissions(plan).map(({ stage, tone, missions }) => (
          <section key={stage.id} className="pz-map__stage" aria-label={stage.title}>
            <Chip tone={tone} className="pz-map__stage-chip">
              {stage.title}
            </Chip>
            <ol className="pz-map__trail">
              {missions.map((mission, index) => {
                const state = stateOf(mission)
                const current = mission.id === currentMissionId
                const number = numbers.get(mission.id) ?? 0
                return (
                  <Fragment key={mission.id}>
                    {index > 0 ? (
                      <li
                        aria-hidden="true"
                        className={`pz-map__rail${state === 'done' ? ' is-done' : ''}`}
                      />
                    ) : null}
                    <li className="pz-map__item">
                      <button
                        type="button"
                        className={`pz-pin is-${state}${current ? ' is-current' : ''}`}
                        aria-label={pinLabel(number, mission, state, current)}
                        aria-current={current ? 'step' : undefined}
                        onClick={() => onOpen(mission)}
                      >
                        <span className="pz-pin__node" aria-hidden="true">
                          {state === 'done' ? (
                            <CheckIcon size={26} strokeWidth={3.2} />
                          ) : isFinalTest(mission) && !current ? (
                            <FlagIcon size={24} />
                          ) : (
                            number
                          )}
                        </span>
                        <span className="pz-pin__title" aria-hidden="true">
                          {mission.title}
                        </span>
                        {current ? (
                          <span className="pz-chip pz-chip--yellow" aria-hidden="true">
                            Você está aqui
                          </span>
                        ) : null}
                      </button>
                    </li>
                  </Fragment>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </section>
  )
}

/**
 * O mapa no celular: a missão atual com as vizinhas e o resto a um toque ("Ver as N missões").
 */
export function MissionMapCompact(props: MapProps) {
  const { plan, currentMissionId, onOpen } = props
  const titleId = useId()
  const [all, setAll] = useState(false)
  const { numbers, stateOf, done, total } = useStates(props)
  const ordered = orderedMissions(plan)
  // Sem missão atual (jogo pronto, esperando a equipe): a primeira que falta, ou a última.
  const current = ordered.findIndex((mission) => mission.id === currentMissionId)
  const firstOpen = ordered.findIndex((mission) => !['done', 'skip'].includes(stateOf(mission)))
  const index = current >= 0 ? current : firstOpen >= 0 ? firstOpen : ordered.length - 1
  const visible = new Set(
    (all ? ordered : ordered.slice(Math.max(0, index - 1), index + 2)).map((item) => item.id),
  )
  return (
    <section className="pz-card pz-map-compact" aria-labelledby={titleId} id="pensa-mapa">
      <div className="pz-map-compact__head">
        <h2 id={titleId} className="pz-title pz-title--sm">
          O mapa das missões
        </h2>
        <span className="pz-map-compact__count">
          {done} de {total} prontas
        </span>
      </div>
      {stagesWithMissions(plan).map(({ stage, missions }) => {
        const shown = missions.filter((mission) => visible.has(mission.id))
        if (!shown.length) return null
        return (
          <div key={stage.id} className="pz-map-compact__stage">
            <span className="pz-map-compact__label">{stage.title}</span>
            <ul>
              {shown.map((mission) => {
                const state = stateOf(mission)
                const current = mission.id === currentMissionId
                const number = numbers.get(mission.id) ?? 0
                return (
                  <li key={mission.id}>
                    <button
                      type="button"
                      className={`pz-map-compact__row is-${state}${current ? ' is-current' : ''}`}
                      aria-label={pinLabel(number, mission, state, current)}
                      aria-current={current ? 'step' : undefined}
                      onClick={() => onOpen(mission)}
                    >
                      <span className="pz-map-compact__dot" aria-hidden="true">
                        {state === 'done' ? <CheckIcon size={14} strokeWidth={3.4} /> : number}
                      </span>
                      <span aria-hidden="true">{mission.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      {ordered.length > visible.size || all ? (
        <button
          type="button"
          className="pz-link-btn"
          aria-expanded={all}
          onClick={() => setAll(!all)}
        >
          {all ? 'Mostrar menos' : `Ver as ${ordered.length} missões`}
        </button>
      ) : null}
    </section>
  )
}

/** O mapa do plano para conferir: linhas por etapa, com a oficina de cada missão. */
export function PlanMissionList({
  plan,
  onOpen,
}: {
  plan: PensaPlan
  onOpen(mission: PensaMission): void
}) {
  const numbers = new Map(orderedMissions(plan).map((mission, index) => [mission.id, index + 1]))
  return (
    <div className="pz-plan-list">
      {stagesWithMissions(plan).map(({ stage, tone, missions }) => (
        <section key={stage.id} className="pz-plan-list__stage" aria-label={stage.title}>
          <h3 className={`pz-plan-list__title is-${tone}`}>{stage.title}</h3>
          <ul>
            {missions.map((mission) => {
              const number = numbers.get(mission.id) ?? 0
              return (
                <li key={mission.id}>
                  <button
                    type="button"
                    className={`pz-plan-list__row${number === 1 ? ' is-first' : ''}`}
                    aria-label={`Missão ${number}, ${mission.title}, no ${DESTINATION_NAMES[mission.destination]}. Ver a missão`}
                    onClick={() => onOpen(mission)}
                  >
                    <span className="pz-plan-list__no" aria-hidden="true">
                      {number}
                    </span>
                    <span className="pz-plan-list__name" aria-hidden="true">
                      {mission.title}
                    </span>
                    <DestinationChip destination={mission.destination} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
