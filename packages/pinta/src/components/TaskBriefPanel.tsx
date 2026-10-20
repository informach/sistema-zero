import { PensaMissionPanel } from '@sistemazero/ui/pensa-mission-panel'
import { useState } from 'react'
import type { PintaTaskSession } from '../core/types'

export function TaskBriefPanel({
  session,
  outputMissing,
  onRecreate,
  onRelink,
  onReturn,
  currentCreationId,
}: {
  session: PintaTaskSession
  outputMissing: boolean
  onRecreate?: () => void
  onRelink?: () => void
  onReturn?: () => void | Promise<void>
  currentCreationId: string | null
}) {
  const [binding, setBinding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <PensaMissionPanel
      key={`${session.mission.id}:${session.mission.contentRevision}`}
      session={{ ...session, onReturnToPlan: onReturn ?? session.onReturnToPlan }}
      recovery={
        outputMissing || error ? (
          <>
            {outputMissing ? (
              <div role="status">
                <p>
                  Este desenho não está neste aparelho. Você pode escolher outro desenho guardado ou
                  criar um novo.
                </p>
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--outline"
                  onClick={onRelink}
                >
                  Escolher desenho
                </button>
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--outline"
                  onClick={onRecreate}
                >
                  Criar outro desenho
                </button>
              </div>
            ) : null}
            {error ? <p role="alert">{error}</p> : null}
          </>
        ) : null
      }
      note="folded"
    >
      {session.assetSlots.map((slot) => {
        const deliveredId =
          session.progress.deliveries.find((delivery) => delivery.assetSlotId === slot.id)?.creation
            .creationId ?? null
        const locked =
          binding || Boolean(session.blockedReason) || session.progress.status === 'completed'
        return (
          <div key={slot.id} className="sz-tool-mission-content__item sz-tool-mission-panel__slot">
            <span
              aria-hidden="true"
              className={`sz-tool-mission-panel__mark${deliveredId ? ' is-done' : ''}`}
            >
              {deliveredId ? <CheckMark /> : null}
            </span>
            <div className="sz-tool-mission-panel__slot-body">
              <p>
                <strong>{slot.name}</strong>
                {deliveredId ? ' · desenho escolhido' : null}
              </p>
              {deliveredId ? null : (
                <p className="sz-tool-mission-panel__slot-note">{slot.description}</p>
              )}
              {deliveredId && deliveredId === currentCreationId ? null : (
                <button
                  type="button"
                  className="sz-tool-mission-panel__btn sz-tool-mission-panel__btn--small"
                  disabled={locked || !currentCreationId}
                  onClick={() => {
                    if (!currentCreationId || binding) return
                    setBinding(true)
                    setError(null)
                    void session
                      .onBindCreation({ assetSlotId: slot.id, creationId: currentCreationId })
                      .catch(() =>
                        setError('Não consegui ligar este desenho à missão. Tente novamente.'),
                      )
                      .finally(() => setBinding(false))
                  }}
                >
                  {deliveredId ? 'Trocar pelo desenho aberto' : 'Escolher o desenho aberto'}
                  <span className="sz-tool-mission-panel__sr"> como {slot.name}</span>
                </button>
              )}
              {!currentCreationId && !locked ? (
                <p className="sz-tool-mission-panel__slot-note">
                  Abra um desenho para escolher aqui.
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </PensaMissionPanel>
  )
}

function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
