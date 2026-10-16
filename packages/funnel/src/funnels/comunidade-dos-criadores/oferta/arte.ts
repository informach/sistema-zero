import type { ComunidadePageId } from './types'

/**
 * Direção de arte que depende do ASSUNTO, e não da posição: o ícone de cada capítulo, o de cada
 * subtítulo e o de cada assunto das dúvidas. É só desenho (nomes de ícone do Material Symbols):
 * nenhuma palavra da copy mora aqui. Sem entrada, vale o ícone pela posição (`ComunidadeSection`
 * e o corpo da oferta). Ids de seção desde a proposta de 16/10/2026: prefixo da página em B, C e D.
 */

/** Por seção, o ícone do chip do capítulo. A Jornada (`journey`) já tem o dela (`route`). */
export const ICONES_DE_CAPITULO: Record<string, string> = {
  // A: aprender criando (página padrão)
  a02: 'lightbulb',
  a03: 'play_circle',
  a10: 'format_quote',
  a06: 'interests',
  a05: 'family_star',
  a09: 'compare_arrows',
  // B: criação de jogos
  'b-ideia': 'lightbulb',
  'b-aula': 'play_circle',
  'b-mudanca': 'tune',
  'b-mostrar': 'share',
  'b-relatos': 'format_quote',
  'b-acompanha': 'family_star',
  'b-alternativas': 'compare_arrows',
  // C: expressão visual
  'c-interesse': 'brush',
  'c-aula': 'directions_run',
  'c-mostrar': 'share',
  'c-relatos': 'format_quote',
  'c-acompanha': 'family_star',
  'c-alternativas': 'compare_arrows',
  // D: formação tecnológica
  'd-uso': 'lightbulb',
  'd-aula': 'play_circle',
  'd-ferramentas': 'build',
  'd-relatos': 'format_quote',
  'd-acompanha': 'family_star',
  'd-alternativas': 'compare_arrows',
  // E: continuidade
  ideia: 'lightbulb',
  'proximo-passo': 'location_on',
  acrescenta: 'add_circle',
  experiencia: 'extension',
  familias: 'format_quote',
  // F: habilidades escolares
  f01: 'lightbulb',
  f02: 'extension',
  f09: 'format_quote',
  f03: 'school',
  f05: 'build',
  f06: 'family_star',
  f08: 'compare_arrows',
}

/** Por seção, o ícone do grupo na MESMA posição (`null` = grupo sem subtítulo). */
const PASSOS_DA_AULA = ['sports_esports', 'extension', 'play_arrow', 'cloud_done', null] as const
export const ICONES_DE_GRUPO: Record<string, readonly (string | null)[]> = {
  a03: PASSOS_DA_AULA,
  a06: ['sports_esports', 'palette', 'code'],
  a09: ['sports_esports', 'smart_display', 'videocam'],
  'b-aula': PASSOS_DA_AULA,
  'b-jornada': ['construction', 'smart_toy', 'view_in_ar'],
  'b-alternativas': ['sports_esports', 'smart_display', 'videocam'],
  'c-aula': ['accessibility_new', 'extension', 'brush', 'directions_run', null],
  'c-jornada': [null, 'smart_toy', 'view_in_ar'],
  'c-alternativas': ['draw', 'smart_display', 'videocam'],
  'd-aula': [null, 'sports_esports', 'extension', 'play_arrow', 'cloud_done', 'school'],
  'd-alternativas': ['smart_display', 'videocam', 'sports_esports'],
  'proximo-passo': [null, 'construction', 'search', 'task_alt', 'publish'],
  f02: PASSOS_DA_AULA,
  f03: ['menu_book', 'calculate', 'science', 'checklist'],
  f08: ['school', 'phone_iphone', 'home'],
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
  'tempo-de-tela': ['schedule', 'school', 'smart_toy', 'diversity_3', 'receipt_long'],
  'criacao-de-jogos': ['sports_esports', 'smart_toy', 'schedule', 'diversity_3', 'receipt_long'],
  'expressao-visual': ['palette', 'smart_toy', 'schedule', 'diversity_3', 'receipt_long'],
  'formacao-tecnologica': ['smart_toy', 'school', 'schedule', 'diversity_3', 'receipt_long'],
  continuar: ['signpost', 'event', 'school', 'diversity_3'],
  'habilidades-escolares': [
    'school',
    'family_star',
    'schedule',
    'smart_toy',
    'diversity_3',
    'receipt_long',
  ],
}
