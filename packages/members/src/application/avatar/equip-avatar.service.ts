import type { AvatarFilter, AvatarSlots } from '@sistemazero/core/avatar'
import {
  type AvatarConfig,
  assertEquippableConfig,
  canonicalizeAvatarConfig,
} from '../../domain/avatar/avatar-config'
import { AVATAR_CHAR_STYLE } from '../../domain/avatar/avatar3d-catalog'
import type { CourseAudience } from '../../domain/course/course'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'

export interface EquipAvatarInput {
  slots: AvatarSlots
  /** Menina, menino ou todos. Ausente = mantém o que estava. */
  filter?: AvatarFilter
}

/**
 * Grava o avatar que a pessoa montou. ESTRITO: combina pelas regras do pack e toda peça paga, da
 * festa ou de fantasia está no inventário (`assertEquippableConfig`). Gravar aqui é sempre uma
 * escolha da pessoa, então o avatar passa a contar como personalizado. `accountId` é imutável.
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
    input: EquipAvatarInput,
  ): Promise<AvatarConfig> {
    const [owned, anterior] = await Promise.all([
      this.avatar.listInventory(userId, audience),
      this.avatar.getConfig(userId, audience),
    ])
    const filter = input.filter ?? canonicalizeAvatarConfig(anterior, userId).filter
    assertEquippableConfig({ slots: input.slots, filter }, new Set(owned))
    const config = canonicalizeAvatarConfig(
      {
        version: 3,
        style: AVATAR_CHAR_STYLE,
        slots: input.slots,
        ...(filter ? { filter } : {}),
        customized: true,
      },
      userId,
    )
    await this.avatar.upsertConfig(userId, accountId, audience, config, this.clock())
    return config
  }
}
