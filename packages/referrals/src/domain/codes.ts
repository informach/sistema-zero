import { randomBytes, randomInt } from 'node:crypto'

/** Formato canônico de um código de indicação/bolsa (sempre lower). */
export const CODE_RE = /^[a-z0-9-]{4,32}$/

/**
 * Alfabeto sem caracteres ambíguos (0/o, 1/l/i) — o código é lido em voz alta
 * ("usa meu código...") e digitado à mão.
 */
export const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

/** Acentos combinantes do NFD (U+0300–U+036F) — removidos ao gerar slug. */
const COMBINING_MARKS_RE = /[\u0300-\u036f]/g

/**
 * Valida\u00e7\u00e3o ESTRUTURAL de e-mail p/ os DTOs da borda (o auth/messaging validam
 * de novo). Fonte \u00fanica do pacote \u2014 as rotas importam daqui.
 */
export const EMAIL_PATTERN = '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'

export function isValidCode(value: string): boolean {
  return CODE_RE.test(value)
}

/** Normalização canônica de código vindo de fora (URL/form). */
export function normalizeCode(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Normalização canônica de e-mail — SEMPRE antes de UNIQUE/comparação/S2S.
 * (O auth normaliza por conta própria; divergência aqui criaria bolsa "nova"
 * para `Foo@x.com` vs `foo@x.com`.)
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Sufixo aleatório no alfabeto sem ambíguos (rejection-free via randomInt). */
export function randomCodeSuffix(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return out
}

/**
 * Slug do primeiro nome p/ compor o código do embaixador (`maria-x7k2`):
 * sem acentos, só [a-z0-9], máx 12 chars; vazio → 'amigo'.
 */
export function slugFromName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? ''
  const slug = first
    .normalize('NFD')
    .replace(COMBINING_MARKS_RE, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12)
  return slug.length >= 2 ? slug : 'amigo'
}

/** Código de embaixador: legível (nome) + entropia anti-enumeração. */
export function generateAmbassadorCode(name: string): string {
  return `${slugFromName(name)}-${randomCodeSuffix(4)}`.slice(0, 32)
}

/** Código de conta (fase 2): 8 chars puros do alfabeto (sem nome — privacidade). */
export function generateAccountCode(): string {
  return randomCodeSuffix(8)
}

/** Capability-token da página do embaixador (32 bytes, base64url). */
export function generatePageToken(): string {
  return randomBytes(32).toString('base64url')
}
