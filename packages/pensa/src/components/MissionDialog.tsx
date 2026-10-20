import type {
  PensaMission,
  PensaMissionAvailability,
  PensaMissionProgress,
  PensaPlan,
  PensaTeamView,
  PensaTechnicalPlan,
} from '@sistemazero/core/pensa'
import { type RefObject, useId, useRef } from 'react'
import { DESTINATION_NAMES, MISSION_STATE_LABELS, missionState, personName } from '../core/copy'
import { extensionNameFor, missionNumber, stageTitle } from '../core/planView'
import { usePensaUi } from './context'
import { useDialogFocus } from './dialogFocus'
import { CheckIcon, CloseIcon, LockIcon } from './icons'
import { MissionBrief, type RenderListen } from './MissionBrief'
import { Chip, type ChipTone, DestinationChip } from './ui'

const STATE_TONES: Record<ReturnType<typeof missionState>, ChipTone> = {
  done: 'mint',
  review: 'yellow',
  doing: 'action',
  todo: 'neutral',
  skip: 'strike',
}

/**
 * A missão aberta (Canvas "Missão aberta"): uma folha à direita no computador e de baixo para
 * cima no celular. Qualquer missão pode ser lida; executar segue a disponibilidade do servidor.
 */
export function MissionDialog({
  mission,
  plan,
  technical,
  progress,
  access,
  team,
  preview,
  onContinue,
  onClose,
  returnFocusTo,
  renderListen,
}: {
  mission: PensaMission
  plan: PensaPlan
  technical: PensaTechnicalPlan | null
  progress?: PensaMissionProgress
  access?: PensaMissionAvailability
  team?: PensaTeamView
  /** O plano ainda não foi aceito: só leitura. */
  preview: boolean
  onContinue(): void
  onClose(): void
  returnFocusTo: RefObject<HTMLElement | null>
  renderListen?: RenderListen
}) {
  const { readOnly, copy } = usePensaUi()
  const cardRef = useRef<HTMLElement>(null)
  const titleId = useId()
  useDialogFocus({ open: true, cardRef, busy: false, onClose, returnFocusTo })
  const state = missionState(progress, access)
  const stage = stageTitle(plan, mission)
  const number = missionNumber(plan, mission.id)
  const assignee =
    access && (access.reason === 'claimed' || access.reason === 'not_your_mission')
      ? team?.people.find((person) => person.profileId === progress?.assigneeProfileId)
      : undefined
  const where = DESTINATION_NAMES[mission.destination]
  const canRun = Boolean(access?.available) && !readOnly
  const locked = access && !access.available && access.message && access.reason !== 'completed'
  return (
    <div className="pz-scrim pz-scrim--sheet">
      <section
        ref={cardRef}
        className="pz-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="pz-sheet__top">
          <div className="pz-sheet__chips">
            <DestinationChip destination={mission.destination} />
            <Chip tone="action">
              Missão {number} de {plan.missions.length}
              {stage ? ` · ${stage}` : ''}
            </Chip>
            {assignee ? (
              <Chip tone="lilac">Com {personName(assignee.firstName)}</Chip>
            ) : preview ? null : (
              <Chip tone={STATE_TONES[state]}>{MISSION_STATE_LABELS[state]}</Chip>
            )}
          </div>
          <button
            type="button"
            className="pz-icon-btn is-quiet"
            aria-label="Fechar"
            onClick={onClose}
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <h2 id={titleId} className="pz-title pz-title--lg">
          {mission.title}
        </h2>
        <MissionBrief
          mission={mission}
          extensionName={extensionNameFor(technical, mission)}
          variant="rows"
          renderListen={renderListen}
        />
        {preview ? (
          <p className="pz-note is-yellow">
            <LockIcon size={22} />
            <span>As missões abrem depois que você aceitar o plano.</span>
          </p>
        ) : access?.reason === 'completed' || state === 'done' ? (
          <p className="pz-note is-mint">
            <CheckIcon size={22} />
            <span>Você já conferiu esta missão.</span>
          </p>
        ) : locked ? (
          <p className="pz-note is-yellow">
            <LockIcon size={22} />
            <span>{access.message}</span>
          </p>
        ) : null}
        <div className="pz-sheet__actions">
          {preview ? null : (
            <button
              type="button"
              className={`pz-btn pz-btn--lg ${canRun ? 'pz-btn--action' : 'pz-btn--locked'}`}
              disabled={!canRun}
              title={readOnly ? copy.readOnlyHint : undefined}
              onClick={onContinue}
            >
              {access?.mode === 'reconfirm' ? 'Conferir' : 'Continuar'} no {where}
            </button>
          )}
          <button type="button" className="pz-btn pz-btn--card pz-btn--lg" onClick={onClose}>
            Fechar
          </button>
        </div>
      </section>
    </div>
  )
}
