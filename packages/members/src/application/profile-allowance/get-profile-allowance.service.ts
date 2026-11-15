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
    private readonly courses?: Pick<CourseRepository, 'findAccessibleCoursesBySlugs'>,
  ) {}

  async execute(accountId: string): Promise<ProfileAllowance> {
    const now = this.clock()
    const [all, liveProfiles] = await Promise.all([
      this.entitlements.listActiveByUser(accountId, now),
      this.live?.maxProfiles(accountId, now) ?? 0,
    ])
    const active = await this.withoutParentsCourses(all)
    if (active.length === 0) return { maxProfiles: liveProfiles }
    let max = 0
    for (const e of active) {
      const m = e.snapshot.fulfillment?.maxProfiles
      if (typeof m === 'number' && m > max) max = m
    }
    return { maxProfiles: Math.max(liveProfiles, max > 0 ? max : this.opts.defaultMaxProfiles) }
  }

  /** Tira as matrículas de UM curso para pais (as da chave-mestra continuam valendo). */
  private async withoutParentsCourses<T extends { accessType: string; courseRef: string | null }>(
    active: T[],
  ): Promise<T[]> {
    if (!this.courses) return active
    const slugs = [
      ...new Set(
        active.flatMap((e) => (e.accessType === 'course' && e.courseRef ? [e.courseRef] : [])),
      ),
    ]
    if (slugs.length === 0) return active
    const parents = new Set(
      (await this.courses.findAccessibleCoursesBySlugs(slugs, 'parents')).map((c) => c.slug),
    )
    return active.filter(
      (e) => !(e.accessType === 'course' && e.courseRef && parents.has(e.courseRef)),
    )
  }
}
