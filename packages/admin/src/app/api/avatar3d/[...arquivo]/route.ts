import { AVATAR_CATALOG, avatarBucketKey, isAvatarFile } from '@sistemazero/core/avatar'
import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { requireLocalAdminSession } from '@/server/local-admin-session'
import { r2PresignGetIn } from '@/server/r2'

/** Mesmo catálogo privado da plataforma; o ensaio não muda o avatar de nenhuma conta. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ arquivo: string[] }> },
) {
  const session = await requireLocalAdminSession('Somente administradores podem testar cenários.', {
    signal: request.signal,
  })
  if (session instanceof NextResponse) return session
  const arquivo = (await params).arquivo.join('/')
  if (!isAvatarFile(AVATAR_CATALOG, arquivo)) return new Response('Não encontrado', { status: 404 })
  const bucket = getEnv().R2_PRIVATE_BUCKET
  if (!bucket) return new Response('Acervo privado indisponível', { status: 503 })
  return NextResponse.redirect(await r2PresignGetIn(bucket, avatarBucketKey(arquivo), 3600), 302)
}
