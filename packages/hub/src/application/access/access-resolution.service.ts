import type { AccessConfig } from '../../domain/access/access-config'
import type { MembersGateway } from '../../domain/ports/members-gateway.port'
import type { Audience, Channel, Space } from '../../domain/space/space'
import type { MicroCache } from '../../infrastructure/cache/micro-cache'

/** Ator resolvido dos headers `X-Auth-User-*` injetados pelo gateway. */
export interface Actor {
  userId: string
  role: string | undefined
  status: string | undefined
  /** Equipe interna (superadmin/admin/staff): bypass total de acesso. */
  privileged: boolean
}

interface CourseAccess {
  granted: Set<string>
  hasMaster: boolean
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

  /** Filtra uma LISTA de servidores numa só ida ao members (batch dos courseRefs). */
  async filterVisibleSpaces(actor: Actor, spaces: Space[]): Promise<Space[]> {
    if (actor.privileged) return spaces
    const courseRefs = [
      ...new Set(
        spaces
          .filter((s) => s.accessConfig.visibility === 'course_gated')
          .flatMap((s) => s.accessConfig.courses),
      ),
    ]
    const access = courseRefs.length
      ? await this.resolveCourseAccess(actor.userId, courseRefs)
      : { granted: new Set<string>(), hasMaster: false }
    return spaces.filter((s) => this.evaluate(s.accessConfig, actor, s.audience, access))
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
    const gated = channels.filter((c) => c.accessConfig?.visibility === 'course_gated')
    const courseRefs = [...new Set(gated.flatMap((c) => c.accessConfig?.courses ?? []))]
    const access = courseRefs.length
      ? await this.resolveCourseAccess(actor.userId, courseRefs)
      : { granted: new Set<string>(), hasMaster: false }
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
    if (access.visibility === 'course_gated') {
      const ca = await this.resolveCourseAccess(actor.userId, access.courses)
      return this.evaluate(access, actor, audience, ca)
    }
    return this.evaluate(access, actor, audience, { granted: new Set(), hasMaster: false })
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
          // A chave-mestra cobre só a vitrine adult (regra do members).
          (courseAccess.hasMaster && audience === 'adult')
        )
    }
  }

  private async resolveCourseAccess(userId: string, courseRefs: string[]): Promise<CourseAccess> {
    const key = `${userId}|${[...courseRefs].sort().join(',')}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const res = await this.members.checkAccess(userId, courseRefs)
    const value: CourseAccess = { granted: new Set(res.granted), hasMaster: res.hasMaster }
    this.cache.set(key, value)
    return value
  }

  /** Invalida o cache de um usuário (webhook de grant). */
  invalidate(userId: string): void {
    this.cache.invalidateUser(userId)
  }
}
