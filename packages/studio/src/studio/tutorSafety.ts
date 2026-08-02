const SECRET_KEY =
  '(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|private[_-]?key|secret|token)'

const QUOTED_ASSIGNMENT_RE = new RegExp(
  `(\\b${SECRET_KEY}\\b\\s*=\\s*)(["'\\x60])([^\\r\\n]*?)\\2`,
  'giu',
)
const UNQUOTED_ASSIGNMENT_RE = new RegExp(
  `(\\b${SECRET_KEY}\\b\\s*=\\s*)(?!["'\\x60])([^\\s,;}]+)`,
  'giu',
)
const QUOTED_PROPERTY_RE = new RegExp(
  `((?:["']?${SECRET_KEY}["']?)\\s*:\\s*)(["'\\x60])([^\\r\\n]*?)\\2`,
  'giu',
)
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/giu
const KNOWN_TOKEN_RE = /\b(?:sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16})\b/g
const PRIVATE_KEY_BLOCK_RE =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g

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
  const replacement = (prefix: string, quote?: string) => {
    hadSecret = true
    return quote ? `${prefix}${quote}[segredo removido]${quote}` : `${prefix}[segredo removido]`
  }
  let text = value.replace(QUOTED_ASSIGNMENT_RE, (_match, prefix: string, quote: string) =>
    replacement(prefix, quote),
  )
  text = text.replace(UNQUOTED_ASSIGNMENT_RE, (_match, prefix: string) => replacement(prefix))
  text = text.replace(QUOTED_PROPERTY_RE, (_match, prefix: string, quote: string) =>
    replacement(prefix, quote),
  )
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
