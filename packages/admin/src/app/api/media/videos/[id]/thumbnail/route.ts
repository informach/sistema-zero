import { NextResponse } from 'next/server'
import {
  MAX_IMAGE_BYTES,
  mediaErrorResponse,
  rejectOversizedRequest,
  requireMediaSession,
  storeVideoThumbnail,
} from '@/server/media'
import { createVideoFrameThumbnail, getVideoThumbnails, selectVideoThumbnail } from '@/server/vimeo'

const THUMB_MIME_TYPES = new Set(['image/jpeg', 'image/png'])

function invalidInput(message: string) {
  return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message } }, { status: 400 })
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  const page = Number(new URL(req.url).searchParams.get('page') ?? '1')
  if (!/^\d{6,12}$/.test(id) || !Number.isSafeInteger(page) || page < 1 || page > 1000)
    return invalidInput('Vídeo ou página inválidos.')
  try {
    return NextResponse.json(await getVideoThumbnails(id, page), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  if (!/^\d{6,12}$/.test(id)) return invalidInput('ID de vídeo Vimeo inválido.')
  try {
    const body: unknown = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return invalidInput('Escolha uma capa válida.')
    if ('automatic' in body && body.automatic === true) {
      return NextResponse.json({ ok: true, pictureId: await createVideoFrameThumbnail(id) })
    }
    if (
      !('pictureId' in body) ||
      typeof body.pictureId !== 'string' ||
      !/^\d{1,20}$/.test(body.pictureId)
    )
      return invalidInput('Escolha uma capa válida.')
    await selectVideoThumbnail(id, body.pictureId)
    return NextResponse.json({ ok: true, pictureId: body.pictureId })
  } catch (error) {
    if (error instanceof SyntaxError) return invalidInput('Dados da capa inválidos.')
    return mediaErrorResponse(error)
  }
}

/**
 * Capa custom do vídeo: sobe a imagem direto ao Vimeo (pictures API). O player
 * do aluno usa a capa do próprio Vimeo — sem cópia no R2 (autoria v3).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  if (!/^\d{6,12}$/.test(id)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID de vídeo Vimeo inválido.' } },
      { status: 400 },
    )
  }
  // ANTES do formData(): o parse materializa o corpo inteiro em memória.
  const oversized = rejectOversizedRequest(req, MAX_IMAGE_BYTES)
  if (oversized) return oversized

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Envie a imagem no campo "file".' } },
        { status: 400 },
      )
    }
    if (!THUMB_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Formato inválido. Envie JPG ou PNG.' } },
        { status: 400 },
      )
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Imagem excede o limite de 5 MB.' } },
        { status: 400 },
      )
    }
    return NextResponse.json(await storeVideoThumbnail(id, file))
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
