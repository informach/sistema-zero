/**
 * Direção de arte que depende do ASSUNTO, e não da posição, para o motor de seções
 * (`ComunidadeSection`, usado pelas páginas do presente e do embaixador): o ícone de cada capítulo e
 * o de cada subtítulo. É só desenho (nomes de ícone do Material Symbols): nenhuma palavra da copy
 * mora aqui. Sem entrada, vale o ícone pela posição. As entradas da continuidade antiga saíram com
 * ela em 20/10/2026 (a página nova tem corpo próprio).
 */

/** Por seção, o ícone do chip do capítulo. A Jornada (`journey`) já tem o dela (`route`). */
export const ICONES_DE_CAPITULO: Record<string, string> = {}

/** Por seção, o ícone do grupo na MESMA posição (`null` = grupo sem subtítulo). */
export const ICONES_DE_GRUPO: Record<string, readonly (string | null)[]> = {}
