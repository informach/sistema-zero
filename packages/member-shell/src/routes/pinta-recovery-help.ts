import 'server-only'
import { PintaRecoveryHelpReportSchema } from '@sistemazero/core/creations/pinta-recovery-help'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { creatorStorageNamespace } from '../lib/creator-storage-namespace'
import type { GatewayModule } from '../server/gateway'
import {
  authorizePintaActor,
  type PintaActorAuthorization,
} from '../server/pinta-actor-authorization'

const Reply = z.object({ threadId: z.uuid() })

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'cache-control': 'private, no-store' } })

const failure = (status: number, code: string) =>
  reply({ error: { code, message: 'Não consegui enviar o pedido de ajuda.' } }, status)

/**
 * O "Preciso de ajuda" do aviso de recuperação do Pinta (23/11/2026): abre (ou continua) a conversa
 * de recados do aluno, a mesma dos recados da aula. A autorização é a das rotas do Pinta
 * (`authorizePintaActor`, escrita): só o aluno ATIVO da sessão, com a conta dele. Pais, conta
 * inativa, perfil sem conta responsável e o suporte em modo leitura ficam de fora antes de
 * qualquer chamada. O pedido só descreve a recuperação do PRÓPRIO perfil: o armazenamento local
 * citado tem de ser o deste aluno.
 */
export function createPintaRecoveryHelpRoutes({
  gateway,
  session,
}: {
  gateway: Pick<GatewayModule, 'gatewayFetchHmac' | 'refreshSession'>
  session: PintaActorAuthorization['session']
}) {
  return {
    pintaRecoveryHelp: {
      POST: async (req: Request) => {
        try {
          const verified = await authorizePintaActor(req, true, { gateway, session })
          if ('status' in verified)
            return failure(verified.status, verified.reason.toUpperCase().replaceAll('-', '_'))
          const { actor } = verified
          const report = PintaRecoveryHelpReportSchema.safeParse(await req.json().catch(() => null))
          if (!report.success) return failure(400, 'VALIDATION_ERROR')
          if (report.data.profile !== creatorStorageNamespace(actor.userId, actor.audience))
            return failure(403, 'PROFILE_MISMATCH')
          const result = await gateway.gatewayFetchHmac(
            '/members/internal/teacher-threads/pinta-recovery-help',
            {
              method: 'POST',
              body: {
                userId: actor.userId,
                accountId: actor.accountId,
                audience: actor.audience,
                payload: report.data,
              },
            },
          )
          if (result.status !== 200) return failure(result.status, 'PINTA_HELP_UNAVAILABLE')
          const thread = Reply.safeParse(result.body)
          if (!thread.success) return failure(502, 'PINTA_HELP_UNAVAILABLE')
          return reply(thread.data)
        } catch {
          return failure(503, 'PINTA_HELP_UNAVAILABLE')
        }
      },
    },
  }
}
