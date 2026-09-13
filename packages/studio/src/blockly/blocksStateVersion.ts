import { PROJECT_AREA_FRAME_TYPES } from './projectAreas'

/**
 * Metadado de versão do layout das áreas de Comportamento no estado serializado
 * do Blockly. Fica num módulo sem dependência do Blockly para o sanitizador de
 * projetos e a migração compartilharem exatamente o mesmo contrato.
 */
export const BEHAVIOR_AREAS_STATE_KEY = 'szBehaviorAreasVersion'
/** Versão mais antiga que o normalizador atual sabe migrar sem perder o layout. */
export const BEHAVIOR_AREAS_MIN_MIGRATABLE_STATE_VERSION = 2
/**
 * 7: nasceu a área 🧩 Meus moldes. Os blocos que só DEFINEM (classe, figura,
 * função, tipo de inimigo e seus ajustes) saem do ⚙️ Ao iniciar e migram para
 * lá, levando junto as variáveis de que dependem. Carregamentos ficam no início.
 */
export const BEHAVIOR_AREAS_STATE_VERSION = 7

/**
 * Estados atuais aceitam o marcador corrente; estados vazios podem omiti-lo.
 * Versões históricas passam pelo conversor antes desta validação.
 */
export function hasValidBehaviorAreasStateVersion(state: Record<string, unknown>): boolean {
  const value = state[BEHAVIOR_AREAS_STATE_KEY]
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value === BEHAVIOR_AREAS_STATE_VERSION)
  )
}

type LifecycleVersionedState = Record<string, unknown> & {
  [BEHAVIOR_AREAS_STATE_KEY]: typeof BEHAVIOR_AREAS_STATE_VERSION
}

export function markLifecycleBlocksState<T>(state: T): T | (T & LifecycleVersionedState) {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) return state
  const record = state as Record<string, unknown>
  if (record[BEHAVIOR_AREAS_STATE_KEY] === BEHAVIOR_AREAS_STATE_VERSION) return state
  return {
    ...record,
    [BEHAVIOR_AREAS_STATE_KEY]: BEHAVIOR_AREAS_STATE_VERSION,
  } as T & LifecycleVersionedState
}

/** O documento atual tem alguma área no topo? */
export function blocksStateHasFrame(state: unknown): boolean {
  if (!state || typeof state !== 'object' || !('blocks' in state)) return false
  const root = state.blocks
  if (!root || typeof root !== 'object' || !('blocks' in root) || !Array.isArray(root.blocks))
    return false
  return root.blocks.some(
    (block: unknown) =>
      !!block &&
      typeof block === 'object' &&
      'type' in block &&
      typeof block.type === 'string' &&
      PROJECT_AREA_FRAME_TYPES.has(block.type),
  )
}
