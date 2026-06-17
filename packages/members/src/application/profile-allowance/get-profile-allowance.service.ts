import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'

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
 */
export class GetProfileAllowanceService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly clock: () => Date,
    private readonly opts: GetProfileAllowanceOptions,
  ) {}

  async execute(accountId: string): Promise<ProfileAllowance> {
    const active = await this.entitlements.listActiveByUser(accountId, this.clock())
    if (active.length === 0) return { maxProfiles: 0 }
    let max = 0
    for (const e of active) {
      const m = e.snapshot.fulfillment?.maxProfiles
      if (typeof m === 'number' && m > max) max = m
    }
    return { maxProfiles: max > 0 ? max : this.opts.defaultMaxProfiles }
  }
}
