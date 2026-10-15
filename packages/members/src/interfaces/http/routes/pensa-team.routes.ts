import { Elysia, t } from 'elysia'
import type { PensaTeamService } from '../../../application/pensa/team.service'
import { MAX_ART_ROLES } from '../../../domain/pensa/team'
import type { PensaJourneyActor } from '../../../domain/ports/pensa-journey-repository.port'
import { assertInternalCaller, isPrivilegedActor, resolveAccountId, resolveUserId } from '../auth'

export interface PensaTeamRoutesDeps {
  team: PensaTeamService
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
}

const uuid = t.String({ format: 'uuid' })
const ProjectParams = t.Object({ projectId: uuid })
const TeamArtParams = t.Object({ projectId: uuid, taskId: uuid })
/** Corpo do `PUT …/roles`: quem programa (um) e quem faz as artes (até 6; vazio = quem programa). */
export const PensaRolesBody = t.Object(
  { code: uuid, art: t.Array(uuid, { maxItems: MAX_ART_ROLES }) },
  { additionalProperties: false },
)

/**
 * A EQUIPE no Pensa v2 (14/10/2026), sob o mesmo prefixo das rotas da jornada
 * (`members-pensa-v2` no gateway, JWT + `x-internal-token`). Entrar, gerar/desligar o código,
 * listar e tirar alguém seguem nas rotas do plano clássico (`/members/pensa/projects/…`), que
 * valem para o v2 também.
 */
export function pensaTeamRoutes(deps: PensaTeamRoutesDeps) {
  const actor = (headers: Record<string, string | undefined>): PensaJourneyActor => ({
    profileId: resolveUserId(headers),
    accountId: resolveAccountId(headers),
    privileged: isPrivilegedActor(headers),
  })
  return (
    new Elysia({ prefix: '/members/pensa/v2/projects' })
      .onTransform(({ headers }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      })
      // A equipe inteira (pessoas, código só para a dona, funções efetivas, `codeLocked`).
      .get(
        '/:projectId/team',
        ({ headers, params }) => deps.team.team(actor(headers), params.projectId),
        { params: ProjectParams },
      )
      // Só a dona: troca as funções de uma vez e devolve a `PensaJourneyView` atualizada.
      .put(
        '/:projectId/roles',
        ({ headers, params, body }) =>
          deps.team.setRoles(actor(headers), params.projectId, {
            code: body.code,
            art: body.art,
          }),
        { params: ProjectParams, body: PensaRolesBody },
      )
      // Os recursos de quem programa e de quem faz as artes (consumido só pelo BFF).
      .get(
        '/:projectId/team-capabilities',
        ({ headers, params }) => deps.team.capabilities(actor(headers), params.projectId),
        { params: ProjectParams },
      )
      // "Trazer da equipe": as artes entregues em missões do plano por outra pessoa.
      .get(
        '/:projectId/team-art',
        ({ headers, params }) => deps.team.art(actor(headers), params.projectId),
        { params: ProjectParams },
      )
      .get(
        '/:projectId/team-art/:taskId/download',
        ({ headers, params }) =>
          deps.team.artDownload(actor(headers), params.projectId, params.taskId),
        { params: TeamArtParams },
      )
  )
}
