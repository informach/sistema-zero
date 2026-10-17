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
    >
      {session.assetSlots.map((slot) => (
        <div key={slot.id}>
          <p>
            <strong>{slot.name}</strong> · {slot.description}
          </p>
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--outline"
            disabled={
              binding ||
              !currentCreationId ||
              Boolean(session.blockedReason) ||
              session.progress.status === 'completed'
            }
            onClick={() => {
              if (!currentCreationId || binding) return
              setBinding(true)
              setError(null)
              void session
                .onBindCreation({ assetSlotId: slot.id, creationId: currentCreationId })
                .catch(() => setError('Não consegui ligar este desenho à missão. Tente novamente.'))
                .finally(() => setBinding(false))
            }}
          >
            Usar o desenho aberto nesta parte
          </button>
        </div>
      ))}
    </PensaMissionPanel>
  )
}
