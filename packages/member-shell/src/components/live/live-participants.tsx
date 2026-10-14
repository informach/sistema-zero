'use client'

import type { LiveControl, LiveParticipation, LiveRoomView } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { orderedParticipants, participantStatus } from '../../lib/live/participants'

export function LiveParticipants({
  room,
  disabled,
  onControl,
  onObserve,
}: {
  room: LiveRoomView
  disabled: boolean
  onControl(command: LiveControl): Promise<boolean>
  onObserve(learnerId: string): void
}) {
  const command = (
    participant: LiveParticipation,
    kind:
      | 'mute'
      | 'lower-hands'
      | 'grant-turn'
      | 'revoke-turn'
      | 'lock-microphone'
      | 'unlock-microphone'
      | 'lock-camera'
      | 'unlock-camera',
  ) => void onControl({ kind, learnerId: participant.learnerId })
  return (
    <section aria-label="Turma" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {orderedParticipants(room.occurrence?.participants ?? []).map((participant) => {
        const status = participantStatus(participant, room.serverTime, room.plan?.steps ?? [])
        return (
          <article key={participant.learnerId} className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 font-bold">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              >
                {participant.displayName.slice(0, 1)}
              </span>
              {participant.displayName}
            </h2>
            <p className="text-sm">
              {status.presence}
              {participant.helpAt ? ' · Pediu ajuda' : participant.handAt ? ' · Mão levantada' : ''}
            </p>
            {participant.admission === 'admitted' && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{status.step}</p>
                <p>{status.save}</p>
              </div>
            )}
            {participant.admission === 'waiting' ? (
              <Button
                size="sm"
                disabled={disabled}
                onClick={() => void onControl({ kind: 'admit', learnerId: participant.learnerId })}
              >
                Receber
              </Button>
            ) : null}
            {participant.admission === 'admitted' ? (
              <>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={disabled}
                  onClick={() =>
                    participant.handAt && !participant.helpAt && !participant.turnGranted
                      ? command(participant, 'grant-turn')
                      : onObserve(participant.learnerId)
                  }
                >
                  {participant.helpAt
                    ? 'Acompanhar pedido de ajuda'
                    : participant.handAt && !participant.turnGranted
                      ? 'Pode falar'
                      : 'Acompanhar projeto'}
                </Button>
                <details className="text-sm">
                  <summary className="min-h-11 cursor-pointer rounded-lg px-2 py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">
                    Controles de {participant.displayName}
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => onObserve(participant.learnerId)}
                    >
                      Ver projeto
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() =>
                        command(participant, participant.turnGranted ? 'revoke-turn' : 'grant-turn')
                      }
                    >
                      {participant.turnGranted ? 'Encerrar fala' : 'Pode falar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => command(participant, 'mute')}
                    >
                      Silenciar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() =>
                        command(
                          participant,
                          participant.microphoneLocked ? 'unlock-microphone' : 'lock-microphone',
                        )
                      }
                    >
                      {participant.microphoneLocked ? 'Liberar microfone' : 'Bloquear microfone'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() =>
                        command(
                          participant,
                          participant.cameraLocked ? 'unlock-camera' : 'lock-camera',
                        )
                      }
                    >
                      {participant.cameraLocked ? 'Liberar câmera' : 'Pausar câmera'}
                    </Button>
                    {participant.handAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => command(participant, 'lower-hands')}
                      >
                        Abaixar mão
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => {
                        if (
                          window.confirm(`Encerrar a participação de ${participant.displayName}?`)
                        )
                          void onControl({ kind: 'remove', learnerId: participant.learnerId })
                      }}
                    >
                      Retirar da sala
                    </Button>
                  </div>
                </details>
              </>
            ) : null}
          </article>
        )
      })}
    </section>
  )
}
