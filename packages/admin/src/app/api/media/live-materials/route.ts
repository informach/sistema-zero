import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { createLiveMaterialUploadHandler } from '@sistemazero/member-shell/routes/live-materials'
import { getEnv } from '@/lib/env'
import { requireMediaSession } from '@/server/media'
import { r2DeletePrivateObject, r2PutObjectPrivate } from '@/server/r2'

export const POST = createLiveMaterialUploadHandler({
  session: requireMediaSession,
  put: (input) => r2PutObjectPrivate(input),
  remove: r2DeletePrivateObject,
  register: async (input) => {
    const env = getEnv(),
      secret = env.MEMBER_SHELL_HMAC_SECRET
    if (!secret) throw new Error('Upload de materiais não configurado')
    const path = '/members/internal/live/materials',
      body = JSON.stringify(input),
      timestamp = Math.floor(Date.now() / 1000)
    const signature = signHmac(
      secret,
      canonicalHmacMessage({ method: 'POST', path, body }),
      timestamp,
    )
    const result = await fetch(new URL(path, env.GATEWAY_URL), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-consumer-id': 'member-shell',
        'x-signature': `t=${timestamp},v1=${signature}`,
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    return { status: result.status, body: await result.json() }
  },
})
