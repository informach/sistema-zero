import {
  httpUrlSchema,
  type ResearchEvidence,
  researchResultSchema,
} from '@sistemazero/marketing-contracts'
/** Collect only URLs actually present in native web-tool results, bounded independently of assistant text. */
export function observedResearchUrls(value: unknown): string[] {
  const urls = new Set<string>(),
    queue: [unknown, number][] = [[value, 0]]
  let visited = 0
  while (queue.length) {
    const next = queue.shift()
    if (!next) break
    const [item, depth] = next
    if (++visited > 10000 || urls.size >= 200) break
    if (typeof item === 'string') {
      const url = httpUrlSchema.safeParse(item)
      if (url.success) urls.add(url.data)
    } else if (item && typeof item === 'object' && depth < 10)
      for (const child of Object.values(item)) queue.push([child, depth + 1])
  }
  return [...urls]
}
export function validateResearch(
  text: string,
  observedUrls: string[],
  toolCalls: number,
): ResearchEvidence {
  if (!toolCalls)
    throw new Error(
      'A pesquisa não consultou fontes externas; o resultado não será tratado como evidência',
    )
  const result = researchResultSchema.parse(JSON.parse(text))
  const normalize = (url: string) => {
    const value = new URL(url)
    value.hash = ''
    return value.href.replace(/\/$/, '')
  }
  const observed = new Set(observedUrls.map(normalize))
  if (result.sources.some((source) => !observed.has(normalize(source.url))))
    throw new Error(
      'A pesquisa citou uma página que não consta das consultas do cliente. O resultado foi preservado para conferência, sem alterar a direção.',
    )
  return { result, observedUrls, searchedAt: new Date().toISOString(), toolCalls }
}
