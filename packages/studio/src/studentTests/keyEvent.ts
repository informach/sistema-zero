import { EXECUTION_KEYS, type ExecutionKey } from '@sistemazero/core/studio/execution-keys'

/**
 * A tecla do contrato dos objetivos (`EXECUTION_KEYS`) como o navegador a nomeia num
 * KeyboardEvent. Uma fonte só para os dois executores da aba "Meus testes": o piloto do palco
 * escondido do JavaScript (`driver.ts`) e o quadro do Python, que aperta a tecla do teste no
 * próprio programa (`runtime/python/frame.ts`).
 */
export function executionKeyEvent(key: ExecutionKey): { key: string; code: string } {
  if (key === 'Space') return { key: ' ', code: 'Space' }
  if (key === 'Shift') return { key: 'Shift', code: 'ShiftLeft' }
  if (/^[a-z]$/.test(key)) return { key, code: `Key${key.toUpperCase()}` }
  if (/^[0-9]$/.test(key)) return { key, code: `Digit${key}` }
  return { key, code: key }
}

/** A tecla, se ela é uma das do contrato; `null` para qualquer outra coisa. */
export function readExecutionKey(value: unknown): ExecutionKey | null {
  return EXECUTION_KEYS.find((key) => key === value) ?? null
}
