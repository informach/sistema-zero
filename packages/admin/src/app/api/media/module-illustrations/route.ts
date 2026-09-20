import { NextResponse } from 'next/server'
import { InvalidModuleIllustrationSvgError } from '@/lib/module-illustration-svg'
import {
  MAX_MODULE_ILLUSTRATION_BYTES,
  mediaErrorResponse,
  rejectOversizedRequest,
  requireMediaSession,
  storeModuleIllustration,
} from '@/server/media'

/** Upload de SVG animado para o R2 público, usado na trilha infantil. */
export async function POST(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  const oversized = rejectOversizedRequest(req, MAX_MODULE_ILLUSTRATION_BYTES)
  if (oversized) return oversized

  try {
    const file = (await req.formData()).get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Envie o SVG no campo "file".' } },
        { status: 400 },
      )
    }
    if ((file.type && file.type !== 'image/svg+xml') || !file.name.toLowerCase().endsWith('.svg')) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Formato inválido. Envie um arquivo SVG.' } },
        { status: 400 },
      )
    }
    if (file.size === 0 || file.size > MAX_MODULE_ILLUSTRATION_BYTES) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'SVG vazio ou maior que 2 MB.' } },
        { status: 400 },
      )
    }
    return NextResponse.json(await storeModuleIllustration(file))
  } catch (error) {
    if (error instanceof InvalidModuleIllustrationSvgError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 },
      )
    }
    return mediaErrorResponse(error)
  }
}
