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
