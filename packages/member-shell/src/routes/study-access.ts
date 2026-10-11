import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { changeStudyAccessSchema, createStudyAccessSchema } from '../lib/study-access'
import { type GatewayModule, publicAuthPost } from '../server/gateway'
import { type AuthTokens, type SessionModule, SessionUnavailableError } from '../server/session'
import type { StudyAccessClient } from '../server/study-access'

const profileInput = z.object({ profileId: z.string().uuid() })
const redeemInput = z.object({
  code: z.string().min(1).max(30),
  expectedProfileId: z.string().uuid().optional(),
})
function error(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status })
}
function result(response: { status: number; body: unknown }) {
  return NextResponse.json(response.body, {
    status: response.status,
    headers: { 'cache-control': 'no-store' },
  })
}

export function createStudyAccessRoutes({
  session,
  gateway,
  study,
}: {
  session: SessionModule
  gateway: GatewayModule
  study: StudyAccessClient
}) {
  async function endSession() {
    const refresh = await session.getRefreshToken()
    if (refresh && !(await gateway.logoutRequest(refresh))) return false
    await session.clearSessionCookies()
    return true
  }
  async function rejectStalePage(req: Request) {
    const expected = req.headers.get('x-sz-session')
    if (!expected) return null // Entrada pública, sem página autenticada anterior.
    const user = await session.getSession()
    if (user?.kids && user.kids.sessionId !== expected) return error('SESSION_CHANGED', 409)
    return null
  }
  async function requireParent(req: Request) {
    const user = await session.getSession()
    if (user?.kids?.kind !== 'parent') return error('PARENT_SESSION_REQUIRED', 403)
    if (req.method !== 'GET' && req.headers.get('x-sz-session') !== user.kids.sessionId)
      return error('SESSION_CHANGED', 409)
    return null
  }
  return {
    retiredKidsProfileAccess: { POST: async () => error('USE_KIDS_LOGIN', 410) },
    studySession: {
      GET: async () => {
        const access = await session.getAccessToken()
        const refresh = await session.getRefreshToken()
        const verdict = access && refresh ? await session.verifyAccessToken(access) : null
        if (verdict && !verdict.ok && verdict.unavailable)
          return result({ status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE' } } })
        const user = verdict?.ok ? verdict.user : null
        return NextResponse.json(
          { sessionId: user?.kids?.sessionId ?? null },
          { headers: { 'cache-control': 'no-store' } },
        )
      },
    },
    studyPrepare: {
      POST: async () => {
        await study.prepareDevice()
        return NextResponse.json({ ok: true })
      },
    },
    studyDevice: { GET: async () => result(await study.recognize()) },
    studyGrants: {
      GET: async (req: Request) => {
        const denied = await requireParent(req)
        if (denied) return denied
        const parsed = profileInput.safeParse({
          profileId: new URL(req.url).searchParams.get('profileId'),
        })
        if (!parsed.success) return error('INVALID_INPUT', 400)
        return result(
          await gateway.gatewayFetchReadonly('/auth/kids/grants/list', {
            method: 'POST',
            body: { ...parsed.data, deviceToken: (await study.getDeviceToken()) ?? undefined },
          }),
        )
      },
      POST: async (req: Request) => {
        const denied = await requireParent(req)
        if (denied) return denied
        const parsed = createStudyAccessSchema.safeParse(await req.json().catch(() => null))
        if (!parsed.success) return error('INVALID_INPUT', 400)
        const deviceToken = await study.getDeviceToken()
        if (parsed.data.mode === 'current' && !deviceToken) return error('DEVICE_NOT_READY', 409)
        return result(
          await gateway.gatewayFetch('/auth/kids/grants', {
            method: 'POST',
            body: { ...parsed.data, deviceToken: deviceToken ?? undefined },
          }),
        )
      },
    },
    studyGrant: {
      PATCH: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const denied = await requireParent(req)
        if (denied) return denied
        const parsed = changeStudyAccessSchema.safeParse(await req.json().catch(() => null))
        const id = z
          .string()
          .uuid()
          .safeParse((await ctx.params).id)
        if (!parsed.success || !id.success) return error('INVALID_INPUT', 400)
        return result(
          await gateway.gatewayFetch(`/auth/kids/grants/${id.data}`, {
            method: 'PATCH',
            body: parsed.data,
          }),
        )
      },
    },
    studyRedeem: {
      POST: async (req: Request) => {
        const stale = await rejectStalePage(req)
        if (stale) return stale
        const parsed = redeemInput.safeParse(await req.json().catch(() => null))
        if (!parsed.success) return error('INVALID_INPUT', 400)
        const deviceToken = await study.getDeviceToken()
        if (!deviceToken) return error('DEVICE_NOT_READY', 409)
        return result(await publicAuthPost('/auth/kids/redeem', { ...parsed.data, deviceToken }))
      },
    },
    studyEnter: {
      POST: async (req: Request) => {
        const stale = await rejectStalePage(req)
        if (stale) return stale
        const parsed = profileInput.safeParse(await req.json().catch(() => null))
        if (!parsed.success) return error('INVALID_INPUT', 400)
        const deviceToken = await study.getDeviceToken()
        if (!deviceToken) return error('DEVICE_NOT_READY', 409)
        // Confere ANTES de encerrar o adulto; a autorização não nasce desta troca.
        const device = await study.recognize(false)
        if (device.status !== 200) return error('SERVICE_UNAVAILABLE', 503)
        if (!device.body.profiles.some((p) => p.id === parsed.data.profileId && p.available))
          return error('STUDY_ACCESS_REQUIRED', 403)
        if (!(await endSession())) return error('SESSION_REVOKE_FAILED', 503)
        const response = await publicAuthPost<{ tokens?: AuthTokens }>('/auth/kids/enter', {
          deviceToken,
          ...parsed.data,
        })
        if (response.status !== 200 || !response.body?.tokens) return result(response)
        await session.setSessionCookies(response.body.tokens)
        return NextResponse.json({ ok: true })
      },
    },
    studyLeave: {
      POST: async (req: Request) => {
        const stale = await rejectStalePage(req)
        if (stale) return stale
        const parsed = z
          .object({ forgetProfileId: z.string().uuid().optional() })
          .safeParse(await req.json().catch(() => null))
        if (!parsed.success) return error('INVALID_INPUT', 400)
        // ⚠️ "Esquecer este perfil" vale só para o perfil da sessão ATUAL: com o cookie do
        // aparelho, uma criança encerrava o acesso de um irmão escolhendo o id dele.
        if (parsed.data.forgetProfileId) {
          let user: Awaited<ReturnType<SessionModule['getSession']>>
          try {
            user = await session.getSession()
          } catch (unavailable) {
            if (unavailable instanceof SessionUnavailableError)
              return error('SERVICE_UNAVAILABLE', 503)
            throw unavailable
          }
          if (user?.kids?.kind !== 'student' || user.id !== parsed.data.forgetProfileId)
            return error('PROFILE_MISMATCH', 403)
        }
        const deviceToken = await study.getDeviceToken()
        if (deviceToken) {
          const response = parsed.data.forgetProfileId
            ? await publicAuthPost('/auth/kids/disconnect', {
                deviceToken,
                profileId: parsed.data.forgetProfileId,
              })
            : await publicAuthPost('/auth/kids/suspend', { deviceToken })
          if (response.status !== 200) return result(response)
        }
        if (!(await endSession())) return error('SESSION_REVOKE_FAILED', 503)
        return NextResponse.json({ ok: true })
      },
    },
    /**
     * Esquecer o navegador INTEIRO (todos os perfis da família nele). ⚠️ Exige sessão de
     * RESPONSÁVEL (o Auth ainda pede login recente e confere a família): só com o cookie do
     * aparelho, uma criança apagava o acesso dos irmãos. A sessão adulta continua aberta; a
     * sessão infantil que estiver ativa neste navegador cai junto no Auth.
     */
    studyForget: {
      POST: async (req: Request) => {
        const denied = await requireParent(req)
        if (denied) return denied
        const parsed = z
          .object({ confirm: z.literal(true) })
          .safeParse(await req.json().catch(() => null))
        if (!parsed.success) return error('INVALID_INPUT', 400)
        const deviceToken = await study.getDeviceToken()
        if (deviceToken) {
          const response = await gateway.gatewayFetch('/auth/kids/forget', {
            method: 'POST',
            body: { deviceToken },
          })
          if (response.status !== 200) return result(response)
        }
        await study.clearDevice()
        return NextResponse.json({ ok: true })
      },
    },
  }
}
