import 'server-only'
import { CREATOR_MASTERY_IDS, MasterySubmissionInputSchema } from '@sistemazero/core/journey'
import { NextResponse } from 'next/server'
import { isReadonlyImpersonation } from '../lib/act'
import type { GatewayModule } from '../server/gateway'
import { RequestBodyTooLargeError, readJsonBodyWithLimit } from '../server/read-json-body'
import type { SessionModule } from '../server/session'

export function createMasteryRoutes(session: SessionModule, gateway: GatewayModule) {
  const respond = (result: { status: number; body: unknown }) =>
    NextResponse.json(result.body, {
      status: result.status,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  const denied = (status: number, code: string, message: string) =>
    NextResponse.json({ error: { code, message } }, { status })
  return {
    list: {
      GET: async () =>
        respond(
          await gateway.gatewayFetch('/members/journey/masteries', {
            query: { audience: session.audience },
          }),
        ),
    },
    evidence: {
      GET: async () =>
        respond(
          await gateway.gatewayFetch('/members/journey/masteries/evidence', {
            query: { audience: session.audience },
          }),
        ),
    },
    submission: {
      POST: async (
        request: Request,
        context: { params: Promise<{ areaId: string; level: string }> },
      ) => {
        const user = await session.getSession()
        if (!user) return denied(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.')
        if (isReadonlyImpersonation(user))
          return denied(403, 'IMPERSONATION_READONLY', 'A sessão de suporte é somente leitura.')
        const { areaId, level } = await context.params
        if (
          !(CREATOR_MASTERY_IDS as readonly string[]).includes(areaId) ||
          !['1', '2', '3'].includes(level)
        )
          return denied(400, 'VALIDATION_ERROR', 'Área ou nível inválido.')
        let raw: unknown
        try {
          raw = await readJsonBodyWithLimit(request, 8192)
        } catch (error) {
          return denied(
            error instanceof RequestBodyTooLargeError ? 413 : 400,
            'VALIDATION_ERROR',
            'Confira a mensagem e o projeto escolhido.',
          )
        }
        const parsed = MasterySubmissionInputSchema.safeParse(raw)
        if (!parsed.success)
          return denied(
            400,
            'VALIDATION_ERROR',
            'Escolha uma versão salva e escreva até 1.000 caracteres.',
          )
        return respond(
          await gateway.gatewayFetch(
            `/members/journey/masteries/${areaId}/levels/${level}/submissions`,
            { method: 'POST', query: { audience: session.audience }, body: parsed.data },
          ),
        )
      },
    },
  }
}
