import { IDE_MODES, type IDEMode } from '#core'
import { prefetchMode } from '../modes/lazyModes'

/**
 * Pré-aquece os chunks dos modos do editor (Blockly/Monaco são pesados).
 * Hosts podem chamar no hover do link que abre o Studio — a navegação não
 * espera o download. Idempotente e best-effort.
 */
export function prefetchStudioModes(modes: readonly IDEMode[] = IDE_MODES): void {
  for (const mode of modes) prefetchMode(mode)
}
