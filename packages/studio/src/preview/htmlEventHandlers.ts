import { instrumentLoops } from './loopGuard'
import { scriptIntegrity } from './scriptIntegrity'

export interface PreparedHtmlEventHandlers {
  html: string
  hashes: readonly `sha256-${string}`[]
}

const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set(['script', 'style', 'textarea', 'title'])

/**
 * Instrumenta handlers `on*` sem convertê-los em listeners.
 *
 * Preservar o atributo é importante: o navegador fornece `this`/`event` e
 * interpreta `return false` com uma semântica que um wrapper genérico perderia.
 * O chamador inclui os hashes retornados junto de `'unsafe-hashes'` na CSP.
 */
export function prepareHtmlEventHandlers(html: string): PreparedHtmlEventHandlers {
  if (!html || !/\son[a-z][\w:-]*\s*=/i.test(html)) return { html, hashes: [] }

  const hashes = new Set<`sha256-${string}`>()
  let output = ''
  let cursor = 0

  while (cursor < html.length) {
    const tagStart = html.indexOf('<', cursor)
    if (tagStart < 0) {
      output += html.slice(cursor)
      break
    }
    output += html.slice(cursor, tagStart)

    if (html.startsWith('<!--', tagStart)) {
      const commentEnd = html.indexOf('-->', tagStart + 4)
      const end = commentEnd < 0 ? html.length : commentEnd + 3
      output += html.slice(tagStart, end)
      cursor = end
      continue
    }

    const tagEnd = findTagEnd(html, tagStart)
    if (tagEnd < 0) {
      output += html.slice(tagStart)
      break
    }

    const tag = html.slice(tagStart, tagEnd + 1)
    const tagName = tag.match(/^<\s*([a-z][\w:-]*)/i)?.[1]?.toLowerCase()
    const rewritten = tagName ? rewriteEventHandlerAttributes(tag, hashes) : tag
    output += rewritten
    cursor = tagEnd + 1

    // Conteúdo raw-text não contém markup HTML. Ignorá-lo evita interpretar
    // exemplos de `onclick="..."` dentro de JSON, CSS ou texto como atributos.
    if (tagName && RAW_TEXT_ELEMENTS.has(tagName) && !/\/\s*>$/.test(tag)) {
      const close = findClosingTag(html, tagName, cursor)
      if (close >= 0) {
        output += html.slice(cursor, close)
        cursor = close
      }
    }
  }

  return { html: output, hashes: [...hashes] }
}

function findTagEnd(html: string, start: number): number {
  let quote = ''
  for (let index = start + 1; index < html.length; index += 1) {
    const char = html[index] ?? ''
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === '>') return index
  }
  return -1
}

function findClosingTag(html: string, tagName: string, start: number): number {
  const lower = html.toLowerCase()
  return lower.indexOf(`</${tagName}`, start)
}

function rewriteEventHandlerAttributes(tag: string, hashes: Set<`sha256-${string}`>): string {
  return tag.replace(
    /(\s+)(on[a-z][\w:-]*)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
    (_full, spacing: string, name: string, equals: string, double, single, unquoted) => {
      const source = String(double ?? single ?? unquoted ?? '')
      const instrumented = instrumentLoops(decodeHtmlEntities(source))
      hashes.add(scriptIntegrity(instrumented))
      return `${spacing}${name}${equals}"${encodeHtmlAttribute(instrumented)}"`
    },
  )
}

/** Decodifica referências como o parser HTML faz antes de compilar o handler. */
function decodeHtmlEntities(value: string): string {
  if (!value.includes('&')) return value
  return value.replace(/&(?:#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);?/g, (entity) => {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea')
      textarea.innerHTML = entity
      if (textarea.value !== entity) return textarea.value
    }
    const numeric = entity.match(/^&#(?:x([0-9a-f]+)|(\d+));?$/i)
    if (numeric) {
      const codePoint = Number.parseInt(numeric[1] ?? numeric[2] ?? '', numeric[1] ? 16 : 10)
      if (Number.isFinite(codePoint)) {
        try {
          return String.fromCodePoint(codePoint)
        } catch {
          return '\uFFFD'
        }
      }
    }
    const basic: Record<string, string> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      nbsp: '\u00A0',
      quot: '"',
    }
    return basic[entity.slice(1).replace(/;$/, '').toLowerCase()] ?? entity
  })
}

function encodeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
