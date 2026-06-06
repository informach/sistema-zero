import { NextResponse } from 'next/server'
import { updateMe } from '@/server/auth'
import {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  mediaErrorResponse,
  optimizeAndStoreAvatar,
  rejectOversizedRequest,
  removeStaleAvatars,
  requireUploadSession,
} from '@/server/media'

export const runtime = 'nodejs'

/**
 * Troca a foto de perfil: multipart (`file`) → sharp→WebP → R2 → PATCH /auth/me
 * (via gateway) com a URL pública. O R2 é provedor externo (mesma exceção
 * consciente do admin) — o guard de sessão (ESTRITO) é feito aqui.
 */
export async function POST(req: Request) {
  const session = await requireUploadSession(req)
  if (session instanceof NextResponse) return session

  // ANTES do formData(): o parse materializa o corpo inteiro em memória.
  const oversized = rejectOversizedRequest(req, MAX_IMAGE_BYTES)
  if (oversized) return oversized

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Envie um arquivo de imagem.' } },
        { status: 400 },
      )
    }
    if (!IMAGE_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Formato inválido. Use PNG, JPG ou WebP.' } },
        { status: 400 },
      )
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'A foto deve ter no máximo 5MB.' } },
        { status: 400 },
      )
    }

    const stored = await optimizeAndStoreAvatar(file, session.id)
    const { status, body } = await updateMe({ avatarUrl: stored.url })
    if (status !== 200) {
      return NextResponse.json(body ?? { error: { code: 'UPDATE_FAILED' } }, { status })
    }
    // Avatar trocado com sucesso → apaga os anteriores (best-effort; sem isso
    // cada troca deixaria um objeto órfão no R2 para sempre).
    await removeStaleAvatars(session.id, stored.key)
    return NextResponse.json({ url: stored.url, user: body?.user })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
