'use client'
import type {
  LiveOccurrenceState,
  LiveRecordingState,
  LiveRecordingSummary,
  LiveRecordingVimeo,
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
import { useEffect, useId, useRef, useState } from 'react'
import { liveDate, liveRequest } from '../../lib/live/client'
import { sessionFetch } from '../../lib/session-fetch'
import { LiveReplay } from './live-replay'

/** Um estado que este app ainda não conhece (servidor mais novo) cai no ramo `empty`. */
type RecordingInfo = Omit<LiveRecordingSummary['recording'], 'state'> & {
  state: LiveRecordingState | (string & {})
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
  | 'unavailable'
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
    case 'unavailable':
      return {
        key: 'unavailable',
        label: 'Gravador sem resposta',
        description:
          'O gravador parou de confirmar o que está gravando. Este trecho pode ficar fora da gravação.',
        nextStep:
          'Continue o encontro normalmente. Se a gravação não voltar, avise a equipe técnica ao terminar.',
      }
    case 'empty':
      return {
        key: 'empty',
        label: 'Sem gravação',
        description: 'O encontro terminou sem nenhum trecho gravado.',
        nextStep: 'Se o encontro não aconteceu como planejado, agende uma reposição.',
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

const STATUS_ICON = {
  waiting: Clock3,
  recording: Radio,
  paused: Hourglass,
  processing: LoaderCircle,
  review: Clapperboard,
  published: CircleCheck,
  failed: CircleAlert,
  unavailable: CircleAlert,
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
        ...(current.recording.vimeo ? { vimeo: current.recording.vimeo } : {}),
      },
    })
  return items
}

export type VimeoStepKey = 'not-sent' | 'sending' | 'processing' | 'ready' | 'failed'

export interface VimeoStepView {
  key: VimeoStepKey
  label: string
  description: string
  /** O botão que leva adiante, quando há o que fazer. */
  action: string | null
}

/**
 * O envio da gravação PUBLICADA ao Vimeo (14/10/2026): o Admin cria o vídeo, o Vimeo baixa e
 * prepara, e a turma passa a assistir pelo player do Vimeo. Cada estado diz o próximo passo.
 */
export function vimeoStepView(
  vimeo: LiveRecordingVimeo | null | undefined,
  sending: boolean,
): VimeoStepView {
  if (sending)
    return {
      key: 'sending',
      label: 'Enviando ao Vimeo',
      description: 'O Vimeo está recebendo o endereço da gravação.',
      action: null,
    }
  if (!vimeo)
    return {
      key: 'not-sent',
      label: 'Ainda não foi para o Vimeo',
      description:
        'A turma já pode rever a gravação daqui. Envie ao Vimeo para ela tocar no player de sempre.',
      action: 'Enviar ao Vimeo',
    }
  if (vimeo.status === 'ready')
    return {
      key: 'ready',
      label: 'Pronta no Vimeo',
      description: 'A turma assiste pelo player do Vimeo, com a mesma proteção dos outros vídeos.',
      action: null,
    }
  if (vimeo.status === 'failed')
    return {
      key: 'failed',
      label: 'O Vimeo não conseguiu preparar o vídeo',
      description: 'A turma continua revendo a gravação daqui. Tente enviar de novo.',
      action: 'Enviar ao Vimeo de novo',
    }
  return {
    key: 'processing',
    label: 'Preparando no Vimeo',
    description:
      'O Vimeo está baixando e preparando o vídeo. Gravações longas levam alguns minutos. Esta tela atualiza sozinha.',
    action: null,
  }
}

/** Intervalo entre as consultas ao Vimeo: rápido no começo, mais espaçado depois. */
export function vimeoPollDelay(attempt: number): number {
  return attempt < 24 ? 5_000 : 15_000
}
/** Depois disso a tela para de perguntar sozinha e oferece "Conferir agora". */
export const VIMEO_POLL_LIMIT_MS = 45 * 60_000

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
  // Remonta o passo do Vimeo depois do envio que a publicação dispara (o resultado fica no memo).
  const [vimeoRound, setVimeoRound] = useState(0)
  const recording = item.recording
  const view = recordingStatusView(recording, occurrenceState)
  const Icon = STATUS_ICON[view.key]
  const reviewable = view.key === 'review' || view.key === 'published'
  async function publish() {
    setBusy(true)
    setError(null)
    const publishing = !recording.published
    try {
      await liveRequest(`/api/admin/live/sessions/${sessionId}/recording/publish`, {
        occurrenceId: item.occurrenceId,
        expectedVersion: recording.version,
        published: publishing,
      })
      setReviewedVersion(null)
      // Publicou a gravação revisada: ela segue para o Vimeo, como os vídeos dos cursos. Uma
      // falha aqui não desfaz a publicação; o passo do Vimeo mostra o recado e o "de novo".
      const known = currentVimeo(recording.vimeo, item.occurrenceId)
      if (publishing && (!known || known.status === 'failed')) {
        await startVimeoUpload(item.occurrenceId)
        setVimeoRound((value) => value + 1)
      }
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
      {recording.published || recording.vimeo ? (
        <VimeoStep
          key={vimeoRound}
          occurrenceId={item.occurrenceId}
          vimeo={recording.vimeo ?? null}
          canSend={recording.published}
          onUpdated={onUpdated}
        />
      ) : null}
    </div>
  )
}

interface VimeoMemo {
  vimeo?: LiveRecordingVimeo
  error?: string
}

/**
 * O último envio de cada encontro NESTA página. A sala recarrega a gravação depois de publicar
 * (o componente remonta), e sem o memo um envio ainda sem eco no servidor sumiria da tela e o
 * botão ofereceria um segundo vídeo no Vimeo.
 */
const VIMEO_MEMO = new Map<string, VimeoMemo>()
const vimeoMemo = (occurrenceId: string): VimeoMemo => VIMEO_MEMO.get(occurrenceId) ?? {}

/**
 * O vídeo que vale para a tela: o do servidor, a não ser que ele ainda não tenha ecoado o envio
 * desta página (nenhum vídeo, ou o vídeo que FALHOU e já foi reenviado com outro id).
 */
export function pickRecordingVimeo(
  fromServer: LiveRecordingVimeo | null | undefined,
  local: LiveRecordingVimeo | null | undefined,
): LiveRecordingVimeo | null {
  if (!local) return fromServer ?? null
  if (!fromServer) return local
  return fromServer.status === 'failed' && fromServer.videoId !== local.videoId ? local : fromServer
}
const currentVimeo = (fromServer: LiveRecordingVimeo | null | undefined, occurrenceId: string) =>
  pickRecordingVimeo(fromServer, vimeoMemo(occurrenceId).vimeo)

const vimeoPath = (occurrenceId: string) =>
  `/api/admin/live/occurrences/${occurrenceId}/recording/vimeo`

/** O Admin fala com o members, o R2 e o Vimeo nesta chamada: o prazo é maior que o das salas. */
async function vimeoRequest(path: string, method: 'GET' | 'POST'): Promise<LiveRecordingVimeo> {
  let response: Response
  try {
    response = await sessionFetch(path, {
      method,
      cache: 'no-store',
      signal: AbortSignal.timeout(method === 'POST' ? 60_000 : 30_000),
    })
  } catch {
    throw new Error('O Vimeo demorou para responder. Confira de novo daqui a pouco.')
  }
  const value = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(value?.error?.message ?? 'Não foi possível falar com o Vimeo agora.')
  return value as LiveRecordingVimeo
}

async function startVimeoUpload(occurrenceId: string): Promise<VimeoMemo> {
  let memo: VimeoMemo
  try {
    memo = { vimeo: await vimeoRequest(vimeoPath(occurrenceId), 'POST') }
  } catch (cause) {
    memo = {
      ...vimeoMemo(occurrenceId),
      error: cause instanceof Error ? cause.message : 'Não foi possível enviar ao Vimeo.',
    }
  }
  VIMEO_MEMO.set(occurrenceId, memo)
  return memo
}

const VIMEO_ICON = {
  'not-sent': Film,
  sending: LoaderCircle,
  processing: LoaderCircle,
  ready: CircleCheck,
  failed: CircleAlert,
} as const

/**
 * O passo do Vimeo da gravação publicada: enviar, acompanhar o processamento (a mesma
 * reconciliação dos vídeos das aulas: sem webhook, a tela pergunta) e oferecer o "de novo".
 */
function VimeoStep({
  occurrenceId,
  vimeo: fromServer,
  canSend,
  onUpdated,
}: {
  occurrenceId: string
  vimeo: LiveRecordingVimeo | null
  canSend: boolean
  onUpdated(): void
}) {
  const [vimeo, setVimeo] = useState<LiveRecordingVimeo | null>(() =>
    currentVimeo(fromServer, occurrenceId),
  )
  const [error, setError] = useState<string | null>(() => vimeoMemo(occurrenceId).error ?? null)
  const [sending, setSending] = useState(false)
  const [pollRound, setPollRound] = useState(0)
  const [pollStopped, setPollStopped] = useState(false)
  const updatedRef = useRef(onUpdated)
  updatedRef.current = onUpdated
  const view = vimeoStepView(vimeo, sending)
  const Icon = VIMEO_ICON[view.key]

  const videoId = vimeo?.status === 'processing' ? vimeo.videoId : null
  // biome-ignore lint/correctness/useExhaustiveDependencies: "Conferir agora" recomeça a consulta.
  useEffect(() => {
    if (!videoId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()
    const poll = async (attempt: number) => {
      if (cancelled) return
      if (Date.now() - startedAt > VIMEO_POLL_LIMIT_MS) {
        setPollStopped(true)
        return
      }
      try {
        const next = await vimeoRequest(
          `${vimeoPath(occurrenceId)}?videoId=${encodeURIComponent(videoId)}`,
          'GET',
        )
        if (cancelled) return
        setVimeo(next)
        setError(null)
        VIMEO_MEMO.set(occurrenceId, { vimeo: next })
        if (next.status !== 'processing') {
          updatedRef.current()
          return
        }
      } catch (cause) {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Não foi possível conferir o Vimeo.')
      }
      timer = setTimeout(() => void poll(attempt + 1), vimeoPollDelay(attempt))
    }
    setPollStopped(false)
    timer = setTimeout(() => void poll(0), vimeoPollDelay(0))
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [occurrenceId, videoId, pollRound])

  async function send() {
    setSending(true)
    setError(null)
    const memo = await startVimeoUpload(occurrenceId)
    setVimeo(memo.vimeo ?? null)
    setError(memo.error ?? null)
    setSending(false)
    if (memo.vimeo) updatedRef.current()
  }

  return (
    <div className="space-y-2 rounded-lg border p-3" data-vimeo-step={view.key}>
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold" role="status">
        <Icon className="size-4" aria-hidden />
        {view.label}
      </p>
      <p className="text-sm text-muted-foreground">{view.description}</p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {pollStopped && vimeo?.status === 'processing' ? (
        <Button
          variant="outline"
          className="min-h-11 px-4"
          onClick={() => setPollRound((value) => value + 1)}
        >
          Conferir agora
        </Button>
      ) : null}
      {canSend && view.action ? (
        <Button
          variant="outline"
          className="min-h-11 px-4"
          disabled={sending}
          onClick={() => void send()}
        >
          {view.action}
        </Button>
      ) : null}
    </div>
  )
}
