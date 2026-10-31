import { randomUUID } from 'node:crypto'
import { type PedidoDeRoupas, PedidoDeRoupasSchema } from '@sistemazero/arquipelago-contracts'
import { and, eq } from 'drizzle-orm'
import { AVATAR3D_PARTS } from '../../../domain/avatar/avatar3d-catalog'
import type { Database } from './db'
import { lockLearningOwner } from './learning-owner-lock'
import { avatarInventory, gamificationProfiles } from './schema'

/**
 * Só peças que alguém precisa TER vão ao inventário: as pagas (a amizade) e as da festa (B16, que
 * só o jogo concede). As grátis já são de todo mundo.
 */
const PECAS_PAGAS: ReadonlySet<string> = new Set(
  AVATAR3D_PARTS.filter((p) => p.tier !== 'free').map((p) => p.id),
)

/**
 * As roupas que o Arquipélago concede (§6.28, A21): a amizade com os moradores e a festa da
 * época. É o mesmo inventário da loja do avatar, idempotente por peça (`avatar_inventory_user_part_uq`):
 * pedir de novo nunca duplica e não cobra nada. O dono confere como nas moedas do jogo.
 */
export class ArquipelagoAvatarRepository {
  constructor(private readonly db: Database) {}

  async conceder(raw: PedidoDeRoupas, now = new Date()) {
    const pedido = PedidoDeRoupasSchema.parse(raw)
    if (pedido.pecas.some((p) => !PECAS_PAGAS.has(p)))
      return { ok: false as const, code: 'UNKNOWN_PART' as const }
    if (pedido.audience === 'adult' && pedido.userId !== pedido.accountId)
      return { ok: false as const, code: 'OWNER_MISMATCH' as const }
    return this.db.transaction(async (tx) => {
      await lockLearningOwner(tx, { userId: pedido.userId, accountId: pedido.accountId })
      const [profile] = await tx
        .select({ accountId: gamificationProfiles.accountId })
        .from(gamificationProfiles)
        .where(
          and(
            eq(gamificationProfiles.userId, pedido.userId),
            eq(gamificationProfiles.audience, pedido.audience),
          ),
        )
        .limit(1)
      if (profile && profile.accountId !== pedido.accountId)
        return { ok: false as const, code: 'OWNER_MISMATCH' as const }
      const concedidas: string[] = []
      for (const partId of [...new Set(pedido.pecas)]) {
        const nova = await tx
          .insert(avatarInventory)
          .values({
            id: randomUUID(),
            userId: pedido.userId,
            audience: pedido.audience,
            partId,
            acquiredAt: now,
          })
          .onConflictDoNothing({
            target: [avatarInventory.userId, avatarInventory.audience, avatarInventory.partId],
          })
          .returning({ id: avatarInventory.id })
        if (nova.length > 0) concedidas.push(partId)
      }
      return { ok: true as const, concedidas }
    })
  }
}
