import type { StudioTutorCodeFile } from '@sistemazero/core/studio/pro-tutor'
import { sha256Base64 } from '../preview/scriptIntegrity'

const KEY_IDENTIFIER = '[A-Za-z_$][A-Za-z0-9_$.-]{0,127}'
const ASSIGNMENT_PREFIX_RE = new RegExp(
  `(?<![A-Za-z0-9_$])(${KEY_IDENTIFIER})[ \\t]*=[ \\t]*`,
  'gu',
)
const PROPERTY_PREFIX_RE = new RegExp(`(["']?)(${KEY_IDENTIFIER})\\1[ \\t]*:[ \\t]*`, 'gu')
const URL_CREDENTIALS_RE = /\b([a-z][a-z0-9+.-]*:\/\/)([^:/@\s"'\x60]+):([^/@\s"'\x60]+)@/giu
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/giu
const KNOWN_TOKEN_RE = /\b(?:sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16})\b/g
const PRIVATE_KEY_BLOCK_RE =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g

const SENSITIVE_KEY_SUFFIXES = [
  'apikey',
  'accesstoken',
  'authtoken',
  'clientsecret',
  'password',
  'passwd',
  'privatekey',
  'secretaccesskey',
  'servicerolekey',
  'secret',
  'token',
  'databaseurl',
  'postgresurl',
  'mysqlurl',
  'mongourl',
  'mongodburl',
  'redisurl',
  'amqpurl',
  'connectionstring',
  'dsn',
] as const

function isSensitiveKeyName(value: string): boolean {
  const compact = value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return SENSITIVE_KEY_SUFFIXES.some((suffix) => compact.endsWith(suffix))
}

interface SensitiveBinding {
  index: number
  valueStart: number
}

/** Python/TypeScript annotations may precede the assignment. Never inspect beyond
 * this value's line or cross a sibling object property to find an equals sign. */
function annotatedValueStart(text: string, from: number): number | undefined {
  let depth = 0
  let quote: string | undefined
  for (let index = from; index < text.length; index++) {
    const character = text[index]!
    if ((character === '\r' || character === '\n') && depth === 0 && !quote) return
    if (quote) {
      if (character === '\\') index++
      else if (text.startsWith(quote, index)) {
        index += quote.length - 1
        quote = undefined
      }
      continue
    }
    if (character === '"' || character === "'" || character === '`') {
      quote =
        character !== '`' && text.startsWith(character.repeat(3), index)
          ? character.repeat(3)
          : character
      index += quote.length - 1
      continue
    }
    if ('([{'.includes(character)) {
      depth++
      continue
    }
    if (')]}'.includes(character)) {
      if (depth === 0) return
      depth--
      continue
    }
    if (depth === 0 && (character === ',' || character === ';')) return
    if (depth === 0 && character === '=' && text[index + 1] !== '>' && text[index + 1] !== '=') {
      let start = index + 1
      while (text[start] === ' ' || text[start] === '\t') start++
      return start
    }
  }
}

function nextSensitiveBinding(line: string, from: number): SensitiveBinding | null {
  let assignment: SensitiveBinding | null = null
  ASSIGNMENT_PREFIX_RE.lastIndex = from
  for (
    let match = ASSIGNMENT_PREFIX_RE.exec(line);
    match;
    match = ASSIGNMENT_PREFIX_RE.exec(line)
  ) {
    if (isSensitiveKeyName(match[1] ?? '')) {
      assignment = { index: match.index, valueStart: ASSIGNMENT_PREFIX_RE.lastIndex }
      break
    }
  }

  let property: SensitiveBinding | null = null
  PROPERTY_PREFIX_RE.lastIndex = from
  for (let match = PROPERTY_PREFIX_RE.exec(line); match; match = PROPERTY_PREFIX_RE.exec(line)) {
    if (isSensitiveKeyName(match[2] ?? '')) {
      property = {
        index: match.index,
        valueStart:
          annotatedValueStart(line, PROPERTY_PREFIX_RE.lastIndex) ?? PROPERTY_PREFIX_RE.lastIndex,
      }
      break
    }
  }

  if (!assignment) return property
  if (!property) return assignment
  return assignment.index <= property.index ? assignment : property
}

function closingQuoteAt(line: string, quote: string, from: number): number {
  for (let index = from; index < line.length; index += 1) {
    if (!line.startsWith(quote, index)) continue
    let slashCount = 0
    for (let previous = index - 1; previous >= 0 && line[previous] === '\\'; previous -= 1) {
      slashCount += 1
    }
    if (slashCount % 2 === 0) return index
  }
  return -1
}

function redactedQuotedContent(content: string): string {
  const firstLineBreak = content.search(/\r\n|\r|\n/)
  if (firstLineBreak < 0) return '[segredo removido]'
  return `[segredo removido]${content.slice(firstLineBreak).replace(/[^\r\n]/g, ' ')}`
}

function redactKeyedSecrets(value: string, markSecret: () => void): string {
  let text = value
  let cursor = 0
  while (cursor < text.length) {
    const binding = nextSensitiveBinding(text, cursor)
    if (!binding) break
    const prefix = text.slice(binding.valueStart).match(/^[rRuUbBfFtT]{1,2}(?=["'])/)?.[0] ?? ''
    const quoteStart = binding.valueStart + prefix.length
    const firstQuote = text[quoteStart]
    const quote =
      firstQuote && firstQuote !== '`' && text.startsWith(firstQuote.repeat(3), quoteStart)
        ? firstQuote.repeat(3)
        : firstQuote
    if (quote && (quote[0] === '"' || quote[0] === "'" || quote === '`')) {
      const closing = closingQuoteAt(text, quote, quoteStart + quote.length)
      const contentEnd = closing >= 0 ? closing : text.length
      const redacted = redactedQuotedContent(text.slice(quoteStart + quote.length, contentEnd))
      text = `${text.slice(0, quoteStart)}${quote}${redacted}${closing >= 0 ? quote : ''}${closing >= 0 ? text.slice(closing + quote.length) : ''}`
      cursor = quoteStart + quote.length + redacted.length + (closing >= 0 ? quote.length : 0)
    } else {
      const delimiter = text.slice(binding.valueStart).search(/[\s,;}]/)
      const valueEnd = delimiter < 0 ? text.length : binding.valueStart + delimiter
      if (valueEnd === binding.valueStart) {
        cursor = binding.valueStart + 1
        continue
      }
      text = `${text.slice(0, binding.valueStart)}[segredo removido]${text.slice(valueEnd)}`
      cursor = binding.valueStart + '[segredo removido]'.length
    }
    markSecret()
  }
  return text
}

/** Arquivos que podem conter credenciais nunca fazem parte do contexto do tutor. */
export function isStudioTutorSensitivePath(path: string): boolean {
  const normalized = path.replaceAll('\\', '/').toLowerCase()
  const name = normalized.split('/').at(-1) ?? normalized
  return (
    /^\.env(?:\..+)?$/.test(name) ||
    ['.npmrc', '.yarnrc', '.netrc', 'id_rsa', 'id_ed25519'].includes(name) ||
    /(?:^|[._-])(?:credentials?|secrets?)(?:[._-]|$)/.test(name) ||
    /\.(?:key|pem|p12|pfx)$/.test(name)
  )
}

/** Redação conservadora e estável: remove valores, mas preserva linhas e indentação. */
export function redactStudioTutorSecrets(value: string): {
  text: string
  hadSecret: boolean
} {
  let hadSecret = false
  const markSecret = () => {
    hadSecret = true
  }
  let text = redactKeyedSecrets(value, markSecret)
  text = text.replace(URL_CREDENTIALS_RE, (_match, scheme: string) => {
    hadSecret = true
    return `${scheme}[segredo removido]@`
  })
  text = text.replace(BEARER_RE, () => {
    hadSecret = true
    return 'Bearer [segredo removido]'
  })
  text = text.replace(KNOWN_TOKEN_RE, () => {
    hadSecret = true
    return '[segredo removido]'
  })
  text = text.replace(PRIVATE_KEY_BLOCK_RE, (block) => {
    hadSecret = true
    return block
      .split(/(\r?\n)/)
      .map((part, index) => {
        if (/^\r?\n$/.test(part)) return part
        if (index === 0) return '[segredo removido]'
        return part.replace(/\S/g, ' ')
      })
      .join('')
  })
  return { text, hadSecret }
}

/** Synchronous, browser/server-identical digest. Never a permission or an execution hash. */
export function studioTutorSourceHash(content: string): string {
  return `sha256-${sha256Base64(content)}`
}

export function studioTutorLineCount(content: string): number {
  return content.split(/\r\n|\r|\n/).length
}

/**
 * Run after every redaction or budget cut. A sanitizer that removes a newline
 * invalidates the original line mapping: retain the file reference only.
 * The current sanitizers replace spans monotonically and never add newlines.
 */
export function sanitizeStudioTutorExcerpt(
  file: StudioTutorCodeFile,
  redact: (content: string) => string,
  maxChars: number,
): StudioTutorCodeFile {
  const sanitized = redact(file.content).replace(/\r\n|\r/g, '\n')
  const content = sanitized.slice(0, Math.max(0, maxChars))
  if (!file.excerpt) return { path: file.path, content }
  const original = file.excerpt
  const originalLines = studioTutorLineCount(file.content)
  const safeLines =
    original.mapping === 'lines' &&
    original.endLine - original.startLine + 1 === originalLines &&
    studioTutorLineCount(sanitized) === originalLines
  const excerpt = {
    ...original,
    endLine: original.startLine + studioTutorLineCount(content) - 1,
    mapping: safeLines ? ('lines' as const) : ('file' as const),
    truncated: original.truncated || content.length !== sanitized.length,
  }
  return {
    path: file.path,
    content,
    excerpt: {
      ...excerpt,
      contextDigest: studioTutorSourceHash(
        JSON.stringify([
          file.path,
          excerpt.sourceHash,
          excerpt.startLine,
          excerpt.endLine,
          excerpt.mapping,
          content,
        ]),
      ),
    },
  }
}
