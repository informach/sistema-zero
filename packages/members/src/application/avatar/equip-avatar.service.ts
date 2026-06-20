import {
  type AvatarConfig,
  assertEquippableConfig,
  canonicalizeAvatarConfig,
} from '../../domain/avatar/avatar-config'
import type { CourseAudience } from '../../domain/course/course'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'

/**
 * Salva a config equipada do avatar. ESTRITO: toda peça precisa existir, estar na
 * camada certa e ser grátis OU possuída (`assertEquippableConfig`) — o servidor é o
 * portão (cliente não equipa o que não tem). Persiste a config CANONICALIZADA
 * (defaults preenchidos, peças desconhecidas descartadas). `accountId` é imutável.
 */
export class EquipAvatarService {
  constructor(
    private readonly avatar: AvatarRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    config: AvatarConfig,
  ): Promise<AvatarConfig> {
    const owned = new Set(await this.avatar.listInventory(userId, audience))
    assertEquippableConfig(config, owned)
    const canonical = canonicalizeAvatarConfig(config)
    await this.avatar.upsertConfig(userId, accountId, audience, canonical, this.clock())
    return canonical
  }
}
