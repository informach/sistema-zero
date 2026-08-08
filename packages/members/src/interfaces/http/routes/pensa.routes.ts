import { creatorCareerLevel } from '@sistemazero/core/career'
import { Elysia } from 'elysia'
import type { AccessCheckService } from '../../../application/access-check/access-check.service'
import type { GetGamificationService } from '../../../application/gamification/get-gamification.service'
import type { AdvancePensaStageService } from '../../../application/pensa/advance-stage.service'
import type { AppendPensaConversationTurnService } from '../../../application/pensa/append-conversation-turn.service'
import type { AppendPensaTasksService } from '../../../application/pensa/append-tasks.service'
import type { CreatePensaCycleService } from '../../../application/pensa/create-cycle.service'
import type { CreatePensaProjectService } from '../../../application/pensa/create-project.service'
import type { DeletePensaTaskService } from '../../../application/pensa/delete-task.service'
import type { GetPensaProjectService } from '../../../application/pensa/get-project.service'
import type { GetPensaStageService } from '../../../application/pensa/get-stage.service'
import type { GetPensaTaskHandoffService } from '../../../application/pensa/get-task-handoff.service'
import type { ListPensaProjectsService } from '../../../application/pensa/list-projects.service'
import type { ReplacePensaTasksService } from '../../../application/pensa/replace-tasks.service'
import type { SavePensaArtifactService } from '../../../application/pensa/save-artifact.service'
import type { UpdatePensaProjectService } from '../../../application/pensa/update-project.service'
import type { UpdatePensaTaskService } from '../../../application/pensa/update-task.service'
import type { UpdatePensaTaskProgressService } from '../../../application/pensa/update-task-progress.service'
import type { ValidatePensaArtifactService } from '../../../application/pensa/validate-artifact.service'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import {
  PENSA_ACCESS_REF,
  PENSA_PINTA_ACCESS_REF,
  PENSA_STUDIO_ACCESS_REF,
} from '../../../domain/pensa/pensa'
import { assertInternalCaller, isPrivilegedActor, resolveAccountId, resolveUserId } from '../auth'
import {
  AudienceQuery,
  PensaAdvanceBody,
  PensaArtifactBody,
  PensaArtifactValidateParams,
  PensaConversationBody,
  PensaConversationParams,
  PensaCreateCycleBody,
  PensaCreateProjectBody,
  PensaCycleParams,
  PensaProjectParams,
  PensaStageParams,
  PensaTaskParams,
  PensaTaskProgressBody,
  PensaTasksReplaceBody,
  PensaTaskUpdateBody,
  PensaUpdateProjectBody,
} from '../dtos'

export interface PensaRoutesDeps {
  listProjects: ListPensaProjectsService
  createProject: CreatePensaProjectService
  getProject: GetPensaProjectService
  updateProject: UpdatePensaProjectService
  createCycle: CreatePensaCycleService
  getStage: GetPensaStageService
  appendConversationTurn: AppendPensaConversationTurnService
  saveArtifact: SavePensaArtifactService
  validateArtifact: ValidatePensaArtifactService
  advanceStage: AdvancePensaStageService
  replaceTasks: ReplacePensaTasksService
  appendTasks: AppendPensaTasksService
  updateTask: UpdatePensaTaskService
  deleteTask: DeletePensaTaskService
  getTaskHandoff: GetPensaTaskHandoffService
  updateTaskProgress: UpdatePensaTaskProgressService
  /** Gate de PRODUTO na criação de projeto (mesma régua da rota `/members/access`). */
  accessCheck: AccessCheckService
  /** Rank autoritativo do perfil; tarefas do Estúdio respeitam a carreira. */
  getGamification: GetGamificationService
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
}

/**
 * Rotas do Pensa (planejamento guiado — metodologia ZERO). Todas exigem o
 * `x-internal-token` (gateway) + `x-auth-user-id`; `?audience=` como as demais
 * rotas (ausente → 'adult'; o shell kids SEMPRE manda kids). O dono dos dados é
 * o `user_id` (perfil kids); ownership por (userId, audience) nos use cases —
 * mismatch vira 404 PENSA_NOT_FOUND (nunca vaza existência).
 *
 * GATE DE PRODUTO só no `POST /projects` (criar projeto exige o entitlement da
 * ref `pensa` no catálogo — a chave-mestra de CURSOS não conta); equipe interna
 * (`isPrivilegedActor`) pula. Nas demais rotas basta a ownership: TER o projeto
 * prova que tinha acesso ao criar.
 */
export function pensaRoutes(deps: PensaRoutesDeps) {
  return (
    new Elysia({ prefix: '/members/pensa' })
      .onTransform(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      // Lista os projetos ATIVOS do dono na vitrine (updated_at DESC).
      .get(
        '/projects',
        async ({ headers, query }) => ({
          projects: await deps.listProjects.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
          ),
        }),
        { query: AudienceQuery },
      )
      // Cria projeto + ciclo 1 (atômico). GATE de produto: ref `pensa` no catálogo
      // pela CONTA (responsável compra) — mesma leitura da rota `/members/access`
      // (grants OU communities; chave-mestra de cursos NÃO conta). Equipe pula.
      .post(
        '/projects',
        async ({ headers, body, query }) => {
          const userId = resolveUserId(headers)
          const accountId = resolveAccountId(headers)
          if (!isPrivilegedActor(headers)) {
            const result = await deps.accessCheck.execute(accountId, [PENSA_ACCESS_REF])
            const allowed =
              result.grants.includes(PENSA_ACCESS_REF) ||
              result.communities.includes(PENSA_ACCESS_REF)
            if (!allowed) throw new AccessDeniedError('Você não tem acesso ao Pensa')
          }
          return {
            project: await deps.createProject.execute(
              userId,
              accountId,
              query.audience ?? 'adult',
              body,
            ),
          }
        },
        { body: PensaCreateProjectBody, query: AudienceQuery },
      )
      .get(
        '/projects/:projectId',
        async ({ headers, params, query }) => ({
          project: await deps.getProject.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.projectId,
          ),
        }),
        { params: PensaProjectParams, query: AudienceQuery },
      )
      .patch(
        '/projects/:projectId',
        async ({ headers, params, body, query }) => ({
          project: await deps.updateProject.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.projectId,
            body,
          ),
        }),
        { body: PensaUpdateProjectBody, params: PensaProjectParams, query: AudienceQuery },
      )
      // Ciclo n+1 (exige o anterior `done`; ≤10). Devolve o detail atualizado.
      .post(
        '/projects/:projectId/cycles',
        async ({ headers, params, body, query }) => ({
          project: await deps.createCycle.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.projectId,
            body.goal,
          ),
        }),
        { body: PensaCreateCycleBody, params: PensaProjectParams, query: AudienceQuery },
      )
      // View da etapa: conversa + state + artefatos latest DESTA etapa.
      .get(
        '/cycles/:cycleId/stages/:stage',
        async ({ headers, params, query }) =>
          deps.getStage.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.cycleId,
            params.stage,
          ),
        { params: PensaStageParams, query: AudienceQuery },
      )
      // Grava UM turno do chat (upsert por ciclo+etapa; trim server-side).
      .put(
        '/cycles/:cycleId/stages/:stage/conversation',
        async ({ headers, params, body, query }) =>
          deps.appendConversationTurn.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.cycleId,
            params.stage,
            body,
          ),
        { body: PensaConversationBody, params: PensaConversationParams, query: AudienceQuery },
      )
      // Nova versão do artefato (version = latest+1; nasce draft).
      .post(
        '/cycles/:cycleId/artifacts',
        async ({ headers, params, body, query }) => ({
          artifact: await deps.saveArtifact.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.cycleId,
            body,
          ),
        }),
        { body: PensaArtifactBody, params: PensaCycleParams, query: AudienceQuery },
      )
      // Valida o artefato LATEST do type (destrava os gates do advance).
      .post(
        '/cycles/:cycleId/artifacts/:type/validate',
        async ({ headers, params, query }) => ({
          artifact: await deps.validateArtifact.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.cycleId,
            params.type,
          ),
        }),
        { params: PensaArtifactValidateParams, query: AudienceQuery },
      )
      // Avança a etapa (gates server-side; grava <from>_completed_at) e credita a
      // gamificação NA RESPOSTA (`{ cycle, gamification }` — delta aditivo, fail-open;
      // `null` = award falhou). `privileged`/`accountId` seguem o padrão do complete:
      // equipe não entra no ranking; em sessão de perfil a CONTA vem do header.
      .post(
        '/cycles/:cycleId/advance',
        async ({ headers, params, body, query }) =>
          deps.advanceStage.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.cycleId,
            body.from,
            isPrivilegedActor(headers),
            resolveAccountId(headers),
          ),
        { body: PensaAdvanceBody, params: PensaCycleParams, query: AudienceQuery },
      )
      // REPLACE total do plano (somente enquanto nenhuma tarefa foi iniciada).
      .put(
        '/cycles/:cycleId/tasks',
        async ({ headers, params, body, query }) => ({
          tasks: await deps.replaceTasks.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.cycleId,
            body.tasks,
          ),
        }),
        { body: PensaTasksReplaceBody, params: PensaCycleParams, query: AudienceQuery },
      )
      // APPEND em ordem global (autoria manual / sugestão complementar).
      .post(
        '/cycles/:cycleId/tasks',
        async ({ headers, params, body, query }) => ({
          tasks: await deps.appendTasks.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.cycleId,
            body.tasks,
          ),
        }),
        { body: PensaTasksReplaceBody, params: PensaCycleParams, query: AudienceQuery },
      )
      // Edita o conteúdo planejado. Iniciada/concluída gera uma revisão imutável.
      .patch(
        '/tasks/:taskId',
        async ({ headers, params, body, query }) => ({
          task: await deps.updateTask.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.taskId,
            body,
          ),
        }),
        { body: PensaTaskUpdateBody, params: PensaTaskParams, query: AudienceQuery },
      )
      // Apaga um card (autoria manual).
      .delete(
        '/tasks/:taskId',
        async ({ headers, params, query }) => {
          await deps.deleteTask.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.taskId,
          )
          return { ok: true }
        },
        { params: PensaTaskParams, query: AudienceQuery },
      )
      // Brief/guia completo para a ferramenta de destino. A posse não esconde o
      // plano: devolve capability bloqueada com explicação.
      .get(
        '/tasks/:taskId/handoff',
        async ({ headers, params, query }) => {
          const userId = resolveUserId(headers)
          const accountId = resolveAccountId(headers)
          const audience = query.audience ?? 'adult'
          const privileged = isPrivilegedActor(headers)
          const handoff = await deps.getTaskHandoff.execute(userId, audience, params.taskId)
          const requiredRef =
            handoff.task.destination === 'pinta' ? PENSA_PINTA_ACCESS_REF : PENSA_STUDIO_ACCESS_REF
          let owned = privileged
          if (!owned) {
            const access = await deps.accessCheck.execute(accountId, [requiredRef])
            owned = access.grants.includes(requiredRef) || access.communities.includes(requiredRef)
          }
          let studioCareerLocked = false
          if (owned && !privileged && handoff.task.destination === 'studio') {
            try {
              const gamification = await deps.getGamification.execute(userId, accountId, {
                audience,
              })
              studioCareerLocked = !creatorCareerLevel(gamification.level.slug).reward.freeStudio
            } catch {
              // Sem conseguir provar o rank, o gate pedagógico falha fechado.
              studioCareerLocked = true
            }
            if (studioCareerLocked) owned = false
          }
          return {
            ...handoff,
            capability: {
              owned,
              blockedReason: owned
                ? null
                : studioCareerLocked
                  ? 'O Estúdio ainda não foi liberado pelo seu nível na carreira.'
                  : handoff.task.destination === 'pinta'
                    ? 'O Pinta ainda não está liberado para esta conta.'
                    : 'O Estúdio Completo ainda não está liberado para esta conta.',
            },
          }
        },
        { params: PensaTaskParams, query: AudienceQuery },
      )
      // Progresso é escrito pelo Pinta/Estúdio; IDs e transições são validados.
      .patch(
        '/tasks/:taskId/progress',
        async ({ headers, params, body, query }) => ({
          task: await deps.updateTaskProgress.execute(
            resolveUserId(headers),
            query.audience ?? 'adult',
            params.taskId,
            body,
          ),
        }),
        { body: PensaTaskProgressBody, params: PensaTaskParams, query: AudienceQuery },
      )
  )
}
