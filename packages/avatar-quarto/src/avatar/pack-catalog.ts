/**
 * O catálogo do avatar do pack para quem só pode importar do `avatar-quarto` (o jogo Arquipélago
 * Vagalume não importa o core direto). Repassa o `@sistemazero/core/avatar` e acrescenta a leitura
 * tolerante do avatar que chega da plataforma.
 */
import {
  AVATAR_CATALOG,
  type AvatarCatalog,
  type AvatarGameClip,
  type AvatarSkeleton,
  type AvatarSlots,
  avatarFileUrl,
  type BodyMeasures,
  bodyMeasures,
  drawAvatar,
  type PhysicalBody,
  physicalBody,
  withEars,
} from '@sistemazero/core/avatar'

export {
  AVATAR_CATALOG,
  type AvatarCatalog,
  type AvatarGameClip,
  type AvatarSkeleton,
  type AvatarSlots,
  avatarFileUrl,
  type BodyMeasures,
  bodyMeasures,
  drawAvatar,
  type PhysicalBody,
  physicalBody,
  withEars,
}

/** O nome de uma peça do pack (o id, se ela não estiver no catálogo). */
export function nomeDaPecaDoPack(id: string, catalog: AvatarCatalog = AVATAR_CATALOG): string {
  return catalog.parts[id]?.label ?? catalog.sets[id]?.label ?? id
}

/**
 * O avatar que veio da plataforma, só com o que o pack conhece: cada encaixe com uma peça do
 * catálogo DAQUELE encaixe (o resto, como o formato antigo `{asset, color}`, sai), corpo e rosto
 * de partida quando faltam, e as orelhas da cor do corpo. Nunca lança: avatar estranho vira o de
 * partida.
 */
export function avatarDoPack(
  slots: Readonly<Record<string, unknown>> | null | undefined,
  catalog: AvatarCatalog = AVATAR_CATALOG,
): AvatarSlots {
  const limpo: AvatarSlots = {}
  for (const [slot, id] of Object.entries(slots ?? {}))
    if (typeof id === 'string' && catalog.parts[id]?.slot === slot) limpo[slot] = id
  for (const slot of ['corpo', 'rosto'] as const)
    if (!limpo[slot] && catalog.rules.default[slot]) limpo[slot] = catalog.rules.default[slot]
  return withEars(catalog, limpo)
}
