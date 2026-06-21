import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'

export interface AccessCheckResult {
  /** Subconjunto de `courseRefs` em que o usuário tem matrícula ATIVA específica (de CURSO). */
  grants: string[]
  /** Chave-mestra ADULTA (`all_courses`) ATIVA? Cobre só cursos adult — quem aplica é o chamador. */
  hasMaster: boolean
  /** Chave-mestra KIDS (`all_kids_courses`) ATIVA? Cobre só cursos kids — idem. */
  hasMasterKids: boolean
  /** Chaves de COMUNIDADE ativas (entitlement `community`; o `courseRef` guarda a chave). */
  communities: string[]
}

/**
 * Resolve, num único passo, o acesso do aluno a um conjunto de cursos — consumido
 * S2S pela comunidade (`@sistemazero/hub`) para gatear servidores/canais `course_gated`.
 * Reporta FATOS (grants específicos + chaves-mestra ativas POR audiência); a REGRA
 * (cada chave-mestra cobre só a sua vitrine) é aplicada pelo chamador, que conhece a audiência.
 */
export class AccessCheckService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, courseRefs: string[]): Promise<AccessCheckResult> {
    const active = await this.entitlements.listActiveByUser(userId, this.clock())
    const hasMaster = active.some((e) => e.accessType === 'all_courses')
    const hasMasterKids = active.some((e) => e.accessType === 'all_kids_courses')
    // `courseRef` é a chave do recurso; separamos por accessType (curso × comunidade).
    const refsByType = (type: string): string[] =>
      active
        .filter((e) => e.accessType === type)
        .map((e) => e.courseRef)
        .filter((ref): ref is string => ref !== null)
    const owned = new Set(refsByType('course'))
    const communities = [...new Set(refsByType('community'))]
    const wanted = new Set(courseRefs)
    const grants = [...wanted].filter((ref) => owned.has(ref))
    return { grants, hasMaster, hasMasterKids, communities }
  }
}
