import type { ExtensionBootstrapContext } from '#extensions'

/**
 * O cenário do Molda (`runtimeScene.ts`, ~8,2 mil caracteres compactados) entra só no mundo
 * que usa o bloco de cenário, na convenção do Jogo 3D (`game-3d/sceneVariant.ts`). A detecção
 * procura o nome do método como palavra inteira em qualquer lugar do código: um falso positivo
 * só custa bytes, um falso negativo quebraria o mundo.
 */
const SCENE_USE = /\bloadScene\b/

/** A variante sem cenário. A chave reduzida nunca é `''` (para `''` o host tira o contexto). */
export const WORLD_3D_WITHOUT_SCENE_VARIANT = 'sem-cenario-molda'

export function world3DUsesScene(code: string): boolean {
  return SCENE_USE.test(code)
}

/** Sem contexto (chamador antigo, teste) ⇒ `''`, o runtime completo, a variante segura. */
export function world3DRuntimeVariant(context?: ExtensionBootstrapContext): string {
  return !context || world3DUsesScene(context.code) ? '' : WORLD_3D_WITHOUT_SCENE_VARIANT
}
