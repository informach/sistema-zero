import 'server-only'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { SessionUser } from '@/lib/types'
import { optimizeImage } from './image-optimizer'
import { MediaNotConfiguredError, r2PutObject } from './r2'
import { getSession } from './session'

// ── Limites/validações (mesma régua do projeto de referência: 5MB png/jpg/webp) ─

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB
export const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

// ── Guard de sessão ─────────────────────────────────────────────────────────

/**
 * `/api/me/avatar` NÃO passa pelo gateway (fala com o R2 direto — provedor
 * externo, mesma exceção consciente do admin) → guard de sessão OBRIGATÓRIO.
 * Qualquer conta ATIVA pode trocar a própria foto (≠ admin, que exige role).
 */
export async function requireUploadSession(): Promise<SessionUser | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sessão expirada — faça login novamente.' } },
      { status: 401 },
    )
  }
  if (session.status !== 'active') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Conta sem acesso (status).' } },
      { status: 403 },
    )
  }
  return session
}

/** Erro → resposta `{ error: { code, message } }` (503 quando falta config). */
export function mediaErrorResponse(error: unknown): NextResponse {
  if (error instanceof MediaNotConfiguredError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 503 },
    )
  }
  console.error('[media] operação falhou', error)
  const message = error instanceof Error ? error.message : 'Falha na operação de mídia.'
  return NextResponse.json({ error: { code: 'MEDIA_ERROR', message } }, { status: 500 })
}

// ── Avatar (R2 + sharp→WebP) ────────────────────────────────────────────────

export interface StoredAvatar {
  url: string
  sizeBytes: number
}

/** Otimiza (WebP 512×512) e armazena no R2 sob `community/avatars/<userId>/<uuid>.webp`. */
export async function optimizeAndStoreAvatar(file: File, userId: string): Promise<StoredAvatar> {
  const optimized = await optimizeImage(await file.arrayBuffer(), 'avatar')
  const { url } = await r2PutObject({
    key: `community/avatars/${userId}/${randomUUID()}.${optimized.extension}`,
    body: optimized.buffer,
    contentType: optimized.contentType,
  })
  return { url, sizeBytes: optimized.sizeBytes }
}
