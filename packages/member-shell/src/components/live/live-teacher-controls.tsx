'use client'

import type {
  LiveControl,
  LiveGuidance,
  LiveOccurrenceState,
  LiveRoomView,
  LiveSpeakingMode,
} from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import {
  Ban,
  CalendarX2,
  DoorOpen,
  Hand,
  MousePointerClick,
  Play,
  Radio,
  Square,
  UserCheck,
  VolumeX,
} from 'lucide-react'
import { useId, useState } from 'react'

/**
 * TODO contrato do servidor: estes três comandos entram no `LiveControl` de
 * `packages/core/src/live/contracts.ts` (cancelar, receber todos e o `before` do abaixar mãos).
 * Depois do merge, `LiveTeacherControl` passa a ser só `LiveControl` e este tipo some.
 */
type PendingServerControl =
  | { kind: 'cancel' }
  | { kind: 'admit-all' }
  | { kind: 'lower-hands'; learnerId: string | null; before?: string }
export type LiveTeacherControl = LiveControl | PendingServerControl

export const SPEAKING_MODES: readonly { value: LiveSpeakingMode; label: string; hint: string }[] = [
  {
    value: 'open',
    label: 'Conversa livre',
    hint: 'Todas as crianças podem ligar o microfone quando quiserem.',
  },
  {
    value: 'turns',
    label: 'Falar por vez',
    hint: 'Só fala quem levantar a mão e receber a vez.',
  },
  {
    value: 'listen',
    label: 'Hora de ouvir',
    hint: 'As crianças só escutam: ninguém liga o microfone enquanto você explica.',
  },
]

export const GUIDE_TARGETS: readonly (readonly [LiveGuidance['target'], string])[] = [
  ['studio-run', 'Executar projeto'],
  ['studio-stop', 'Parar projeto'],
  ['studio-blocks', 'Blocos'],
  ['studio-code', 'Código'],
  ['studio-save', 'Guardar projeto'],
  ['room-hand', 'Levantar a mão'],
  ['room-help', 'Pedir ajuda'],
]

const STATE_TEXT: Record<LiveOccurrenceState, { label: string; detail: string }> = {
  scheduled: {
    label: 'Encontro marcado',
    detail:
      'A recepção pode abrir quinze minutos antes do horário. Quem chegar espera até você receber.',
  },
  lobby: {
    label: 'Recepção aberta',
    detail:
      'As crianças esperam na recepção. Receba quem chegou e comece quando a turma estiver pronta.',
  },
  live: {
    label: 'Ao vivo',
    detail:
      'Ao encerrar, a chamada termina para todos. Os desafios continuam disponíveis pelo prazo de cada criança.',
  },
  ended: {
    label: 'Encontro encerrado',
    detail: 'A chamada terminou. Confira a gravação e, se precisar, agende uma reposição.',
  },
  cancelled: {
    label: 'Encontro cancelado',
    detail: 'Este encontro não vai acontecer. Agende uma reposição para a turma.',
  },
}

/** O que a professora vê no instante da foto da sala: quem espera e quantas mãos estão no ar. */
export function teacherRoomSummary(room: LiveRoomView) {
  const participants = room.occurrence?.participants ?? []
  return {
    state: room.occurrence?.state ?? null,
    waiting: participants.filter((item) => item.admission === 'waiting').length,
    hands: participants.filter((item) => item.admission === 'admitted' && item.handAt).length,
  }
}

/**
 * Abaixa só as mãos que a professora VIU: as que subiram até o horário desta foto da sala.
 * Uma mão levantada depois do clique continua no ar.
 */
export function lowerHandsCommand(room: LiveRoomView): LiveTeacherControl {
  return { kind: 'lower-hands', learnerId: null, before: room.serverTime }
}

export function LiveTeacherControls({
  room,
  busy,
  stale,
  onControl,
}: {
  room: LiveRoomView
  busy: boolean
  stale: boolean
  onControl(command: LiveTeacherControl): Promise<boolean>
}) {
  const [confirming, setConfirming] = useState<'end' | 'cancel' | null>(null)
  const headingId = useId()
  const modeHintId = useId()
  const occurrence = room.occurrence
  if (!occurrence) return null
  const { state, waiting, hands } = teacherRoomSummary(room)
  const text = STATE_TEXT[occurrence.state]
  const off = busy || stale
  const moderation = state === 'lobby' || state === 'live'
  const live = state === 'live'
  const mode = SPEAKING_MODES.find((item) => item.value === occurrence.speakingMode)
  const run = (command: LiveTeacherControl) => void onControl(command)
  const big = 'min-h-11 px-4'
  return (
    <section aria-labelledby={headingId} className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          Organização da sala
        </h2>
        <span
          role="status"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
        >
          {live ? <Radio className="size-4" aria-hidden /> : null}
          {stale ? 'Reconectando…' : text.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{text.detail}</p>

      <div className="flex flex-wrap gap-2">
        {state === 'scheduled' ? (
          <Button className={big} disabled={off} onClick={() => run({ kind: 'open-lobby' })}>
            <DoorOpen aria-hidden />
            Abrir recepção
          </Button>
        ) : null}
        {state === 'lobby' ? (
          <Button className={big} disabled={off} onClick={() => run({ kind: 'start' })}>
            <Play aria-hidden />
            Começar encontro
          </Button>
        ) : null}
        {live ? (
          <Button
            className={big}
            variant="outline"
            disabled={off}
            onClick={() => setConfirming('end')}
          >
            <Square aria-hidden />
            Encerrar encontro
          </Button>
        ) : null}
        {state === 'scheduled' || state === 'lobby' ? (
          <Button
            className={big}
            variant="outline"
            disabled={off}
            onClick={() => setConfirming('cancel')}
          >
            <CalendarX2 aria-hidden />
            Cancelar encontro
          </Button>
        ) : null}
      </div>

      {moderation ? (
        <div className="space-y-4 border-t pt-4">
          <div className="flex flex-wrap gap-2">
            {waiting > 0 ? (
              <Button className={big} disabled={off} onClick={() => run({ kind: 'admit-all' })}>
                <UserCheck aria-hidden />
                Receber todos ({waiting})
              </Button>
            ) : null}
            <Button
              className={big}
              variant="outline"
              disabled={off}
              onClick={() => run({ kind: 'mute', learnerId: null })}
            >
              <VolumeX aria-hidden />
              Silenciar todos agora
            </Button>
            <Button
              className={big}
              variant="outline"
              disabled={off || hands === 0}
              onClick={() => run(lowerHandsCommand(room))}
            >
              <Hand aria-hidden />
              {hands > 0 ? `Abaixar todas as mãos (${hands})` : 'Abaixar todas as mãos'}
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold" id={`${modeHintId}-label`}>
              Como a turma fala
            </p>
            <div
              role="group"
              aria-labelledby={`${modeHintId}-label`}
              aria-describedby={modeHintId}
              className="flex flex-wrap gap-2"
            >
              {SPEAKING_MODES.map((item) => (
                <Button
                  key={item.value}
                  className={big}
                  variant={occurrence.speakingMode === item.value ? 'default' : 'outline'}
                  aria-pressed={occurrence.speakingMode === item.value}
                  disabled={off}
                  onClick={() => {
                    if (occurrence.speakingMode !== item.value)
                      run({ kind: 'speaking-mode', mode: item.value })
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <p id={modeHintId} className="text-sm text-muted-foreground">
              {mode ? `${mode.label}: ${mode.hint} ` : ''}Liberar o microfone permite que a criança
              o ligue. Não liga o aparelho por ela.
            </p>
          </div>
        </div>
      ) : null}

      {moderation ? (
        <div className="space-y-2 border-t pt-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MousePointerClick className="size-4" aria-hidden />
            Apontar para a turma
          </p>
          <div className="flex flex-wrap gap-2">
            {GUIDE_TARGETS.map(([target, label]) => (
              <Button
                key={target}
                className={big}
                variant="outline"
                disabled={off || !live}
                onClick={() => run({ kind: 'guide', target, learnerId: null })}
              >
                {label}
              </Button>
            ))}
          </div>
          {!live ? (
            <p className="text-sm text-muted-foreground">
              Os destaques aparecem para as crianças depois que o encontro começar.
            </p>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming === 'end'}
        onClose={() => setConfirming(null)}
        title="Encerrar o encontro para toda a turma?"
        message="A chamada termina agora para todas as crianças. Os desafios e o projeto de cada uma continuam disponíveis pelo prazo do encontro."
        confirmText="Encerrar encontro"
        cancelText="Voltar"
        confirmVariant="destructive"
        onConfirm={async () => {
          await onControl({ kind: 'end' })
          setConfirming(null)
        }}
      />
      <ConfirmDialog
        open={confirming === 'cancel'}
        onClose={() => setConfirming(null)}
        title="Cancelar este encontro?"
        message={
          <>
            <span className="flex items-start gap-2">
              <Ban className="mt-0.5 size-4 shrink-0" aria-hidden />O encontro não vai acontecer
              neste horário.
            </span>
            <span className="mt-2 block">
              As famílias continuam com o acesso aos desafios pelo prazo combinado. Depois de
              cancelar, você pode agendar uma reposição para a turma.
            </span>
          </>
        }
        confirmText="Cancelar encontro"
        cancelText="Voltar"
        confirmVariant="destructive"
        onConfirm={async () => {
          await onControl({ kind: 'cancel' })
          setConfirming(null)
        }}
      />
    </section>
  )
}
