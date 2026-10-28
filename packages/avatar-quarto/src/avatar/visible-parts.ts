import {
  AVATAR_CATEGORIES,
  AVATAR_HIDE_GROUPS,
  AVATAR_REMOVABLE_NONE,
  type AvatarCategory,
  type AvatarSlot,
} from './catalog'

type Slots = Partial<Record<string, AvatarSlot>>

/**
 * As peças que o personagem MOSTRA, `[categoria, peça]`, na ordem das categorias: sem as
 * "nenhum" e sem as escondidas por outra (o chapéu esconde o cabelo, a roupa inteira esconde a
 * parte de cima e a de baixo). É a lista que o rig desenha e a que precisa estar inteira na cena
 * antes de medir o corpo (ficar em pé e tirar a foto).
 */
export function visibleParts(slots: Slots): [AvatarCategory, string][] {
  const hidden = new Set<AvatarCategory>()
  for (const cat of Object.keys(AVATAR_HIDE_GROUPS) as AvatarCategory[]) {
    const asset = slots[cat]?.asset
    if (asset && asset !== AVATAR_REMOVABLE_NONE[cat])
      for (const h of AVATAR_HIDE_GROUPS[cat] ?? []) hidden.add(h)
  }
  const parts: [AvatarCategory, string][] = []
  for (const cat of AVATAR_CATEGORIES) {
    const asset = slots[cat]?.asset
    if (!asset || asset === AVATAR_REMOVABLE_NONE[cat] || hidden.has(cat)) continue
    parts.push([cat, asset])
  }
  return parts
}

/** Cada peça mostrada já está na cena COM a peça certa (a troca em curso ainda não conta). */
export function allPartsSettled(
  parts: readonly (readonly [string, string])[],
  settled: ReadonlyMap<string, string>,
): boolean {
  return parts.every(([cat, asset]) => settled.get(cat) === asset)
}
