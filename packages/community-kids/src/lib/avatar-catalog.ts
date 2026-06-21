/**
 * APRESENTAÇÃO do avatar (rótulo PT + mapeamento DiceBear), chaveada pelo MESMO
 * `id` do catálogo do members (`domain/avatar/parts-catalog.ts`) — exatamente como
 * `BADGE_INFO` espelha `BADGE_SLUGS`. O members é a fonte da verdade de existência/
 * preço/posse; aqui mora só o "como aparece" e a tradução p/ as opções do estilo
 * `adventurer` (DiceBear v9). Id desconhecido → ignorado (forward-compat).
 *
 * ⚠️ Os VALORES do DiceBear (`short01`, hex) são internos e NUNCA exibidos — o texto
 * visível é 100% PT (convenção "blocos só em português").
 */

/** Camadas trocáveis, na ordem do editor. Espelha `AVATAR_LAYERS` do members. */
export const AVATAR_LAYERS = [
  'skin',
  'hair',
  'hairColor',
  'eyes',
  'mouth',
  'glasses',
  'earrings',
] as const

export type AvatarLayer = (typeof AVATAR_LAYERS)[number]

/** Rótulo PT de cada camada (cabeçalho do carrossel do editor). */
export const AVATAR_LAYER_LABELS: Record<AvatarLayer, string> = {
  skin: 'Pele',
  hair: 'Cabelo',
  hairColor: 'Cor do cabelo',
  eyes: 'Olhos',
  mouth: 'Boca',
  glasses: 'Óculos',
  earrings: 'Brincos',
}

interface PartInfo {
  layer: AvatarLayer
  labelPt: string
  /** Opção do estilo adventurer (array de 1 valor). Ausente = acessório "nenhum". */
  key: 'skinColor' | 'hairColor' | 'hair' | 'eyes' | 'mouth' | 'glasses' | 'earrings'
  /** Variante/hex DiceBear. Ausente → o acessório é OCULTO (probabilidade 0). */
  value?: string
  /** Chave de probabilidade do acessório (óculos/brincos) — 100 c/ valor, 0 sem. */
  probabilityKey?: 'glassesProbability' | 'earringsProbability'
}

export const AVATAR_PART_INFO: Record<string, PartInfo> = {
  // Pele (skinColor — hex sem '#').
  'pele-clara': { layer: 'skin', labelPt: 'Clara', key: 'skinColor', value: 'f2d3b1' },
  'pele-media': { layer: 'skin', labelPt: 'Média', key: 'skinColor', value: 'ecad80' },
  'pele-morena': { layer: 'skin', labelPt: 'Morena', key: 'skinColor', value: '9e5622' },
  'pele-escura': { layer: 'skin', labelPt: 'Escura', key: 'skinColor', value: '763900' },

  // Cor do cabelo (hairColor — hex sem '#').
  'cor-preto': { layer: 'hairColor', labelPt: 'Preto', key: 'hairColor', value: '2c1b18' },
  'cor-castanho': { layer: 'hairColor', labelPt: 'Castanho', key: 'hairColor', value: '6a4e35' },
  'cor-loiro': { layer: 'hairColor', labelPt: 'Loiro', key: 'hairColor', value: 'e6b54a' },
  'cor-ruivo': { layer: 'hairColor', labelPt: 'Ruivo', key: 'hairColor', value: 'cb6820' },
  'cor-fantasia': { layer: 'hairColor', labelPt: 'Fantasia', key: 'hairColor', value: 'a55fb0' },

  // Estilo do cabelo (hair — variantes do adventurer).
  'cabelo-curtinho': { layer: 'hair', labelPt: 'Curtinho', key: 'hair', value: 'short01' },
  'cabelo-ondulado': { layer: 'hair', labelPt: 'Ondulado', key: 'hair', value: 'short03' },
  'cabelo-longo': { layer: 'hair', labelPt: 'Longo', key: 'hair', value: 'long01' },
  'cabelo-rabo': { layer: 'hair', labelPt: 'Rabo de cavalo', key: 'hair', value: 'long10' },
  'cabelo-cacheado': { layer: 'hair', labelPt: 'Cacheado', key: 'hair', value: 'short05' },
  'cabelo-espetado': { layer: 'hair', labelPt: 'Espetado', key: 'hair', value: 'short08' },
  'cabelo-trancas': { layer: 'hair', labelPt: 'Tranças', key: 'hair', value: 'long20' },
  'cabelo-moicano': { layer: 'hair', labelPt: 'Moicano', key: 'hair', value: 'short16' },

  // Olhos (eyes — variantes).
  'olhos-alegres': { layer: 'eyes', labelPt: 'Alegres', key: 'eyes', value: 'variant01' },
  'olhos-curiosos': { layer: 'eyes', labelPt: 'Curiosos', key: 'eyes', value: 'variant07' },
  'olhos-tranquilos': { layer: 'eyes', labelPt: 'Tranquilos', key: 'eyes', value: 'variant12' },
  'olhos-determinados': {
    layer: 'eyes',
    labelPt: 'Determinados',
    key: 'eyes',
    value: 'variant19',
  },
  'olhos-sonhadores': { layer: 'eyes', labelPt: 'Sonhadores', key: 'eyes', value: 'variant24' },

  // Boca (mouth — variantes).
  'boca-sorriso': { layer: 'mouth', labelPt: 'Sorriso', key: 'mouth', value: 'variant01' },
  'boca-risada': { layer: 'mouth', labelPt: 'Risada', key: 'mouth', value: 'variant10' },
  'boca-serena': { layer: 'mouth', labelPt: 'Serena', key: 'mouth', value: 'variant20' },
  'boca-surpresa': { layer: 'mouth', labelPt: 'Surpresa', key: 'mouth', value: 'variant26' },

  // Óculos (glasses — acessório com probabilidade).
  'oculos-nenhum': {
    layer: 'glasses',
    labelPt: 'Nenhum',
    key: 'glasses',
    probabilityKey: 'glassesProbability',
  },
  'oculos-redondo': {
    layer: 'glasses',
    labelPt: 'Redondo',
    key: 'glasses',
    value: 'variant01',
    probabilityKey: 'glassesProbability',
  },
  'oculos-quadrado': {
    layer: 'glasses',
    labelPt: 'Quadrado',
    key: 'glasses',
    value: 'variant03',
    probabilityKey: 'glassesProbability',
  },
  'oculos-estiloso': {
    layer: 'glasses',
    labelPt: 'Estiloso',
    key: 'glasses',
    value: 'variant05',
    probabilityKey: 'glassesProbability',
  },

  // Brincos (earrings — acessório com probabilidade).
  'brincos-nenhum': {
    layer: 'earrings',
    labelPt: 'Nenhum',
    key: 'earrings',
    probabilityKey: 'earringsProbability',
  },
  'brincos-bolinha': {
    layer: 'earrings',
    labelPt: 'Bolinha',
    key: 'earrings',
    value: 'variant01',
    probabilityKey: 'earringsProbability',
  },
  'brincos-estrela': {
    layer: 'earrings',
    labelPt: 'Estrela',
    key: 'earrings',
    value: 'variant03',
    probabilityKey: 'earringsProbability',
  },
  'brincos-argola': {
    layer: 'earrings',
    labelPt: 'Argola',
    key: 'earrings',
    value: 'variant06',
    probabilityKey: 'earringsProbability',
  },
}

/** Conjunto inicial grátis (espelha `DEFAULT_AVATAR_PART_IDS` do members). */
export const DEFAULT_AVATAR_PART_IDS: Record<AvatarLayer, string> = {
  skin: 'pele-media',
  hair: 'cabelo-curtinho',
  hairColor: 'cor-castanho',
  eyes: 'olhos-alegres',
  mouth: 'boca-sorriso',
  glasses: 'oculos-nenhum',
  earrings: 'brincos-nenhum',
}

export interface AvatarConfig {
  style?: string
  parts: Partial<Record<string, string>>
}

/**
 * Traduz a config equipada nas OPÇÕES do estilo adventurer. Camada faltante/peça
 * desconhecida → cai no default grátis. Acessório "nenhum" → probabilidade 0.
 * Determinístico (sem `Date.now`/random) → o avatar é estável.
 */
export function buildAvatarOptions(
  config: AvatarConfig | null | undefined,
): Record<string, unknown> {
  const opts: Record<string, unknown> = {
    seed: 'sistema-zero',
    // Cabelo e features sempre visíveis/estáveis (sem sorteio do seed).
    hairProbability: 100,
    featuresProbability: 0,
    earringsProbability: 0,
    glassesProbability: 0,
  }
  for (const layer of AVATAR_LAYERS) {
    const partId = config?.parts?.[layer] ?? DEFAULT_AVATAR_PART_IDS[layer]
    const info = AVATAR_PART_INFO[partId] ?? AVATAR_PART_INFO[DEFAULT_AVATAR_PART_IDS[layer]]
    if (!info) continue
    if (info.value !== undefined) {
      opts[info.key] = [info.value]
      if (info.probabilityKey) opts[info.probabilityKey] = 100
    } else if (info.probabilityKey) {
      opts[info.probabilityKey] = 0 // acessório "nenhum"
    }
  }
  return opts
}
