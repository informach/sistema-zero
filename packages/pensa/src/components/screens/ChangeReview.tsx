import type {
  PensaMission,
  PensaPlanDraft,
  PensaProjectRevision,
  PensaProjectView,
} from '@sistemazero/core/pensa'
import { missionState } from '../../core/copy'
import { orderedMissions } from '../../core/planView'
import { usePensaUi } from '../context'
import { ShieldIcon } from '../icons'
import { Chip, type ChipTone, Mascot } from '../ui'
import { ScreenHeader } from './ScreenHeader'

type Kind = 'added' | 'changed' | 'review' | 'removed'
const KIND_LABELS: Record<Kind, { chip: string; tone: ChipTone }> = {
  added: { chip: 'Missão nova', tone: 'mint' },
  changed: { chip: 'Muda o resultado', tone: 'action' },
  review: { chip: 'Conferir de novo', tone: 'yellow' },
  removed: { chip: 'Sai do mapa', tone: 'strike' },
}

/**
 * Mudar uma parte (Canvas "Mudar uma parte"): o que a mudança preparada faz no mapa antes de
 * aceitar. O plano de agora continua valendo até a criança escolher a mudança.
 */
export function ChangeReview({
  view,
  revision,
  draft,
  request,
  busy,
  onBack,
  onAccept,
  onDiscard,
}: {
  view: PensaProjectView
  revision: PensaProjectRevision
  draft: PensaPlanDraft & {
    definition: NonNullable<PensaPlanDraft['definition']>
    plan: NonNullable<PensaPlanDraft['plan']>
  }
  /** O pedido que gerou a mudança (a última mensagem de planejamento da criança). */
  request: string | null
  busy: boolean
  onBack(): void
  onAccept(): void
  onDiscard(): void
}) {
  const { readOnly, copy } = usePensaUi()
  // Pausado ou em Guardados, o servidor recusa o aceite; descartar continua livre.
  const locked = view.project.paused || view.project.status === 'archived'
  const impact = draft.impact
  const counts: Array<{ kind: Kind; count: number; label: (n: number) => string }> = [
    {
      kind: 'added',
      count: impact?.addedMissionIds.length ?? 0,
      label: (n) => (n === 1 ? 'missão nova' : 'missões novas'),
    },
    {
      kind: 'changed',
      count: impact?.changedMissionIds.length ?? 0,
      label: (n) => (n === 1 ? 'missão muda o resultado' : 'missões mudam o resultado'),
    },
    {
      kind: 'review',
      count: impact?.reviewMissionIds.length ?? 0,
      label: (n) => (n === 1 ? 'missão para conferir de novo' : 'missões para conferir de novo'),
    },
    {
      kind: 'removed',
      count: impact?.removedMissionIds.length ?? 0,
      label: (n) => (n === 1 ? 'missão sai do mapa' : 'missões saem do mapa'),
    },
  ]
  const draftOrder = orderedMissions(draft.plan)
  const currentOrder = orderedMissions(revision.plan)
  const rows: Array<{ mission: PensaMission; kind: Kind; number: number }> = []
  const seen = new Set<string>()
  const push = (ids: readonly string[] | undefined, kind: Kind) => {
    for (const id of ids ?? []) {
      if (seen.has(id)) continue
      const inDraft = draftOrder.findIndex((mission) => mission.id === id)
      const inCurrent = currentOrder.findIndex((mission) => mission.id === id)
      const mission = draftOrder[inDraft] ?? currentOrder[inCurrent]
      if (!mission) continue
      seen.add(id)
      rows.push({ mission, kind, number: (inDraft >= 0 ? inDraft : inCurrent) + 1 })
    }
  }
  push(impact?.addedMissionIds, 'added')
  push(impact?.changedMissionIds, 'changed')
  push(impact?.reviewMissionIds, 'review')
  push(impact?.removedMissionIds, 'removed')
  const summaryChanged = revision.definition.summary !== draft.definition.summary
  return (
    <div className="pz-screen pz-change">
      <ScreenHeader
        titleAs="strong"
        title={view.project.name}
        back={{ label: 'Voltar ao jogo', onClick: onBack }}
      />
      <div className="pz-column pz-column--1000">
        <div className="pz-hero">
          <Mascot pose="speaking" size={110} alt="O Zappy falando" />
          <div>
            <span className="pz-kicker">Mudança preparada pelo Zappy</span>
            <h1 className="pz-title pz-title--hero">{request ?? 'Uma mudança no jogo'}</h1>
            <p className="pz-lead">
              Confira o que muda no mapa. O plano de agora continua valendo até você escolher esta
              mudança.
            </p>
          </div>
        </div>
        <div className="pz-counts">
          {counts.map((item) => (
            <div key={item.kind} className={`pz-count is-${item.count ? item.kind : 'zero'}`}>
              <span className="pz-count__n">{item.count}</span>
              <span>{item.label(item.count)}</span>
            </div>
          ))}
        </div>
        {summaryChanged ? (
          <section className="pz-card pz-change__card" aria-labelledby="pz-change-carta">
            <h2 id="pz-change-carta" className="pz-title pz-title--md">
              A carta do jogo
            </h2>
            <div className="pz-before-after">
              <div className="pz-before">
                <Chip tone="neutral">Antes</Chip>
                <p>{revision.definition.summary}</p>
              </div>
              <div className="pz-after">
                <Chip tone="action-solid">Depois</Chip>
                <p>{draft.definition.summary}</p>
              </div>
            </div>
          </section>
        ) : null}
        <section className="pz-card pz-change__card" aria-labelledby="pz-change-missions">
          <h2 id="pz-change-missions" className="pz-title pz-title--md">
            Missões que mudam
          </h2>
          {rows.length ? (
            <ul className="pz-change__list">
              {rows.map(({ mission, kind, number }) => {
                const done =
                  missionState(
                    view.progress.find((item) => item.missionId === mission.id),
                    undefined,
                  ) === 'done'
                return (
                  <li key={mission.id}>
                    <span className={`pz-change__no${done ? ' is-done' : ''}`} aria-hidden="true">
                      {number}
                    </span>
                    <div className="pz-change__text">
                      <strong>{mission.title}</strong>
                      <p>{mission.objective}</p>
                    </div>
                    <Chip tone={KIND_LABELS[kind].tone}>{KIND_LABELS[kind].chip}</Chip>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="pz-muted">Nenhuma missão muda de resultado com esta mudança.</p>
          )}
          <p className="pz-safe">
            <ShieldIcon size={20} />
            As criações e as partes que continuam valendo ficam guardadas.
          </p>
        </section>
        <div className="pz-row pz-row--end">
          <button
            type="button"
            className="pz-btn pz-btn--card pz-btn--lg"
            disabled={busy || readOnly}
            onClick={onDiscard}
          >
            Deixar como está
          </button>
          <button
            type="button"
            className="pz-btn pz-btn--action pz-btn--lg"
            disabled={busy || readOnly || locked || draft.status !== 'ready'}
            title={readOnly ? copy.readOnlyHint : undefined}
            onClick={onAccept}
          >
            Quero esta mudança
          </button>
        </div>
      </div>
    </div>
  )
}
