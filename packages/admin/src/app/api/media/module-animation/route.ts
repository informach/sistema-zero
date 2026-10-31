import { NextResponse } from 'next/server'
import { InvalidAnimationFileError, MAX_ANIMATION_BYTES } from '@/lib/animation-file'
import { mediaErrorResponse, rejectOversizedRequest, requireMediaSession } from '@/server/media'
import { storeModuleAnimation } from '@/server/module-animation'

const invalid = (message: string) =>
  NextResponse.json({ error: { code: 'VALIDATION_ERROR', message } }, { status: 400 })

export async function POST(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session
  const oversized = rejectOversizedRequest(req, MAX_ANIMATION_BYTES)
  if (oversized) return oversized
  try {
    const file = (await req.formData()).get('file')
    if (!(file instanceof File)) return invalid('Envie a animação no campo file.')
    if (!file.name.toLowerCase().endsWith('.edi-animation.json'))
      return invalid('Escolha um arquivo .edi-animation.json exportado do ediSVG.')
    if (!file.size || file.size > MAX_ANIMATION_BYTES)
      return invalid('A animação deve ter até 10 MB.')
    return NextResponse.json(await storeModuleAnimation(new Uint8Array(await file.arrayBuffer())))
  } catch (error) {
    if (error instanceof InvalidAnimationFileError) return invalid(error.message)
    return mediaErrorResponse(error)
  }
}
