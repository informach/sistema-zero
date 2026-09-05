export interface KbPromptArticle {
  title: string
  content: string
}

const STOP_WORDS = new Set([
  'a',
  'ao',
  'aos',
  'as',
  'com',
  'como',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'eu',
  'me',
  'meu',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'os',
  'para',
  'por',
  'que',
  'um',
  'uma',
])

function tokens(value: string): string[] {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .match(/[a-z0-9]+/g) ?? []
  ).filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

function score(queryTokens: Set<string>, article: KbPromptArticle): number {
  const titleTokens = tokens(article.title)
  const contentTokens = tokens(article.content)
  let value = 0
  for (const token of queryTokens) {
    if (titleTokens.includes(token)) value += 5
    if (contentTokens.includes(token)) value += 1
  }
  return value
}

/**
 * Seleciona contexto lexicalmente relevante e limita o tamanho já no formato
 * que será interpolado no prompt. Entradas sem relação com o ticket não entram.
 */
export function selectRelevantKbArticles(
  query: string,
  articles: KbPromptArticle[],
  maxChars: number,
): KbPromptArticle[] {
  if (maxChars <= 0) return []
  const queryTokens = new Set(tokens(query))
  if (queryTokens.size === 0) return []

  const ranked = articles
    .map((article, index) => ({ article, index, score: score(queryTokens, article) }))
    .filter((candidate) => candidate.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.index - b.index ||
        a.article.title.localeCompare(b.article.title, 'pt-BR'),
    )

  const selected: KbPromptArticle[] = []
  let used = 0
  for (const { article } of ranked) {
    const separatorChars = selected.length === 0 ? 0 : 2
    const header = `# ${article.title}\n`
    const remaining = maxChars - used - separatorChars - header.length
    if (remaining <= 0) continue
    const content = article.content.slice(0, remaining)
    if (!content) continue
    selected.push({ title: article.title, content })
    used += separatorChars + header.length + content.length
    if (used >= maxChars) break
  }
  return selected
}
