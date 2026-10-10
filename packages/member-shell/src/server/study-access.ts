import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { expireCookieOptions, studyDeviceCookieName } from '../lib/cookies'
import { isProd } from '../lib/env'
import { studyDeviceViewSchema } from '../lib/study-access'
import { type GatewayModule, publicAuthPost } from './gateway'

export function createStudyAccessClient(cookieBase: string, gateway: GatewayModule) {
  const deviceCookie = studyDeviceCookieName(cookieBase, process.env.NODE_ENV === 'production')
  async function getDeviceToken() {
    const value = (await cookies()).get(deviceCookie)?.value
    return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null
  }
  async function prepareDevice() {
    // Mantém o segredo para retries, mas renova a retenção do cookie. O prazo
    // concedido pelos pais continua sendo conferido separadamente no servidor.
    // Esta resposta chega ANTES do resgate, inclusive se a resposta dele se perder.
    const token = (await getDeviceToken()) ?? randomBytes(32).toString('base64url')
    ;(await cookies()).set(deviceCookie, token, {
      httpOnly: true,
      secure: isProd(),
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 86_400,
    })
  }
  async function recognize(withPhotos = true) {
    const deviceToken = await getDeviceToken()
    if (!deviceToken) return { status: 200, body: { profiles: [] } }
    const result = await publicAuthPost<unknown>('/auth/kids/device', { deviceToken })
    const parsed = studyDeviceViewSchema.safeParse(result.body)
    if (result.status !== 200 || !parsed.success)
      return { status: result.status === 200 ? 502 : result.status, body: { profiles: [] } }
    const ids = parsed.data.profiles.map((profile) => profile.id)
    const response =
      withPhotos && ids.length
        ? await gateway.gatewayFetchHmac('/members/internal/device-avatars', {
            method: 'POST',
            // `rateLimitKey`: o teto do Gateway é POR NAVEGADOR (o principal é sempre o BFF).
            // Hash com domínio próprio: nem o segredo nem o hash guardado no Auth saem daqui.
            body: {
              profileIds: ids.slice(0, 50),
              rateLimitKey: createHash('sha256')
                .update(`device-avatars:${deviceToken}`)
                .digest('hex'),
            },
          })
        : null
    const photos = z
      .object({ photos: z.record(z.string(), z.string().nullable()) })
      .safeParse(response?.status === 200 ? response.body : null)
    return {
      status: 200,
      body: {
        profiles: parsed.data.profiles.map((profile) => ({
          ...profile,
          photoUrl: photos.success ? (photos.data.photos[profile.id] ?? null) : null,
        })),
      },
    }
  }
  async function clearDevice() {
    ;(await cookies()).set(deviceCookie, '', expireCookieOptions(isProd()))
  }
  return { getDeviceToken, prepareDevice, recognize, clearDevice }
}
export type StudyAccessClient = ReturnType<typeof createStudyAccessClient>
