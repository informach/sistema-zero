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
 * SEM paleta (`eyes`/`nose`/`faceDecor`/`hat`) têm cor embutida por variante (ou seguem a
 * pele). Os ids casam 1:1 com `public/avatar3d/parts/<id>.glb` no kids e na comunidade adulta
 * (os dois apps servem os MESMOS arquivos; peça nova entra nas duas pastas).
 *
 * **Peças próprias (26/10/2026):** a partir de `hair-12`, `head-05`, `eyes-13`, `eyebrow-11`,
 * `nose-05`, `face-09`, `glasses-05`, `top-04`, `bottom-04`, `outfit-06`, `shoes-04`, `acc-09` e
 * toda a aba Enfeite, as peças foram modeladas no Blender sobre o mesmo esqueleto e no mesmo
 * estilo do pacote (proposta do Canvas "Provador do avatar"). Mesma regra de materiais.
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
  'hat', // chapéu (removível; esconde o cabelo e o enfeite)
  'hairAccessory', // enfeite de cabelo: laço, tiara… (removível, tintável; aparece COM o cabelo)
  'top', // roupa de cima
  'bottom', // roupa de baixo
  'outfit', // vestido/roupa única (removível; esconde top+bottom)
  'shoes', // calçado
  'accessory', // acessório (brinco, colar, cachecol… removível; os novos pegam a cor da paleta)
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
  /**
   * `free`: de todo mundo. `coins`: compra com moedas Zappy. `festa` (B16, 31/10/2026): só a festa
   * do Arquipélago concede, no jogo e na época dela; nunca à venda (decisão da dona: "Só
   * conquistadas na festa").
   */
  tier: 'free' | 'coins' | 'festa'
  /** Preço em moedas Zappy (0 quando `free` ou `festa`). */
  price: number
}

const free = (id: string, category: AvatarCategory): Avatar3dPart => ({
  id,
  category,
  tier: 'free',
  price: 0,
})
const festa = (id: string, category: AvatarCategory): Avatar3dPart => ({
  id,
  category,
  tier: 'festa',
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
  // Rosto delicado (26/10/2026): o rosto 1 com sorriso pequeno e com sorriso fechado.
  free('head-05', 'head'),
  free('head-06', 'head'),

  // Cabelo — careca + 1 de MENINO (hair-01) e 1 de MENINA (hair-08, estilo longo, trazido pra
  // 2ª posição) GRÁTIS — justiça de gênero: menina nova não fica sem cabelo grátis. Resto pago.
  free('hair-none', 'hair'),
  free('hair-01', 'hair'),
  free('hair-08', 'hair'), // menina (longo) — liberado e trazido pra frente
  free('hair-12', 'hair'), // longo solto (26/10/2026): o cabelo comprido novo também é grátis
  paid('hair-02', 'hair', 50),
  paid('hair-03', 'hair', 60),
  paid('hair-04', 'hair', 60),
  paid('hair-05', 'hair', 70),
  paid('hair-06', 'hair', 80),
  paid('hair-07', 'hair', 90),
  paid('hair-09', 'hair', 100),
  paid('hair-10', 'hair', 110),
  paid('hair-11', 'hair', 120),
  paid('hair-13', 'hair', 80), // rabo de cavalo alto
  paid('hair-14', 'hair', 90), // duas tranças
  paid('hair-15', 'hair', 100), // crespo volumoso
  paid('hair-16', 'hair', 70), // cachos curtos
  paid('hair-17', 'hair', 70), // coque alto
  paid('hair-18', 'hair', 90), // maria-chiquinha

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
  free('eyes-13', 'eyes'), // com cílios
  free('eyes-14', 'eyes'), // com cílios e brilho

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
  free('eyebrow-11', 'eyebrows'), // fina e arqueada

  // Nariz — grátis (segue a pele).
  free('nose-01', 'nose'),
  free('nose-02', 'nose'),
  free('nose-03', 'nose'),
  free('nose-04', 'nose'),
  free('nose-05', 'nose'), // pequeno

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
  paid('face-09', 'faceDecor', 45), // sardas
  free('face-10', 'faceDecor'), // bochecha rosada: faz parte do rosto delicado, grátis

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
  paid('glasses-05', 'glasses', 70), // redondos
  paid('glasses-06', 'glasses', 90), // gatinho

  // Chapéu — nenhum grátis + pagos (cor embutida; esconde o cabelo).
  free('hat-none', 'hat'),
  paid('hat-01', 'hat', 70),
  paid('hat-02', 'hat', 80),
  paid('hat-03', 'hat', 90),
  paid('hat-04', 'hat', 100),
  paid('hat-05', 'hat', 120),
  paid('hat-06', 'hat', 150),
  paid('hat-07', 'hat', 150),
  // As roupas das festas (B16, 31/10/2026): só a festa do Arquipélago concede (A21), nunca à venda.
  // A lista é a `conquista` de `VESTUARIO_DAS_FESTAS` (teste de conformidade).
  festa('hat-08', 'hat'), // cartolinha de Carnaval
  festa('hat-09', 'hat'), // chapéu de palha junino
  festa('hat-10', 'hat'), // gorro de fim de ano

  // Enfeite de cabelo (26/10/2026): nenhum grátis + pagos (tintável). Chapéu esconde.
  free('enfeite-none', 'hairAccessory'),
  paid('enfeite-01', 'hairAccessory', 50), // laço
  paid('enfeite-02', 'hairAccessory', 60), // tiara
  paid('enfeite-03', 'hairAccessory', 80), // coroa de flores
  paid('enfeite-04', 'hairAccessory', 50), // presilhas de estrela
  paid('enfeite-05', 'hairAccessory', 90), // orelhinhas de gato
  festa('enfeite-06', 'hairAccessory'), // tiara de lanterninhas (Noite das Lanternas)

  // Roupa de cima — 1 grátis + 2 pagas (tintável).
  free('top-01', 'top'),
  paid('top-02', 'top', 70),
  paid('top-03', 'top', 90),
  paid('top-04', 'top', 60), // manga longa
  paid('top-05', 'top', 100), // moletom com capuz
  paid('top-06', 'top', 70), // listrada
  festa('top-07', 'top'), // colete de franjas (Carnaval)
  festa('top-08', 'top'), // capa de estrelas (Noite das Lanternas)
  festa('top-09', 'top'), // suéter de estrela (fim de ano)

  // Roupa de baixo — 1 grátis + 2 pagas (tintável).
  free('bottom-01', 'bottom'),
  paid('bottom-02', 'bottom', 60),
  paid('bottom-03', 'bottom', 80),
  paid('bottom-04', 'bottom', 60), // calça comprida
  paid('bottom-05', 'bottom', 80), // saia longa

  // Vestido / roupa única — nenhum + vestido GRÁTIS (tintável) + looks pagos. Esconde top+bottom.
  free('outfit-none', 'outfit'),
  free('outfit-01', 'outfit'),
  paid('outfit-02', 'outfit', 90),
  paid('outfit-03', 'outfit', 100),
  paid('outfit-04', 'outfit', 110),
  paid('outfit-05', 'outfit', 120),
  paid('outfit-06', 'outfit', 100), // vestido longo (tintável)
  festa('outfit-07', 'outfit'), // vestido de chita (Festa Junina)

  // Calçado — 1 grátis + pagos (tintável).
  free('shoes-01', 'shoes'),
  paid('shoes-02', 'shoes', 70),
  paid('shoes-03', 'shoes', 90),
  paid('shoes-04', 'shoes', 90), // bota
  paid('shoes-05', 'shoes', 60), // sapatilha

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
  paid('acc-09', 'accessory', 80), // colar de coração (o pingente pega a cor)
  paid('acc-10', 'accessory', 90), // cachecol
]

export const AVATAR3D_PARTS_BY_ID: ReadonlyMap<string, Avatar3dPart> = new Map(
  AVATAR3D_PARTS.map((p) => [p.id, p]),
)

/**
 * Paletas CURADAS por categoria (hex MINÚSCULO). Pintar é GRÁTIS. Só categorias com
 * material `Color_*` (ou pele) têm paleta: cabeça (pele), cabelo/sobrancelha/barba (cabelo),
 * óculos/top/bottom/shoes/enfeite/acessório (roupa). `eyes`/`nose`/`hat`/`faceDecor` não
 * aceitam cor. No acessório só as peças novas (`acc-09`, `acc-10`) têm material `Color_`; os
 * brincos e as gravatas mantêm a cor embutida e ignoram a escolhida.
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
  hairAccessory: GARMENT_PALETTE,
  accessory: GARMENT_PALETTE,
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
  hairAccessory: 'enfeite-none',
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
  hat: ['hair', 'hairAccessory'], // o enfeite fica no cabelo: some junto com ele
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
  hairAccessory: { asset: 'enfeite-none', color: '#e84393' },
  top: { asset: 'top-01', color: '#3498db' },
  bottom: { asset: 'bottom-01', color: '#34495e' },
  outfit: { asset: 'outfit-none', color: '#e84393' }, // sem vestido por padrão (usa top+bottom)
  shoes: { asset: 'shoes-01', color: '#2c3e50' },
  accessory: { asset: 'acc-none', color: '#e74c3c' },
}
