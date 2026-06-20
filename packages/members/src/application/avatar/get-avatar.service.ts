import { canonicalizeAvatarConfig } from '../../domain/avatar/avatar-config'
import { AVATAR_PARTS } from '../../domain/avatar/parts-catalog'
import type { CourseAudience } from '../../domain/course/course'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { AvatarStateView } from '../mappers/views'

/**
 * Estado do avatar do aluno NA VITRINE: config equipada (com defaults preenchidos),
 * catálogo COMPLETO com `owned`/`locked`/`price` e o saldo de moedas (p/ a lojinha).
 * O members é a fonte da verdade do "existe + custa + possui"; o app kids casa pelo
 * `id` com o rótulo PT + mapeamento DiceBear (como BADGE_SLUGS × BADGE_INFO).
 */
export class GetAvatarService {
  constructor(
    private readonly avatar: AvatarRepository,
    private readonly coins: GamificationRepository,
  ) {}

  async execute(userId: string, audience: CourseAudience): Promise<AvatarStateView> {
    const [config, owned, balance] = await Promise.all([
      this.avatar.getConfig(userId, audience),
      this.avatar.listInventory(userId, audience),
      this.coins.getBalance(userId, audience),
    ])
    const equipped = canonicalizeAvatarConfig(config)
    const ownedSet = new Set(owned)
    const parts = AVATAR_PARTS.map((p) => ({
      id: p.id,
      layer: p.layer,
      tier: p.tier,
      price: p.price,
      owned: p.tier === 'free' || ownedSet.has(p.id),
      locked: p.tier === 'coins' && !ownedSet.has(p.id),
    }))
    return { style: equipped.style, equipped: equipped.parts, parts, balance }
  }
}
