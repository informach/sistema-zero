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
      property = { index: match.index, valueStart: PROPERTY_PREFIX_RE.lastIndex }
      break
    }
  }

  if (!assignment) return property
  if (!property) return assignment
  return assignment.index <= property.index ? assignment : property
}

function closingQuoteAt(line: string, quote: string, from: number): number {
  for (let index = from; index < line.length; index += 1) {
    if (line[index] !== quote) continue
    let slashCount = 0
    for (let previous = index - 1; previous >= 0 && line[previous] === '\\'; previous -= 1) {
      slashCount += 1
    }
    if (slashCount % 2 === 0) return index
  }
  return -1
}

function redactedQuotedContent(content: string): string {
  const firstLineBreak = content.search(/\r?\n/)
  if (firstLineBreak < 0) return '[segredo removido]'
  return `[segredo removido]${content.slice(firstLineBreak).replace(/[^\r\n]/g, ' ')}`
}

function redactKeyedSecrets(value: string, markSecret: () => void): string {
  let text = value
  let cursor = 0
  while (cursor < text.length) {
    const binding = nextSensitiveBinding(text, cursor)
    if (!binding) break
    const quote = text[binding.valueStart]
    if (quote === '"' || quote === "'" || quote === '`') {
      const closing = closingQuoteAt(text, quote, binding.valueStart + 1)
      const contentEnd = closing >= 0 ? closing : text.length
      const redacted = redactedQuotedContent(text.slice(binding.valueStart + 1, contentEnd))
      text = `${text.slice(0, binding.valueStart)}${quote}${redacted}${closing >= 0 ? quote : ''}${closing >= 0 ? text.slice(closing + 1) : ''}`
      cursor = binding.valueStart + quote.length + redacted.length + (closing >= 0 ? 1 : 0)
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
