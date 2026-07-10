/**
 * Checagens PURAS sobre a forma de um `blocksState` serializado. Módulo sem
 * NENHUM import de propósito: o PersistenceService (chunk do núcleo, carregado
 * antes dos modos) precisa desta checagem sem arrastar o Blockly — importar de
 * `workspaceState` puxaria `buildIR` → `blockly/core` para o bundle inicial.
 */

/**
 * Verdadeiro se o `blocksState` é `null`/inválido OU é uma serialização válida
 * porém sem blocos top-level. Os modos Blocos/Ponte usam para decidir se devem
 * derivar os blocos do IR — sem isso, um `blocksState` vazio (resíduo de algum
 * ciclo anterior, ex.: sanitizer que descartava todo o estado) passava no
 * early-return e o canvas ficava em branco depois do refresh.
 */
export function isBlocksStateEmpty(state: unknown): boolean {
  const tops = (state as { blocks?: { blocks?: unknown } } | null | undefined)?.blocks?.blocks
  return !Array.isArray(tops) || tops.length === 0
}
