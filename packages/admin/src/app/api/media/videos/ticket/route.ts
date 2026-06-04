import { NextResponse } from 'next/server'
import {
  createVideoTicket,
  MAX_VIDEO_BYTES,
  mediaErrorResponse,
  requireMediaSession,
  VIDEO_MIME_TYPES,
} from '@/server/media'

interface TicketBody {
  filename?: unknown
  sizeBytes?: unknown
  mimeType?: unknown
}

/**
 * Cria o ticket de upload TUS no Vimeo. O VÍDEO NÃO passa por aqui — o browser
 * sobe direto pro `uploadLink` (tus-js-client). Guard de sessão obrigatório.
 */
export async function POST(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  try {
    const body = (await req.json().catch(() => null)) as TicketBody | null
    const filename = typeof body?.filename === 'string' ? body.filename.trim() : ''
    const sizeBytes = typeof body?.sizeBytes === 'number' ? body.sizeBytes : 0
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : ''

    if (!filename || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Informe filename e sizeBytes.' } },
        { status: 400 },
      )
    }
    if (!VIDEO_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: { code: 'VALIDATION_ERROR', message: 'Formato inválido. Envie MP4, MOV ou WebM.' },
        },
        { status: 400 },
      )
    }
    if (sizeBytes > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Vídeo excede o limite de 5 GB.' } },
        { status: 400 },
      )
    }

    const ticket = await createVideoTicket({ filename, sizeBytes })
    return NextResponse.json(ticket)
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
