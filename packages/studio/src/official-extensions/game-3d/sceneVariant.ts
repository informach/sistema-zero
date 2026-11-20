import type { ExtensionBootstrapContext } from '#extensions'
import { sceneRuntimeVariant } from '../sceneVariant'
import { gameThreeDBootstrapVariant } from './platformKitVariant'

// O cenário do Molda só entra no Jogo 3D que usa cenário; a regra é a comum (`../sceneVariant.ts`).
export {
  usesMoldaScene as gameThreeDUsesScene,
  WITHOUT_SCENE_VARIANT as GAME_3D_WITHOUT_SCENE_VARIANT,
} from '../sceneVariant'

/**
 * A variante do runtime nas duas dimensões (Kit Plataforma e cenário), juntas por `+`.
 * Sem contexto (chamador antigo, teste) ⇒ `''`, o runtime completo, a variante segura.
 */
export function gameThreeDRuntimeVariant(context?: ExtensionBootstrapContext): string {
  if (!context) return ''
  return [gameThreeDBootstrapVariant(context), sceneRuntimeVariant(context)]
    .filter(Boolean)
    .join('+')
}
