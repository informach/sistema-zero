import 'server-only'
import { AVATAR_CATALOG, avatarBucketKey, isAvatarFile } from '@sistemazero/core/avatar'
import { NextResponse } from 'next/server'
import { r2PresignGetPrivate } from '../server/r2'
import type { SessionModule } from '../server/session'

/** Quanto vale o link assinado. */
const LINK_SECONDS = 60 * 60
/** Quanto o navegador guarda o redirecionamento: menos que o link, para nunca reusar um vencido. */
const REDIRECT_CACHE_SECONDS = 50 * 60

/**
 * Entrega os arquivos do avatar (esqueleto, peças, texturas e miniaturas).
 *
 * Eles moram no bucket PRIVADO do R2 (o pack é pago e a licença não deixa as peças soltas num
 * endereço público). Só quem tem sessão recebe um arquivo, e só arquivo que o catálogo cita
 * (`isAvatarFile`): a rota não serve para ler outra coisa do bucket. O navegador baixa direto do
 * R2 por um link assinado que vence; o servidor só assina.
 *
 * O redirecionamento fica guardado no navegador por 50 minutos, então a mesma peça usa o mesmo
 * link e o cache de imagem e de modelo do navegador funciona.
 */
export function createAvatarFileRoutes(session: SessionModule) {
  return {
    GET: async (_req: Request, ctx: { params: Promise<{ arquivo: string[] }> }) => {
      const user = await session.getSession()
      if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
      const { arquivo } = await ctx.params
      const file = arquivo.join('/')
      if (!isAvatarFile(AVATAR_CATALOG, file))
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      const url = await r2PresignGetPrivate(avatarBucketKey(file), {
        expiresInSeconds: LINK_SECONDS,
      })
      const res = NextResponse.redirect(url, 302)
      res.headers.set('cache-control', `private, max-age=${REDIRECT_CACHE_SECONDS}`)
      return res
    },
  }
}
