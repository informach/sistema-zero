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
 * Aceita legado sem marcador e versões conhecidas que ainda passarão pelo
 * normalizador. Versões futuras ficam bloqueadas até existir migração explícita.
 */
export function hasValidBehaviorAreasStateVersion(state: Record<string, unknown>): boolean {
  const value = state[BEHAVIOR_AREAS_STATE_KEY]
  return (
    value === undefined ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= BEHAVIOR_AREAS_MIN_MIGRATABLE_STATE_VERSION &&
      value <= BEHAVIOR_AREAS_STATE_VERSION)
  )
}
