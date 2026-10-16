import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import type { StudioAiPolicyInput } from '@sistemazero/core/ai-credits'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getEnv } from '../lib/env'
import { RequestBodyTooLargeError, readBoundedJson } from '../lib/read-bounded-json'
import type { MembersClient } from '../server/clients'
import type { SessionModule } from '../server/session'

const failure = (code: string, status: number) =>
  NextResponse.json({ error: { code } }, { status, headers: { 'Cache-Control': 'no-store' } })
export function createStudioOpenRouterRoutes(deps: {
  members: MembersClient
  session: SessionModule
  cookieBase: string
  getCookies?: typeof cookies
}) {
  const getCookies = deps.getCookies ?? cookies
  const cookieName = `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}${deps.cookieBase}_openrouter`
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  }
  async function parent() {
    const user = await deps.session.getSession()
    if (user?.kids?.kind !== 'parent' || user.activeProfile || user.act) return null
    return {
      actor: { accountId: user.id, userId: user.id, parent: true as const },
      sessionId: user.kids.sessionId,
    }
  }
  function sessionBinding(token: string, sessionId: string) {
    return createHash('sha256').update(token).update('\0').update(sessionId).digest('hex')
  }
  function origin(req: Request) {
    const configured = getEnv().APP_PUBLIC_URL
    if (!configured && process.env.NODE_ENV === 'production')
      throw new Error('Origem pública indisponível')
    return new URL(configured ?? req.url).origin
  }
  async function mutation(req: Request, operation: 'policy' | 'disconnect') {
    const context = await parent()
    if (!context) return failure('PARENT_SESSION_REQUIRED', 403)
    const { actor } = context
    if (req.headers.get('origin') !== origin(req)) return failure('INVALID_ORIGIN', 403)
    let action: Parameters<MembersClient['studioAiAccount']>[1] = { operation: 'disconnect' }
    if (operation === 'policy') {
      let input: Partial<StudioAiPolicyInput>
      try {
        input = (await readBoundedJson(req, 2048)) as Partial<StudioAiPolicyInput>
      } catch (cause) {
        return failure(
          cause instanceof RequestBodyTooLargeError ? 'PAYLOAD_TOO_LARGE' : 'INVALID_INPUT',
          cause instanceof RequestBodyTooLargeError ? 413 : 400,
        )
      }
      if (
        !input ||
        (input.source !== 'platform' && input.source !== 'openrouter') ||
        ![input.externalDailyLimitMicroUsd, input.externalMonthlyLimitMicroUsd].every(
          (v) =>
            v === null ||
            (typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 && v <= 1_000_000_000),
        )
      )
        return failure('INVALID_INPUT', 400)
      action = {
        operation: 'policy',
        policy: {
          source: input.source,
          externalDailyLimitMicroUsd: input.externalDailyLimitMicroUsd ?? null,
          externalMonthlyLimitMicroUsd: input.externalMonthlyLimitMicroUsd ?? null,
        },
      }
    }
    const response = await deps.members.studioAiAccount(actor, action)
    if (response.status !== 200 || !response.body?.account)
      return failure('OPENROUTER_UPDATE_FAILED', response.status >= 400 ? response.status : 502)
    return NextResponse.json(
      { account: response.body.account },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
  return {
    studioOpenRouter: {
      GET: async () => {
        const context = await parent()
        if (!context) return failure('PARENT_SESSION_REQUIRED', 403)
        const { actor } = context
        const response = await deps.members.studioAiAccount(actor, { operation: 'view' })
        if (response.status !== 200 || !response.body?.account)
          return failure('OPENROUTER_UNAVAILABLE', 503)
        const usage = await deps.members
          .studioAiUsage({ ...actor, privileged: false }, { operation: 'costs' })
          .catch(() => null)
        return NextResponse.json(
          {
            account: response.body.account,
            costs: usage?.status === 200 ? (usage.body?.costs ?? null) : null,
          },
          { headers: { 'Cache-Control': 'no-store' } },
        )
      },
      PUT: (req: Request) => mutation(req, 'policy'),
      DELETE: (req: Request) => mutation(req, 'disconnect'),
    },
    studioOpenRouterConnect: {
      POST: async (req: Request) => {
        const context = await parent()
        if (!context) return failure('PARENT_SESSION_REQUIRED', 403)
        const { actor } = context
        const base = origin(req)
        if (req.headers.get('origin') !== base) return failure('INVALID_ORIGIN', 403)
        const binding = randomBytes(32).toString('hex')
        const response = await deps.members.studioAiAccount(actor, {
          operation: 'start',
          binding: sessionBinding(binding, context.sessionId),
          callbackUrl: `${base}/api/parents/openrouter/callback`,
        })
        if (
          response.status !== 200 ||
          !response.body?.url ||
          new URL(response.body.url).origin !== 'https://openrouter.ai'
        )
          return failure('OPENROUTER_CONNECT_FAILED', 503)
        ;(await getCookies()).set(cookieName, binding, cookieOptions)
        return NextResponse.json(
          { url: response.body.url },
          { headers: { 'Cache-Control': 'no-store' } },
        )
      },
    },
    studioOpenRouterCallback: {
      GET: async (req: Request) => {
        const context = await parent()
        if (!context) return failure('PARENT_SESSION_REQUIRED', 403)
        const { actor } = context
        const jar = await getCookies()
        const binding = jar.get(cookieName)?.value
        const params = new URL(req.url).searchParams
        const state = params.get('state') ?? ''
        const code = params.get('code') ?? ''
        let connected = false
        try {
          if (binding && state && code && !params.has('error')) {
            const result = await deps.members.studioAiAccount(actor, {
              operation: 'complete',
              binding: sessionBinding(binding, context.sessionId),
              state,
              code,
            })
            connected = result.status === 200 && result.body?.account?.connected === true
          }
        } catch {
          connected = false
        } finally {
          jar.set(cookieName, '', { ...cookieOptions, maxAge: 0 })
        }
        const response = NextResponse.redirect(
          `${origin(req)}/pais/conta?openrouter=${connected ? 'connected' : 'failed'}`,
          303,
        )
        response.headers.set('Cache-Control', 'no-store')
        response.headers.set('Referrer-Policy', 'no-referrer')
        return response
      },
    },
  }
}
