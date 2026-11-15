import {
  AVATAR_CATALOG,
  type AvatarFilter,
  type AvatarSlots,
  withEars,
} from '@sistemazero/core/avatar'
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

function mesmasPecas(a: AvatarSlots, b: AvatarSlots): boolean {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}

/**
 * Grava o avatar que a pessoa montou. ESTRITO: combina pelas regras do pack e toda peça paga, da
 * festa ou de fantasia está no inventário (`assertEquippableConfig`). Passa a contar como
 * personalizado quando alguma peça muda (uma vez personalizado, fica). `accountId` é imutável.
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
    const atual = canonicalizeAvatarConfig(anterior, userId)
    const filter = input.filter ?? atual.filter
    assertEquippableConfig({ slots: input.slots, filter }, new Set(owned))
    // Personalizado = a pessoa mudou alguma peça. Só responder o filtro (a pergunta da primeira
    // vez) grava o filtro, mas o avatar continua o sorteado: a ação de aula ainda não passa.
    const mudou = !mesmasPecas(withEars(AVATAR_CATALOG, input.slots), atual.slots)
    const config = canonicalizeAvatarConfig(
      {
        version: 3,
        style: AVATAR_CHAR_STYLE,
        slots: input.slots,
        ...(filter ? { filter } : {}),
        ...(atual.customized || mudou ? { customized: true } : {}),
      },
      userId,
    )
    await this.avatar.upsertConfig(userId, accountId, audience, config, this.clock())
    return config
  }
}
