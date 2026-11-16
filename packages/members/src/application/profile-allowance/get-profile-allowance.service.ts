import { isParentsCourse } from '@sistemazero/core/course/learner'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { LiveBenefitsPort } from '../../domain/ports/live-benefits.port'

export interface ProfileAllowance {
  /** Teto de perfis (estilo Netflix) que a CONTA pode criar na plataforma kids. */
  maxProfiles: number
}

export interface GetProfileAllowanceOptions {
  /**
   * Teto aplicado quando a conta TEM matrícula ativa mas nenhuma define
   * `maxProfiles` (compradores legados, anteriores ao campo). Protege a janela de
   * rollout até o admin preencher o campo no produto kids.
   */
  defaultMaxProfiles: number
}

/**
 * Resolve quantos PERFIS de criança a conta do responsável pode criar (consumido
 * S2S pelo `auth` ao criar um perfil — a fonte da verdade do teto é a matrícula).
 *
 * Regra: o teto efetivo é o MÁXIMO de `snapshot.fulfillment.maxProfiles` entre as
 * matrículas ATIVAS da conta (upgrade de plano vale o maior). O campo só existe em
 * produtos kids, então matrículas adultas (sem o campo) contribuem 0 naturalmente —
 * sem precisar consultar a audiência do curso. Conta SEM matrícula ativa → 0
 * (não comprou, não cria perfil). Conta COM matrícula ativa mas todas sem o campo
 * (legado) → `defaultMaxProfiles`.
 *
 * Curso PARA PAIS (15/11/2026, decisão da dona): a compra avulsa (ou de presente) de um curso
 * para pais é do responsável, não da criança. Ela não libera perfil de filho nem cai no teto do
 * legado: quem comprou só isso fica com 0 perfis (a área dos pais mostra o curso e o convite para
 * a Comunidade). A chave dos cursos Kids e as outras compras seguem a régua acima.
 */
export class GetProfileAllowanceService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly clock: () => Date,
    private readonly opts: GetProfileAllowanceOptions,
    private readonly live?: Pick<LiveBenefitsPort, 'maxProfiles'>,
    private readonly courses?: Pick<CourseRepository, 'findCoursesBySlugs'>,
  ) {}

  async execute(accountId: string): Promise<ProfileAllowance> {
    const now = this.clock()
    const [active, liveProfiles] = await Promise.all([
      this.entitlements.listActiveByUser(accountId, now),
      this.live?.maxProfiles(accountId, now) ?? 0,
    ])
    if (active.length === 0) return { maxProfiles: liveProfiles }
    let max = 0
    for (const e of active) {
      const m = e.snapshot.fulfillment?.maxProfiles
      if (typeof m === 'number' && m > max) max = m
    }
    if (max > 0) return { maxProfiles: Math.max(liveProfiles, max) }
    // Nenhuma compra define o teto. Só agora importa se elas são todas de curso para pais: aí
    // não há perfil de filho a liberar (e o teto do legado não vale).
    if (await this.onlyParentsCourses(active)) return { maxProfiles: liveProfiles }
    return { maxProfiles: Math.max(liveProfiles, this.opts.defaultMaxProfiles) }
  }

  /**
   * Todas as matrículas são de UM curso para pais? O curso conta em QUALQUER status (a compra
   * pode vir antes da publicação). Falha na leitura vale "não": a régua de antes, para nunca
   * travar a criação de perfil de quem comprou para a criança.
   */
  private async onlyParentsCourses(
    active: readonly { accessType: string; courseRef: string | null }[],
  ): Promise<boolean> {
    if (!this.courses) return false
    const slugs: string[] = []
    for (const e of active) {
      if (e.accessType !== 'course' || !e.courseRef) return false
      slugs.push(e.courseRef)
    }
    try {
      const found = await this.courses.findCoursesBySlugs([...new Set(slugs)])
      const parents = new Set(found.filter((c) => isParentsCourse(c)).map((c) => c.slug))
      return slugs.every((slug) => parents.has(slug))
    } catch {
      return false
    }
  }
}
