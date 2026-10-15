import 'server-only'
import type { PensaJourneyActor, PensaJourneyCommand } from '@sistemazero/core/pensa'
import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { MembersClient } from '../server/clients'
import { signCreationDownload } from '../server/creation-download'
import { hasAiAppsLevel } from '../server/creative-apps-access'
import { loadJourneyContext } from '../server/pensa-journey/context'
import { validateJourneyProposal } from '../server/pensa-journey/contracts'
import { JourneyChildError } from '../server/pensa-journey/errors'
import { workJourney } from '../server/pensa-journey/planner'
import { pensaNarrativeRefusal, redactPensaText } from '../server/pensa-journey/privacy'
import { protectJourney, restoreJourney } from '../server/pensa-journey/protection'
import { pensaLlmAvailable } from '../server/pensa-llm'
import { r2PresignGetUgc } from '../server/r2'
import type { SessionModule } from '../server/session'

const uuid = z.uuid()
/** O código como a criança digitou (quem normaliza é o members, como no plano clássico). */
const Join = z.strictObject({ code: z.string().trim().min(4).max(16) })
/** As funções do plano: UMA pessoa programa; as artes são zero ou mais (até a equipe inteira). */
const Roles = z.strictObject({ code: uuid, art: z.array(uuid).max(6) })
/** As rotas da EQUIPE debaixo de `projects/:id` (14/10/2026). */
const TEAM_ACTIONS = new Set(['team', 'roles', 'share', 'members', 'team-art'])
/** Testar, concluir, guardar versão, restaurar e adaptar usam o jogo do Estúdio de quem programa. */
const PROGRAMMER_ACTIONS = ['test', 'close', 'increment', 'restore', 'revise']
const NOT_PROGRAMMER = 'Quem testa e guarda as versões é quem programa o jogo.'
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
  storage = { presignGet: r2PresignGetUgc },
}: {
  members: MembersClient
  session: SessionModule
  /** Só testes: onde a descida da arte da equipe é assinada (padrão: o R2 UGC). */
  storage?: { presignGet: typeof r2PresignGetUgc }
}) {
  /** Entrar num plano v2 pelo código `ZAP-…` (a rota CLÁSSICA do members) e abrir o jogo direto. */
  async function join(role: string, body: unknown) {
    const parsed = Join.safeParse(body)
    if (!parsed.success) return error(400, 'Confira o código e tente de novo.', 'VALIDATION_ERROR')
    if (!(await hasAiAppsLevel(members, role)))
      return error(403, 'O Pensa abre no nível Inventor(a).', 'CAREER_LEVEL_REQUIRED')
    const res = await members.pensaJoinProject(parsed.data)
    // Os 403/404/409 do members atravessam inteiros: é a frase que fica ao lado do campo.
    if (res.status !== 200) return reply(res)
    const projectId = res.body?.project?.id
    if (!projectId || !uuid.safeParse(projectId).success) {
      console.error('[pensa-v2] entrada sem o plano na resposta', { status: res.status })
      return error(502, 'Não consegui abrir este plano agora. Tente de novo.')
    }
    return reply({ status: 200, body: { projectId } })
  }

  /** "Trazer da equipe": o members autoriza e diz onde está a criação; só então o R2 é assinado. */
  async function teamArtDownload(projectId: string, taskId: string) {
    const ticket = await members.pensaJourneyTeamArtDownload(projectId, taskId)
    if (ticket.status !== 200) return reply(ticket)
    if (!ticket.body)
      return error(502, 'Não consegui trazer essa arte agora. Tente de novo.', 'UPSTREAM_EMPTY')
    try {
      return reply({
        status: 200,
        body: await signCreationDownload(storage.presignGet, ticket.body),
      })
    } catch (cause) {
      console.error('[pensa-v2] a arte da equipe não desceu', {
        projectId,
        taskId,
        name: errorName(cause),
      })
      return error(503, 'Não consegui trazer essa arte agora. Tente de novo.')
    }
  }

  /**
   * A equipe de um plano v2. Código, saída e tirar alguém seguem nas rotas CLÁSSICAS do members
   * (o mesmo convite e os mesmos tetos do plano clássico); equipe, funções e artes, nas do v2.
   * Quem pode o quê é regra do members (dona, quem programa, a equipe toda).
   */
  async function team(
    method: string,
    projectId: string,
    action: string,
    rest: string[],
    body: unknown,
  ) {
    const [item, leaf] = rest
    const method405 = () => error(405, 'Ação indisponível.')
    if (rest.length === 0) {
      if (action === 'team')
        return method === 'GET' ? reply(await members.pensaJourneyTeam(projectId)) : method405()
      if (action === 'team-art')
        return method === 'GET' ? reply(await members.pensaJourneyTeamArt(projectId)) : method405()
      if (action === 'share') {
        if (method === 'POST') return reply(await members.pensaShareProject(projectId))
        if (method === 'DELETE') return reply(await members.pensaUnshareProject(projectId))
        return method405()
      }
      if (action === 'roles') {
        if (method !== 'PUT') return method405()
        const parsed = Roles.safeParse(body)
        if (!parsed.success)
          return error(400, 'Escolha quem programa e quem faz as artes.', 'VALIDATION_ERROR')
        return reply(await members.pensaJourneyRoles(projectId, parsed.data))
      }
    }
    // `me` = sair da equipe (o app não precisa saber o próprio perfil).
    if (
      action === 'members' &&
      rest.length === 1 &&
      item &&
      (item === 'me' || uuid.safeParse(item).success)
    )
      return method === 'DELETE'
        ? reply(await members.pensaRemoveProjectMember(projectId, item))
        : method405()
    if (
      action === 'team-art' &&
      rest.length === 2 &&
      leaf === 'download' &&
      item &&
      uuid.safeParse(item).success
    )
      return method === 'GET' ? teamArtDownload(projectId, item) : method405()
    return error(404, 'Ação não encontrada.')
  }

  async function handle(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
    const user = await session.getSession()
    if (!user) return error(401, 'Entre de novo para continuar.', 'UNAUTHENTICATED')
    if (!user.kids && !isPrivilegedRole(user.role))
      return error(403, 'Abra seu perfil na Comunidade Kids.')
    // A aba que enfileirou o pedido é de OUTRO perfil (irmão que entrou no meio): nada passa.
    const viewer = req.headers.get('x-sz-viewer')
    if (viewer && viewer !== user.id)
      return error(409, 'A sessão trocou de perfil.', 'VIEWER_MISMATCH')
    if (isReadonlyImpersonation(user) && req.method !== 'GET')
      return error(403, 'Sessão de suporte é só leitura.', 'IMPERSONATION_READONLY')
    const actor: PensaJourneyActor = {
      profileId: user.id,
      accountId: user.activeProfile?.accountId ?? user.id,
      privileged: isPrivilegedRole(user.role),
    }
    const { path = [] } = await ctx.params
    const [resource, projectId, action] = path
    // O selo de usos do Zappy (o mesmo do plano clássico, 15/10/2026). SEMPRE 200: sem dado,
    // `credits: null` e a tela esconde o selo; "não sei" nunca pode virar "acabou".
    if (resource === 'credits' && path.length === 1) {
      if (req.method !== 'GET') return error(405, 'Ação indisponível.')
      const res = await members.getAiCredits().catch((cause: unknown) => {
        console.error('[pensa-v2] usos indisponíveis', { name: errorName(cause) })
        return null
      })
      const credits =
        res?.status === 200 && typeof res.body?.dayRemaining === 'number' ? res.body : null
      return reply({ status: 200, body: { credits } })
    }
    if (resource !== 'projects' || path.length > 5) return error(404, 'Plano não encontrado.')
    const body = req.method === 'GET' ? null : await req.json().catch(() => null)
    if (projectId === 'join' && path.length === 2)
      return req.method === 'POST' ? join(user.role, body) : error(405, 'Ação indisponível.')
    if (projectId && !uuid.safeParse(projectId).success) return error(404, 'Plano não encontrado.')
    if (projectId && action && TEAM_ACTIONS.has(action))
      return team(req.method, projectId, action, path.slice(3), body)
    if (path.length > 3) return error(404, 'Plano não encontrado.')
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
      // Renomear o jogo (15/10/2026): o nome aparece para a equipe, então passa pela régua da
      // narrativa (nada de contato, segredo ou o que não é para criança).
      const renamed = z.strictObject({ name: z.string().trim().min(2).max(120) }).safeParse(body)
      if (renamed.success) {
        const refusal = pensaNarrativeRefusal(renamed.data.name)
        if (refusal) return error(422, refusal, 'PENSA_MESSAGE_REVIEW')
        return reply(await members.pensaJourneyRename(projectId, renamed.data.name))
      }
    }
    if (req.method !== 'POST') return error(405, 'Ação indisponível.')
    if (action === 'cancel') return reply(await members.pensaJourneyCancel(projectId))
    if (PROGRAMMER_ACTIONS.includes(action ?? '')) {
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
      // Em equipe, o jogo mora no Estúdio de quem PROGRAMA: só ela testa e guarda as versões. O
      // members recusa também (`PENSA_NOT_PROGRAMMER`); aqui a recusa vem antes de ler o jogo
      // salvo, que seria o da conta de quem pediu, não o do plano.
      if (view.team && view.team.roles.code !== actor.profileId)
        return error(403, NOT_PROGRAMMER, 'PENSA_NOT_PROGRAMMER')
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
          // Em equipe, a proposta é conferida contra os recursos da EQUIPE (a view acabou de vir).
          const context = await loadJourneyContext(members, user, current.body.journey.intent, {
            projectId,
            view: current.body,
          })
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
  return { pensaJourney: { GET: handle, POST: handle, PUT: handle, PATCH: handle, DELETE: handle } }
}
