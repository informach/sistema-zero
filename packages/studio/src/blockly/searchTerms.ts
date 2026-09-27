import { normalizeSearchText } from '../core/searchText'
import { GAME_TWO_D_SEARCH_TERMS } from '../official-extensions/game-2d/searchTerms'

/** Resolve sinônimos dentro do índice já filtrado da paleta deste workspace. */
export function searchWithSynonyms<T extends { kind: string; type?: string }>(
  query: string,
  matching: (query: string) => T[],
): T[] {
  const result = matching(query)
  const words = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return result
  const seen = new Set(result.map((item) => item.type))
  for (const [type, terms] of Object.entries(GAME_TWO_D_SEARCH_TERMS)) {
    if (seen.has(type)) continue
    const normalized = normalizeSearchText(terms.join(' '))
    if (!words.every((word) => normalized.includes(word))) continue
    for (const entry of matching(type.replaceAll('_', ' '))) {
      if (entry.type !== type || seen.has(type)) continue
      result.push(entry)
      seen.add(type)
    }
  }
  return result
}
