/**
 * APRESENTAÇÃO do avatar 3D (rótulo PT + URL do GLB + paletas), chaveada pelo MESMO
 * `id`/categoria do catálogo do members (`domain/avatar/avatar3d-catalog.ts`). O members
 * é a fonte da verdade de existência/preço/posse/paleta; aqui mora só o "como aparece" + o
 * caminho do asset.
 *
 * ⚠️ Arquivo PURO (sem imports): o teste de conformância do members o alcança por caminho
 * relativo. Drift (peça/categoria/paleta/default/oclusão divergente) → CI vermelho.
 *
 * Assets reais (Quaternius CC0, via pack do WawaSensei) servidos do PRÓPRIO app
 * (`public/avatar3d/…`, same-origin) — sem CORS, sem URL por ambiente; `connect-src 'self'`
 * cobre. GLB SIMPLES (sem Draco/KTX2/meshopt — a CSP do kids não tem `wasm-unsafe-eval`).
 */

/** Categorias trocáveis, na ordem do configurador. Espelha `AVATAR_CATEGORIES` do members. */
export const AVATAR_CATEGORIES = [
  'head',
  'hair',
  'eyes',
  'eyebrows',
  'nose',
  'facialHair',
  'glasses',
  'hat',
  'top',
  'bottom',
  'shoes',
  'accessory',
] as const

export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number]

/** Rótulo PT de cada categoria (aba do configurador). */
export const AVATAR_CATEGORY_LABELS: Record<AvatarCategory, string> = {
  head: 'Rosto',
  hair: 'Cabelo',
  eyes: 'Olhos',
  eyebrows: 'Sobrancelhas',
  nose: 'Nariz',
  facialHair: 'Barba',
  glasses: 'Óculos',
  hat: 'Chapéu',
  top: 'Blusa',
  bottom: 'Calça',
  shoes: 'Calçado',
  accessory: 'Acessório',
}

export interface AvatarPartInfo {
  category: AvatarCategory
  /** Texto visível (100% PT — convenção "blocos só em português"). */
  labelPt: string
}

/** id → apresentação. Id desconhecido → ignorado (forward-compat). */
export const AVATAR_PART_INFO: Record<string, AvatarPartInfo> = {
  // Rosto (formato da cabeça)
  'head-01': { category: 'head', labelPt: 'Rosto 1' },
  'head-02': { category: 'head', labelPt: 'Rosto 2' },
  'head-03': { category: 'head', labelPt: 'Rosto 3' },
  // Cabelo
  'hair-none': { category: 'hair', labelPt: 'Careca' },
  'hair-01': { category: 'hair', labelPt: 'Cabelo 1' },
  'hair-02': { category: 'hair', labelPt: 'Cabelo 2' },
  'hair-03': { category: 'hair', labelPt: 'Cabelo 3' },
  'hair-04': { category: 'hair', labelPt: 'Cabelo 4' },
  'hair-05': { category: 'hair', labelPt: 'Cabelo 5' },
  'hair-06': { category: 'hair', labelPt: 'Cabelo 6' },
  'hair-07': { category: 'hair', labelPt: 'Cabelo 7' },
  // Olhos
  'eyes-01': { category: 'eyes', labelPt: 'Olhos 1' },
  'eyes-02': { category: 'eyes', labelPt: 'Olhos 2' },
  'eyes-03': { category: 'eyes', labelPt: 'Olhos 3' },
  'eyes-04': { category: 'eyes', labelPt: 'Olhos 4' },
  'eyes-05': { category: 'eyes', labelPt: 'Olhos 5' },
  'eyes-06': { category: 'eyes', labelPt: 'Olhos 6' },
  'eyes-07': { category: 'eyes', labelPt: 'Olhos 7' },
  'eyes-08': { category: 'eyes', labelPt: 'Olhos 8' },
  // Sobrancelhas
  'eyebrow-01': { category: 'eyebrows', labelPt: 'Sobrancelha 1' },
  'eyebrow-02': { category: 'eyebrows', labelPt: 'Sobrancelha 2' },
  'eyebrow-03': { category: 'eyebrows', labelPt: 'Sobrancelha 3' },
  'eyebrow-04': { category: 'eyebrows', labelPt: 'Sobrancelha 4' },
  'eyebrow-05': { category: 'eyebrows', labelPt: 'Sobrancelha 5' },
  'eyebrow-06': { category: 'eyebrows', labelPt: 'Sobrancelha 6' },
  // Nariz
  'nose-01': { category: 'nose', labelPt: 'Nariz 1' },
  'nose-02': { category: 'nose', labelPt: 'Nariz 2' },
  'nose-03': { category: 'nose', labelPt: 'Nariz 3' },
  'nose-04': { category: 'nose', labelPt: 'Nariz 4' },
  // Barba
  'beard-none': { category: 'facialHair', labelPt: 'Nenhuma' },
  'beard-01': { category: 'facialHair', labelPt: 'Barba 1' },
  'beard-02': { category: 'facialHair', labelPt: 'Barba 2' },
  'beard-03': { category: 'facialHair', labelPt: 'Barba 3' },
  'beard-04': { category: 'facialHair', labelPt: 'Barba 4' },
  'beard-05': { category: 'facialHair', labelPt: 'Barba 5' },
  // Óculos
  'glasses-none': { category: 'glasses', labelPt: 'Nenhum' },
  'glasses-01': { category: 'glasses', labelPt: 'Óculos 1' },
  'glasses-02': { category: 'glasses', labelPt: 'Óculos 2' },
  'glasses-03': { category: 'glasses', labelPt: 'Óculos 3' },
  'glasses-04': { category: 'glasses', labelPt: 'Óculos 4' },
  // Chapéu
  'hat-none': { category: 'hat', labelPt: 'Nenhum' },
  'hat-01': { category: 'hat', labelPt: 'Chapéu 1' },
  'hat-02': { category: 'hat', labelPt: 'Chapéu 2' },
  'hat-03': { category: 'hat', labelPt: 'Chapéu 3' },
  'hat-04': { category: 'hat', labelPt: 'Chapéu 4' },
  'hat-05': { category: 'hat', labelPt: 'Chapéu 5' },
  'hat-06': { category: 'hat', labelPt: 'Chapéu 6' },
  // Blusa
  'top-01': { category: 'top', labelPt: 'Blusa 1' },
  'top-02': { category: 'top', labelPt: 'Blusa 2' },
  'top-03': { category: 'top', labelPt: 'Blusa 3' },
  // Calça
  'bottom-01': { category: 'bottom', labelPt: 'Calça 1' },
  'bottom-02': { category: 'bottom', labelPt: 'Calça 2' },
  'bottom-03': { category: 'bottom', labelPt: 'Calça 3' },
  // Calçado
  'shoes-01': { category: 'shoes', labelPt: 'Calçado 1' },
  'shoes-02': { category: 'shoes', labelPt: 'Calçado 2' },
  // Acessório
  'acc-none': { category: 'accessory', labelPt: 'Nenhum' },
  'acc-01': { category: 'accessory', labelPt: 'Brinco 1' },
  'acc-02': { category: 'accessory', labelPt: 'Brinco 2' },
  'acc-03': { category: 'accessory', labelPt: 'Brinco 3' },
  'acc-04': { category: 'accessory', labelPt: 'Brinco 4' },
  'acc-05': { category: 'accessory', labelPt: 'Laço 1' },
  'acc-06': { category: 'accessory', labelPt: 'Laço 2' },
}

/** Paletas por categoria (mesmas cores do members — travado pela conformância). */
const SKIN_PALETTE = ['#f2d3b1', '#ecad80', '#cf9b6e', '#9e5622', '#763900', '#5a2e0a']
const HAIR_PALETTE = [
  '#2c1b18',
  '#4a3120',
  '#6a4e35',
  '#a5673f',
  '#d6a04b',
  '#e6c84a',
  '#ece0c8',
  '#c0392b',
  '#8e44ad',
  '#2980b9',
  '#27ae60',
  '#e84393',
]
const GARMENT_PALETTE = [
  '#e74c3c',
  '#e67e22',
  '#f1c40f',
  '#2ecc71',
  '#1abc9c',
  '#3498db',
  '#9b59b6',
  '#e84393',
  '#ecf0f1',
  '#34495e',
  '#7f8c8d',
  '#2c3e50',
  '#16a085',
  '#d35400',
]

export const AVATAR_CATEGORY_PALETTES: Partial<Record<AvatarCategory, string[]>> = {
  head: SKIN_PALETTE,
  hair: HAIR_PALETTE,
  eyebrows: HAIR_PALETTE,
  facialHair: HAIR_PALETTE,
  glasses: GARMENT_PALETTE,
  top: GARMENT_PALETTE,
  bottom: GARMENT_PALETTE,
  shoes: GARMENT_PALETTE,
}

export interface AvatarSlot {
  asset: string
  color?: string
}

/** Conjunto inicial grátis (espelha `DEFAULT_AVATAR_SLOTS` do members). */
export const DEFAULT_AVATAR_SLOTS: Record<AvatarCategory, AvatarSlot> = {
  head: { asset: 'head-01', color: '#ecad80' },
  hair: { asset: 'hair-01', color: '#6a4e35' },
  eyes: { asset: 'eyes-01' },
  eyebrows: { asset: 'eyebrow-01', color: '#6a4e35' },
  nose: { asset: 'nose-01' },
  facialHair: { asset: 'beard-none', color: '#6a4e35' },
  glasses: { asset: 'glasses-none', color: '#3498db' },
  hat: { asset: 'hat-none' },
  top: { asset: 'top-01', color: '#3498db' },
  bottom: { asset: 'bottom-01', color: '#34495e' },
  shoes: { asset: 'shoes-01', color: '#2c3e50' },
  accessory: { asset: 'acc-none' },
}

/** Oclusão de render: chapéu real esconde o cabelo (espelha o members). */
export const AVATAR_HIDE_GROUPS: Partial<Record<AvatarCategory, AvatarCategory[]>> = {
  hat: ['hair'],
}

/** Categoria removível → id da peça "nenhum" (espelha o members; sem GLB). */
export const AVATAR_REMOVABLE_NONE: Partial<Record<AvatarCategory, string>> = {
  hair: 'hair-none',
  facialHair: 'beard-none',
  glasses: 'glasses-none',
  hat: 'hat-none',
  accessory: 'acc-none',
}

// ── URLs dos assets (same-origin, servidos de `public/avatar3d/`) ────────────
/** GLB de uma peça (ex.: `/avatar3d/parts/hair-01.glb`). Peça "nenhum" não tem arquivo. */
export const partGlbUrl = (id: string): string => `/avatar3d/parts/${id}.glb`
/** GLB base (esqueleto/corpo, poses, pódio): `Armature`, `Poses`, `Podium`. */
export const baseGlbUrl = (name: 'Armature' | 'Poses' | 'Podium'): string =>
  `/avatar3d/base/${name}.glb`
