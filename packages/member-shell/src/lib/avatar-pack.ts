/**
 * A loja do avatar do pack (Cute Characters) na tela "Meu avatar": as abas, os tipos dentro de cada
 * aba, as peças que aparecem para o filtro escolhido, o que a pessoa já tem e o que a escolha tirou.
 * Puro (sem React): o configurador do Kids e o da comunidade adulta leem daqui.
 *
 * O catálogo e as regras são os do `@sistemazero/core/avatar` (os mesmos do servidor): peça nova da
 * arte entra numa aba sozinha, pelo grupo dela. Só a divisão da roupa de cima por tipo sai do NOME
 * da peça (o pack não tem esse grupo); peça de um tipo desconhecido cai em "Outras".
 */
import {
  type AvatarCatalog,
  type AvatarFilter,
  type AvatarPartEntry,
  type AvatarSlots,
  equipPart,
  isListed,
  matchesFilter,
  removeSlot,
  wornSet,
} from '@sistemazero/core/avatar'

export type AvatarTabId =
  | 'corpo'
  | 'rosto'
  | 'acessorio_rosto'
  | 'cabelo'
  | 'chapeu'
  | 'oculos'
  | 'roupa_cima'
  | 'roupa_inteira'
  | 'calca'
  | 'calcado'
  | 'meias'
  | 'luvas'
  | 'costas'
  | 'fantasia'

export interface AvatarTab {
  id: AvatarTabId
  label: string
  /** Os grupos do pack que a aba mostra. */
  groups: readonly string[]
  /** Os encaixes que o "Nenhum" esvazia; vazio = a aba não tem "Nenhum" (corpo e rosto). */
  removable: readonly string[]
}

export interface AvatarTabGroup {
  id: 'voce' | 'cabeca' | 'roupa'
  label: string
  tabs: readonly AvatarTab[]
}

/**
 * As abas em três grupos (no computador, todos à vista; no celular, o grupo em cima e as abas dele
 * embaixo). ⚠️ Todo grupo do pack, menos as orelhas (que entram sozinhas com a cor do corpo), está
 * em UMA aba: travado por teste, senão a peça sumiria da loja.
 */
export const AVATAR_TAB_GROUPS: readonly AvatarTabGroup[] = [
  {
    id: 'voce',
    label: 'Você',
    tabs: [
      { id: 'corpo', label: 'Cor', groups: ['corpo'], removable: [] },
      { id: 'rosto', label: 'Rosto', groups: ['rosto'], removable: [] },
      {
        id: 'acessorio_rosto',
        label: 'No rosto',
        groups: ['acessorio_rosto'],
        removable: ['acessorio_rosto'],
      },
    ],
  },
  {
    id: 'cabeca',
    label: 'Cabeça',
    tabs: [
      {
        id: 'cabelo',
        label: 'Cabelo',
        groups: ['cabelo', 'cabelo_sob_chapeu'],
        removable: ['cabelo'],
      },
      {
        id: 'chapeu',
        label: 'Chapéu',
        groups: ['chapeu', 'chapeu_sobre_cabelo', 'capuz'],
        removable: ['chapeu'],
      },
      { id: 'oculos', label: 'Óculos', groups: ['oculos'], removable: ['oculos'] },
    ],
  },
  {
    id: 'roupa',
    label: 'Roupa',
    tabs: [
      { id: 'roupa_cima', label: 'Blusa', groups: ['roupa_cima'], removable: ['roupa_cima'] },
      {
        id: 'roupa_inteira',
        label: 'Vestido e macacão',
        groups: ['roupa_inteira'],
        removable: ['roupa_inteira'],
      },
      {
        id: 'calca',
        label: 'Calça e bermuda',
        groups: ['calca', 'bermuda'],
        removable: ['calca', 'bermuda'],
      },
      { id: 'calcado', label: 'Calçado', groups: ['calcado'], removable: ['calcado'] },
      { id: 'meias', label: 'Meias', groups: ['meias'], removable: ['meias'] },
      { id: 'luvas', label: 'Luvas', groups: ['luvas'], removable: ['luvas'] },
      { id: 'costas', label: 'Capa', groups: ['costas'], removable: ['costas'] },
      { id: 'fantasia', label: 'Fantasia', groups: ['fantasia'], removable: ['fantasia'] },
    ],
  },
]

export const AVATAR_TABS: readonly AvatarTab[] = AVATAR_TAB_GROUPS.flatMap((g) => g.tabs)

export function avatarTab(id: AvatarTabId): AvatarTab {
  return AVATAR_TABS.find((t) => t.id === id) ?? (AVATAR_TABS[0] as AvatarTab)
}

export function avatarTabGroupOf(id: AvatarTabId): AvatarTabGroup {
  return (
    AVATAR_TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === id)) ??
    (AVATAR_TAB_GROUPS[0] as AvatarTabGroup)
  )
}

/** O nome de cada grupo do pack quando ele vira um TIPO dentro da aba (só nas abas com mais de um). */
const GROUP_KIND_LABELS: Record<string, string> = {
  cabelo: 'Cabelo',
  cabelo_sob_chapeu: 'Para usar com chapéu',
  chapeu: 'Chapéu',
  chapeu_sobre_cabelo: 'Tiara e enfeite',
  capuz: 'Capuz e capacete',
  calca: 'Calça',
  bermuda: 'Bermuda',
}

/** A roupa de cima por tipo, pela palavra do nome da peça (`roupa_cima_<tipo>_…`). */
const TOP_KINDS: readonly { id: string; label: string; words: readonly string[] }[] = [
  { id: 'camiseta', label: 'Camiseta', words: ['camiseta', 'regata', 'polo', 'top', 'maio'] },
  { id: 'camisa', label: 'Camisa', words: ['camisa'] },
  {
    id: 'agasalho',
    label: 'Jaqueta e moletom',
    words: ['jaqueta', 'moletom', 'casaco', 'casaquinho', 'sueter'],
  },
  { id: 'colete', label: 'Colete', words: ['colete'] },
]

/** Um tipo dentro de uma aba: o filtro de cima da grade (chips). */
export interface AvatarKind {
  id: string
  label: string
  ids: string[]
}

/**
 * Os tipos da aba, cada um com as suas peças (ou conjuntos, na fantasia), na ordem do pack. Uma aba
 * com um tipo só não mostra os chips. O rosto se divide pelo DESENHO (as expressões são as peças).
 */
export function avatarKinds(catalog: AvatarCatalog, tab: AvatarTab): AvatarKind[] {
  const idsDo = (grupo: string) => catalog.rules.groups[grupo]?.parts ?? []
  if (tab.id === 'rosto') {
    return Object.entries(catalog.rules.faces).map(([design, expressoes]) => ({
      id: design,
      label: `Rosto ${Object.keys(catalog.rules.faces).indexOf(design) + 1}`,
      ids: Object.values(expressoes),
    }))
  }
  if (tab.id === 'roupa_cima') {
    const todos = idsDo('roupa_cima')
    const palavra = (id: string) => id.replace(/^roupa_cima_/, '').split('_')[0] ?? ''
    const tipos: AvatarKind[] = TOP_KINDS.map((k) => ({
      id: k.id,
      label: k.label,
      ids: todos.filter((id) => k.words.includes(palavra(id))),
    }))
    const conhecidas = new Set(TOP_KINDS.flatMap((k) => k.words))
    const outras = todos.filter((id) => !conhecidas.has(palavra(id)))
    if (outras.length > 0) tipos.push({ id: 'outras', label: 'Outras', ids: outras })
    return tipos
  }
  return tab.groups.map((g) => ({
    id: g,
    label: GROUP_KIND_LABELS[g] ?? catalog.rules.groups[g]?.label ?? g,
    ids: [...idsDo(g)],
  }))
}

/** Uma escolha na grade: uma peça, um conjunto de fantasia ou o "Nenhum" da aba. */
export interface AvatarShopItem {
  id: string
  kind: 'part' | 'set' | 'none'
  label: string
  /** Caminho da miniatura no bucket (`null` no "Nenhum"). */
  thumb: string | null
  /** Cor de amostra (a cor do corpo). */
  swatch?: string
  tier: AvatarPartEntry['tier']
  price: number
  /** A pessoa pode usar: grátis, entra sozinha ou já está no inventário. */
  owned: boolean
}

/** O que a pessoa pode usar sem comprar (as grátis são de todos; conjunto pelo id do conjunto). */
export function isAvatarItemOwned(
  catalog: AvatarCatalog,
  id: string,
  owned: ReadonlySet<string>,
): boolean {
  const conjunto = catalog.sets[id]
  if (conjunto) return owned.has(id)
  const p = catalog.parts[id]
  if (!p) return false
  if (p.set) return owned.has(p.set)
  return p.tier === 'free' || p.tier === 'auto' || owned.has(id)
}

/**
 * As escolhas de um tipo da aba, para o filtro: as peças listadas, os conjuntos de fantasia, e o
 * "Nenhum" primeiro quando a aba deixa tirar. Peça escondida ou aposentada só aparece se estiver
 * no avatar (quem tem não a perde de vista).
 */
export function avatarShopItems(
  catalog: AvatarCatalog,
  tab: AvatarTab,
  kind: AvatarKind,
  filter: AvatarFilter,
  owned: ReadonlySet<string>,
  slots: AvatarSlots,
): AvatarShopItem[] {
  const vestidas = new Set(Object.values(slots))
  const itens: AvatarShopItem[] = []
  if (tab.removable.length > 0)
    itens.push({
      id: `nenhum:${tab.id}`,
      kind: 'none',
      label: 'Nenhum',
      thumb: null,
      tier: 'free',
      price: 0,
      owned: true,
    })
  for (const id of kind.ids) {
    const conjunto = catalog.sets[id]
    if (conjunto) {
      const principal = conjunto.parts.find((p) => p.slot === 'fantasia') ?? conjunto.parts[0]
      itens.push({
        id,
        kind: 'set',
        label: conjunto.label,
        thumb: catalog.parts[principal?.part ?? '']?.thumb ?? null,
        tier: conjunto.tier,
        price: conjunto.price,
        owned: owned.has(id),
      })
      continue
    }
    const p = catalog.parts[id]
    if (!p) continue
    if (!vestidas.has(id) && (!isListed(p) || !matchesFilter(p.audience, filter))) continue
    itens.push({
      id,
      kind: 'part',
      label:
        tab.id === 'rosto' && p.face
          ? (catalog.rules.expressions[p.face.expression] ?? p.label)
          : p.label,
      thumb: p.thumb,
      ...(p.swatch ? { swatch: p.swatch } : {}),
      tier: p.tier,
      price: p.price,
      owned: isAvatarItemOwned(catalog, id, owned),
    })
  }
  // O que a pessoa já pode usar vem primeiro; depois as pagas, da mais barata à mais cara (a
  // ordem do pack fica entre as do mesmo preço). O "Nenhum" continua na frente.
  const ordem = (i: AvatarShopItem) => (i.kind === 'none' ? -1 : i.owned ? 0 : 1 + i.price)
  return itens
    .map((item, posicao) => ({ item, posicao }))
    .sort((a, b) => ordem(a.item) - ordem(b.item) || a.posicao - b.posicao)
    .map(({ item }) => item)
}

/**
 * Só os tipos que têm o que mostrar com este filtro (com "Menino", os rostos de menina somem). Os
 * rostos são numerados entre os que aparecem: "Rosto 1", "Rosto 2".
 */
export function visibleAvatarKinds(
  catalog: AvatarCatalog,
  tab: AvatarTab,
  kinds: readonly AvatarKind[],
  filter: AvatarFilter,
  owned: ReadonlySet<string>,
  slots: AvatarSlots,
): AvatarKind[] {
  const visiveis = kinds.filter((k) =>
    avatarShopItems(catalog, tab, k, filter, owned, slots).some((i) => i.kind !== 'none'),
  )
  return tab.id === 'rosto' ? visiveis.map((k, i) => ({ ...k, label: `Rosto ${i + 1}` })) : visiveis
}

/** O tipo da aba em que está a peça vestida (para a aba abrir nele). */
export function avatarKindOfWorn(
  kinds: readonly AvatarKind[],
  tab: AvatarTab,
  slots: AvatarSlots,
): string | undefined {
  if (tab.id === 'fantasia') return kinds[0]?.id
  const vestidas = new Set(Object.values(slots))
  return kinds.find((k) => k.ids.some((id) => vestidas.has(id)))?.id ?? kinds[0]?.id
}

/** A escolha está no avatar agora. */
export function isAvatarItemWorn(
  catalog: AvatarCatalog,
  item: AvatarShopItem,
  tab: AvatarTab,
  slots: AvatarSlots,
): boolean {
  if (item.kind === 'none') return tab.removable.every((s) => !slots[s])
  if (item.kind === 'set') return wornSet(catalog, slots) === item.id
  return Object.values(slots).includes(item.id)
}

/** O avatar depois da escolha (as regras do pack tiram o que não combina). */
export function applyAvatarItem(
  catalog: AvatarCatalog,
  slots: AvatarSlots,
  item: AvatarShopItem,
  tab: AvatarTab,
): AvatarSlots {
  if (item.kind === 'none') {
    let s = slots
    for (const slot of tab.removable) s = removeSlot(catalog, s, slot)
    return s
  }
  if (item.kind === 'set') {
    const principal = catalog.sets[item.id]?.parts.find((p) => p.slot === 'fantasia')
    return principal ? equipPart(catalog, slots, principal.part) : slots
  }
  return equipPart(catalog, slots, item.id)
}

/**
 * O que a escolha TIROU do avatar além do que ela mesma trocou: é o aviso "para vestir o chapéu,
 * o cabelo saiu". Orelhas não contam (entram e saem sozinhas); a fantasia conta uma vez só.
 */
export function avatarRemovedBy(
  catalog: AvatarCatalog,
  before: AvatarSlots,
  after: AvatarSlots,
  tab: AvatarTab,
): string[] {
  const depois = new Set(Object.values(after))
  const trocados = new Set(tab.groups.flatMap((g) => (catalog.rules.groups[g] ? [g] : [])))
  const nomes: string[] = []
  const conjuntoAntes = wornSet(catalog, before)
  for (const [slot, id] of Object.entries(before)) {
    if (slot === 'orelhas' || depois.has(id)) continue
    const p = catalog.parts[id]
    if (!p) continue
    if (p.set) {
      if (tab.id === 'fantasia') continue
      const label = catalog.sets[p.set]?.label
      if (p.set === conjuntoAntes && label && !nomes.includes(`Fantasia de ${label}`))
        nomes.push(`Fantasia de ${label}`)
      continue
    }
    if (trocados.has(p.group) || tab.removable.includes(slot)) continue
    nomes.push(p.label)
  }
  return nomes
}

/**
 * As escolhas pagas que estão no avatar e a pessoa ainda não tem: com qualquer uma, o avatar só
 * está de PRÉVIA (nada é gravado até comprar ou tirar).
 */
export function avatarUnownedWorn(
  catalog: AvatarCatalog,
  slots: AvatarSlots,
  owned: ReadonlySet<string>,
): string[] {
  const faltam = new Set<string>()
  for (const id of Object.values(slots)) {
    const p = catalog.parts[id]
    if (!p) continue
    const item = p.set ?? id
    if (!isAvatarItemOwned(catalog, item, owned)) faltam.add(item)
  }
  return [...faltam]
}

/** O nome de uma peça ou de um conjunto. */
export function avatarItemLabel(catalog: AvatarCatalog, id: string): string {
  return catalog.sets[id]?.label ?? catalog.parts[id]?.label ?? id
}

/** A pose de quem está parado (a do esqueleto do pack; a mesma do `PACK_IDLE_POSE`). */
export const AVATAR_IDLE_POSE = 'parado_relaxado'

/**
 * As poses da Cabine de fotos (clipes do esqueleto do pack), na ordem da tela. ⚠️ O `pulo_no_ar` e o
 * `correr_frente` ficam de fora: os clipes levam o corpo inteiro (para cima, para a frente) e o
 * boneco sai da foto.
 */
export const AVATAR_POSES: readonly { id: string; label: string }[] = [
  { id: 'parado_relaxado', label: 'Parado' },
  { id: 'parado_olhando', label: 'Olhando' },
  { id: 'soco', label: 'Soco' },
  { id: 'chute', label: 'Chute' },
  { id: 'defender_com_as_maos', label: 'Defesa' },
]

/** Só as poses que o esqueleto publicado tem. */
export function avatarPoses(catalog: AvatarCatalog): { id: string; label: string }[] {
  const clips = new Set(catalog.base.skeleton.clips)
  return AVATAR_POSES.filter((p) => clips.has(p.id))
}

export const AVATAR_FILTERS: readonly { id: AvatarFilter; label: string }[] = [
  { id: 'girl', label: 'Menina' },
  { id: 'boy', label: 'Menino' },
  { id: 'all', label: 'Todas' },
]
