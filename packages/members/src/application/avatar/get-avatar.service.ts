import { canonicalizeAvatarConfig } from '../../domain/avatar/avatar-config'
import {
  AVATAR_CATEGORIES,
  AVATAR_CATEGORY_PALETTES,
  AVATAR_HIDE_GROUPS,
  AVATAR_REMOVABLE_NONE,
  AVATAR3D_PARTS,
  type AvatarCategory,
} from '../../domain/avatar/avatar3d-catalog'
import type { CourseAudience } from '../../domain/course/course'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { AvatarStateView } from '../mappers/views'

/**
 * Estado do avatar do aluno NA VITRINE: config equipada (com defaults preenchidos),
 * catálogo COMPLETO com `owned`/`locked`/`price`, as PALETAS por categoria, o mapa de
 * oclusão (chapéu→cabelo), os ids "nenhum" das removíveis e o saldo de moedas (p/ a
 * lojinha). O members é a fonte da verdade do "existe + custa + possui + paleta"; o app
 * kids casa pelo `id` com o rótulo PT + URL do GLB (como BADGE_SLUGS × BADGE_INFO).
 */
export class GetAvatarService {
  constructor(
    private readonly avatar: AvatarRepository,
    private readonly coins: GamificationRepository,
  ) {}

  async execute(userId: string, audience: CourseAudience): Promise<AvatarStateView> {
    const [config, owned, balance, photoUrl] = await Promise.all([
      this.avatar.getConfig(userId, audience),
      this.avatar.listInventory(userId, audience),
      this.coins.getBalance(userId, audience),
      this.avatar.getPhotoUrl(userId, audience),
    ])
    const equipped = canonicalizeAvatarConfig(config)
    const ownedSet = new Set(owned)
    const parts = AVATAR3D_PARTS.map((p) => ({
      id: p.id,
      category: p.category,
      tier: p.tier,
      price: p.price,
      owned: p.tier === 'free' || ownedSet.has(p.id),
      locked: p.tier === 'coins' && !ownedSet.has(p.id),
    }))
    const palettes: Partial<Record<AvatarCategory, string[]>> = {}
    for (const category of AVATAR_CATEGORIES) {
      const palette = AVATAR_CATEGORY_PALETTES[category]
      if (palette) palettes[category] = [...palette]
    }
    return {
      style: equipped.style,
      equipped: equipped.slots,
      parts,
      palettes,
      hideGroups: AVATAR_HIDE_GROUPS,
      removable: AVATAR_REMOVABLE_NONE,
      photoUrl,
      balance,
    }
  }
}
