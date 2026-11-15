import { canonicalizeAvatarConfig } from '../../domain/avatar/avatar-config'
import type { CourseAudience } from '../../domain/course/course'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { AvatarStateView } from '../mappers/views'

/**
 * O avatar do aluno NA VITRINE: o que veste (o sorteado do perfil, se nunca salvou), o que tem,
 * o filtro escolhido, a foto e o saldo. O catálogo e as regras são o `@sistemazero/core/avatar`,
 * que a tela lê direto.
 */
export class GetAvatarService {
  constructor(
    private readonly avatar: AvatarRepository,
    private readonly coins: GamificationRepository,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    privileged = false,
  ): Promise<AvatarStateView> {
    const [config, owned, balance, photoUrl] = await Promise.all([
      this.avatar.getConfig(userId, audience),
      this.avatar.listInventory(userId, audience),
      this.coins.getBalance(userId, audience),
      this.avatar.getPhotoUrl(userId, audience),
    ])
    const equipped = canonicalizeAvatarConfig(config, userId)
    return {
      style: equipped.style,
      equipped: equipped.slots,
      filter: equipped.filter ?? null,
      customized: equipped.customized === true,
      owned,
      photoUrl,
      balance,
      // Equipe = moedas VIRTUAIS ilimitadas (nunca persiste): a UI mostra ∞.
      ...(privileged ? { balanceUnlimited: true } : {}),
    }
  }
}
