import type { ExtensionBootstrapContext } from '#extensions'

/**
 * O cenário do Molda (`runtimeScene.ts`, ~8,4 mil caracteres compactados) entra só no jogo
 * que usa um bloco de cenário, na convenção do Jogo 3D (`game-3d/sceneVariant.ts`). A
 * detecção procura o nome do método como palavra inteira em qualquer lugar do código: um falso
 * positivo só custa bytes, um falso negativo quebraria o jogo.
 */
const SCENE_USE = /\b(?:loadScene|sceneStart)\b/

/** A variante sem cenário. A chave reduzida nunca é `''` (para `''` o host tira o contexto). */
export const GAME_KIT_3D_WITHOUT_SCENE_VARIANT = 'sem-cenario-molda'

export function gameKit3DUsesScene(code: string): boolean {
  return SCENE_USE.test(code)
}

/** Sem contexto (chamador antigo, teste) ⇒ `''`, o runtime completo, a variante segura. */
export function gameKit3DRuntimeVariant(context?: ExtensionBootstrapContext): string {
  return !context || gameKit3DUsesScene(context.code) ? '' : GAME_KIT_3D_WITHOUT_SCENE_VARIANT
}
