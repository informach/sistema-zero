import type { ExtensionBootstrapContext } from '#extensions'
import { gameThreeDBootstrapVariant } from './platformKitVariant'

/**
 * O cenário do Molda (`runtimeScene.ts`, ~7,5 mil caracteres compactados) entra só no jogo
 * que usa um bloco de cenário, na convenção do Kit Plataforma (`platformKitVariant.ts`) e do
 * cenário do Pinta no Jogo 2D (`map-2d/bootstrap.ts`). A detecção procura o nome do método
 * como palavra inteira em qualquer lugar do código: um falso positivo só custa bytes, um falso
 * negativo quebraria o jogo.
 */
const SCENE_USE = /\b(?:loadScene|sceneStart)\b/

/** A variante sem cenário. A chave reduzida nunca é `''` (para `''` o host tira o contexto). */
export const GAME_3D_WITHOUT_SCENE_VARIANT = 'sem-cenario-molda'

export function gameThreeDUsesScene(code: string): boolean {
  return SCENE_USE.test(code)
}

/**
 * A variante do runtime nas duas dimensões (Kit Plataforma e cenário), juntas por `+`.
 * Sem contexto (chamador antigo, teste) ⇒ `''`, o runtime completo, a variante segura.
 */
export function gameThreeDRuntimeVariant(context?: ExtensionBootstrapContext): string {
  if (!context) return ''
  return [
    gameThreeDBootstrapVariant(context),
    gameThreeDUsesScene(context.code) ? '' : GAME_3D_WITHOUT_SCENE_VARIANT,
  ]
    .filter(Boolean)
    .join('+')
}
