import { MOLDA_LIMITS } from './limits'

/**
 * Nome de criação em kebab-case: é o nome que os blocos do Estúdio referenciam
 * (todo asset do Estúdio é achado pelo NOME na IR). ⚠️ Manter em sincronia com o
 * `normalizeAssetName` do Pinta e do Studio — é a mesma régua nos três.
 */
const ASSET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/

export function normalizeAssetName(input: string): string | null {
  const trimmed = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!trimmed || trimmed.length > MOLDA_LIMITS.maxNameChars) return null
  return ASSET_NAME_PATTERN.test(trimmed) ? trimmed : null
}

/** Nome único por sufixo numérico (`nave` → `nave-2`), respeitando o teto. */
export function uniqueAssetName(base: string, taken: ReadonlySet<string>): string | null {
  if (!taken.has(base)) return base
  for (let n = 2; n <= 999; n += 1) {
    const suffix = `-${n}`
    const prefix = base.slice(0, MOLDA_LIMITS.maxNameChars - suffix.length).replace(/-+$/, '')
    const candidate = `${prefix}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return null
}

/** Nome de PEÇA: texto livre curto (não atravessa o Estúdio), só cortado no teto. */
export function normalizePartName(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback
  const trimmed = input.trim().slice(0, MOLDA_LIMITS.maxPartNameChars)
  return trimmed || fallback
}
