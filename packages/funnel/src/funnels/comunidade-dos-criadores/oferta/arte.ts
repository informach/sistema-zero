import type { ComunidadePageId } from './types'

/**
 * Direção de arte que depende do ASSUNTO, e não da posição: o ícone de cada capítulo, o de cada
 * subtítulo e o de cada assunto das dúvidas. É só desenho (nomes de ícone do Material Symbols):
 * nenhuma palavra da copy mora aqui. Sem entrada, vale o ícone pela posição (`ComunidadeSection`
 * e o corpo da oferta).
 */

/** Por seção, o ícone do chip do capítulo. A Jornada (`journey`) já tem o dela (`route`). */
export const ICONES_DE_CAPITULO: Record<string, string> = {
  // B: criação de jogos
  b04: 'tune',
  b05: 'hub',
  b06: 'timer',
  b07: 'palette',
  b09: 'share',
  b10: 'family_star',
  b11: 'widgets',
  // C: expressão visual
  c02: 'brush',
  c04: 'palette',
  c05: 'directions_run',
  c06: 'hub',
  c07: 'timer',
  c08: 'family_star',
  c09: 'share',
  // D: formação tecnológica
  d05: 'build',
  d06: 'timer',
  d07: 'family_star',
  d08: 'interests',
  d09: 'share',
  d10: 'school',
  // E: continuidade
  'proximo-passo': 'location_on',
  e04: 'add_circle',
  experiencia: 'extension',
  e07: 'timer',
  e08: 'family_star',
  e09: 'interests',
  e10: 'smart_toy',
  e11: 'share',
  e12: 'bookmark',
}

/** Por seção, o ícone do grupo na MESMA posição (`null` = grupo sem subtítulo). */
export const ICONES_DE_GRUPO: Record<string, readonly (string | null)[]> = {
  a03: [null, 'link'],
  a04: [null, 'forum'],
  a07: [null, 'smart_toy'],
  a08: [null, 'group'],
  b08: [null, 'smart_toy'],
  c03: [null, 'extension'],
  c04: [null, 'draw'],
  d03: [null, 'rule', 'explore'],
  d06: [null, 'supervisor_account'],
  'proximo-passo': [null, 'construction', 'search', 'task_alt'],
  experiencia: [null, 'visibility'],
  e07: [null, 'forum'],
  e10: [null, 'lightbulb', 'smart_toy'],
  e11: [null, 'group'],
}

/**
 * Páginas em que a ÊNFASE do título do herói fica inteira numa linha: o valor é a largura da frase
 * em `em` (medida no navegador, com folga). O título encolhe só o que for preciso para ela caber,
 * no computador e no celular. Serve para ênfase curta que o equilíbrio de linhas deixava partida
 * ("continuar" sozinho numa linha); ênfase longa segue quebrando no fluxo do título.
 */
export const ENFASE_NUMA_LINHA: Partial<Record<ComunidadePageId, number>> = {
  continuar: 11.2,
}

/** Por página, o ícone de cada assunto das dúvidas, na ordem de `faqGroups`. */
export const ICONES_DE_DUVIDAS: Partial<Record<ComunidadePageId, readonly string[]>> = {
  continuar: ['signpost', 'key', 'school', 'build', 'devices', 'diversity_3', 'receipt_long'],
}
