/**
 * Catálogo de PEÇAS do avatar EM CÓDIGO (espelha `domain/gamification/badges.ts`):
 * o preDeploy de produção roda só `db:migrate` (sem seed) e o catálogo muda JUNTO
 * com o código — deploy atômico, sem drift. O members é a fonte da verdade do
 * "o que existe + quanto custa + o que é grátis" (autorização de compra/equipar);
 * a APRESENTAÇÃO (rótulo PT + mapeamento DiceBear) vive no app kids (`lib/avatar-catalog.ts`),
 * chaveada pelo MESMO `id` — exatamente como `BADGE_SLUGS` × `BADGE_INFO`.
 *
 * Peça `free` é IMPLICITAMENTE possuída (nunca vai ao inventário). v1 do avatar é
 * cosmética pura (sem pay-to-win): preço é só um SINK das moedas Zappy.
 */

/** Camadas trocáveis do avatar (a criança escolhe uma peça por camada). */
export const AVATAR_LAYERS = [
  'skin', // pele
  'hair', // estilo do cabelo
  'hairColor', // cor do cabelo
  'eyes', // olhos
  'mouth', // boca
  'glasses', // óculos (acessório)
  'earrings', // brincos (acessório)
] as const

export type AvatarLayer = (typeof AVATAR_LAYERS)[number]

export interface AvatarPart {
  id: string
  layer: AvatarLayer
  tier: 'free' | 'coins'
  /** Preço em moedas Zappy (0 quando `free`). */
  price: number
}

const free = (id: string, layer: AvatarLayer): AvatarPart => ({ id, layer, tier: 'free', price: 0 })
const paid = (id: string, layer: AvatarLayer, price: number): AvatarPart => ({
  id,
  layer,
  tier: 'coins',
  price,
})

/**
 * Catálogo curado. Identidade (pele/olhos/boca) é 100% grátis — ética: ninguém
 * precisa pagar para "ser" alguém. O hook de moedas está em cabelo/cores/acessórios.
 */
export const AVATAR_PARTS: readonly AvatarPart[] = [
  // Pele — todas grátis (representação diversa, sem custo).
  free('pele-clara', 'skin'),
  free('pele-media', 'skin'),
  free('pele-morena', 'skin'),
  free('pele-escura', 'skin'),

  // Cor do cabelo — 3 grátis + 2 especiais.
  free('cor-preto', 'hairColor'),
  free('cor-castanho', 'hairColor'),
  free('cor-loiro', 'hairColor'),
  paid('cor-ruivo', 'hairColor', 50),
  paid('cor-fantasia', 'hairColor', 90),

  // Estilo do cabelo — 4 grátis + 4 com moedas.
  free('cabelo-curtinho', 'hair'),
  free('cabelo-ondulado', 'hair'),
  free('cabelo-longo', 'hair'),
  free('cabelo-rabo', 'hair'),
  paid('cabelo-cacheado', 'hair', 60),
  paid('cabelo-espetado', 'hair', 70),
  paid('cabelo-trancas', 'hair', 90),
  paid('cabelo-moicano', 'hair', 100),

  // Olhos — todos grátis (expressão).
  free('olhos-alegres', 'eyes'),
  free('olhos-curiosos', 'eyes'),
  free('olhos-tranquilos', 'eyes'),
  free('olhos-determinados', 'eyes'),
  free('olhos-sonhadores', 'eyes'),

  // Boca — todas grátis (expressão).
  free('boca-sorriso', 'mouth'),
  free('boca-risada', 'mouth'),
  free('boca-serena', 'mouth'),
  free('boca-surpresa', 'mouth'),

  // Óculos (acessório) — nenhum/básico grátis + dois com moedas.
  free('oculos-nenhum', 'glasses'),
  free('oculos-redondo', 'glasses'),
  paid('oculos-quadrado', 'glasses', 80),
  paid('oculos-estiloso', 'glasses', 120),

  // Brincos (acessório) — nenhum/básico grátis + dois com moedas.
  free('brincos-nenhum', 'earrings'),
  free('brincos-bolinha', 'earrings'),
  paid('brincos-estrela', 'earrings', 70),
  paid('brincos-argola', 'earrings', 100),
]

export const AVATAR_PARTS_BY_ID: ReadonlyMap<string, AvatarPart> = new Map(
  AVATAR_PARTS.map((p) => [p.id, p]),
)

/**
 * Conjunto inicial GRÁTIS (uma peça por camada) — todo perfil novo começa com este
 * avatar antes de qualquer escolha/compra. Determinístico (sem `Date.now`/random).
 */
export const DEFAULT_AVATAR_PART_IDS: Readonly<Record<AvatarLayer, string>> = {
  skin: 'pele-media',
  hair: 'cabelo-curtinho',
  hairColor: 'cor-castanho',
  eyes: 'olhos-alegres',
  mouth: 'boca-sorriso',
  glasses: 'oculos-nenhum',
  earrings: 'brincos-nenhum',
}

/** Estilo DiceBear único do guarda-roupa (mantido no config p/ forward-compat). */
export const AVATAR_STYLE = 'adventurer' as const
