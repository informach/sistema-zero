/**
 * A linha final `SUGESTÕES: a | b | c` é um CONTRATO do prompt da etapa Z
 * (stage-z.ts do member-shell): toda resposta do Zappy termina com 2–4
 * sugestões prontas. Aqui ela vira DADO — o texto cru nunca renderiza; a UI
 * mostra o corpo e transforma as sugestões em chips clicáveis.
 */

const MARKER = /^sugest(?:õ|o)es\s*:/i
const MAX_SUGGESTIONS = 6

export interface SplitSuggestions {
  body: string
  suggestions: string[]
}

/**
 * Separa o corpo da ÚLTIMA linha de sugestões. Tolerante a caixa e acento
 * (conversas antigas/variações do modelo); ocorrência no MEIO do texto fica
 * intacta — o prompt proíbe texto depois da linha, só o fim conta.
 */
export function splitSuggestions(content: string): SplitSuggestions {
  const allLines = content.split('\n')
  let index = allLines.length - 1
  while (index >= 0 && !(allLines[index] ?? '').trim()) index -= 1
  const last = (allLines[index] ?? '').trim()
  const match = MARKER.exec(last)
  if (index < 0 || !match) return { body: content, suggestions: [] }
  const suggestions = last
    .slice(match[0].length)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index)
    .slice(0, MAX_SUGGESTIONS)
  return { body: allLines.slice(0, index).join('\n').trimEnd(), suggestions }
}

/**
 * Versão do STREAMING: além da linha completa, esconde um prefixo parcial do
 * marcador no fim do texto — "SUGEST" não pisca enquanto os tokens chegam.
 */
export function stripStreamingSuggestions(text: string): string {
  const { body } = splitSuggestions(text)
  if (body !== text) return body
  const allLines = text.split('\n')
  const last = (allLines[allLines.length - 1] ?? '').trim()
  if (last && isMarkerPrefix(last)) return allLines.slice(0, -1).join('\n').trimEnd()
  return text
}

function isMarkerPrefix(value: string): boolean {
  const lower = value.toLowerCase()
  return 'sugestões:'.startsWith(lower) || 'sugestoes:'.startsWith(lower)
}
