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
 * (toggle opcional, desligável pelo professor). Modelo = 3 níveis + allowlist
 * custom por aula.
 */

export type BlockLevel = 'iniciante' | 'intermediario' | 'avancado'

export const BLOCK_LEVELS: readonly BlockLevel[] = ['iniciante', 'intermediario', 'avancado']

const RANK: Record<BlockLevel, number> = { iniciante: 0, intermediario: 1, avancado: 2 }

export function levelRank(level: BlockLevel): number {
  return RANK[level]
}

/** Default standalone/sem prop: mostra tudo (não regride o playground). */
export const DEFAULT_LEARNING_LEVEL: BlockLevel = 'avancado'

export interface LearningProfile {
  /** Nível fixado pelo professor (host). */
  level: BlockLevel
  /** Aluno revelou o avançado → sobe o teto efetivo para 'avancado'. */
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
export const FULL_LEARNING_PROFILE: LearningProfile = { level: 'avancado' }

/** Teto de nível efetivo considerando o "revelar avançado" do aluno. */
export function effectiveLevel(profile: LearningProfile): BlockLevel {
  return profile.revealed ? 'avancado' : profile.level
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
export const CORE_CATEGORY_LEVELS: Record<string, BlockLevel> = {
  HTML: 'iniciante',
  SVG: 'iniciante',
  CSS: 'iniciante',
  DOM: 'iniciante',
  JavaScript: 'iniciante',
  Matemática: 'intermediario',
  Canvas: 'iniciante',
  Valores: 'iniciante',
  Funções: 'intermediario',
  Classes: 'avancado',
  Objetos: 'avancado',
  Avançado: 'avancado',
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
