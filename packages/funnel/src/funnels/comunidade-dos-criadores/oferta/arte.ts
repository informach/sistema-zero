import type { ComunidadePageId } from './types'

/**
 * Direção de arte que depende do ASSUNTO, e não da posição: o ícone de cada capítulo, o de cada
 * subtítulo e o de cada assunto das dúvidas. É só desenho (nomes de ícone do Material Symbols):
 * nenhuma palavra da copy mora aqui. Sem entrada, vale o ícone pela posição (`ComunidadeSection`
 * e o corpo da oferta). Hoje só a página de continuidade usa o motor de seções.
 */

/** Por seção, o ícone do chip do capítulo. A Jornada (`journey`) já tem o dela (`route`). */
export const ICONES_DE_CAPITULO: Record<string, string> = {
  // Continuidade (as cinco páginas de perfil saíram em 20/10/2026)
  ideia: 'lightbulb',
  'proximo-passo': 'location_on',
  acrescenta: 'add_circle',
  experiencia: 'extension',
  familias: 'format_quote',
}

/** Por seção, o ícone do grupo na MESMA posição (`null` = grupo sem subtítulo). */
export const ICONES_DE_GRUPO: Record<string, readonly (string | null)[]> = {
  'proximo-passo': [null, 'construction', 'search', 'task_alt', 'publish'],
}

/**
 * Páginas em que a ÊNFASE do título do herói fica inteira numa linha: o valor é a largura da frase
 * em `em` (medida no navegador, com folga). O título encolhe só o que for preciso para ela caber,
 * no computador e no celular. Serve para ênfase curta que o equilíbrio de linhas deixava partida;
 * ênfase longa segue quebrando no fluxo do título.
 */
export const ENFASE_NUMA_LINHA: Partial<Record<ComunidadePageId, number>> = {}

/** Por página, o ícone de cada assunto das dúvidas, na ordem de `faqGroups`. */
export const ICONES_DE_DUVIDAS: Partial<Record<ComunidadePageId, readonly string[]>> = {
  continuar: ['signpost', 'event', 'school', 'diversity_3'],
}
