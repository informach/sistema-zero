import { AvatarInvalidError, AvatarPartNotOwnedError } from './avatar.errors'
import {
  AVATAR_CATEGORIES,
  AVATAR_CATEGORY_SET,
  AVATAR_CHAR_STYLE,
  AVATAR_PALETTE_SETS,
  AVATAR3D_PARTS_BY_ID,
  type AvatarCategory,
  type AvatarSlot,
  DEFAULT_AVATAR_SLOTS,
} from './avatar3d-catalog'

/**
 * Config EQUIPADA do avatar 3D: estilo (versão do personagem base, p/ forward-compat)
 * + uma peça (e cor) escolhida por categoria. JSON opaco persistido em
 * `avatar_configs.equipped`. Leitura é TOLERANTE (categoria faltando/peça ou cor
 * desconhecida → cai no default no render); escrita é ESTRITA (`assertEquippableConfig`).
 *
 * `version: 2` discrimina o config 3D do legado DiceBear (`{style:'adventurer',parts}`):
 * `canonicalize` trata qualquer coisa sem `version:2` como legado → default 3D (sem
 * migração de dados; o JSON velho é inócuo até ser sobrescrito na 1ª gravação).
 */
export interface AvatarConfig {
  version: 2
  style: string
  slots: Partial<Record<AvatarCategory, AvatarSlot>>
}

/** Avatar inicial GRÁTIS — determinístico (sem `Date.now`/random). */
export function defaultAvatarConfig(): AvatarConfig {
  return { version: 2, style: AVATAR_CHAR_STYLE, slots: cloneDefaultSlots() }
}

function cloneDefaultSlots(): Partial<Record<AvatarCategory, AvatarSlot>> {
  const slots: Partial<Record<AvatarCategory, AvatarSlot>> = {}
  for (const category of AVATAR_CATEGORIES) {
    const def = DEFAULT_AVATAR_SLOTS[category]
    slots[category] =
      def.color !== undefined ? { asset: def.asset, color: def.color } : { asset: def.asset }
  }
  return slots
}

/** Forma TOLERANTE de leitura (config v2, legado DiceBear, null ou lixo do banco). */
type UnknownConfig = {
  version?: unknown
  slots?: Record<string, { asset?: unknown; color?: unknown } | null | undefined>
} | null

/**
 * Valida (ESCRITA) que toda peça equipada existe no catálogo, está na categoria certa,
 * é grátis OU possuída, e (se houver cor) a cor está na paleta da categoria. Estrito de
 * propósito: o servidor é o portão — uma peça paga só entra na config se o inventário a
 * tiver. `ownedPartIds` = inventário do aluno (peças grátis NÃO precisam estar lá).
 */
export function assertEquippableConfig(
  config: AvatarConfig,
  ownedPartIds: ReadonlySet<string>,
): void {
  for (const [category, slot] of Object.entries(config.slots)) {
    if (!slot) continue
    if (!AVATAR_CATEGORY_SET.has(category)) {
      throw new AvatarInvalidError(`Categoria de avatar desconhecida: ${category}`)
    }
    const part = AVATAR3D_PARTS_BY_ID.get(slot.asset)
    if (!part) throw new AvatarInvalidError(`Peça de avatar desconhecida: ${slot.asset}`)
    if (part.category !== category) {
      throw new AvatarInvalidError(`Peça ${slot.asset} não pertence à categoria ${category}`)
    }
    if (part.tier === 'coins' && !ownedPartIds.has(slot.asset)) {
      throw new AvatarPartNotOwnedError()
    }
    if (slot.color !== undefined) {
      const palette = AVATAR_PALETTE_SETS[category as AvatarCategory]
      if (!palette) throw new AvatarInvalidError(`A categoria ${category} não aceita cor`)
      if (!palette.has(slot.color.toLowerCase())) {
        throw new AvatarInvalidError(`Cor inválida para ${category}: ${slot.color}`)
      }
    }
  }
}

/**
 * Normaliza uma config crua (do banco/cliente) para render: descarta categorias/peças/
 * cores desconhecidas e preenche o que falta com o default GRÁTIS — o avatar nunca quebra
 * (forward-compat). Config sem `version:2` (legado DiceBear/null/lixo) → default 3D inteiro.
 */
export function canonicalizeAvatarConfig(raw: AvatarConfig | null): AvatarConfig {
  const unknown = raw as UnknownConfig
  const rawSlots = unknown && unknown.version === 2 ? unknown.slots : undefined
  const slots: Partial<Record<AvatarCategory, AvatarSlot>> = {}
  for (const category of AVATAR_CATEGORIES) {
    const def = DEFAULT_AVATAR_SLOTS[category]
    const candidate = rawSlots?.[category]
    const candAsset = typeof candidate?.asset === 'string' ? candidate.asset : undefined
    const part = candAsset ? AVATAR3D_PARTS_BY_ID.get(candAsset) : undefined
    const asset = part && part.category === category ? (candAsset as string) : def.asset

    const palette = AVATAR_PALETTE_SETS[category]
    let color: string | undefined
    if (palette) {
      const candColor =
        typeof candidate?.color === 'string' ? candidate.color.toLowerCase() : undefined
      color = candColor && palette.has(candColor) ? candColor : def.color
    }
    slots[category] = color !== undefined ? { asset, color } : { asset }
  }
  return { version: 2, style: AVATAR_CHAR_STYLE, slots }
}
