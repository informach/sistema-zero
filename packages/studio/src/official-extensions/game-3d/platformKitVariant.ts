import type { ExtensionBootstrapContext } from '#extensions'
import { GAME_3D_PLATFORM_KIT_METHODS } from './platformCodec'

/**
 * Kit Plataforma injetado só quando o projeto usa (lote 14 do review 3D, P2). O fragmento
 * `runtimePlatform.ts` pesa ~40 KB do runtime do Jogo 3D e só serve a quem chama um método do
 * kit; os outros jogos 3D recebem o runtime sem ele.
 *
 * A detecção procura o NOME do método como palavra inteira, em qualquer lugar do código, e não
 * só `SZGame3D.<metodo>(`: um apelido (`const g = SZGame3D; g.loadStage(…)`), a
 * desestruturação ou o colchete com o nome em texto também contam. É mais larga de propósito:
 * um falso positivo só custa bytes (recebe o runtime completo), um falso negativo quebraria o
 * jogo. A lista vem de `platformCodec.ts`, a fonte única dos métodos do kit.
 */
const PLATFORM_KIT_USE = new RegExp(`\\b(?:${GAME_3D_PLATFORM_KIT_METHODS.join('|')})\\b`)

/** A variante sem o Kit Plataforma; a padrão (`''`) é o runtime completo. */
export const GAME_3D_WITHOUT_PLATFORM_VARIANT = 'sem-kit-plataforma'

export function gameThreeDUsesPlatformKit(code: string): boolean {
  return PLATFORM_KIT_USE.test(code)
}

/** Sem contexto (chamador antigo, teste) ⇒ completo, a variante segura. */
export function gameThreeDBootstrapVariant(context?: ExtensionBootstrapContext): string {
  if (!context || gameThreeDUsesPlatformKit(context.code)) return ''
  return GAME_3D_WITHOUT_PLATFORM_VARIANT
}
