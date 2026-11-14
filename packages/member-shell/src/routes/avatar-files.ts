import 'server-only'
import { AVATAR_CATALOG, avatarBucketKey, isAvatarFile } from '@sistemazero/core/avatar'
import { NextResponse } from 'next/server'
import { avatarLinkWindow } from '../lib/avatar-link-window'
import { r2PresignGetPrivate } from '../server/r2'
import type { SessionModule } from '../server/session'

/**
 * Entrega os arquivos do avatar (esqueleto, peças, texturas e miniaturas).
 *
 * Eles moram no bucket PRIVADO do R2 (o pack é pago e a licença não deixa as peças soltas num
 * endereço público). Só quem tem sessão recebe um arquivo, e só arquivo que o catálogo cita
 * (`isAvatarFile`): a rota não serve para ler outra coisa do bucket. O navegador baixa direto do
 * R2 por um link assinado que vence; o servidor só assina.
 *
 * O link é o MESMO para todo pedido da mesma janela de 6 horas (`avatarLinkWindow`), e o R2
 * devolve o arquivo com cache longo: as centenas de miniaturas da tela "Meu avatar" e as peças 3D
 * saem do cache do navegador ao reabrir a tela, em vez de baixar tudo de novo a cada link novo.
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
      const janela = avatarLinkWindow(Date.now())
      const url = await r2PresignGetPrivate(avatarBucketKey(file), {
        expiresInSeconds: janela.expiresInSeconds,
        signingDate: janela.signingDate,
        responseCacheControl: janela.fileCacheControl,
      })
      const res = NextResponse.redirect(url, 302)
      res.headers.set('cache-control', `private, max-age=${janela.redirectMaxAgeSeconds}`)
      return res
    },
  }
}
