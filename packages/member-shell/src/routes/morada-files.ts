import 'server-only'
import { isMoradaFile, moradaBucketKey } from '@sistemazero/core/morada'
import { NextResponse } from 'next/server'
import { avatarLinkWindow } from '../lib/avatar-link-window'
import { r2PresignGetPrivate } from '../server/r2'
import type { SessionModule } from '../server/session'

/** Arte privada: sessão e allowlist do catálogo antes de assinar qualquer chave. */
export function createMoradaFileRoutes(session: SessionModule) {
  return {
    GET: async (_request: Request, context: { params: Promise<{ arquivo: string[] }> }) => {
      const user = await session.getSession()
      if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
      const { arquivo } = await context.params
      const file = arquivo.join('/')
      if (!isMoradaFile(file))
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      const window = avatarLinkWindow(Date.now())
      const url = await r2PresignGetPrivate(moradaBucketKey(file), {
        expiresInSeconds: window.expiresInSeconds,
        signingDate: window.signingDate,
        responseCacheControl: window.fileCacheControl,
      })
      const response = NextResponse.redirect(url, 302)
      response.headers.set('cache-control', `private, max-age=${window.redirectMaxAgeSeconds}`)
      return response
    },
  }
}
