'use client'

import type {
  LiveControl,
  LiveOccurrenceState,
  LiveParticipation,
  LiveRoomView,
} from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { CheckCircle2, Ellipsis, Hand, LifeBuoy, Mic, MicOff, VideoOff } from 'lucide-react'
import { type MouseEvent, useId, useState } from 'react'
import { orderedParticipants, participantStatus } from '../../lib/live/participants'

export type ParticipantPrimaryAction =
  | { kind: 'admit'; label: string }
  | { kind: 'readmit'; label: string }
  | { kind: 'observe-help'; label: string }
  | { kind: 'grant-turn'; label: string }
  | { kind: 'observe'; label: string }

/** Uma ação principal por cartão; o resto mora no menu "Mais ações". */
export function participantPrimaryAction(participant: LiveParticipation): ParticipantPrimaryAction {
  if (participant.admission === 'waiting') return { kind: 'admit', label: 'Receber' }
  if (participant.admission === 'removed') return { kind: 'readmit', label: 'Permitir voltar' }
  if (participant.helpAt) return { kind: 'observe-help', label: 'Acompanhar pedido de ajuda' }
  if (participant.handAt && !participant.turnGranted)
    return { kind: 'grant-turn', label: 'Dar a vez de falar' }
  return { kind: 'observe', label: 'Acompanhar projeto' }
}

export type ParticipantSignal = {
  key: 'help' | 'hand' | 'turn' | 'mic-locked' | 'camera-locked'
  label: string
}

/** O estado de cada criança sempre em TEXTO (com ícone), nunca só pela cor. */
export function participantSignals(participant: LiveParticipation): ParticipantSignal[] {
  if (participant.admission !== 'admitted') return []
  const signals: ParticipantSignal[] = []
  if (participant.helpAt) signals.push({ key: 'help', label: 'Pediu ajuda' })
  if (participant.handAt) signals.push({ key: 'hand', label: 'Mão levantada' })
  if (participant.turnGranted) signals.push({ key: 'turn', label: 'Com a vez de falar' })
  if (participant.microphoneLocked)
    signals.push({ key: 'mic-locked', label: 'Microfone bloqueado' })
  if (participant.cameraLocked) signals.push({ key: 'camera-locked', label: 'Câmera pausada' })
  return signals
}

const SIGNAL_ICON = {
  help: LifeBuoy,
  hand: Hand,
  turn: Mic,
  'mic-locked': MicOff,
  'camera-locked': VideoOff,
} as const

/** A recepção e a sala aceitam moderação; encontro encerrado ou cancelado, não. */
export function participantsModerationOpen(state: LiveOccurrenceState | undefined) {
  return state !== 'ended' && state !== 'cancelled'
}

function closeMenu(event: MouseEvent<HTMLElement>) {
  const menu = event.currentTarget.closest('details')
  if (menu) menu.open = false
}

export function LiveParticipants({
  room,
  disabled,
  onControl,
  onObserve,
  sections,
}: {
  room: LiveRoomView
  disabled: boolean
  onControl(command: LiveControl): Promise<boolean>
  onObserve(learnerId: string): void
  /**
   * As partes da aula do encontro (curso ao vivo): o cartão diz em que parte a criança está e se
   * ela já concluiu a parte da turma. Ausente: as etapas do roteiro antigo.
   */
  sections?: { id: string; title: string }[]
}) {
  const [removing, setRemoving] = useState<LiveParticipation | null>(null)
  const headingId = useId()
  const participants = orderedParticipants(room.occurrence?.participants ?? [])
  const off = disabled || !participantsModerationOpen(room.occurrence?.state)
  const inRoom = participants.filter((item) => item.admission === 'admitted').length
  const waiting = participants.filter((item) => item.admission === 'waiting').length
  const send = (command: LiveControl) => void onControl(command)
  const primary = (participant: LiveParticipation) => {
    const action = participantPrimaryAction(participant)
    const learnerId = participant.learnerId
    switch (action.kind) {
      case 'admit':
      case 'readmit':
        return { action, run: () => send({ kind: 'admit', learnerId }), blocked: off }
      case 'grant-turn':
        return { action, run: () => send({ kind: 'grant-turn', learnerId }), blocked: off }
      default:
        return { action, run: () => onObserve(learnerId), blocked: disabled }
    }
  }
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          Turma
        </h2>
        <p className="text-sm text-muted-foreground">
          {inRoom} na sala · {waiting} na recepção
        </p>
      </div>
      {participants.length === 0 ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Ninguém chegou ainda. As crianças aparecem aqui assim que entrarem.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {participants.map((participant) => {
            const status = participantStatus(
              participant,
              room.serverTime,
              sections ?? room.plan?.steps ?? [],
              room.occurrence?.sections?.currentId ?? null,
            )
            const signals = participantSignals(participant)
            const main = primary(participant)
            const name = participant.displayName
            return (
              <article
                key={participant.learnerId}
                className="flex flex-col gap-2 rounded-xl border bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
                  >
                    {name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{name}</h3>
                    <p className="text-xs text-muted-foreground">{status.presence}</p>
                  </div>
                </div>
                {participant.admission === 'removed' ? (
                  <p className="text-sm text-muted-foreground">
                    Saiu deste encontro. Só volta se você permitir.
                  </p>
                ) : null}
                {signals.length ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label={`Situação de ${name}`}>
                    {signals.map((signal) => {
                      const Icon = SIGNAL_ICON[signal.key]
                      return (
                        <li
                          key={signal.key}
                          data-signal={signal.key}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                        >
                          <Icon className="size-3.5" aria-hidden />
                          {signal.label}
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
                {participant.admission === 'admitted' ? (
                  <p className="text-xs text-muted-foreground">
                    <span>{status.step}</span> · <span>{status.save}</span>
                  </p>
                ) : null}
                {participant.admission === 'admitted' && status.done ? (
                  <p
                    data-signal="section-done"
                    className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900 text-xs"
                  >
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    Concluiu a parte da turma
                  </p>
                ) : null}
                <div className="mt-auto flex items-start gap-2">
                  <Button
                    className="min-h-11 flex-1"
                    variant={main.action.kind === 'observe' ? 'outline' : 'default'}
                    disabled={main.blocked}
                    onClick={main.run}
                  >
                    {main.action.label}
                  </Button>
                  {participant.admission === 'admitted' ? (
                    <details className="relative">
                      <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg border bg-background focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                        <Ellipsis className="size-4" aria-hidden />
                        <span className="sr-only">Controles de {name}</span>
                      </summary>
                      <div className="absolute right-0 z-10 mt-1 flex w-56 flex-col gap-1 rounded-lg border bg-card p-2 shadow-lg">
                        <Button
                          className="min-h-11 justify-start"
                          variant="ghost"
                          disabled={disabled}
                          onClick={(event) => {
                            closeMenu(event)
                            onObserve(participant.learnerId)
                          }}
                        >
                          Ver projeto
                        </Button>
                        <Button
                          className="min-h-11 justify-start"
                          variant="ghost"
                          disabled={off}
                          onClick={(event) => {
                            closeMenu(event)
                            send({
                              kind: participant.turnGranted ? 'revoke-turn' : 'grant-turn',
                              learnerId: participant.learnerId,
                            })
                          }}
                        >
                          {participant.turnGranted
                            ? 'Encerrar a vez de falar'
                            : 'Dar a vez de falar'}
                        </Button>
                        <Button
                          className="min-h-11 justify-start"
                          variant="ghost"
                          disabled={off}
                          onClick={(event) => {
                            closeMenu(event)
                            send({ kind: 'mute', learnerId: participant.learnerId })
                          }}
                        >
                          Silenciar
                        </Button>
                        <Button
                          className="min-h-11 justify-start"
                          variant="ghost"
                          disabled={off}
                          onClick={(event) => {
                            closeMenu(event)
                            send({
                              kind: participant.microphoneLocked
                                ? 'unlock-microphone'
                                : 'lock-microphone',
                              learnerId: participant.learnerId,
                            })
                          }}
                        >
                          {participant.microphoneLocked
                            ? 'Liberar microfone'
                            : 'Bloquear microfone'}
                        </Button>
                        <Button
                          className="min-h-11 justify-start"
                          variant="ghost"
                          disabled={off}
                          onClick={(event) => {
                            closeMenu(event)
                            send({
                              kind: participant.cameraLocked ? 'unlock-camera' : 'lock-camera',
                              learnerId: participant.learnerId,
                            })
                          }}
                        >
                          {participant.cameraLocked ? 'Liberar câmera' : 'Pausar câmera'}
                        </Button>
                        {participant.handAt ? (
                          <Button
                            className="min-h-11 justify-start"
                            variant="ghost"
                            disabled={off}
                            onClick={(event) => {
                              closeMenu(event)
                              send({ kind: 'lower-hands', learnerId: participant.learnerId })
                            }}
                          >
                            Abaixar mão
                          </Button>
                        ) : null}
                        <Button
                          className="min-h-11 justify-start text-destructive"
                          variant="ghost"
                          disabled={off}
                          onClick={(event) => {
                            closeMenu(event)
                            setRemoving(participant)
                          }}
                        >
                          Retirar da sala
                        </Button>
                      </div>
                    </details>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing ? `Retirar ${removing.displayName} da sala?` : 'Retirar da sala?'}
        message={
          removing
            ? `${removing.displayName} sai deste encontro agora e só volta se você permitir. O projeto e o acesso aos desafios continuam guardados.`
            : ''
        }
        confirmText="Retirar da sala"
        cancelText="Voltar"
        confirmVariant="destructive"
        onConfirm={async () => {
          const target = removing
          if (target) await onControl({ kind: 'remove', learnerId: target.learnerId })
          setRemoving(null)
        }}
      />
    </section>
  )
}
