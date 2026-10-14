'use client'
import type { LiveRecordingSummary, LiveRoomView } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { useState } from 'react'
import { liveDate, liveRequest } from '../../lib/live/client'
import { LiveReplay } from './live-replay'

export function LiveRecordingReview({
  room,
  onUpdated,
}: {
  room: LiveRoomView
  onUpdated(): void
}) {
  const [selected, setSelected] = useState('')
  const recordings = room.recordings ?? []
  const current = recordings.find((item) => item.occurrenceId === selected) ?? recordings[0]
  if (!current) return null
  return (
    <section className="space-y-3">
      <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        Gravação do encontro
        <select
          className="min-h-11 rounded-xl border bg-background px-3"
          value={current.occurrenceId}
          onChange={(event) => setSelected(event.target.value)}
        >
          {recordings.map((item) => (
            <option key={item.occurrenceId} value={item.occurrenceId}>
              {liveDate(item.startsAt, room.cohort.timeZone)} ·{' '}
              {item.recording.published ? 'Publicada' : 'Para revisar'}
            </option>
          ))}
        </select>
      </label>
      <RecordingReview
        key={`${current.occurrenceId}:${current.recording.version}`}
        sessionId={room.session.id}
        item={current}
        onUpdated={onUpdated}
      />
    </section>
  )
}

function RecordingReview({
  sessionId,
  item,
  onUpdated,
}: {
  sessionId: string
  item: LiveRecordingSummary
  onUpdated(): void
}) {
  const [reviewedVersion, setReviewedVersion] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recording = item.recording
  if (!recording || !['review', 'ready'].includes(recording.state)) return null
  async function publish() {
    if (!recording) return
    setBusy(true)
    setError(null)
    try {
      await liveRequest(`/api/admin/live/sessions/${sessionId}/recording/publish`, {
        occurrenceId: item.occurrenceId,
        expectedVersion: recording.version,
        published: !recording.published,
      })
      setReviewedVersion(null)
      onUpdated()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a publicação.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-bold">Revisão da gravação</h2>
      <LiveReplay
        key={recording.version}
        sessionId={sessionId}
        occurrenceId={item.occurrenceId}
        teacherPreview
      />
      {recording.published ? (
        <p className="text-sm">Disponível para a turma, dentro do prazo de cada inscrição.</p>
      ) : (
        <label className="flex items-start gap-3 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={reviewedVersion === recording.version}
            onChange={(event) =>
              setReviewedVersion(event.target.checked ? recording.version : null)
            }
          />
          Conferi imagem e áudio. A gravação não expõe crianças, conversas ou informações pessoais.
        </label>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        disabled={busy || (!recording.published && reviewedVersion !== recording.version)}
        onClick={() => void publish()}
      >
        {busy
          ? 'Salvando…'
          : recording.published
            ? 'Retirar gravação da turma'
            : 'Publicar gravação para a turma'}
      </Button>
    </section>
  )
}
