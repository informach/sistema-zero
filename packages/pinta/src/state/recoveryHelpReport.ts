import type { PintaRecoveryHelpReport } from '../core/types'
import { getPintaStorageNamespace, type PintaPersistence } from './persistence'

/**
 * O pedido de ajuda da recuperação: o perfil, as edições guardadas e os desenhos de cada uma, e
 * quando a criança pediu. Só identifica; os bytes ficam no aparelho até a equipe pedir.
 */
export async function retainedRecoveryHelpReport(
  persistence: Pick<PintaPersistence, 'describeRetainedRecovery'>,
  names: ReadonlyMap<string, string>,
  now: Date = new Date(),
): Promise<PintaRecoveryHelpReport> {
  const operations = (await persistence.describeRetainedRecovery?.()) ?? []
  return {
    kind: 'retained-recovery',
    profile: getPintaStorageNamespace(),
    requestedAt: now.toISOString(),
    operations: operations.map(({ opId, itemIds }) => ({
      opId,
      drawings: itemIds.map((id) => ({ id, name: names.get(id) ?? null })),
    })),
  }
}
