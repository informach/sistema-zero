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
  /** Tipos de bloco SEMPRE visíveis, independente do nível (allowlist da aula). */
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

/** Um bloco aparece se está na allowlist OU se seu nível cabe no teto efetivo. */
export function isBlockTypeAllowed(
  blockType: string,
  blockLevel: BlockLevel,
  profile: LearningProfile,
): boolean {
  if (profile.allowBlocks?.includes(blockType)) return true
  return isLevelWithin(blockLevel, profile)
}

/** Uma categoria aparece se está na allowlist OU se seu nível cabe no teto. */
export function isCategoryAllowed(
  categoryName: string,
  categoryLevel: BlockLevel,
  profile: LearningProfile,
): boolean {
  if (profile.allowCategories?.includes(categoryName)) return true
  return isLevelWithin(categoryLevel, profile)
}
