import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { isVimeoVideoId } from '@/lib/live-recording-vimeo'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'
import {
  createRecordingVimeoService,
  type RecordingVimeoOutcome,
} from '@/server/live-recording-vimeo'
import { requireLocalAdminSession } from '@/server/local-admin-session'
import { finishVimeoVideoSetup, mediaErrorResponse } from '@/server/media'
import { r2HeadObjectIn, r2PresignGetIn } from '@/server/r2'
import { createPullUpload, deleteVideo, getVideo } from '@/server/vimeo'

/**
 * A gravação revisada de um encontro vai ao Vimeo (POST cria por `pull`; GET acompanha o
 * processamento). Fala com R2 e Vimeo DIRETO, como as rotas de mídia: por isso a sessão é a
 * ESTRITA (token verificado, uma renovação, mesma origem), aqui com a equipe toda (a professora
 * pode ser `staff`). Quem decide se ESTA pessoa pode mexer NESTA gravação é o members, nas duas
 * chamadas que esta rota faz a ele (`recording/source` e `recording/vimeo`).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function service() {
  return createRecordingVimeoService({
    gatewayFetch,
    headObject: r2HeadObjectIn,
    presignGet: r2PresignGetIn,
    createPullUpload,
    finishSetup: finishVimeoVideoSetup,
    getVideo,
    deleteVideo,
    buckets: () => {
      const env = getEnv()
      return { privateBucket: env.R2_PRIVATE_BUCKET, recordingBucket: env.LIVE_RECORDING_BUCKET }
    },
  })
}

function respond(outcome: RecordingVimeoOutcome): NextResponse {
  if (outcome.kind === 'ok')
    return NextResponse.json(outcome.vimeo, { headers: { 'Cache-Control': 'private, no-store' } })
  if (outcome.kind === 'upstream') return forwardUpstream(outcome.response)
  return NextResponse.json(
    { error: { code: outcome.code, message: outcome.message } },
    { status: outcome.status },
  )
}

async function guard(params: Promise<{ id: string }>) {
  const session = await requireLocalAdminSession('Sem permissão para publicar a gravação.', {
    allowStaff: true,
  })
  if (session instanceof NextResponse) return session
  const { id } = await params
  if (!UUID.test(id))
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Encontro não encontrado.' } },
      { status: 404 },
    )
  return id
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = await guard(params)
  if (id instanceof NextResponse) return id
  try {
    return respond(await service().start(id))
  } catch (error) {
    return mediaErrorResponse(error)
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = await guard(params)
  if (id instanceof NextResponse) return id
  const videoId = new URL(request.url).searchParams.get('videoId')
  if (!isVimeoVideoId(videoId))
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Informe o vídeo do Vimeo da gravação.' } },
      { status: 400 },
    )
  try {
    return respond(await service().refresh(id, videoId))
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
