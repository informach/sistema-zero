import type { HelpTutorialDocument, HelpTutorialEntry } from './document'

/**
 * A busca do "Como fazer" roda no NAVEGADOR da criança, sobre a lista publicada (dezenas
 * de tutoriais, alguns KB cada). Uma lib de busca ou um tsvector seriam peso para nada
 * nesse volume; o que importa é a régua: sem acento, por prefixo de palavra, e o título
 * valendo mais que o corpo. O texto dos passos chega pré-achatado (`searchText`, gravado
 * no publish), então a página não precisa do documento inteiro para pesquisar.
 */

export function normalizeHelpText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tira o markdown que o `renderMarkdown` entende: imagem, link, ênfase, código, títulos. */
export function stripHelpMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)(?:\{[^}]*\})?/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,3}\s+/gm, '')
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim()
}

/** O texto achatado que vai para `searchText` no publish (já normalizado). */
export function buildHelpSearchText(doc: HelpTutorialDocument): string {
  const partes = [
    doc.title,
    doc.summary,
    ...(doc.keywords ?? []),
    ...(doc.steps ?? []).flatMap((step) => [step.title, stripHelpMarkdown(step.body ?? '')]),
  ]
  return normalizeHelpText(partes.filter(Boolean).join(' '))
}

const ZAPPY_TEXT_MAX = 1_500

/**
 * O trecho que o Zappy recebe quando um tutorial casa com a pergunta: resumo + passos
 * numerados, legível (não normalizado), com teto. É o suficiente para ele explicar em
 * poucas palavras e apontar o passo a passo.
 */
export function buildHelpZappyText(doc: HelpTutorialDocument): string {
  const passos = (doc.steps ?? []).map(
    (step, index) => `${index + 1}. ${step.title.trim()}: ${stripHelpMarkdown(step.body ?? '')}`,
  )
  const texto = [doc.summary.trim(), ...passos].filter(Boolean).join(' ')
  return texto.length > ZAPPY_TEXT_MAX ? `${texto.slice(0, ZAPPY_TEXT_MAX - 1).trimEnd()}…` : texto
}

export function normalizeHelpQuery(query: string): string[] {
  return normalizeHelpText(query)
    .split(' ')
    .filter((termo) => termo.length >= 2)
}

const PESO_TITULO = 8
const PESO_KEYWORD = 6
const PESO_RESUMO = 3
const PESO_CORPO = 1

function casaTermo(texto: string, termo: string): 'exato' | 'prefixo' | null {
  const palavras = texto.split(' ')
  let prefixo = false
  for (const palavra of palavras) {
    if (palavra === termo) return 'exato'
    if (palavra.startsWith(termo)) prefixo = true
  }
  return prefixo ? 'prefixo' : null
}

export type HelpSearchable = Pick<
  HelpTutorialEntry,
  'title' | 'summary' | 'keywords' | 'searchText'
>

/**
 * Pontuação de UM tutorial para a consulta. Zero = não casa. Todos os termos precisam
 * casar em algum campo (senão "camada pinta" traria tudo que fala de pinta); o campo
 * decide o peso, e casar a palavra inteira vale mais que o prefixo.
 */
export function scoreHelpTutorial(entry: HelpSearchable, termos: readonly string[]): number {
  if (termos.length === 0) return 0
  const titulo = normalizeHelpText(entry.title)
  const keywords = normalizeHelpText((entry.keywords ?? []).join(' '))
  const resumo = normalizeHelpText(entry.summary)
  const corpo = entry.searchText
  let total = 0
  for (const termo of termos) {
    let melhor = 0
    for (const [texto, peso] of [
      [titulo, PESO_TITULO],
      [keywords, PESO_KEYWORD],
      [resumo, PESO_RESUMO],
      [corpo, PESO_CORPO],
    ] as const) {
      const casou = casaTermo(texto, termo)
      if (!casou) continue
      const pontos = casou === 'exato' ? peso : peso / 2
      if (pontos > melhor) melhor = pontos
    }
    if (melhor === 0) return 0
    total += melhor
  }
  // Título que COMEÇA pela consulta inteira é o que a criança quis dizer.
  if (titulo.startsWith(termos.join(' '))) total += PESO_TITULO
  return total
}

export interface HelpSearchHit<T extends HelpSearchable = HelpTutorialEntry> {
  entry: T
  score: number
}

/** Os tutoriais que casam com a consulta, do mais provável ao menos. Consulta vazia = nada. */
export function searchHelpTutorials<T extends HelpSearchable>(
  entries: readonly T[],
  query: string,
  limit = 10,
): HelpSearchHit<T>[] {
  const termos = normalizeHelpQuery(query)
  if (termos.length === 0) return []
  return entries
    .map((entry) => ({ entry, score: scoreHelpTutorial(entry, termos) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'pt-BR'))
    .slice(0, limit)
}
