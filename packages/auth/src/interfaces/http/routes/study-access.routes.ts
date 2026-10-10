import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { StudyAccessService } from '../../../application/study-access/study-access.service'
import type { TokenIssuer } from '../../../domain/ports/token-issuer.port'
import { KidsSessionInvalidError } from '../../../domain/study-access/errors'
import { extractBearer, resolveClientIp } from '../auth'

const id = t.String({ format: 'uuid' })
const deviceToken = t.String({ minLength: 43, maxLength: 43, pattern: '^[A-Za-z0-9_-]{43}$' })
const durationDays = t.Union([t.Literal(0), t.Literal(7), t.Literal(30), t.Literal(90)])

export function studyAccessRoutes(deps: {
  service: StudyAccessService
  tokenIssuer: TokenIssuer
  trustProxy: boolean
  trustedProxyHops: number
}) {
  async function claims(authorization?: string) {
    const token = extractBearer(authorization)
    const result = token ? await deps.tokenIssuer.verifyAccessToken(token) : null
    if (!result?.kids) throw new UnauthorizedError('Entre novamente para continuar.')
    return result
  }
  return (
    new Elysia({ prefix: '/auth/kids' })
      // ⚠️ Sessão encerrada/vencida responde um código PRÓPRIO (`KIDS_SESSION_INVALID`):
      // o BFF só desloga a criança com ele. Um 401 do Gateway (consumer HMAC mal
      // configurado) não pode virar "sessão encerrada" para todas as crianças.
      .post('/session/validate', async ({ headers }) => {
        const user = await claims(headers.authorization).catch((error: unknown) => {
          if (error instanceof UnauthorizedError) throw new KidsSessionInvalidError()
          throw error
        })
        return { valid: true, kind: user.kids?.kind, profileId: user.pfl ? user.sub : null }
      })
      .post(
        '/grants/list',
        async ({ body, headers }) =>
          deps.service.list(await claims(headers.authorization), body.profileId, body.deviceToken),
        { body: t.Object({ profileId: id, deviceToken: t.Optional(deviceToken) }) },
      )
      .post(
        '/grants',
        async ({ body, headers }) => deps.service.create(await claims(headers.authorization), body),
        {
          body: t.Object({
            profileId: id,
            label: t.String({ minLength: 2, maxLength: 60 }),
            durationDays,
            mode: t.Union([t.Literal('code'), t.Literal('current')]),
            deviceToken: t.Optional(deviceToken),
          }),
        },
      )
      .patch(
        '/grants/:id',
        async ({ body, params, headers }) =>
          deps.service.update(await claims(headers.authorization), params.id, body),
        {
          params: t.Object({ id }),
          body: t.Object({
            action: t.Union([t.Literal('renew'), t.Literal('revoke'), t.Literal('rename')]),
            durationDays: t.Optional(durationDays),
            label: t.Optional(t.String({ minLength: 2, maxLength: 60 })),
          }),
        },
      )
      .post('/device', ({ body }) => deps.service.recognize(body.deviceToken), {
        body: t.Object({ deviceToken }),
      })
      .post(
        '/redeem',
        ({ body, request, server, headers }) =>
          deps.service.redeem({
            ...body,
            ip: resolveClientIp(
              { request, server, headers },
              deps.trustProxy,
              deps.trustedProxyHops,
            ),
          }),
        {
          body: t.Object({
            deviceToken,
            code: t.String({ minLength: 1, maxLength: 30 }),
            expectedProfileId: t.Optional(id),
          }),
        },
      )
      .post(
        '/enter',
        ({ body, request, server, headers }) =>
          deps.service.enter({
            ...body,
            userAgent: headers['user-agent'] ?? null,
            ip: resolveClientIp(
              { request, server, headers },
              deps.trustProxy,
              deps.trustedProxyHops,
            ),
          }),
        { body: t.Object({ deviceToken, profileId: id }) },
      )
      .post(
        '/suspend',
        async ({ body }) => {
          await deps.service.suspend(body.deviceToken)
          return { ok: true }
        },
        { body: t.Object({ deviceToken }) },
      )
      .post(
        '/disconnect',
        async ({ body }) => {
          await deps.service.disconnect(body.deviceToken, body.profileId)
          return { ok: true }
        },
        { body: t.Object({ deviceToken, profileId: id }) },
      )
      // Esquecer o navegador inteiro exige o RESPONSÁVEL autenticado há pouco (Bearer adulto):
      // só o cookie do aparelho deixava uma criança apagar o acesso dos irmãos.
      .post(
        '/forget',
        async ({ body, headers }) => {
          await deps.service.forgetDevice(await claims(headers.authorization), body.deviceToken)
          return { ok: true }
        },
        { body: t.Object({ deviceToken }) },
      )
  )
}
