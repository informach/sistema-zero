import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { normalizeWebAnimation } from '@sistemazero/edisvg/data'
import { NextResponse } from 'next/server'
import { MAX_ANIMATION_BYTES } from '@/lib/animation-file'
import { mediaErrorResponse, requireMediaSession } from '@/server/media'
import { isModuleAnimationPreview } from '@/server/module-animation'

export async function GET(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session
  try {
    const src = new URL(req.url).searchParams.get('src') ?? ''
    if (!isModuleAnimationPreview(src))
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Animação fora do acervo do painel.' } },
        { status: 400 },
      )
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(15_000)])
    const response = await fetch(src, { redirect: 'error', signal, cache: 'no-store' })
    if (!response.ok)
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Animação não encontrada.' } },
        { status: 404 },
      )
    const data = normalizeWebAnimation(
      await readJsonBodyWithLimit(response, MAX_ANIMATION_BYTES, signal),
    )
    return new NextResponse(data, {
      headers: {
        'content-type': 'application/json',
        'x-content-type-options': 'nosniff',
        'cache-control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
