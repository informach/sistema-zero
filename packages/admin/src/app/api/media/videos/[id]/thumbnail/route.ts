import { NextResponse } from 'next/server'
import {
  MAX_IMAGE_BYTES,
  mediaErrorResponse,
  requireMediaSession,
  storeVideoThumbnail,
} from '@/server/media'

const THUMB_MIME_TYPES = new Set(['image/jpeg', 'image/png'])

/**
 * Capa custom do vídeo: sobe a imagem ao Vimeo (pictures) e devolve um
 * `posterUrl` estável no R2 p/ o campo poster do bloco.
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
