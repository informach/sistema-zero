import { gameTwoDPromptSummary } from './game-2d/aiSummary'
import { gameKitPromptSummary } from './game-2d-advanced/aiSummary'
import { gameThreeDPromptSummary } from './game-3d/aiSummary'
import { gameKit3DPromptContext } from './game-3d-advanced/ai'
import { world3DPromptContext } from './world-3d/ai'

export interface ServerMechanicDocument {
  extension: string
  title: string
  content: string
}

/**
 * Manuais oficiais das extensões em formato server-safe. São strings estáticas:
 * este módulo não carrega Blockly, DOM, runtimes ou projetos de exemplo.
 */
export const SERVER_MECHANIC_DOCUMENTS: readonly ServerMechanicDocument[] = [
  { extension: 'game-2d', title: 'Manual oficial — Jogo 2D', content: gameTwoDPromptSummary },
  {
    extension: 'game-2d-advanced',
    title: 'Manual oficial — Jogo 2D Avançado',
    content: gameKitPromptSummary,
  },
  { extension: 'game-3d', title: 'Manual oficial — Jogo 3D', content: gameThreeDPromptSummary },
  {
    extension: 'game-3d-advanced',
    title: 'Manual oficial — Jogo 3D Avançado',
    content: gameKit3DPromptContext,
  },
  { extension: 'world-3d', title: 'Manual oficial — Mundo 3D', content: world3DPromptContext },
]
