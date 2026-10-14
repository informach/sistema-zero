import 'server-only'
import type { PensaJourneyActor, PensaJourneyCommand } from '@sistemazero/core/pensa'
import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { MembersClient } from '../server/clients'
import { hasAiAppsLevel } from '../server/creative-apps-access'
import { loadJourneyContext } from '../server/pensa-journey/context'
import { validateJourneyProposal } from '../server/pensa-journey/contracts'
import { JourneyChildError } from '../server/pensa-journey/errors'
import { workJourney } from '../server/pensa-journey/planner'
import { pensaNarrativeRefusal, redactPensaText } from '../server/pensa-journey/privacy'
import { protectJourney, restoreJourney } from '../server/pensa-journey/protection'
import { pensaLlmAvailable } from '../server/pensa-llm'
import type { SessionModule } from '../server/session'

const uuid = z.uuid()
const Start = z.strictObject({
  id: uuid,
  expectedRevision: z.number().int().min(0),
  message: z.string().trim().min(1).max(4000),
  kind: z.enum(['planning', 'help', 'repair']),
})
/**
 * O que o navegador pode mandar por `command` (o `JourneyApp` usa pausar, retomar, aceitar,
 * observar, consertar e guardar ideia; tirar ideia é o par dela). ⚠️ `close`, `revise` e
 * `record_test` NÃO: as rotas próprias protegem a versão e conferem o jogo salvo antes, e pelo
 * `command` cru elas pulavam as duas coisas. `retry` é do `/work`.
 */
const Command = z.strictObject({
  expectedRevision: z.number().int().min(0),
  command: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('pause') }),
    z.strictObject({ type: z.literal('resume') }),
    z.strictObject({ type: z.literal('observe') }),
    z.strictObject({ type: z.literal('repair') }),
    z.strictObject({ type: z.literal('accept'), proposalId: uuid }),
    z.strictObject({
      type: z.literal('keep_idea'),
      idea: z.strictObject({
        id: z.string().min(1).max(100),
        text: z.string().trim().min(1).max(2000),
        origin: z.enum(['child', 'zappy']),
      }),
    }),
    z.strictObject({ type: z.literal('remove_idea'), ideaId: z.string().min(1).max(100) }),
  ]),
})
/** O nome do erro, nunca a mensagem (pode carregar o que não deve sair daqui). */
const errorName = (cause: unknown) => (cause instanceof Error ? cause.name : typeof cause)
const error = (status: number, message: string, code = 'PENSA_UNAVAILABLE') =>
  NextResponse.json({ error: { code, message } }, { status })
const reply = (res: { status: number; body: unknown }) =>
  NextResponse.json(res.body, {
    status: res.status,
    headers: { 'Cache-Control': 'private, no-store' },
  })

/** Uma única superfície BFF; identidade e contexto do worker nunca vêm do navegador. */
export function createPensaJourneyRoutes({
  members,
  session,
}: {
  members: MembersClient
  session: SessionModule
}) {
  async function handle(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
    const user = await session.getSession()
    if (!user) return error(401, 'Entre de novo para continuar.', 'UNAUTHENTICATED')
    if (!user.kids && !isPrivilegedRole(user.role))
      return error(403, 'Abra seu perfil na Comunidade Kids.')
    if (isReadonlyImpersonation(user) && req.method !== 'GET')
      return error(403, 'Sessão de suporte é só leitura.', 'IMPERSONATION_READONLY')
    const actor: PensaJourneyActor = {
      profileId: user.id,
      accountId: user.activeProfile?.accountId ?? user.id,
      privileged: isPrivilegedRole(user.role),
    }
    const { path = [] } = await ctx.params
    const [resource, projectId, action] = path
    if (
      resource !== 'projects' ||
      path.length > 3 ||
      (projectId && !uuid.safeParse(projectId).success)
    )
      return error(404, 'Plano não encontrado.')
    const body = req.method === 'GET' ? null : await req.json().catch(() => null)
    const queue = (id: string, retry = false) =>
      after(() => workJourney({ members, user, actor, projectId: id, retry }))
    if (!projectId) {
      if (req.method === 'GET')
        return reply(
          await members.pensaJourneyList(
            new URL(req.url).searchParams.get('status') === 'archived' ? 'archived' : 'active',
          ),
        )
      const parsed = z.strictObject({ id: uuid }).safeParse(body)
      if (req.method === 'POST' && parsed.success)
        return reply(await members.pensaJourneyCreate(parsed.data.id))
      return error(400, 'Não consegui abrir este plano.')
    }
    if (!action && req.method === 'GET') return reply(await members.pensaJourneyGet(projectId))
    if (!action && req.method === 'DELETE')
      return reply(await members.pensaJourneyDelete(projectId))
    if (!action && req.method === 'PATCH') {
      const parsed = z.strictObject({ status: z.enum(['active', 'archived']) }).safeParse(body)
      if (parsed.success)
        return reply(await members.pensaJourneyArchive(projectId, parsed.data.status))
    }
    if (req.method !== 'POST') return error(405, 'Ação indisponível.')
    if (action === 'cancel') return reply(await members.pensaJourneyCancel(projectId))
    if (['test', 'close', 'increment', 'restore', 'revise'].includes(action ?? '')) {
      const parsed = z
        .object({
          expectedRevision: z.number().int().min(0),
          id: uuid.optional(),
          reason: z.enum(['met', 'incomplete']).optional(),
          result: z.enum(['met', 'needs_adjustment', 'inconclusive']).optional(),
          note: z.string().max(2000).optional(),
          checkpointId: uuid.optional(),
        })
        .strict()
        .safeParse(body)
      if (!parsed.success) return error(400, 'Não consegui entender essa ação.')
      const current = await members.pensaJourneyGet(projectId)
      if (current.status !== 200 || !current.body) return reply(current)
      let view = current.body
      if (view.journey.revision !== parsed.data.expectedRevision)
        return error(409, 'Seu jogo mudou em outra tela. Atualize antes de continuar.')
      if (action === 'increment')
        return reply(
          await members.pensaJourneyProtect(actor, projectId, {
            type: 'increment',
            expectedRevision: view.journey.revision,
          }),
        )
      try {
        if (action === 'restore') {
          if (!parsed.data.checkpointId) return error(400, 'Escolha a versão guardada.')
          return NextResponse.json(
            await restoreJourney(members, actor, view, parsed.data.checkpointId),
          )
        }
        const saved = await members.getCreationDownload(
          'studio',
          `pensa-${projectId.replaceAll('-', '')}`,
        )
        if (action === 'test') {
          if (saved.status !== 200 || !saved.body)
            return error(
              409,
              'Abra e salve seu jogo. Espere Guardado na conta antes de contar o resultado.',
            )
          if (!parsed.data.result || !parsed.data.id)
            return error(400, 'Conte o resultado do teste.')
          if (view.journey.stage === 'building') {
            const observed = await members.pensaJourneyCommand(projectId, view.journey.revision, {
              type: 'observe',
            })
            if (observed.status !== 200 || !observed.body) return reply(observed)
            view = observed.body
          }
          return reply(
            await members.pensaJourneyCommand(projectId, view.journey.revision, {
              type: 'record_test',
              test: {
                id: parsed.data.id,
                result: parsed.data.result,
                source: 'child',
                note: redactPensaText(parsed.data.note ?? '').text,
                creationId: saved.body.summary.itemId,
                saveRevision: String(saved.body.revision),
                at: new Date().toISOString(),
              },
            }),
          )
        }
        if (action !== 'revise' && !parsed.data.reason)
          return error(400, 'Escolha como guardar este começo.')
        if (view.operation && ['running', 'queued'].includes(view.operation.status))
          return error(409, 'A preparação ainda está em andamento. Você pode pausar.')
        if (view.journey.operationId) {
          const cancelled = await members.pensaJourneyCancel(projectId)
          if (cancelled.status !== 200 || !cancelled.body) return reply(cancelled)
          view = cancelled.body
        }
        if (saved.status === 200 && saved.body) view = await protectJourney(members, actor, view)
        else if (saved.status !== 404 || parsed.data.reason === 'met')
          return error(
            409,
            'Não consegui conferir a versão salva. Você pode pausar e tentar depois.',
          )
        return reply(
          await members.pensaJourneyCommand(projectId, view.journey.revision, {
            ...(action === 'revise'
              ? { type: 'revise' as const }
              : { type: 'close' as const, reason: parsed.data.reason! }),
          }),
        )
      } catch (cause) {
        console.error('[pensa-v2] proteção da versão falhou', {
          projectId,
          step: action,
          name: errorName(cause),
        })
        return error(
          503,
          cause instanceof JourneyChildError
            ? cause.message
            : 'Não consegui guardar a cópia desta vez. Seu jogo atual continua salvo. Você pode pausar e tentar de novo.',
        )
      }
    }
    if (action === 'command') {
      const parsed = Command.safeParse(body)
      if (!parsed.success) return error(400, 'Não consegui entender essa ação.')
      let command: PensaJourneyCommand = parsed.data.command
      // A ideia guardada vai ao members já sem dado pessoal (o mesmo trecho que a narrativa perde).
      if (command.type === 'keep_idea')
        command = {
          ...command,
          idea: { ...command.idea, text: redactPensaText(command.idea.text).text },
        }
      if (command.type === 'accept') {
        const current = await members.pensaJourneyGet(projectId)
        if (current.status !== 200 || !current.body) return reply(current)
        try {
          const context = await loadJourneyContext(members, user, current.body.journey.intent)
          const proposal = current.body.journey.proposal
          if (
            !proposal ||
            validateJourneyProposal(
              proposal,
              context.capabilities,
              context.documents.map((d) => d.extension),
              context.existingCreationIds,
              context.existingCreations,
              context.blocks,
            ).length
          )
            return error(
              409,
              'Seus recursos mudaram. Peça para o Zappy ajustar este começo.',
              'PENSA_CAPABILITIES_CHANGED',
            )
        } catch (cause) {
          console.error('[pensa-v2] conferência de recursos falhou', {
            projectId,
            step: 'accept',
            name: errorName(cause),
          })
          return error(
            503,
            cause instanceof JourneyChildError
              ? `${cause.message} Sua proposta está guardada.`
              : 'Não consegui conferir suas ferramentas agora. Sua proposta está guardada.',
          )
        }
      }
      const res = await members.pensaJourneyCommand(
        projectId,
        parsed.data.expectedRevision,
        command,
      )
      if (res.status === 200 && command.type === 'accept') queue(projectId)
      return reply(res)
    }
    if (action === 'start' || action === 'work') {
      if (!pensaLlmAvailable())
        return error(503, 'O Zappy está indisponível agora. Sua ideia pode ficar guardada.')
      if (!(await hasAiAppsLevel(members, user.role)))
        return error(403, 'O Pensa abre no nível Inventor(a).')
      if (action === 'work') {
        const parsed = z.strictObject({ retry: z.boolean().optional() }).safeParse(body ?? {})
        if (!parsed.success) return error(400, 'Pedido inválido.')
        let res = await members.pensaJourneyGet(projectId)
        if (res.status === 200 && res.body && parsed.data.retry)
          res = await members.pensaJourneyCommand(projectId, res.body.journey.revision, {
            type: 'retry',
          })
        if (res.status === 200) queue(projectId, parsed.data.retry === true)
        return reply(res)
      }
      const parsed = Start.safeParse(body)
      if (!parsed.success) return error(400, 'Conte sua ideia em até 4.000 letras.')
      // Régua do PENSA, não do tutor: dado pessoal é redigido só no trecho e a ideia segue; recusa
      // só o que é inseguro de verdade, com uma frase do Pensa (ver `pensa-journey/privacy.ts`).
      const refusal = pensaNarrativeRefusal(parsed.data.message)
      if (refusal) return error(422, refusal, 'PENSA_MESSAGE_REVIEW')
      const safe = redactPensaText(parsed.data.message)
      const res = await members.pensaJourneyStart(actor, projectId, {
        ...parsed.data,
        message: safe.text,
        context: {},
      })
      if (res.status === 200) queue(projectId)
      return reply(res)
    }
    return error(404, 'Ação não encontrada.')
  }
  return { pensaJourney: { GET: handle, POST: handle, PATCH: handle, DELETE: handle } }
}
