import { describe, expect, it } from 'bun:test'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { AVATAR_LINK_WINDOW_SECONDS, avatarLinkWindow } from '../src/lib/avatar-link-window'

const JANELA_MS = AVATAR_LINK_WINDOW_SECONDS * 1000
const inicio = Date.UTC(2026, 10, 14, 6, 0, 0) // múltiplo de 6 h

describe('janela dos links do avatar', () => {
  it('todo pedido da mesma janela assina com a hora do começo dela', () => {
    const a = avatarLinkWindow(inicio + 1000)
    const b = avatarLinkWindow(inicio + JANELA_MS - 1000)
    expect(a.signingDate.getTime()).toBe(inicio)
    expect(b.signingDate.getTime()).toBe(inicio)
    expect(avatarLinkWindow(inicio + JANELA_MS).signingDate.getTime()).toBe(inicio + JANELA_MS)
  })

  it('o redirecionamento nunca fica guardado além do prazo do link', () => {
    for (const passou of [0, 1000, JANELA_MS / 2, JANELA_MS - 30_000, JANELA_MS - 1]) {
      const agora = inicio + passou
      const j = avatarLinkWindow(agora)
      const linkVenceEm = j.signingDate.getTime() + j.expiresInSeconds * 1000
      const redirecionamentoAte = agora + j.redirectMaxAgeSeconds * 1000
      expect(redirecionamentoAte).toBeLessThan(linkVenceEm)
      expect(j.redirectMaxAgeSeconds).toBeGreaterThanOrEqual(60)
    }
    expect(avatarLinkWindow(inicio).redirectMaxAgeSeconds).toBe(AVATAR_LINK_WINDOW_SECONDS)
  })

  it('a mesma janela dá o MESMO link assinado, e outra janela dá outro', async () => {
    const client = new S3Client({
      region: 'auto',
      endpoint: 'https://conta.r2.cloudflarestorage.com',
      credentials: { accessKeyId: 'chave-de-teste', secretAccessKey: 'segredo-de-teste' },
    })
    const assinar = (agora: number) => {
      const j = avatarLinkWindow(agora)
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: 'bucket',
          Key: 'avatar/miniaturas/x.abc.webp',
          ResponseCacheControl: j.fileCacheControl,
        }),
        { expiresIn: j.expiresInSeconds, signingDate: j.signingDate },
      )
    }
    const a = await assinar(inicio + 5_000)
    const b = await assinar(inicio + 4 * 60 * 60 * 1000)
    const c = await assinar(inicio + JANELA_MS + 5_000)
    expect(a).toBe(b)
    expect(c).not.toBe(a)
    expect(new URL(a).searchParams.get('response-cache-control')).toBe(
      avatarLinkWindow(inicio).fileCacheControl,
    )
  })
})
