/**
 * As regras de combinação do avatar, as mesmas do pack Cute Characters.
 *
 * O avatar é um encaixe → peça (`AvatarSlots`). Corpo e rosto são obrigatórios; as orelhas não são
 * escolha: entram com a cor do corpo e somem debaixo de capuz e de fantasia.
 *
 * Quem decide o que vai junto:
 * 1. uma peça por encaixe;
 * 2. a fantasia é um conjunto: vestir uma tira tudo o que não é corpo e rosto, e vestir qualquer
 *    outra coisa tira a fantasia inteira;
 * 3. os grupos que não se misturam (`GROUP_CONFLICTS`), tirados do sorteio do pack: o chapéu comum
 *    não vai com cabelo, o capuz cobre também orelhas, óculos e acessório de rosto, o chapéu sobre
 *    o cabelo só aceita os cabelos feitos para ele, a roupa inteira não vai com roupa de cima nem
 *    com calça, e assim por diante;
 * 4. os pares de peças que não combinam (`rules.incompatible`), medidos pela arte peça a peça.
 *
 * Ao vestir, a peça escolhida por último fica e as que não combinam com ela saem (`equipPart`).
 * O servidor confere a mesma coisa ao gravar (`avatarProblems`).
 */
import type { AvatarCatalog, AvatarPartEntry } from './types'

/** Encaixe → id da peça. */
export type AvatarSlots = Record<string, string>

/** Os encaixes que todo avatar tem. */
export const REQUIRED_SLOTS = ['corpo', 'rosto'] as const

/**
 * Grupos que não vão juntos no mesmo avatar (vale nos dois sentidos). São os grupos que o sorteio
 * do pack nunca liga juntos, sem contar os que dividem o encaixe (esses já se excluem).
 */
export const GROUP_CONFLICTS: readonly (readonly [string, string])[] = [
  ['roupa_inteira', 'roupa_cima'],
  ['roupa_inteira', 'calca'],
  ['roupa_inteira', 'bermuda'],
  ['roupa_inteira', 'meias'],
  ['calca', 'bermuda'],
  ['calca', 'meias'],
  ['chapeu', 'cabelo'],
  ['chapeu', 'cabelo_sob_chapeu'],
  ['capuz', 'cabelo'],
  ['capuz', 'cabelo_sob_chapeu'],
  ['capuz', 'oculos'],
  ['capuz', 'acessorio_rosto'],
  ['chapeu_sobre_cabelo', 'cabelo'],
  ['chapeu_sobre_cabelo', 'oculos'],
]

const conflitos = new Map<string, Set<string>>()
for (const [a, b] of GROUP_CONFLICTS) {
  if (!conflitos.has(a)) conflitos.set(a, new Set())
  if (!conflitos.has(b)) conflitos.set(b, new Set())
  conflitos.get(a)?.add(b)
  conflitos.get(b)?.add(a)
}

/** O grupo que esconde as orelhas (o capuz cobre a cabeça inteira). */
const ESCONDE_ORELHAS = 'capuz'
const SLOT_DA_FANTASIA = 'fantasia'
const SLOT_DAS_ORELHAS = 'orelhas'

export function partOf(
  catalog: AvatarCatalog,
  id: string | undefined,
): AvatarPartEntry | undefined {
  return id ? catalog.parts[id] : undefined
}

/** Os ids das peças de um conjunto de fantasia, encaixe a encaixe. */
export function setSlots(catalog: AvatarCatalog, setId: string): AvatarSlots | null {
  const conjunto = catalog.sets[setId]
  if (!conjunto) return null
  return Object.fromEntries(conjunto.parts.map(({ slot, part }) => [slot, part]))
}

/** O conjunto de fantasia que o avatar está vestindo, se estiver. */
export function wornSet(catalog: AvatarCatalog, slots: AvatarSlots): string | null {
  for (const id of Object.values(slots)) {
    const set = partOf(catalog, id)?.set
    if (set) return set
  }
  return null
}

/** `true` quando as duas peças não podem estar juntas no mesmo avatar. */
export function partsConflict(catalog: AvatarCatalog, a: string, b: string): boolean {
  if (a === b) return false
  const pa = partOf(catalog, a)
  const pb = partOf(catalog, b)
  if (!pa || !pb) return false
  if (pa.slot === pb.slot) return true
  // A fantasia é um bloco: as partes do mesmo conjunto vão juntas; com qualquer outra coisa que
  // não seja corpo e rosto, não.
  if (pa.set || pb.set) {
    if (pa.set && pa.set === pb.set) return false
    const outra = pa.set ? pb : pa
    return catalog.rules.setDisables.includes(outra.slot)
  }
  if (conflitos.get(pa.group)?.has(pb.group)) return true
  return catalog.rules.incompatible[a]?.includes(b) ?? false
}

/**
 * Veste uma peça: a escolhida fica e o que não combina com ela sai. Peça de fantasia veste o
 * conjunto inteiro. Corpo troca as orelhas junto. Peça desconhecida não muda nada.
 */
export function equipPart(catalog: AvatarCatalog, slots: AvatarSlots, partId: string): AvatarSlots {
  const parte = partOf(catalog, partId)
  if (!parte) return slots
  const novas: AvatarSlots = parte.set
    ? (setSlots(catalog, parte.set) ?? {})
    : { [parte.slot]: partId }
  const resultado: AvatarSlots = {}
  for (const [slot, id] of Object.entries(slots)) {
    if (slot in novas || slot === SLOT_DAS_ORELHAS) continue
    if (Object.values(novas).some((nova) => partsConflict(catalog, nova, id))) continue
    resultado[slot] = id
  }
  return withEars(catalog, { ...resultado, ...novas })
}

/** Tira a peça do encaixe (corpo e rosto não saem; a fantasia sai inteira). */
export function removeSlot(catalog: AvatarCatalog, slots: AvatarSlots, slot: string): AvatarSlots {
  if ((REQUIRED_SLOTS as readonly string[]).includes(slot)) return slots
  const set = partOf(catalog, slots[slot])?.set
  const resultado: AvatarSlots = {}
  for (const [s, id] of Object.entries(slots)) {
    if (s === slot) continue
    if (set && partOf(catalog, id)?.set === set) continue
    resultado[s] = id
  }
  return withEars(catalog, resultado)
}

/** Põe as orelhas da cor do corpo, ou tira, quando um capuz ou a fantasia cobrem a cabeça. */
export function withEars(catalog: AvatarCatalog, slots: AvatarSlots): AvatarSlots {
  const { [SLOT_DAS_ORELHAS]: _orelhas, ...resto } = slots
  const corpo = slots.corpo
  const orelhas = corpo ? catalog.rules.earsByBody[corpo] : undefined
  const cobertas =
    wornSet(catalog, resto) !== null ||
    Object.values(resto).some((id) => partOf(catalog, id)?.group === ESCONDE_ORELHAS)
  return orelhas && !cobertas ? { ...resto, [SLOT_DAS_ORELHAS]: orelhas } : resto
}

export type AvatarProblem =
  | { kind: 'missing-required'; slot: string }
  | { kind: 'unknown-part'; slot: string; part: string }
  | { kind: 'wrong-slot'; slot: string; part: string }
  | { kind: 'conflict'; parts: [string, string] }
  | { kind: 'incomplete-set'; set: string }
  | { kind: 'wrong-ears'; part: string | null }

/** Tudo o que está errado num avatar (lista vazia = válido). É a régua do servidor ao gravar. */
export function avatarProblems(catalog: AvatarCatalog, slots: AvatarSlots): AvatarProblem[] {
  const problemas: AvatarProblem[] = []
  for (const slot of REQUIRED_SLOTS) {
    if (!slots[slot]) problemas.push({ kind: 'missing-required', slot })
  }
  const ids: string[] = []
  for (const [slot, id] of Object.entries(slots)) {
    const parte = partOf(catalog, id)
    if (!parte) problemas.push({ kind: 'unknown-part', slot, part: id })
    else if (parte.slot !== slot) problemas.push({ kind: 'wrong-slot', slot, part: id })
    else if (slot !== SLOT_DAS_ORELHAS) ids.push(id)
  }
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i] as string
      const b = ids[j] as string
      if (partsConflict(catalog, a, b)) problemas.push({ kind: 'conflict', parts: [a, b] })
    }
  }
  const set = wornSet(catalog, slots)
  if (set) {
    const inteiro = setSlots(catalog, set) ?? {}
    if (Object.entries(inteiro).some(([slot, id]) => slots[slot] !== id))
      problemas.push({ kind: 'incomplete-set', set })
  }
  const esperado = withEars(catalog, slots)[SLOT_DAS_ORELHAS] ?? null
  if ((slots[SLOT_DAS_ORELHAS] ?? null) !== esperado)
    problemas.push({ kind: 'wrong-ears', part: slots[SLOT_DAS_ORELHAS] ?? null })
  return problemas
}

/** O encaixe da fantasia (a parte principal do conjunto mora nele). */
export const FANTASIA_SLOT = SLOT_DA_FANTASIA
