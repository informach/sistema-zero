/** Contrato do arquivo fornecido pelo Rive. Não renomear unilateralmente no código. */
export const CHEST_RIVE_ARTBOARD = 'Chest'
export const CHEST_RIVE_STATE_MACHINE = 'ChestState'
export const CHEST_RIVE_OPEN_TRIGGER = 'open'
export const CHEST_RIVE_OPENED_INPUT = 'opened'
export const CHEST_RIVE_OPEN_STATE = 'Open'

/** O runtime tipa `StateChange.data` como um estado ou uma lista de estados. */
export function riveEntrouNoEstado(data: unknown, state: string): boolean {
  if (typeof data === 'string') return data === state
  return Array.isArray(data) && data.some((item) => item === state)
}

/**
 * URL pública da única animação global dos baús.
 *
 * Não há valor-padrão de propósito: antes de o arquivo existir, pedir uma URL
 * inventada só produziria 404 para cada criança com um baú liberado. Em produção,
 * o Next incorpora esta variável pública durante o build do ambiente.
 */
export function chestRiveSrc(): string | null {
  const src = process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL?.trim()
  return src || null
}
