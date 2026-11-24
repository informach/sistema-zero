import { PintaCausalViewerSchema } from '@sistemazero/core/creations/pinta-causal'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { TeacherThreadsService } from '../../../application/teacher-threads/teacher-threads.service'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'

export interface PintaRecoveryHelpRoutesDeps {
  teacherThreads: Pick<TeacherThreadsService, 'studentRequestPintaRecoveryHelp'>
  /** Token interno (= INTERNAL_API_TOKEN). Sem ele a rota não existe (404), nem fora de produção. */
  internalToken?: string
}

const envelope = PintaCausalViewerSchema.extend({
  privileged: z.boolean().optional(),
  payload: z.unknown(),
})

/**
 * O "Preciso de ajuda" do aviso de recuperação do Pinta (23/11/2026). Só o member-shell chama,
 * pela borda HMAC, depois de autorizar o aluno ativo da sessão com a mesma regra das rotas do
 * Pinta (`authorizePintaActor`): o ator do envelope é o dono da conversa, nunca um id do pedido.
 */
export function pintaRecoveryHelpRoutes(deps: PintaRecoveryHelpRoutesDeps) {
  return new Elysia({ prefix: '/members/internal/teacher-threads' }).post(
    '/pinta-recovery-help',
    async ({ body, headers }) => {
      if (!deps.internalToken) return new Response(null, { status: 404 })
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-consumer-id'])
      const parsed = envelope.safeParse(body)
      if (
        !parsed.success ||
        (parsed.data.audience === 'adult' && parsed.data.userId !== parsed.data.accountId)
      )
        return Response.json({ reason: 'invalid-actor' }, { status: 422 })
      const { userId, accountId, audience, payload } = parsed.data
      return deps.teacherThreads.studentRequestPintaRecoveryHelp(
        { userId, accountId, audience },
        payload,
      )
    },
  )
}
