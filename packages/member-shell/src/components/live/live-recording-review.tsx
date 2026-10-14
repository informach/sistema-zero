'use client'
import type {
  LiveOccurrenceState,
  LiveRecordingState,
  LiveRecordingSummary,
  LiveRoomView,
} from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import {
  CircleAlert,
  CircleCheck,
  Clapperboard,
  Clock3,
  Film,
  Hourglass,
  LoaderCircle,
  Radio,
} from 'lucide-react'
import { useId, useState } from 'react'
import { liveDate, liveRequest } from '../../lib/live/client'
import { LiveReplay } from './live-replay'

/**
 * TODO contrato do servidor: a duração da gravação ainda não viaja no resumo. Quando vier
 * (`durationSeconds`), ela aparece sozinha; estados novos (como um "vazio") caem no ramo `empty`.
 */
type RecordingInfo = Omit<LiveRecordingSummary['recording'], 'state'> & {
  state: LiveRecordingState | (string & {})
  durationSeconds?: number | null
}
type RecordingItem = Omit<LiveRecordingSummary, 'recording'> & { recording: RecordingInfo }

export type RecordingStatusKey =
  | 'waiting'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'review'
  | 'published'
  | 'failed'
  | 'empty'

export interface RecordingStatusView {
  key: RecordingStatusKey
  label: string
  description: string
  nextStep: string | null
}

/** O estado da gravação SEMPRE com um próximo passo claro para a professora. */
export function recordingStatusView(
  recording: Pick<RecordingInfo, 'state' | 'published'>,
  occurrenceState?: LiveOccurrenceState,
): RecordingStatusView {
  const finished = occurrenceState === 'ended' || occurrenceState === 'cancelled'
  switch (recording.state) {
    case 'review':
    case 'ready':
      return recording.published
        ? {
            key: 'published',
            label: 'Publicada para a turma',
            description: 'As crianças podem rever a gravação dentro do prazo de cada inscrição.',
            nextStep: 'Se precisar tirar a gravação da turma, use Retirar gravação da turma.',
          }
        : {
            key: 'review',
            label: 'Pronta para revisar',
            description: 'A turma só vê a gravação depois que você publicar.',
            nextStep: 'Assista, confira imagem e áudio, marque a confirmação e publique.',
          }
    case 'processing':
      return {
        key: 'processing',
        label: 'Preparando a gravação',
        description: 'O vídeo do encontro está sendo preparado. Isso costuma levar alguns minutos.',
        nextStep: 'Esta página atualiza sozinha. Volte daqui a pouco para revisar.',
      }
    case 'starting':
    case 'recording':
      return {
        key: 'recording',
        label: 'Gravando',
        description: 'A sua tela e a sua voz estão sendo gravadas.',
        nextStep: 'Ao encerrar o encontro, a gravação vai para a sua revisão.',
      }
    case 'paused':
      return {
        key: 'paused',
        label: 'Gravação pausada',
        description: 'Nada é gravado enquanto a gravação está pausada.',
        nextStep: 'Ela continua quando você retomar.',
      }
    case 'failed':
      return {
        key: 'failed',
        label: 'A gravação não ficou disponível',
        description: 'Algo falhou ao gravar ou preparar o vídeo deste encontro.',
        nextStep:
          'As crianças continuam com o passo a passo e o projeto. Se precisar, agende uma reposição e avise a equipe técnica.',
      }
    case 'not_started':
      return finished
        ? {
            key: 'empty',
            label: 'Sem gravação',
            description: 'Nada foi gravado neste encontro.',
            nextStep:
              occurrenceState === 'cancelled'
                ? 'O encontro foi cancelado. Agende uma reposição para a turma.'
                : 'Se o encontro não aconteceu como planejado, agende uma reposição.',
          }
        : {
            key: 'waiting',
            label: 'A gravação ainda não começou',
            description: 'Ela começa quando você iniciar o encontro.',
            nextStep: null,
          }
    default:
      return {
        key: 'empty',
        label: 'Sem gravação',
        description: 'Nada foi gravado neste encontro.',
        nextStep: 'Se o encontro não aconteceu como planejado, agende uma reposição.',
      }
  }
}

/** "52 min", "1 h 05 min". Sem duração conhecida, nada. */
export function recordingDuration(seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`
}

const STATUS_ICON = {
  waiting: Clock3,
  recording: Radio,
  paused: Hourglass,
  processing: LoaderCircle,
  review: Clapperboard,
  published: CircleCheck,
  failed: CircleAlert,
  empty: Film,
} as const

/** A gravação do encontro atual vem também da própria ocorrência, para nunca sumir da vista. */
export function recordingItems(room: LiveRoomView): RecordingItem[] {
  const items: RecordingItem[] = [...(room.recordings ?? [])]
  const current = room.occurrence
  if (current && !items.some((item) => item.occurrenceId === current.id))
    items.unshift({
      occurrenceId: current.id,
      startsAt: current.startsAt,
      recording: {
        state: current.recording.state,
        published: current.recording.published,
        version: current.recording.version,
      },
    })
  return items
}

export function LiveRecordingReview({
  room,
  onUpdated,
}: {
  room: LiveRoomView
  onUpdated(): void
}) {
  const [selected, setSelected] = useState('')
  const headingId = useId()
  const selectId = useId()
  const recordings = recordingItems(room)
  const current = recordings.find((item) => item.occurrenceId === selected) ?? recordings[0]
  // Encontros anteriores da mesma sessão já terminaram (foram substituídos por uma reposição).
  const stateOf = (occurrenceId: string): LiveOccurrenceState =>
    room.occurrence && occurrenceId === room.occurrence.id ? room.occurrence.state : 'ended'
  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-xl border bg-card p-4">
      <h2 id={headingId} className="text-lg font-semibold">
        Gravação do encontro
      </h2>
      {!current ? (
        <p className="text-sm text-muted-foreground">
          A gravação aparece aqui quando o encontro começar.
        </p>
      ) : (
        <>
          {recordings.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <label htmlFor={selectId}>Qual encontro</label>
              <select
                id={selectId}
                className="min-h-11 rounded-lg border bg-background px-3"
                value={current.occurrenceId}
                onChange={(event) => setSelected(event.target.value)}
              >
                {recordings.map((item) => (
                  <option key={item.occurrenceId} value={item.occurrenceId}>
                    {liveDate(item.startsAt, room.cohort.timeZone)} ·{' '}
                    {recordingStatusView(item.recording, stateOf(item.occurrenceId)).label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <RecordingReview
            key={`${current.occurrenceId}:${current.recording.version}`}
            sessionId={room.session.id}
            item={current}
            occurrenceState={stateOf(current.occurrenceId)}
            onUpdated={onUpdated}
          />
        </>
      )}
    </section>
  )
}

function RecordingReview({
  sessionId,
  item,
  occurrenceState,
  onUpdated,
}: {
  sessionId: string
  item: RecordingItem
  occurrenceState: LiveOccurrenceState
  onUpdated(): void
}) {
  const [reviewedVersion, setReviewedVersion] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recording = item.recording
  const view = recordingStatusView(recording, occurrenceState)
  const Icon = STATUS_ICON[view.key]
  const duration = recordingDuration(recording.durationSeconds)
  const reviewable = view.key === 'review' || view.key === 'published'
  async function publish() {
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
    <div className="space-y-3" data-recording-state={view.key}>
      <p className="flex flex-wrap items-center gap-2">
        <span
          role="status"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold"
        >
          <Icon className="size-4" aria-hidden />
          {view.label}
        </span>
        {duration ? (
          <span className="text-sm text-muted-foreground">Duração: {duration}</span>
        ) : null}
      </p>
      <p className="text-sm">{view.description}</p>
      {view.nextStep ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Próximo passo:</span> {view.nextStep}
        </p>
      ) : null}
      {reviewable ? (
        <>
          <LiveReplay
            key={recording.version}
            sessionId={sessionId}
            occurrenceId={item.occurrenceId}
            teacherPreview
          />
          {!recording.published ? (
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                className="mt-1 size-4"
                type="checkbox"
                checked={reviewedVersion === recording.version}
                onChange={(event) =>
                  setReviewedVersion(event.target.checked ? recording.version : null)
                }
              />
              Conferi imagem e áudio. A gravação não expõe crianças, conversas ou informações
              pessoais.
            </label>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            className="min-h-11 px-4"
            variant={recording.published ? 'outline' : 'default'}
            disabled={busy || (!recording.published && reviewedVersion !== recording.version)}
            onClick={() => void publish()}
          >
            {busy
              ? 'Salvando…'
              : recording.published
                ? 'Retirar gravação da turma'
                : 'Publicar gravação para a turma'}
          </Button>
        </>
      ) : null}
    </div>
  )
}
