import {
  AVATAR_CATALOG,
  type AvatarCatalog,
  type AvatarFilter,
  type AvatarSlots,
  avatarProblems,
  drawAvatar,
  withEars,
} from '@sistemazero/core/avatar'
import { AvatarInvalidError, AvatarPartNotOwnedError } from './avatar.errors'
import { AVATAR_CHAR_STYLE, avatarItem, needsOwnership } from './avatar3d-catalog'

/**
 * O avatar gravado (`avatar_configs.equipped`, JSON): uma peça por encaixe do pack.
 *
 * - `filter`: o que a pessoa escolheu ver no configurador (menina, menino ou todos); vale também
 *   para o "Surpreenda-me". Ausente = ainda não escolheu.
 * - `customized`: `true` quando a própria pessoa salvou uma escolha. O avatar sorteado (perfil
 *   novo ou a troca do avatar antigo) nasce sem ele. É a régua da ação de aula "personalizar o
 *   avatar".
 *
 * Leitura TOLERANTE: o que não é a versão 3 válida (o avatar antigo, `version: 2`, o legado
 * DiceBear, `null`, lixo, peça que saiu do catálogo) vira um avatar SORTEADO pela semente (o id
 * do perfil): o mesmo perfil vê sempre o mesmo até salvar. Escrita ESTRITA (`assertEquippableConfig`).
 */
export interface AvatarConfig {
  version: 3
  style: string
  slots: AvatarSlots
  filter?: AvatarFilter
  customized?: boolean
}

const FILTROS: ReadonlySet<string> = new Set(['girl', 'boy', 'all'])

export function isAvatarFilter(valor: unknown): valor is AvatarFilter {
  return typeof valor === 'string' && FILTROS.has(valor)
}

/** O avatar de quem ainda não salvou nada: sorteado, grátis e vestido, sempre o mesmo por perfil. */
export function defaultAvatarConfig(
  seed: string,
  filter?: AvatarFilter,
  catalog: AvatarCatalog = AVATAR_CATALOG,
): AvatarConfig {
  return {
    version: 3,
    style: AVATAR_CHAR_STYLE,
    slots: drawAvatar(catalog, seed, { filter: filter ?? 'all' }),
    ...(filter ? { filter } : {}),
  }
}

type Cru = {
  version?: unknown
  slots?: unknown
  filter?: unknown
  customized?: unknown
} | null

function slotsCrus(valor: unknown): AvatarSlots | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null
  const slots: AvatarSlots = {}
  for (const [slot, id] of Object.entries(valor)) {
    if (typeof id !== 'string') return null
    slots[slot] = id
  }
  return slots
}

/** Lê o que está no banco: a versão 3 válida fica; o resto vira o sorteado do perfil. */
export function canonicalizeAvatarConfig(
  raw: unknown,
  seed: string,
  catalog: AvatarCatalog = AVATAR_CATALOG,
): AvatarConfig {
  const cru = raw as Cru
  const filter = isAvatarFilter(cru?.filter) ? cru.filter : undefined
  const slots = cru?.version === 3 ? slotsCrus(cru.slots) : null
  if (slots) {
    const comOrelhas = withEars(catalog, slots)
    if (avatarProblems(catalog, comOrelhas).length === 0)
      return {
        version: 3,
        style: AVATAR_CHAR_STYLE,
        slots: comOrelhas,
        ...(filter ? { filter } : {}),
        ...(cru?.customized === true ? { customized: true } : {}),
      }
  }
  return defaultAvatarConfig(seed, filter, catalog)
}

/**
 * Confere (ESCRITA) o avatar que a pessoa quer gravar: combina pelas regras do pack, e toda peça
 * paga, da festa ou de fantasia está no inventário (a fantasia pelo id do conjunto). Peça
 * escondida da loja só fica com quem já a tem.
 */
export function assertEquippableConfig(
  config: Pick<AvatarConfig, 'slots' | 'filter'>,
  ownedIds: ReadonlySet<string>,
  catalog: AvatarCatalog = AVATAR_CATALOG,
): void {
  if (config.filter !== undefined && !isAvatarFilter(config.filter))
    throw new AvatarInvalidError('Filtro de avatar desconhecido')
  const problema = avatarProblems(catalog, withEars(catalog, config.slots))[0]
  if (problema) throw new AvatarInvalidError(descrever(problema))
  for (const id of Object.values(config.slots)) {
    const peca = catalog.parts[id]
    if (!peca) continue
    const item = peca.set ? avatarItem(peca.set, catalog) : avatarItem(id, catalog)
    if (!item) throw new AvatarInvalidError(`Peça de avatar desconhecida: ${id}`)
    if ((needsOwnership(item) || peca.hidden) && !ownedIds.has(item.id))
      throw new AvatarPartNotOwnedError()
  }
}

function descrever(p: ReturnType<typeof avatarProblems>[number]): string {
  switch (p.kind) {
    case 'missing-required':
      return `Falta a peça obrigatória: ${p.slot}`
    case 'unknown-part':
      return `Peça de avatar desconhecida: ${p.part}`
    case 'wrong-slot':
      return `Peça ${p.part} não pertence ao encaixe ${p.slot}`
    case 'conflict':
      return `Peças que não combinam: ${p.parts.join(' e ')}`
    case 'incomplete-set':
      return `Fantasia incompleta: ${p.set}`
    case 'wrong-ears':
      return 'Orelhas que não são do corpo'
  }
}
