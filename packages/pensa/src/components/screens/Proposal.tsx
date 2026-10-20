import type { PensaMission, PensaPlanDraft, PensaProjectView } from '@sistemazero/core/pensa'
import { useEffect, useId, useState } from 'react'
import { DESTINATION_NAMES } from '../../core/copy'
import { orderedMissions } from '../../core/planView'
import type { Composer } from '../ChatPanel'
import { usePensaUi } from '../context'
import { Adaptations, GameCard } from '../GameCard'
import { PlanMissionList } from '../MissionMap'
import { Chip, Mascot, ZeroTrail } from '../ui'
import { ScreenHeader } from './ScreenHeader'

/**
 * O plano para conferir (Canvas "O plano para conferir"): a carta do jogo e o mapa antes do
 * aceite. Nada começa antes de a criança dizer que este é o jogo dela.
 */
export function Proposal({
  view,
  draft,
  composer,
  busy,
  onAccept,
  onLater,
  onOpenMission,
}: {
  view: PensaProjectView
  draft: PensaPlanDraft & {
    definition: NonNullable<PensaPlanDraft['definition']>
    plan: NonNullable<PensaPlanDraft['plan']>
  }
  composer: Composer
  busy: boolean
  onAccept(): void
  onLater(): void
  onOpenMission(mission: PensaMission): void
}) {
  const { adapter, readOnly, copy } = usePensaUi()
  const [changing, setChanging] = useState(false)
  const mapId = useId()
  const first = orderedMissions(draft.plan)[0]
  const locked = readOnly || view.project.paused || view.project.status === 'archived'
  useEffect(() => {
    if (changing) composer.textareaRef.current?.focus()
  }, [changing, composer.textareaRef])
  const voice = readOnly
    ? null
    : adapter.renderVoiceInput?.({
        value: composer.text,
        onChange: composer.setText,
        onBusyChange: composer.setVoiceBusy,
        disabled: busy,
        textareaId: composer.inputId,
      })
  return (
    <div className="pz-screen pz-proposal">
      <ScreenHeader
        titleAs="strong"
        title={view.project.name}
        back={{ label: 'Voltar aos meus jogos', onClick: onLater }}
        actions={<ZeroTrail stage="e" />}
      />
      <div className="pz-column pz-column--1240">
        <div className="pz-hero">
          <Mascot pose="happy" size={110} alt="O Zappy feliz" />
          <div>
            <h1 className="pz-title pz-title--hero">Este é o plano do {draft.definition.title}</h1>
            <p className="pz-lead">
              Confira a carta do jogo e o mapa das missões. Nada começa antes de você dizer que este
              é o seu jogo.
            </p>
          </div>
        </div>
        <div className="pz-proposal__cols">
          <div className="pz-proposal__left">
            <GameCard
              definition={draft.definition}
              plan={draft.plan}
              listen={adapter.renderListen?.({
                origin: 'pensa_draft',
                projectId: view.project.id,
                draftId: draft.id,
                draftRevision: draft.revision,
                section: 'summary',
              })}
            />
            <Adaptations definition={draft.definition} />
          </div>
          <section className="pz-card pz-proposal__map" aria-labelledby={mapId}>
            <div className="pz-map__head">
              <h2 id={mapId} className="pz-title pz-title--md">
                O mapa das missões
              </h2>
              <Chip tone="yellow">{draft.plan.missions.length} missões</Chip>
            </div>
            <p className="pz-muted">
              Cada missão entrega uma parte que funciona. Toque numa missão para ler o que ela pede.
            </p>
            <PlanMissionList plan={draft.plan} onOpen={onOpenMission} />
            {draft.definition.futureIdeas.length ? (
              <details className="pz-details">
                <summary>Ideias para depois · {draft.definition.futureIdeas.length}</summary>
                <ul>
                  {draft.definition.futureIdeas.map((idea) => (
                    <li key={idea.id}>{idea.text}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        </div>
        {changing ? (
          <form
            className="pz-card pz-answer"
            onSubmit={(event) => {
              event.preventDefault()
              composer.onSend()
            }}
          >
            <label htmlFor={composer.inputId} className="pz-label">
              O que você quer mudar no plano
            </label>
            <textarea
              id={composer.inputId}
              ref={composer.textareaRef}
              className="pz-input pz-textarea"
              rows={3}
              placeholder="Ex.: quero que o jogo tenha três vidas"
              value={composer.text}
              disabled={composer.voiceBusy}
              onChange={(event) => composer.setText(event.target.value)}
            />
            <div className="pz-answer__actions">
              <button type="button" className="pz-text-btn" onClick={() => setChanging(false)}>
                Cancelar
              </button>
              {voice}
              <button
                type="submit"
                className="pz-btn pz-btn--action"
                disabled={composer.blocked || !composer.text.trim()}
              >
                Mandar para o Zappy
              </button>
            </div>
          </form>
        ) : null}
      </div>
      <div className="pz-decide">
        <div className="pz-decide__inner">
          <span className="pz-muted">
            Quando você aceitar, as missões entram no mapa
            {first ? ` e a primeira abre no ${DESTINATION_NAMES[first.destination]}` : ''}.
          </span>
          <div className="pz-decide__actions">
            <button type="button" className="pz-text-btn" onClick={onLater}>
              Agora não
            </button>
            {!readOnly ? (
              <button
                type="button"
                className="pz-btn pz-btn--card"
                aria-expanded={changing}
                onClick={() => setChanging(true)}
              >
                Quero mudar uma coisa
              </button>
            ) : null}
            <button
              type="button"
              className="pz-btn pz-btn--action pz-btn--lg"
              disabled={busy || locked || draft.status !== 'ready'}
              title={readOnly ? copy.readOnlyHint : undefined}
              onClick={onAccept}
            >
              Este é o meu jogo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
