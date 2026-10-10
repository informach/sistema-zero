/** Contexto assinado do Kids. Sessões sem esta claim continuam pertencendo aos outros produtos. */
export type KidsSessionClaim =
  | { kind: 'parent'; sessionId: string; authenticatedAt: number }
  | { kind: 'student'; sessionId: string; deviceId: string; grantId: string }

/**
 * Cabeçalhos de IDENTIDADE que o Gateway injeta a partir da claim `kids` verificada.
 * São removidos da entrada (anti-spoof, como os `x-auth-user-*`) e só valem junto do
 * `x-internal-token`. `context` = `parent` | `student`; `authTime` (só do responsável)
 * = `authenticatedAt` em segundos, para o Auth exigir login recente sem receber o Bearer.
 */
export const KIDS_IDENTITY_HEADERS = {
  context: 'x-auth-kids-context',
  authTime: 'x-auth-kids-auth-time',
} as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isId = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

export function parseKidsSessionClaim(value: unknown): KidsSessionClaim | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('sessionId' in value))
    return null
  if (!isId(value.sessionId)) return null
  if (value.kind === 'parent') {
    if ('grantId' in value || 'deviceId' in value || !('authenticatedAt' in value)) return null
    if (
      typeof value.authenticatedAt !== 'number' ||
      !Number.isSafeInteger(value.authenticatedAt) ||
      value.authenticatedAt <= 0
    )
      return null
    return { kind: 'parent', sessionId: value.sessionId, authenticatedAt: value.authenticatedAt }
  }
  if (
    value.kind === 'student' &&
    'deviceId' in value &&
    'grantId' in value &&
    isId(value.deviceId) &&
    isId(value.grantId)
  ) {
    return {
      kind: 'student',
      sessionId: value.sessionId,
      deviceId: value.deviceId,
      grantId: value.grantId,
    }
  }
  return null
}

export function sameKidsSession(
  a: KidsSessionClaim | null | undefined,
  b: KidsSessionClaim | null | undefined,
): boolean {
  if (!a || !b) return !a && !b
  if (a.sessionId !== b.sessionId || a.kind !== b.kind) return false
  return a.kind === 'parent' && b.kind === 'parent'
    ? a.authenticatedAt === b.authenticatedAt
    : a.kind === 'student' &&
        b.kind === 'student' &&
        a.deviceId === b.deviceId &&
        a.grantId === b.grantId
}

/**
 * Caminho CANÔNICO para as políticas de público (Gateway e BFF). Junta barras repetidas
 * e decodifica cada segmento, porque o roteador do Gateway e os serviços também ignoram
 * `//` e o Elysia decodifica o caminho: comparar o caminho cru deixava `/members//parents/…`
 * passar por uma regra escrita para `/members/parents/`.
 *
 * ⚠️ Devolve `null` quando o caminho é AMBÍGUO, e quem recebe `null` NEGA: segmento `.`
 * ou `..` (inclusive codificado), barra ou contrabarra codificada dentro do segmento,
 * caractere de controle ou percent-encoding inválido. A query e o fragmento são ignorados.
 */
export function normalizePolicyPath(raw: string): string | null {
  const path = raw.split(/[?#]/, 1)[0] ?? ''
  if (!path.startsWith('/')) return null
  const segments: string[] = []
  for (const piece of path.split('/')) {
    if (piece === '') continue
    let decoded: string
    try {
      decoded = decodeURIComponent(piece)
    } catch {
      return null
    }
    // biome-ignore lint/suspicious/noControlCharactersInRegex: controle no caminho é recusado de propósito.
    if (decoded === '.' || decoded === '..' || /[/\\\u0000-\u001f\u007f]/.test(decoded)) return null
    segments.push(decoded)
  }
  return `/${segments.join('/')}`
}
