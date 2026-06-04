import { NextResponse } from 'next/server'
import { getVideoStatus, mediaErrorResponse, requireMediaSession } from '@/server/media'

/**
 * Status de processamento do vídeo no Vimeo (reconciliação on-demand, sem
 * webhook): quando `ready`, inclui as `captions` (VTT re-hospedado no R2).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json(await getVideoStatus(id))
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
