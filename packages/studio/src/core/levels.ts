/**
 * Perfis de aprendizado / divulgação progressiva.
 *
 * Cada bloco e cada categoria têm um NÍVEL; a paleta (toolbox) é filtrada por
 * nível na CONSTRUÇÃO — nunca no registro do Blockly nem no parsing. Invariantes:
 * - Esconder afeta só a OFERTA na paleta. O registro global do Blockly, o
 *   reverse-parse e os projetos salvos continuam intactos.
 * - Um projeto que já usa um bloco acima do nível continua renderizando o bloco.
 * - Trocar de nível JAMAIS apaga blocos existentes.
 *
 * Controle: o professor (host) FIXA o nível; o aluno pode REVELAR o avançado
 * (toggle opcional, desligável pelo professor). Modelo (reforma 2D/3D 07/2026) =
 * ESCADA TOTAL de 6 degraus — dificuldade × eixo, 2D antes de 3D em cada
 * dificuldade, na MESMA ordem da carreira do aluno — + allowlist custom por aula.
 */

export type BlockLevel =
  | 'iniciante-2d'
  | 'iniciante-3d'
  | 'intermediario-2d'
  | 'intermediario-3d'
  | 'avancado-2d'
  | 'avancado-3d'

/**
 * Valores HISTÓRICOS da escala de 3 níveis (pré-reforma). Vivem para sempre em
 * jsonb de aulas salvas, no clipboard de config do admin e em embutidores antigos
 * — a API pública aceita ambos e `normalizeBlockLevel` converte na fronteira.
 */
export type LegacyBlockLevel = 'iniciante' | 'intermediario' | 'avancado'
export type AnyBlockLevel = BlockLevel | LegacyBlockLevel

export const BLOCK_LEVELS: readonly BlockLevel[] = [
  'iniciante-2d',
  'iniciante-3d',
  'intermediario-2d',
  'intermediario-3d',
  'avancado-2d',
  'avancado-3d',
]

/** Teto da escada (o "mostra tudo") — usado pelo reveal e pelo SettingsDrawer. */
export const MAX_BLOCK_LEVEL: BlockLevel = 'avancado-3d'

const RANK: Record<BlockLevel, number> = {
  'iniciante-2d': 0,
  'iniciante-3d': 1,
  'intermediario-2d': 2,
  'intermediario-3d': 3,
  'avancado-2d': 4,
  'avancado-3d': 5,
}

/**
 * Mapeamento do legado — escolhido para preservar EXATAMENTE os conjuntos de
 * blocos visíveis de antes da reforma: o iniciante antigo não via nada de 3D
 * (→ rank 0); o intermediário antigo via gk/g3d/w3d (→ rank 3, que cobre
 * int-2d + ini-3d + int-3d); o avançado antigo via tudo (→ teto).
 */
export const LEGACY_BLOCK_LEVEL_MAP: Record<LegacyBlockLevel, BlockLevel> = {
  iniciante: 'iniciante-2d',
  intermediario: 'intermediario-3d',
  avancado: 'avancado-3d',
}

const LEVEL_SET = new Set<string>(BLOCK_LEVELS)

/**
 * Fronteira ÚNICA de entrada de nível vindo de FORA (props públicas, jsonb de
 * aula, clipboard/localStorage): null/undefined → undefined (o caller aplica o
 * SEU default); legado → mapeado; valor novo válido → ele mesmo; string
 * DESCONHECIDA → 'iniciante-2d' (fail-CLOSED: lixo num jsonb de aula infantil
 * RESTRINGE a paleta em vez de abrir tudo).
 */
export function normalizeBlockLevel(level: string | null | undefined): BlockLevel | undefined {
  if (level == null) return undefined
  if (LEVEL_SET.has(level)) return level as BlockLevel
  const legacy = LEGACY_BLOCK_LEVEL_MAP[level as LegacyBlockLevel]
  return legacy ?? 'iniciante-2d'
}

/** Rótulos dos degraus p/ a autoria (admin) — fonte única do Select "Nível". */
export const BLOCK_LEVEL_OPTIONS: readonly { value: BlockLevel; label: string }[] = [
  { value: 'iniciante-2d', label: 'Iniciante 2D' },
  { value: 'iniciante-3d', label: 'Iniciante 3D' },
  { value: 'intermediario-2d', label: 'Intermediário 2D' },
  { value: 'intermediario-3d', label: 'Intermediário 3D' },
  { value: 'avancado-2d', label: 'Avançado 2D' },
  { value: 'avancado-3d', label: 'Avançado 3D' },
]

export function levelRank(level: BlockLevel): number {
  return RANK[level]
}

/** Default standalone/sem prop: mostra tudo (não regride o playground). */
export const DEFAULT_LEARNING_LEVEL: BlockLevel = MAX_BLOCK_LEVEL

export interface LearningProfile {
  /** Nível fixado pelo professor (host). */
  level: BlockLevel
  /** Aluno revelou o avançado → sobe o teto efetivo para o topo da escada. */
  revealed?: boolean
  /**
   * Lista de blocos da aula. Quando NÃO vazia, vira RESTRITIVA: a paleta mostra SÓ
   * estes blocos (+ as 🗂️ Áreas do projeto, sempre visíveis), ignorando nível/categoria.
   * Vazia/ausente = curadoria normal por nível.
   */
  allowBlocks?: readonly string[]
  /** Nomes de categoria SEMPRE visíveis, independente do nível. */
  allowCategories?: readonly string[]
}

/** Perfil que mostra tudo (default fora de um <Studio> e no playground). */
export const FULL_LEARNING_PROFILE: LearningProfile = { level: MAX_BLOCK_LEVEL }

/** Teto de nível efetivo considerando o "revelar avançado" do aluno. */
export function effectiveLevel(profile: LearningProfile): BlockLevel {
  return profile.revealed ? MAX_BLOCK_LEVEL : profile.level
}

export function isLevelWithin(level: BlockLevel, profile: LearningProfile): boolean {
  return levelRank(level) <= levelRank(effectiveLevel(profile))
}

/**
 * Um bloco aparece se: (lista da aula presente) ele está NELA — RESTRITIVO, só os
 * listados, ignora o nível; (sem lista) seu nível cabe no teto efetivo.
 */
export function isBlockTypeAllowed(
  blockType: string,
  blockLevel: BlockLevel,
  profile: LearningProfile,
): boolean {
  const only = profile.allowBlocks
  if (only && only.length > 0) return only.includes(blockType)
  return isLevelWithin(blockLevel, profile)
}

/**
 * Uma categoria aparece se: (lista da aula presente) SEMPRE — o filtro de bloco + o
 * descarte de categoria vazia decidem (categoria sem bloco listado some); (sem lista)
 * está em `allowCategories` OU seu nível cabe no teto.
 */
export function isCategoryAllowed(
  categoryName: string,
  categoryLevel: BlockLevel,
  profile: LearningProfile,
): boolean {
  if (profile.allowBlocks && profile.allowBlocks.length > 0) return true
  if (profile.allowCategories?.includes(categoryName)) return true
  return isLevelWithin(categoryLevel, profile)
}

/**
 * Nível default de cada categoria CORE do toolbox (sobreposto pelo `level` de cada bloco).
 * Vive aqui — e não no `blockly/toolbox`, que puxa o Blockly — p/ o admin importar a lista
 * de categorias SEM arrastar o editor inteiro pro bundle. A CHAVE é o NOME DE GATING (o que
 * `allowCategories`/`isCategoryAllowed` compara).
 */
// ⚠️ Estes níveis são o GATE de CATEGORIA (esconde a categoria inteira abaixo do
// nível) e o fallback do `categoryLevel`. Com a curadoria POR BLOCO
// (`blockly/blockLevels.ts` → `resolveBlockLevel`), cada valor aqui deve ser o
// MENOR nível entre os blocos da categoria (senão a categoria some mesmo tendo
// bloco visível). A `pruneEmptyCategories` remove o que ficou sem bloco no tier.
// Categorias core são 2D por natureza, exceto 'Canvas 3D' (three.js cru).
export const CORE_CATEGORY_LEVELS: Record<string, BlockLevel> = {
  HTML: 'iniciante-2d',
  SVG: 'iniciante-2d',
  CSS: 'iniciante-2d',
  DOM: 'iniciante-2d',
  JavaScript: 'iniciante-2d',
  Matemática: 'intermediario-2d',
  Canvas: 'iniciante-2d',
  'Canvas 3D': 'intermediario-3d',
  Valores: 'iniciante-2d',
  Funções: 'intermediario-2d',
  Classes: 'avancado-2d',
  Objetos: 'avancado-2d',
  Avançado: 'avancado-2d',
}

/**
 * Rótulo amigável de cada categoria CORE p/ a autoria (admin): o que o ALUNO vê na toolbox.
 * Ex.: `DOM` controla "🌐 Página" + "⚡ Eventos"; `JavaScript` controla a lógica dentro de
 * "Programação". Sem rótulo → cai no próprio nome de gating.
 */
const CORE_CATEGORY_LABELS: Record<string, string> = {
  HTML: 'HTML',
  SVG: 'SVG',
  CSS: 'CSS',
  DOM: 'Página e Eventos',
  JavaScript: 'Programação (lógica/JS)',
  Matemática: 'Matemática',
  Canvas: 'Canvas',
  'Canvas 3D': 'Canvas 3D (three.js)',
  Valores: 'Valores',
  Funções: 'Funções',
  Classes: 'Classes',
  Objetos: 'Objetos',
  Avançado: 'Avançado',
}

/**
 * Categorias que o `allowCategories` das aulas ("sempre visível") aceita, DERIVADAS de
 * `CORE_CATEGORY_LEVELS` — fonte ÚNICA do picker de autoria do admin. Categoria nova no
 * toolbox aparece aqui sozinha (antes a lista hardcoded do admin ficava desatualizada).
 */
export const CORE_CATEGORY_OPTIONS: readonly { value: string; label: string }[] = Object.keys(
  CORE_CATEGORY_LEVELS,
).map((value) => ({ value, label: CORE_CATEGORY_LABELS[value] ?? value }))
