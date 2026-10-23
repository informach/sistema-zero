'use client'
import type { LiveRoomView } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { useState } from 'react'
import { liveRequest } from '../../lib/live/client'

export function LiveRecordingStatus({
  room,
  onUpdated,
}: {
  room: LiveRoomView
  onUpdated(): void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const state = room.occurrence?.recording.state ?? 'not_started'
  const labels = {
    not_started: 'A gravação ainda não começou.',
    starting: 'Preparando a gravação…',
    recording: 'Gravando a câmera e a demonstração de quem conduz.',
    paused: 'Fora da gravação · A turma continua ouvindo.',
    processing: 'Preparando o vídeo para revisão.',
    review: 'Gravação em revisão.',
    ready: room.occurrence?.recording.published
      ? 'Gravação disponível para a turma.'
      : 'Gravação aguardando publicação.',
    failed: 'A gravação foi interrompida. A chamada continua.',
    empty: 'Este encontro terminou sem trechos gravados.',
    unavailable: 'O gravador não está respondendo. A chamada continua.',
  }
  async function command(action: 'pause' | 'resume') {
    setBusy(true)
    setError(null)
    try {
      await liveRequest(`/api/admin/live/sessions/${room.session.id}/recording/${action}`, {})
      onUpdated()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar a gravação.')
    } finally {
      setBusy(false)
    }
  }
  // Quem começou o encontro conduz a gravação; antes de começar, a primeira professora da turma.
  const conductor = room.occurrence?.conductorId ?? room.cohort.teacherIds[0]
  const conducting = room.actorId === conductor
  return (
    <div className="space-y-2 rounded-xl border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" role="status">
          <span
            className={`mr-2 inline-block size-2 rounded-full ${state === 'recording' ? 'bg-red-600' : 'bg-muted-foreground'}`}
            aria-hidden
          />
          {labels[state]}
        </p>
        {room.role === 'teacher' && conducting && room.occurrence?.state === 'live' ? (
          state === 'recording' || state === 'starting' ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void command('pause')}
            >
              Pausar gravação
            </Button>
          ) : state === 'paused' ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void command('resume')}
            >
              Voltar à explicação gravada
            </Button>
          ) : null
        ) : null}
      </div>
      {room.role === 'teacher' ? (
        <p className="text-xs text-muted-foreground">
          {conducting
            ? 'Você cuida da gravação deste encontro.'
            : 'A gravação fica com quem começou o encontro.'}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
