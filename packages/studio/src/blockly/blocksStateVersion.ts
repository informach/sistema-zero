/**
 * Metadado de versão do layout das áreas de Comportamento no estado serializado
 * do Blockly. Fica num módulo sem dependência do Blockly para o sanitizador de
 * projetos e a migração compartilharem exatamente o mesmo contrato.
 */
export const BEHAVIOR_AREAS_STATE_KEY = 'szBehaviorAreasVersion'
export const BEHAVIOR_AREAS_STATE_VERSION = 3

export function hasValidBehaviorAreasStateVersion(state: Record<string, unknown>): boolean {
  const value = state[BEHAVIOR_AREAS_STATE_KEY]
  return value === undefined || value === BEHAVIOR_AREAS_STATE_VERSION
}
