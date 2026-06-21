import {
  EntitlementConflictError,
  EntitlementNotFoundError,
  InvalidEntitlementCommandError,
} from '../../domain/entitlement/entitlement.errors'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import { type AdminEntitlementView, toAdminEntitlementView } from '../mappers/admin-views'

export type EntitlementAction = 'revoke' | 'expire' | 'extend'

export interface ManageEntitlementCommand {
  id: string
  action: EntitlementAction
  /** Obrigatório p/ `extend` (nova validade). ISO já parseada na borda. */
  expiresAt?: Date
}

/**
 * Gestão admin de uma matrícula específica: revogar (corte imediato), expirar (fim
 * natural) ou estender a validade. `extend` numa matrícula REVOGADA reativa
 * explicitamente (`reactivate`) — é o caminho documentado de recuperação ("use
 * estender"); antes era um no-op silencioso (o `extendTo` nunca toca `revoked`,
 * regra do ciclo de assinatura). Carrega por id, aplica a transição no agregado e
 * persiste com concorrência otimista (`version`). Re-lê p/ devolver a versão atual.
 */
export class ManageEntitlementService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(cmd: ManageEntitlementCommand): Promise<AdminEntitlementView> {
    const entitlement = await this.entitlements.findById(cmd.id)
    if (!entitlement) throw new EntitlementNotFoundError()

    const now = this.clock()
    switch (cmd.action) {
      case 'revoke':
        entitlement.revoke(now)
        break
      case 'expire':
        entitlement.expire(now)
        break
      case 'extend':
        if (!cmd.expiresAt) {
          throw new InvalidEntitlementCommandError('A ação "extend" exige expiresAt')
        }
        // A nova validade precisa estar no FUTURO: estender com uma data passada não
        // reativa (o acesso continua negado) e antes virava um no-op silencioso que
        // ainda respondia 200 e movia o `expiresAt` p/ uma data morta. 400 claro.
        if (cmd.expiresAt.getTime() <= now.getTime()) {
          throw new InvalidEntitlementCommandError(
            'A nova validade de "extend" precisa estar no futuro',
          )
        }
        // `extend` numa matrícula NÃO-ativa (revogada OU expirada) reativa explicitamente
        // — é o caminho documentado de recuperação. Numa ativa, só estende p/ frente.
        if (entitlement.status === 'active') entitlement.extendTo(cmd.expiresAt, now)
        else entitlement.reactivate(cmd.expiresAt, now)
        break
    }

    const ok = await this.entitlements.update(entitlement)
    if (!ok) throw new EntitlementConflictError('Conflito de concorrência ao atualizar a matrícula')

    const fresh = await this.entitlements.findById(cmd.id)
    return toAdminEntitlementView(fresh ?? entitlement)
  }
}
