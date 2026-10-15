import type {
  PensaJourneyActor,
  PensaJourneyTeamView,
  PensaJourneyView,
  PensaTeamArtItem,
} from '@sistemazero/core/pensa'
import { type CreationSummary, toCreationSummary } from '../../domain/creations/creation'
import { MAX_PROJECT_MEMBERS, type PensaProjectAccess } from '../../domain/pensa/pensa'
import {
  PensaCodeLockedError,
  PensaNotFoundError,
  PensaNotOwnerError,
  PensaTaskProgressConflictError,
} from '../../domain/pensa/pensa.errors'
import { pensaTeamRoles } from '../../domain/pensa/team'
import type { AuthGateway, ProfileIdentity } from '../../domain/ports/auth-gateway.port'
import type { CreationsRepository } from '../../domain/ports/creations-repository.port'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { GetAvatarsByProfilesService } from '../avatar/get-avatars-by-profiles.service'
import type {
  CreationDownloadTicket,
  GetCreationDownloadService,
} from '../creations/creations.service'
import type { GetGamificationService } from '../gamification/get-gamification.service'
import type { GetStudioUnlocksService } from '../studio-unlocks/get-studio-unlocks.service'

/** Teto de itens de cada lista do `team-capabilities` e do `team-art`. */
export const TEAM_CAPABILITY_CREATIONS = 200
export const TEAM_ART_LIMIT = 100

/** A leitura da jornada que o `PUT …/roles` devolve (o `PensaJourneyService` em produção). */
export interface PensaJourneyReader {
  get(actor: PensaJourneyActor, projectId: string): Promise<PensaJourneyView>
}

/** Posse das ferramentas pela CONTA (refs do catálogo; a chave-mestra de cursos NÃO conta). */
interface ToolAccess {
  studio: boolean
  pinta: boolean
  molda: boolean
}

/**
 * Os recursos de quem está no plano, para o BFF montar o snapshot de capacidades de um plano em
 * equipe: o Estúdio (posto, blocos, posse e o inventário do Pinta/Molda) de quem PROGRAMA e o
 * posto e a posse de cada pessoa das ARTES. Consumido só pelo BFF.
 */
export interface PensaTeamCapabilitiesView {
  code: {
    profileId: string
    /** Slug do posto na jornada (kids); `null` se não deu para calcular. */
    level: string | null
    blocks: string[]
    access: ToolAccess
    /** O mesmo formato dos itens de `GET /members/creations/:tool` (vivos, até 200). */
    creations: { pinta: CreationSummary[]; molda: CreationSummary[] }
  }
  art: Array<{
    profileId: string
    level: string | null
    access: { pinta: boolean; molda: boolean }
  }>
}

export interface PensaTeamServiceDeps {
  repo: PensaRepository
  journey: PensaJourneyReader
  authGateway: AuthGateway | null
  avatars: GetAvatarsByProfilesService
  accessCheck: AccessCheckService
  gamification: GetGamificationService
  studioUnlocks: GetStudioUnlocksService
  creations: CreationsRepository
  creationDownload: GetCreationDownloadService
  clock: () => Date
}

const TOOL_REFS = { studio: 'estudio-completo', pinta: 'pinta', molda: 'molda' } as const

/**
 * A EQUIPE no Pensa v2 (14/10/2026): quem está no plano, as funções (quem programa e quem faz as
 * artes), os recursos de cada um e as artes entregues em missões ("Trazer da equipe"). Toda a
 * equipe lê; só a dona define as funções. As regras das funções são as do core
 * (`effectivePensaRoles`); a régua de acesso é a do plano clássico (`findProject`: dona ou
 * quem entrou num plano ativo; quem é de fora recebe 404).
 */
export class PensaTeamService {
  constructor(private readonly deps: PensaTeamServiceDeps) {}

  private async access(actor: PensaJourneyActor, projectId: string): Promise<PensaProjectAccess> {
    const project = await this.deps.repo.findProject(projectId, actor.profileId, 'kids')
    if (!project) throw new PensaNotFoundError('Esse plano não está mais aqui.')
    return project
  }

  /** Quem está no plano: a dona primeiro (conta = a do projeto), depois quem entrou. */
  private async people(project: PensaProjectAccess) {
    const members = await this.deps.repo.listMembers(project.id)
    return [
      { profileId: project.userId, accountId: project.accountId, joinedAt: null as Date | null },
      ...members.map((member) => ({
        profileId: member.profileId,
        accountId: member.accountId,
        joinedAt: member.joinedAt as Date | null,
      })),
    ]
  }

  async team(actor: PensaJourneyActor, projectId: string): Promise<PensaJourneyTeamView> {
    const project = await this.access(actor, projectId)
    const [people, rows, codeLocked] = await Promise.all([
      this.people(project),
      this.deps.repo.listRoles(projectId),
      this.deps.repo.isCodeLocked(projectId),
    ])
    const ids = people.map((person) => person.profileId)
    // Mesma régua de privacidade da lista de membros do plano clássico: 1º nome e rosto entre
    // colegas, os dois best-effort (sem nome a tela diz "Colega"; sem foto, a inicial).
    const identities: Map<string, ProfileIdentity> = this.deps.authGateway
      ? await this.deps.authGateway.getProfileIdentities(ids).catch((error: unknown) => {
          console.warn('[pensa] identidades da equipe indisponíveis (segue como "Colega")', error)
          return new Map()
        })
      : new Map()
    const avatars: Record<string, { photoUrl: string | null }> = await this.deps.avatars
      .execute(ids, 'kids')
      .catch((error: unknown) => {
        console.warn('[pensa] rostos da equipe indisponíveis (segue sem foto)', error)
        return {}
      })
    return {
      viewerProfileId: actor.profileId,
      role: project.role,
      shareCode: project.role === 'owner' ? project.shareCode : null,
      maxMembers: MAX_PROJECT_MEMBERS,
      roles: pensaTeamRoles(project.userId, ids.slice(1), rows),
      people: people.map((person) => ({
        profileId: person.profileId,
        firstName: identities.get(person.profileId)?.firstName ?? null,
        photoUrl: avatars[person.profileId]?.photoUrl ?? null,
        owner: person.profileId === project.userId,
        joinedAt: person.joinedAt?.toISOString() ?? null,
      })),
      codeLocked,
    }
  }

  /**
   * Só a dona define as funções. Todo id precisa ser da equipe (400); trocar quem programa
   * depois de o jogo começar é 409 `PENSA_CODE_LOCKED`. Devolve a jornada atualizada.
   */
  async setRoles(
    actor: PensaJourneyActor,
    projectId: string,
    input: { code: string; art: string[] },
  ): Promise<PensaJourneyView> {
    const project = await this.access(actor, projectId)
    if (project.role !== 'owner') throw new PensaNotOwnerError()
    const outcome = await this.deps.repo.setRoles(
      projectId,
      input,
      actor.profileId,
      this.deps.clock(),
    )
    if (outcome === 'not_found') throw new PensaNotFoundError('Esse plano não está mais aqui.')
    if (outcome === 'legacy')
      throw new PensaTaskProgressConflictError(
        'Este plano usa o planejamento anterior. As funções valem nos jogos do novo Pensa.',
      )
    if (outcome === 'not_in_team')
      throw new ValidationError('Escolha só pessoas que estão na equipe deste plano.')
    if (outcome === 'code_locked') throw new PensaCodeLockedError()
    return this.deps.journey.get(actor, projectId)
  }

  async capabilities(
    actor: PensaJourneyActor,
    projectId: string,
  ): Promise<PensaTeamCapabilitiesView> {
    const project = await this.access(actor, projectId)
    const [people, rows] = await Promise.all([
      this.people(project),
      this.deps.repo.listRoles(projectId),
    ])
    const roles = pensaTeamRoles(
      project.userId,
      people.slice(1).map((person) => person.profileId),
      rows,
    )
    const accountOf = new Map(people.map((person) => [person.profileId, person.accountId]))
    const codeAccount = accountOf.get(roles.code) ?? project.accountId
    const [codeLevel, codeAccess, unlocks, pinta, molda] = await Promise.all([
      this.level(roles.code, codeAccount),
      this.toolAccess(codeAccount),
      this.deps.studioUnlocks.execute(roles.code, 'kids'),
      this.liveCreations(roles.code, 'pinta'),
      this.liveCreations(roles.code, 'molda'),
    ])
    const art = await Promise.all(
      roles.art.map(async (profileId) => {
        const accountId = accountOf.get(profileId) ?? project.accountId
        const [level, access] = await Promise.all([
          this.level(profileId, accountId),
          this.toolAccess(accountId),
        ])
        return { profileId, level, access: { pinta: access.pinta, molda: access.molda } }
      }),
    )
    return {
      code: {
        profileId: roles.code,
        level: codeLevel,
        blocks: unlocks.blocks,
        access: codeAccess,
        creations: { pinta, molda },
      },
      art,
    }
  }

  async art(actor: PensaJourneyActor, projectId: string): Promise<{ items: PensaTeamArtItem[] }> {
    await this.access(actor, projectId)
    return {
      items: await this.deps.repo.listTeamArt(projectId, actor.profileId, TEAM_ART_LIMIT),
    }
  }

  /**
   * O blob da arte entregue numa missão do plano, lido na conta de QUEM CONCLUIU (o mesmo
   * formato do `GetCreationDownloadService`). Só arte de missão do plano: nada da galeria
   * pessoal da colega. Tarefa de fora do plano, não concluída ou sem arte: 404.
   */
  async artDownload(
    actor: PensaJourneyActor,
    projectId: string,
    taskId: string,
  ): Promise<CreationDownloadTicket> {
    await this.access(actor, projectId)
    const task = await this.deps.repo.findTeamArtTask(projectId, taskId)
    if (!task) throw new PensaNotFoundError('Essa arte não está mais no plano.')
    return this.deps.creationDownload.execute(task.completedByProfileId, task.tool, task.assetId)
  }

  private async level(profileId: string, accountId: string): Promise<string | null> {
    try {
      const view = await this.deps.gamification.execute(profileId, accountId, { audience: 'kids' })
      return view.level.slug
    } catch (error) {
      console.warn('[pensa] posto de uma pessoa da equipe indisponível', error)
      return null
    }
  }

  private async toolAccess(accountId: string): Promise<ToolAccess> {
    const refs = Object.values(TOOL_REFS)
    const result = await this.deps.accessCheck.execute(accountId, refs)
    const owns = (ref: string) => result.grants.includes(ref) || result.communities.includes(ref)
    return {
      studio: owns(TOOL_REFS.studio),
      pinta: owns(TOOL_REFS.pinta),
      molda: owns(TOOL_REFS.molda),
    }
  }

  private async liveCreations(profileId: string, tool: 'pinta' | 'molda') {
    const items = await this.deps.creations.list(profileId, tool)
    return items
      .filter((item) => !item.deletedAt)
      .slice(0, TEAM_CAPABILITY_CREATIONS)
      .map(toCreationSummary)
  }
}
