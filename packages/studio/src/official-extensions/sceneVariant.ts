import type { ExtensionBootstrapContext } from '#extensions'

/**
 * O cenário do Molda só entra no runtime 3D do jogo que usa um bloco de cenário, na convenção do
 * Kit Plataforma (`game-3d/platformKitVariant.ts`) e do cenário do Pinta (`map-2d/bootstrap.ts`).
 * Um módulo só para as três extensões: ele entra no pacote de abertura do modo Blocos.
 *
 * A detecção procura o nome do método como palavra inteira em qualquer lugar do código: um falso
 * positivo só custa bytes, um falso negativo quebraria o jogo. `sceneStart` só existe no Jogo 3D
 * e no Avançado; no Mundo 3D a palavra também pede o completo, o lado seguro.
 */
const SCENE_USE = /\b(?:loadScene|sceneStart)\b/

/** A variante sem cenário. A chave reduzida nunca é `''` (para `''` o host tira o contexto). */
export const WITHOUT_SCENE_VARIANT = 'sem-cenario-molda'

export function usesMoldaScene(code: string): boolean {
  return SCENE_USE.test(code)
}

/** Sem contexto (chamador antigo, teste) ⇒ `''`, o runtime completo, a variante segura. */
export function sceneRuntimeVariant(context?: ExtensionBootstrapContext): string {
  return !context || usesMoldaScene(context.code) ? '' : WITHOUT_SCENE_VARIANT
}
