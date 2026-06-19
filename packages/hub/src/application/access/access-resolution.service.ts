import type { AccessConfig } from '../../domain/access/access-config'
import type { MembersGateway } from '../../domain/ports/members-gateway.port'
import type { Audience, Channel, Space } from '../../domain/space/space'
import type { MicroCache } from '../../infrastructure/cache/micro-cache'

/** Ator resolvido dos headers `X-Auth-User-*` injetados pelo gateway. */
export interface Actor {
  /** Identidade de DADOS: autor de tópicos/comentários, reações, "novidades". Em
   *  sessão de perfil (estilo Netflix) é o PERFIL de criança (x-auth-user-id). */
  userId: string
  /** Conta do responsável para resolver o ACESSO (matrícula). Em sessão de perfil é
   *  o `x-auth-account-id`; fora dela cai no próprio `userId` (a conta É o id). */
  accountId: string
  /** Primeiro nome do AUTOR (perfil de criança) — do header confiável `x-auth-profile-name`
   *  (injetado pelo gateway da claim `pfl.name`), cai no nome da conta. Usado na vitrine
   *  (Mural) como `authorDisplayName` — NUNCA vindo do corpo da requisição. */
  displayName: string
  role: string | undefined
  status: string | undefined
  /** Equipe interna (superadmin/admin/staff): bypass total de acesso. */
  privileged: boolean
}

interface CourseAccess {
  granted: Set<string>
  hasMaster: boolean
  hasMasterKids: boolean
  /** Chaves de comunidade ativas do ator (entitlement `community`). */
  communities: Set<string>
}

type AccessRefs = {
  courseRefs: string[]
  communityRefs: string[]
}

/** Acesso "vazio" (nenhum espaço gated pra resolver). */
const NO_COURSE_ACCESS: CourseAccess = {
  granted: new Set<string>(),
  hasMaster: false,
  hasMasterKids: false,
  communities: new Set<string>(),
}

/**
 * Decide se um ator enxerga um servidor/canal. Ordem: staff bypass → public →
 * role_gated → course_gated (S2S no members, com micro-cache). O CANAL faz AND com
 * o SPACE (só estreita, nunca amplia — invariante de segurança); canal sem
 * accessConfig herda o veredito do space.
 */
export class AccessResolutionService {
  constructor(
    private readonly members: MembersGateway,
    private readonly cache: MicroCache<CourseAccess>,
  ) {}

  private collectAccessRefs(
    items: Array<Pick<AccessConfig, 'visibility' | 'courses' | 'communities'>>,
  ): AccessRefs {
    const courseRefs = new Set<string>()
    const communityRefs = new Set<string>()
    for (const item of items) {
      if (item.visibility === 'course_gated') {
        for (const course of item.courses) courseRefs.add(course)
      }
      if (item.visibility === 'community_gated') {
        for (const community of item.communities ?? []) communityRefs.add(community)
      }
    }
    return { courseRefs: [...courseRefs], communityRefs: [...communityRefs] }
  }

  /**
   * Anota cada servidor com `accessible` numa só ida ao members (batch dos
   * courseRefs) — SEM filtrar. A listagem decide se mostra um inacessível como
   * "bloqueado" (teaser) ou se o esconde.
   */
  async resolveSpaceVisibility(
    actor: Actor,
    spaces: Space[],
  ): Promise<{ space: Space; accessible: boolean }[]> {
    if (actor.privileged) return spaces.map((space) => ({ space, accessible: true }))
    const { courseRefs, communityRefs } = this.collectAccessRefs(spaces.map((s) => s.accessConfig))
    // Espaços community_gated também precisam do access-check (ele devolve as
    // `communities` do ator; `courseRefs` pode ficar vazio nesse caso).
    const needsAccess = spaces.some(
      (s) =>
        s.accessConfig.visibility === 'course_gated' ||
        s.accessConfig.visibility === 'community_gated',
    )
    const access = needsAccess
      ? await this.resolveCourseAccess(actor.accountId, courseRefs, communityRefs)
      : NO_COURSE_ACCESS
    return spaces.map((space) => ({
      space,
      accessible: this.evaluate(space.accessConfig, actor, space.audience, access),
    }))
  }

  /** Filtra uma LISTA de servidores numa só ida ao members (batch dos courseRefs). */
  async filterVisibleSpaces(actor: Actor, spaces: Space[]): Promise<Space[]> {
    const annotated = await this.resolveSpaceVisibility(actor, spaces)
    return annotated.filter((a) => a.accessible).map((a) => a.space)
  }

  async canAccessSpace(actor: Actor, space: Space): Promise<boolean> {
    if (actor.privileged) return true
    return this.evaluateWithFetch(space.accessConfig, actor, space.audience)
  }

  async canAccessChannel(actor: Actor, space: Space, channel: Channel): Promise<boolean> {
    if (!(await this.canAccessSpace(actor, space))) return false
    if (actor.privileged) return true
    // Canal sem accessConfig herda o space (já aprovado acima).
    if (!channel.accessConfig) return true
    return this.evaluateWithFetch(channel.accessConfig, actor, space.audience)
  }

  /** Filtra os canais de um servidor visível (o space já foi liberado pelo chamador). */
  async filterVisibleChannels(actor: Actor, space: Space, channels: Channel[]): Promise<Channel[]> {
    if (actor.privileged) return channels
    const gated = channels.filter(
      (c) =>
        c.accessConfig?.visibility === 'course_gated' ||
        c.accessConfig?.visibility === 'community_gated',
    )
    const needsAccess = gated.length > 0
    const { courseRefs, communityRefs } = this.collectAccessRefs(
      gated
        .map((c) => c.accessConfig)
        .filter((c): c is AccessConfig => c !== null && c !== undefined),
    )
    const access = needsAccess
      ? await this.resolveCourseAccess(actor.accountId, courseRefs, communityRefs)
      : NO_COURSE_ACCESS
    return channels.filter(
      (c) => !c.accessConfig || this.evaluate(c.accessConfig, actor, space.audience, access),
    )
  }

  // ── internos ──────────────────────────────────────────────────────────────
  private async evaluateWithFetch(
    access: AccessConfig,
    actor: Actor,
    audience: Audience,
  ): Promise<boolean> {
    if (access.visibility === 'course_gated' || access.visibility === 'community_gated') {
      // Acesso pela CONTA (sessão de perfil → x-auth-account-id); autoria pelo userId.
      // community_gated usa `access.communities` para entitlement `community`.
      const ca = await this.resolveCourseAccess(
        actor.accountId,
        access.visibility === 'course_gated' ? access.courses : [],
        access.visibility === 'community_gated' ? access.communities ?? [] : [],
      )
      return this.evaluate(access, actor, audience, ca)
    }
    return this.evaluate(access, actor, audience, NO_COURSE_ACCESS)
  }

  /** Avaliação PURA dado o resultado de acesso a cursos já carregado. */
  private evaluate(
    access: AccessConfig,
    actor: Actor,
    audience: Audience,
    courseAccess: CourseAccess,
  ): boolean {
    switch (access.visibility) {
      case 'public':
        return true
      case 'role_gated':
        return actor.role !== undefined && access.roles.includes(actor.role)
      case 'course_gated':
        return (
          access.courses.some((c) => courseAccess.granted.has(c)) ||
          // Cada chave-mestra cobre só a SUA vitrine (regra do members):
          // `all_courses` na adult, `all_kids_courses` na kids.
          (courseAccess.hasMaster && audience === 'adult') ||
          (courseAccess.hasMasterKids && audience === 'kids')
        )
      case 'community_gated':
        // Tem o acesso de ALGUMA das comunidades exigidas (entitlement `community`).
        return (access.communities ?? []).some((c) => courseAccess.communities.has(c))
    }
  }

  private async resolveCourseAccess(
    userId: string,
    courseRefs: string[],
    communityRefs: string[],
  ): Promise<CourseAccess> {
    const orderedCourses = [...new Set(courseRefs)].sort()
    const orderedCommunities = [...new Set(communityRefs)].sort()
    const key = `${userId}|c=${orderedCourses.join(',')}|m=${orderedCommunities.join(',')}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const res = await this.members.checkAccess(userId, orderedCourses, orderedCommunities)
    const value: CourseAccess = {
      granted: new Set(res.granted),
      hasMaster: res.hasMaster,
      hasMasterKids: res.hasMasterKids,
      communities: new Set(res.communities),
    }
    this.cache.set(key, value)
    return value
  }

  /** Invalida o cache de um usuário (webhook de grant). */
  invalidate(userId: string): void {
    this.cache.invalidateUser(userId)
  }
}
