import 'server-only'
import {
  PENSA_LIMITS,
  type PensaActor,
  PensaCreateProjectRequestSchema,
  PensaDraftAcceptRequestSchema,
  PensaDraftEditRequestSchema,
  PensaJoinRequestSchema,
  PensaMessagePageSchema,
  PensaMessageRequestSchema,
  PensaMetadataRequestSchema,
  PensaMissionCompleteRequestSchema,
  PensaMissionDeliveriesRequestSchema,
  PensaMissionNoteRequestSchema,
  PensaMissionReopenRequestSchema,
  PensaMissionStartRequestSchema,
  PensaRestoreRequestSchema,
  PensaRolesRequestSchema,
  validatePensaPlan,
} from '@sistemazero/core/pensa'
import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import { learnerIdentity } from '../lib/learner-identity'
import { isPrivilegedRole } from '../lib/studio-tier'
import { hasAdultCapability } from '../server/adult-capabilities'
import type { MembersClient } from '../server/clients'
import { signCreationDownload } from '../server/creation-download'
import { readKidsCapabilities } from '../server/creative-apps-access'
import { loadPensaContext, type PensaContextMembers } from '../server/pensa/context'
import { PensaUnavailable } from '../server/pensa/errors'
import { workPensa } from '../server/pensa/planning'
import { pensaNarrativeRefusal, privatePensaInput, redactPensaText } from '../server/pensa/privacy'
import { protectPensaProject, restorePensaProject } from '../server/pensa/protection'
import type { PensaClient } from '../server/pensa-client'
import { pensaLlmAvailable } from '../server/pensa-llm'
import { r2PresignGetUgc } from '../server/r2'
import type { SessionModule } from '../server/session'

const uuid = z.uuid()
const RequestId = z.strictObject({ requestId: uuid })
const WorkRequest = z.strictObject({ requestId: uuid, retry: z.boolean().optional() })
const error = (status: number, message: string, code = 'OPERATION_FAILED') =>
  NextResponse.json(
    { error: { code, message } },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  )
const reply = (response: { status: number; body: unknown }) =>
  response.status === 204
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json(response.body, {
        status: response.status,
        headers: { 'Cache-Control': 'private, no-store' },
      })

async function readBody(request: Request, limit: number): Promise<unknown> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > limit)
    throw new PensaUnavailable(
      'Este pedido ficou grande. Revise o texto antes de enviar.',
      'PAYLOAD_TOO_LARGE',
      413,
    )
  if (!request.body) return null
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  for (;;) {
    const next = await reader.read()
    if (next.done) break
    bytes += next.value.byteLength
    if (bytes > limit) {
      await reader.cancel()
      throw new PensaUnavailable(
        'Este pedido ficou grande. Revise o texto antes de enviar.',
        'PAYLOAD_TOO_LARGE',
        413,
      )
    }
    chunks.push(next.value)
  }
  const buffer = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }
  try {
    return JSON.parse(new TextDecoder().decode(buffer))
  } catch {
    throw new PensaUnavailable(
      'Não consegui entender esse pedido. Revise e tente de novo.',
      'VALIDATION_ERROR',
      400,
    )
  }
}

export function createPensaRoutes({
  members,
  session,
  audience = 'kids',
  loadContext = loadPensaContext,
  worker = workPensa,
  schedule = after,
  storage = { presignGet: r2PresignGetUgc },
}: {
  members: PensaClient &
    PensaContextMembers &
    Pick<MembersClient, 'getAiCredits' | 'getGamification'>
  audience?: 'kids' | 'adult'
  session: Pick<SessionModule, 'getSession'>
  loadContext?: typeof loadPensaContext
  worker?: typeof workPensa
  schedule?: (callback: () => Promise<void>) => void
  storage?: { presignGet: typeof r2PresignGetUgc }
}) {
  async function handle(request: Request, route: { params: Promise<{ path?: string[] }> }) {
    const user = await session.getSession()
    if (!user) return error(401, 'Entre de novo para continuar.', 'UNAUTHENTICATED')
    if (
      audience === 'adult'
        ? !learnerIdentity(user, 'adult')
        : user.kids?.kind !== 'student' && !isPrivilegedRole(user.role)
    )
      return error(403, 'Abra seu perfil na Comunidade Kids.', 'KIDS_PROFILE_REQUIRED')
    if (request.headers.get('x-sz-viewer') !== user.id)
      return error(
        409,
        'O perfil mudou. Abra esta página de novo para continuar.',
        'VIEWER_MISMATCH',
      )
    if (request.method !== 'GET' && isReadonlyImpersonation(user))
      return error(403, 'A sessão de suporte é só leitura.', 'IMPERSONATION_READONLY')
    const actor: PensaActor = {
      ...(audience === 'adult' ? { audience: 'adult' as const } : {}),
      profileId: user.id,
      accountId: user.activeProfile?.accountId ?? user.id,
      privileged: isPrivilegedRole(user.role),
    }
    if (
      audience === 'adult' &&
      request.method !== 'DELETE' &&
      (!(await hasAdultCapability(members, user, 'pensa')) ||
        !(await hasAdultCapability(members, user, 'ai')))
    )
      return error(
        403,
        'O Pensa será liberado após a formação avançada.',
        'ADULT_CAPABILITY_REQUIRED',
      )
    const { path = [] } = await route.params
    const [resource, id, action, leaf, tail] = path
    const expectedLength =
      resource === 'missions'
        ? 3
        : action === 'operations'
          ? tail
            ? 5
            : 4
          : action === 'team-art'
            ? leaf
              ? 6
              : 3
            : action === 'checkpoints'
              ? leaf
                ? 5
                : 3
              : action === 'draft' || action === 'members'
                ? leaf
                  ? 4
                  : 3
                : action
                  ? 3
                  : id
                    ? 2
                    : 1
    if (path.length !== expectedLength) return error(404, 'Ação não encontrada.')
    const queue = (projectId: string, retry = false) =>
      schedule(() => worker({ members, user, actor, projectId, retry }))
    const drain = () =>
      schedule(async () => {
        const response = await members.pensaRewardsWork()
        if (response.status !== 200)
          console.error('[pensa] entregas pendentes', { status: response.status })
      })
    const projectReply = async (projectId: string, response: { status: number; body: unknown }) => {
      if (response.status < 200 || response.status >= 300) return reply(response)
      drain()
      const context = await loadContext(members, user, actor, projectId, '')
      return reply({ status: response.status, body: context.view })
    }
    try {
      const body =
        request.method === 'GET'
          ? null
          : await readBody(
              request,
              resource === 'projects' && action === 'draft' && request.method === 'PATCH'
                ? PENSA_LIMITS.draftBodyBytes
                : 16 * 1024,
            )
      if (resource === 'credits' && path.length === 1 && request.method === 'GET') {
        const response = await members.getAiCredits()
        return reply({
          status: 200,
          body: { credits: response.status === 200 ? response.body : null },
        })
      }
      if (resource === 'projects' && !id) {
        if (request.method === 'GET')
          return reply(
            await members.pensaListProjects(
              new URL(request.url).searchParams.get('status') === 'archived'
                ? 'archived'
                : 'active',
            ),
          )
        if (request.method !== 'POST') return error(405, 'Ação indisponível.')
        if (audience === 'kids') {
          const capability = await readKidsCapabilities(members, ['pensa', 'ai'])
          if (capability === 'unavailable')
            return error(503, 'Não consegui conferir sua jornada agora.', 'JOURNEY_UNAVAILABLE')
          if (capability !== 'allowed')
            return error(
              403,
              'O Pensa ainda não está liberado na sua jornada.',
              'JOURNEY_CAPABILITY_REQUIRED',
            )
        }
        const parsed = PensaCreateProjectRequestSchema.parse(body)
        const refusal = pensaNarrativeRefusal(parsed.message)
        if (refusal) return error(422, refusal, 'PENSA_MESSAGE_REVIEW')
        const created = await members.pensaCreateProject({
          ...parsed,
          message: redactPensaText(parsed.message).text,
        })
        if (created.status === 200 && created.body.operation) queue(created.body.project.id)
        return created.status === 200 && created.body
          ? await projectReply(created.body.project.id, created)
          : reply(created)
      }
      if (
        resource === 'projects' &&
        id === 'join' &&
        path.length === 2 &&
        request.method === 'POST'
      )
        return reply(await members.pensaJoinProject(PensaJoinRequestSchema.parse(body)))
      if (!id || !uuid.safeParse(id).success)
        return error(404, 'Projeto não encontrado.', 'PROJECT_GONE')
      if (resource === 'missions') {
        const target = await members.pensaMissionContext(actor, id)
        if (target.status !== 200 || !target.body) return reply(target)
        const context = await loadContext(members, user, actor, target.body.projectId, '')
        if (action === 'handoff' && request.method === 'GET')
          return reply(await members.pensaMissionHandoff(actor, id, context.capabilities))
        if (action === 'start' && request.method === 'POST')
          return reply(
            await members.pensaStartMission(
              actor,
              id,
              PensaMissionStartRequestSchema.parse(body),
              context.capabilities,
            ),
          )
        if (action === 'note' && request.method === 'PATCH')
          return reply(
            await members.pensaMissionNote(
              actor,
              id,
              PensaMissionNoteRequestSchema.parse(body),
              context.capabilities,
            ),
          )
        if (action === 'deliveries' && request.method === 'PATCH')
          return reply(
            await members.pensaMissionDeliveries(
              actor,
              id,
              PensaMissionDeliveriesRequestSchema.parse(body),
              context.capabilities,
            ),
          )
        if (action === 'reopen' && request.method === 'POST')
          return reply(
            await members.pensaReopenMission(
              actor,
              id,
              PensaMissionReopenRequestSchema.parse(body),
              context.capabilities,
            ),
          )
        if ((action === 'complete' || action === 'reconfirm') && request.method === 'POST') {
          const input = PensaMissionCompleteRequestSchema.parse(body)
          const mission = context.view.revision?.plan.missions.find((item) => item.id === id)
          const game = context.capabilities.observedGame
          const inspection =
            mission?.kind === 'setup' && game
              ? { creation: game.creation, installedExtensionIds: game.installedExtensionIds }
              : undefined
          const response =
            action === 'complete'
              ? await members.pensaCompleteMission(
                  actor,
                  id,
                  input,
                  context.capabilities,
                  inspection,
                )
              : await members.pensaReconfirmMission(
                  actor,
                  id,
                  input,
                  context.capabilities,
                  inspection,
                )
          if (response.status === 200) drain()
          return reply(response)
        }
        return error(405, 'Ação indisponível.')
      }
      if (resource !== 'projects') return error(404, 'Projeto não encontrado.', 'PROJECT_GONE')
      if (!action) {
        if (request.method === 'GET')
          return reply({
            status: 200,
            body: (await loadContext(members, user, actor, id, '')).view,
          })
        if (request.method === 'PATCH') {
          const input = PensaMetadataRequestSchema.parse(body)
          if (input.name) {
            const refusal = pensaNarrativeRefusal(input.name)
            if (refusal) return error(422, refusal, 'PENSA_MESSAGE_REVIEW')
            input.name = redactPensaText(input.name).text
          }
          return await projectReply(id, await members.pensaUpdateProject(id, input))
        }
        if (request.method === 'DELETE') {
          const response = await members.pensaDeleteProject(id, RequestId.parse(body).requestId)
          if (response.status === 200) drain()
          return reply(response)
        }
      }
      if (action === 'messages' && request.method === 'GET') {
        const query = z
          .strictObject({
            limit: z.coerce.number().int().min(1).max(100).optional(),
            cursor: uuid.optional(),
          })
          .parse(Object.fromEntries(new URL(request.url).searchParams))
        const response = await members.pensaMessages(id, query)
        return reply(
          response.status === 200
            ? { status: 200, body: PensaMessagePageSchema.parse(response.body) }
            : response,
        )
      }
      if (action === 'messages' && request.method === 'POST') {
        if (!pensaLlmAvailable())
          return error(
            503,
            'O Zappy está descansando. Sua ideia continua guardada.',
            'AI_UNAVAILABLE',
          )
        if (audience === 'kids') {
          const capability = await readKidsCapabilities(members, ['pensa', 'ai'])
          if (capability === 'unavailable')
            return error(503, 'Não consegui conferir sua jornada agora.', 'JOURNEY_UNAVAILABLE')
          if (capability !== 'allowed')
            return error(
              403,
              'O Pensa ainda não está liberado na sua jornada.',
              'JOURNEY_CAPABILITY_REQUIRED',
            )
        }
        const input = PensaMessageRequestSchema.parse(body)
        const refusal = pensaNarrativeRefusal(input.message)
        if (refusal) return error(422, refusal, 'PENSA_MESSAGE_REVIEW')
        const response = await members.pensaMessage(id, {
          ...input,
          message: redactPensaText(input.message).text,
        })
        if (response.status === 200) queue(id)
        return await projectReply(id, response)
      }
      if (action === 'operations' && leaf && uuid.safeParse(leaf).success) {
        if (!tail && request.method === 'GET') return reply(await members.pensaOperation(id, leaf))
        if (tail === 'cancel' && request.method === 'POST')
          return await projectReply(
            id,
            await members.pensaCancelOperation(id, leaf, RequestId.parse(body).requestId),
          )
        if (tail === 'work' && request.method === 'POST') {
          const input = WorkRequest.parse(body)
          const context = await loadContext(members, user, actor, id, '')
          if (context.view.operation?.id !== leaf)
            return error(409, 'O pedido mudou. Atualize o projeto.', 'REVISION_CONFLICT')
          if (input.retry) {
            const resumed = await members.pensaRetryOperation(
              actor,
              id,
              leaf,
              input.requestId,
              context.capabilities,
            )
            if (resumed.status !== 200) return reply(resumed)
          }
          const current = input.retry ? await loadContext(members, user, actor, id, '') : context
          queue(id)
          return reply({ status: 200, body: current.view })
        }
      }
      if (action === 'draft') {
        if (!leaf && request.method === 'GET') return reply(await members.pensaDraft(id))
        if (!leaf && request.method === 'PATCH') {
          const context = await loadContext(members, user, actor, id, '')
          return await projectReply(
            id,
            await members.pensaEditDraft(
              actor,
              id,
              PensaDraftEditRequestSchema.parse(
                privatePensaInput(PensaDraftEditRequestSchema.parse(body)),
              ),
              context.capabilities,
            ),
          )
        }
        if (!leaf && request.method === 'DELETE')
          return await projectReply(
            id,
            await members.pensaDiscardDraft(id, RequestId.parse(body).requestId),
          )
        if (leaf === 'accept' && request.method === 'POST') {
          const context = await loadContext(members, user, actor, id, '')
          const draft = context.view.draft
          if (!draft?.definition || !draft.plan || !draft.technical)
            return error(409, 'Seu caminho ainda precisa ser preparado.', 'DRAFT_CHANGED')
          const validation = validatePensaPlan({
            definition: draft.definition,
            plan: draft.plan,
            technical: draft.technical,
            capabilities: context.capabilities,
            team: context.view.team,
          })
          if (!validation.ok)
            return error(
              409,
              'Os recursos ou as escolhas mudaram. Vamos adaptar o caminho.',
              'RESOURCES_CHANGED',
            )
          return await projectReply(
            id,
            await members.pensaAcceptDraft(
              actor,
              id,
              PensaDraftAcceptRequestSchema.parse(body),
              context.capabilities,
            ),
          )
        }
      }
      if (action === 'members') {
        if (!leaf && request.method === 'GET') return reply(await members.pensaTeam(id))
        if (
          leaf &&
          (leaf === 'me' || uuid.safeParse(leaf).success) &&
          request.method === 'DELETE'
        ) {
          const response = await members.pensaRemoveProjectMember(
            id,
            leaf,
            RequestId.parse(body).requestId,
          )
          if (response.status === 200 && (leaf === 'me' || leaf === user.id))
            return reply({ status: 200, body: { left: true } })
          return await projectReply(id, response)
        }
      }
      if (action === 'roles') {
        if (request.method === 'GET') return reply(await members.pensaTeam(id))
        if (request.method === 'PUT')
          return await projectReply(
            id,
            await members.pensaRoles(id, PensaRolesRequestSchema.parse(body)),
          )
      }
      if (action === 'share') {
        const input = RequestId.parse(body)
        if (request.method === 'POST')
          return await projectReply(id, await members.pensaShareProject(id, input.requestId))
        if (request.method === 'DELETE')
          return await projectReply(id, await members.pensaUnshareProject(id, input.requestId))
      }
      if (action === 'team-art' && request.method === 'GET') {
        if (!leaf) return reply(await members.pensaTeamArt(id))
        if (
          tail &&
          uuid.safeParse(leaf).success &&
          uuid.safeParse(tail).success &&
          path[5] === 'download'
        ) {
          const ticket = await members.pensaTeamArtDownload(id, leaf, tail)
          return ticket.status === 200 && ticket.body
            ? reply({
                status: 200,
                body: await signCreationDownload(storage.presignGet, ticket.body),
              })
            : reply(ticket)
        }
      }
      if (action === 'revisions' && request.method === 'GET')
        return reply(
          await members.pensaRevisions(
            id,
            new URL(request.url).searchParams.get('cursor') ?? undefined,
          ),
        )
      if (action === 'checkpoints') {
        if (!leaf && request.method === 'GET') return reply(await members.pensaCheckpoints(id))
        const context = await loadContext(members, user, actor, id, '')
        const dependencies = { refreshContext: () => loadContext(members, user, actor, id, '') }
        if (!leaf && request.method === 'POST')
          return await projectReply(id, {
            status: 200,
            body: await protectPensaProject(
              members,
              actor,
              context,
              PensaRestoreRequestSchema.parse(body),
              dependencies,
            ),
          })
        if (leaf && uuid.safeParse(leaf).success && tail === 'restore' && request.method === 'POST')
          return await projectReply(id, {
            status: 200,
            body: await restorePensaProject(
              members,
              actor,
              context,
              leaf,
              PensaRestoreRequestSchema.parse(body),
              dependencies,
            ),
          })
      }
      return error(404, 'Ação não encontrada.')
    } catch (cause) {
      if (cause instanceof z.ZodError)
        return error(400, 'Confira os campos e tente de novo.', 'VALIDATION_ERROR')
      if (cause instanceof PensaUnavailable) return error(cause.status, cause.message, cause.code)
      console.error('[pensa] pedido interrompido', {
        name: cause instanceof Error ? cause.name : typeof cause,
      })
      return error(503, 'Não consegui concluir essa ação agora. Sua criação continua guardada.')
    }
  }
  return { pensa: { GET: handle, POST: handle, PUT: handle, PATCH: handle, DELETE: handle } }
}
