import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'

export interface AccessCheckResult {
  /** Subconjunto de `courseRefs` em que o usuário tem matrícula ATIVA específica. */
  grants: string[]
  /** O usuário tem uma chave-mestra (`all_courses`) ATIVA? (cobre só cursos adult — quem aplica é o chamador.) */
  hasMaster: boolean
}

/**
 * Resolve, num único passo, o acesso do aluno a um conjunto de cursos — consumido
 * S2S pela comunidade (`@sistemazero/hub`) para gatear servidores/canais `course_gated`.
 * Reporta FATOS (grants específicos + se há chave-mestra ativa); a REGRA de audiência
 * (a `all_courses` cobre só adult) é aplicada pelo chamador, que conhece a vitrine.
 */
export class AccessCheckService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, courseRefs: string[]): Promise<AccessCheckResult> {
    const active = await this.entitlements.listActiveByUser(userId, this.clock())
    const hasMaster = active.some((e) => e.accessType === 'all_courses')
    const owned = new Set(
      active.map((e) => e.courseRef).filter((ref): ref is string => ref !== null),
    )
    const wanted = new Set(courseRefs)
    const grants = [...wanted].filter((ref) => owned.has(ref))
    return { grants, hasMaster }
  }
}
