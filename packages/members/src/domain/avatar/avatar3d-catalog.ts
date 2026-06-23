/**
 * Catálogo do AVATAR 3D EM CÓDIGO (espelha o padrão badges/quarto: prod roda só
 * `db:migrate`, sem seed; o catálogo muda JUNTO com o código — deploy atômico, sem
 * drift). O members é a fonte da verdade de "o que existe + quanto custa + o que é
 * grátis + qual a paleta de cores"; a APRESENTAÇÃO (rótulo PT + URL do GLB) vive no app
 * kids (`lib/avatar3d-catalog.ts`), chaveada pelo MESMO `id` (como BADGE_SLUGS ×
 * BADGE_INFO), travada pelo teste de conformância.
 *
 * Peça `free` é IMPLICITAMENTE possuída (nunca vai ao inventário). Cosmético puro: preço
 * é só um SINK das moedas Zappy. COR é GRÁTIS e irrestrita dentro da paleta da categoria.
 *
 * **Assets reais (Quaternius CC0, via pack do WawaSensei):** 1 esqueleto compartilhado
 * (`Armature.glb`) + 1 GLB skinned por peça. Material `Color_*` = tintável (recebe a cor
 * da peça); `Skin_*` = pele compartilhada (a cor de `head` rege a pele). Categorias
 * SEM paleta (`eyes`/`nose`/`hat`/`accessory`) têm cor embutida por variante (ou seguem a
 * pele). Os ids casam 1:1 com `public/avatar3d/parts/<id>.glb` no kids.
 */

/** Categorias trocáveis do personagem (uma peça equipada por categoria). */
export const AVATAR_CATEGORIES = [
  'head', // formato da cabeça — a COR é o tom de pele (rege o material `Skin_` compartilhado)
  'hair', // cabelo (escondido por chapéu)
  'eyes', // olhos (cor embutida)
  'eyebrows', // sobrancelhas (tintável)
  'nose', // nariz (segue a pele)
  'faceDecor', // pintura de rosto / máscara (removível; decalque no rosto, cor embutida)
  'facialHair', // barba/bigode (removível, tintável)
  'glasses', // óculos (removível, armação tintável)
  'hat', // chapéu (removível; esconde o cabelo)
  'top', // roupa de cima
  'bottom', // roupa de baixo
  'outfit', // vestido/roupa única (removível; esconde top+bottom)
  'shoes', // calçado
  'accessory', // acessório (brinco/laço — removível)
] as const

export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number]

export const AVATAR_CATEGORY_SET: ReadonlySet<string> = new Set(AVATAR_CATEGORIES)

/** Estilo/versão do personagem base (no config p/ forward-compat do esqueleto). */
export const AVATAR_CHAR_STYLE = 'char-v1' as const

/** Uma escolha equipada por categoria: a peça + (opcional) a cor da paleta. */
export interface AvatarSlot {
  asset: string
  /** Cor da paleta da categoria (hex minúsculo). Ausente em categoria sem paleta. */
  color?: string
}

export interface Avatar3dPart {
  id: string
  category: AvatarCategory
  tier: 'free' | 'coins'
  /** Preço em moedas Zappy (0 quando `free`). */
  price: number
}

const free = (id: string, category: AvatarCategory): Avatar3dPart => ({
  id,
  category,
  tier: 'free',
  price: 0,
})
const paid = (id: string, category: AvatarCategory, price: number): Avatar3dPart => ({
  id,
  category,
  tier: 'coins',
  price,
})

/**
 * Catálogo curado. Identidade (cabeça/olhos/sobrancelha/nariz) é 100% GRÁTIS. O hook de
 * moedas está em cabelo/barba/óculos/chapéu/roupas/acessórios. Categorias removíveis têm
 * uma peça `*-none` grátis (= "tirar"; sem GLB). Preços 50–150 (coerente com aula=5, teto
 * diário=100). Os ids casam com `public/avatar3d/parts/<id>.glb`.
 */
export const AVATAR3D_PARTS: readonly Avatar3dPart[] = [
  // Cabeça — formato; a COR (pele) é grátis e irrestrita na paleta.
  free('head-01', 'head'),
  free('head-02', 'head'),
  free('head-03', 'head'),
  free('head-04', 'head'),

  // Cabelo — careca + 1 de MENINO (hair-01) e 1 de MENINA (hair-08, estilo longo, trazido pra
  // 2ª posição) GRÁTIS — justiça de gênero: menina nova não fica sem cabelo grátis. Resto pago.
  free('hair-none', 'hair'),
  free('hair-01', 'hair'),
  free('hair-08', 'hair'), // menina (longo) — liberado e trazido pra frente
  paid('hair-02', 'hair', 50),
  paid('hair-03', 'hair', 60),
  paid('hair-04', 'hair', 60),
  paid('hair-05', 'hair', 70),
  paid('hair-06', 'hair', 80),
  paid('hair-07', 'hair', 90),
  paid('hair-09', 'hair', 100),
  paid('hair-10', 'hair', 110),
  paid('hair-11', 'hair', 120),

  // Olhos — todos grátis (expressão; cor embutida).
  free('eyes-01', 'eyes'),
  free('eyes-02', 'eyes'),
  free('eyes-03', 'eyes'),
  free('eyes-04', 'eyes'),
  free('eyes-05', 'eyes'),
  free('eyes-06', 'eyes'),
  free('eyes-07', 'eyes'),
  free('eyes-08', 'eyes'),
  free('eyes-09', 'eyes'),
  free('eyes-10', 'eyes'),
  free('eyes-11', 'eyes'),
  free('eyes-12', 'eyes'),

  // Sobrancelhas — grátis (tintável).
  free('eyebrow-01', 'eyebrows'),
  free('eyebrow-02', 'eyebrows'),
  free('eyebrow-03', 'eyebrows'),
  free('eyebrow-04', 'eyebrows'),
  free('eyebrow-05', 'eyebrows'),
  free('eyebrow-06', 'eyebrows'),
  free('eyebrow-07', 'eyebrows'),
  free('eyebrow-08', 'eyebrows'),
  free('eyebrow-09', 'eyebrows'),
  free('eyebrow-10', 'eyebrows'),

  // Nariz — grátis (segue a pele).
  free('nose-01', 'nose'),
  free('nose-02', 'nose'),
  free('nose-03', 'nose'),
  free('nose-04', 'nose'),

  // Pintura de rosto / máscara — nenhuma + 1 grátis + pagas (decalque no rosto; cor embutida).
  free('face-none', 'faceDecor'),
  free('face-01', 'faceDecor'),
  paid('face-02', 'faceDecor', 40),
  paid('face-03', 'faceDecor', 45),
  paid('face-04', 'faceDecor', 50),
  paid('face-05', 'faceDecor', 55),
  paid('face-06', 'faceDecor', 60),
  paid('face-07', 'faceDecor', 70),
  paid('face-08', 'faceDecor', 60), // máscara

  // Barba — nenhuma + 1 grátis + pagas (tintável).
  free('beard-none', 'facialHair'),
  free('beard-01', 'facialHair'),
  paid('beard-02', 'facialHair', 60),
  paid('beard-03', 'facialHair', 70),
  paid('beard-04', 'facialHair', 80),
  paid('beard-05', 'facialHair', 90),
  paid('beard-06', 'facialHair', 100),
  paid('beard-07', 'facialHair', 110),

  // Óculos — nenhum + 1 grátis + pagos (armação tintável).
  free('glasses-none', 'glasses'),
  free('glasses-01', 'glasses'),
  paid('glasses-02', 'glasses', 70),
  paid('glasses-03', 'glasses', 90),
  paid('glasses-04', 'glasses', 120),

  // Chapéu — nenhum grátis + pagos (cor embutida; esconde o cabelo).
  free('hat-none', 'hat'),
  paid('hat-01', 'hat', 70),
  paid('hat-02', 'hat', 80),
  paid('hat-03', 'hat', 90),
  paid('hat-04', 'hat', 100),
  paid('hat-05', 'hat', 120),
  paid('hat-06', 'hat', 150),
  paid('hat-07', 'hat', 150),

  // Roupa de cima — 1 grátis + 2 pagas (tintável).
  free('top-01', 'top'),
  paid('top-02', 'top', 70),
  paid('top-03', 'top', 90),

  // Roupa de baixo — 1 grátis + 2 pagas (tintável).
  free('bottom-01', 'bottom'),
  paid('bottom-02', 'bottom', 60),
  paid('bottom-03', 'bottom', 80),

  // Vestido / roupa única — nenhum + vestido GRÁTIS (tintável) + looks pagos. Esconde top+bottom.
  free('outfit-none', 'outfit'),
  free('outfit-01', 'outfit'),
  paid('outfit-02', 'outfit', 90),
  paid('outfit-03', 'outfit', 100),
  paid('outfit-04', 'outfit', 110),
  paid('outfit-05', 'outfit', 120),

  // Calçado — 1 grátis + pagos (tintável).
  free('shoes-01', 'shoes'),
  paid('shoes-02', 'shoes', 70),
  paid('shoes-03', 'shoes', 90),

  // Acessório — nenhum grátis + pagos (cor embutida).
  free('acc-none', 'accessory'),
  paid('acc-01', 'accessory', 50),
  paid('acc-02', 'accessory', 60),
  paid('acc-03', 'accessory', 70),
  paid('acc-04', 'accessory', 80),
  paid('acc-05', 'accessory', 90),
  paid('acc-06', 'accessory', 100),
  paid('acc-07', 'accessory', 60),
  paid('acc-08', 'accessory', 70),
]

export const AVATAR3D_PARTS_BY_ID: ReadonlyMap<string, Avatar3dPart> = new Map(
  AVATAR3D_PARTS.map((p) => [p.id, p]),
)

/**
 * Paletas CURADAS por categoria (hex MINÚSCULO). Pintar é GRÁTIS. Só categorias com
 * material `Color_*` (ou pele) têm paleta: cabeça (pele), cabelo/sobrancelha/barba (cabelo),
 * óculos/top/bottom/shoes (roupa). `eyes`/`nose`/`hat`/`accessory` não aceitam cor.
 */
const SKIN_PALETTE = ['#f2d3b1', '#ecad80', '#cf9b6e', '#9e5622', '#763900', '#5a2e0a'] as const
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
] as const
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
] as const

/** Paleta por categoria (cores como arrays p/ a view; sem paleta = sem cor). */
export const AVATAR_CATEGORY_PALETTES: Partial<Record<AvatarCategory, readonly string[]>> = {
  head: SKIN_PALETTE,
  hair: HAIR_PALETTE,
  eyebrows: HAIR_PALETTE,
  facialHair: HAIR_PALETTE,
  glasses: GARMENT_PALETTE,
  top: GARMENT_PALETTE,
  bottom: GARMENT_PALETTE,
  outfit: GARMENT_PALETTE, // o vestido (outfit-01) é tintável; os looks (02–05) têm cor embutida
  shoes: GARMENT_PALETTE,
}

/** Sets (lookup O(1), já minúsculo) p/ validar cor no domínio. */
export const AVATAR_PALETTE_SETS: Partial<Record<AvatarCategory, ReadonlySet<string>>> =
  Object.fromEntries(
    Object.entries(AVATAR_CATEGORY_PALETTES).map(([cat, colors]) => [cat, new Set(colors)]),
  ) as Partial<Record<AvatarCategory, ReadonlySet<string>>>

/**
 * Categorias REMOVÍVEIS → id da peça "nenhum" (sem GLB; o renderer não desenha nada).
 * "Tirar" = equipar a peça nenhum (sem slot nulo, sem caso especial).
 */
export const AVATAR_REMOVABLE_NONE: Partial<Record<AvatarCategory, string>> = {
  hair: 'hair-none',
  faceDecor: 'face-none',
  facialHair: 'beard-none',
  glasses: 'glasses-none',
  hat: 'hat-none',
  outfit: 'outfit-none',
  accessory: 'acc-none',
}

/**
 * Oclusão de peças (apresentação): a categoria-chave, quando equipada com peça REAL
 * (≠ nenhum), ESCONDE as categorias listadas no render. Exportado p/ o renderer + a
 * conformância; o SERVIDOR NÃO gateia nisso (chapéu+cabelo é estado válido — o renderer
 * oculta; tirar o chapéu restaura o cabelo escolhido). Single source of truth.
 */
export const AVATAR_HIDE_GROUPS: Partial<Record<AvatarCategory, AvatarCategory[]>> = {
  hat: ['hair'],
  outfit: ['top', 'bottom'], // vestido/roupa única cobre as duas peças
}

/**
 * Conjunto inicial GRÁTIS (uma peça por categoria + cor default onde há paleta) — todo
 * perfil novo começa com este avatar antes de qualquer escolha/compra. Determinístico
 * (sem `Date.now`/random). Toda cor default ∈ paleta da categoria.
 */
export const DEFAULT_AVATAR_SLOTS: Readonly<Record<AvatarCategory, AvatarSlot>> = {
  head: { asset: 'head-01', color: '#ecad80' },
  hair: { asset: 'hair-01', color: '#6a4e35' },
  eyes: { asset: 'eyes-01' },
  eyebrows: { asset: 'eyebrow-01', color: '#6a4e35' },
  nose: { asset: 'nose-01' },
  faceDecor: { asset: 'face-none' }, // sem pintura por padrão (cor embutida; sem paleta)
  facialHair: { asset: 'beard-none', color: '#6a4e35' },
  glasses: { asset: 'glasses-none', color: '#3498db' },
  hat: { asset: 'hat-none' },
  top: { asset: 'top-01', color: '#3498db' },
  bottom: { asset: 'bottom-01', color: '#34495e' },
  outfit: { asset: 'outfit-none', color: '#e84393' }, // sem vestido por padrão (usa top+bottom)
  shoes: { asset: 'shoes-01', color: '#2c3e50' },
  accessory: { asset: 'acc-none' },
}
