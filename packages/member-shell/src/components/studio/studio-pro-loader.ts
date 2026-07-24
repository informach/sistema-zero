import type * as Studio from '@sistemazero/studio'

export type StudioProModule = typeof Studio
export type StudioProModuleLoader = () => Promise<StudioProModule>
export type StudioProModuleLoadResult =
  | { module: StudioProModule }
  | { module: null; error: unknown }

/**
 * Carrega o chunk pesado do editor Pro sem deixar uma falha transitória de rede
 * como rejeição não tratada. A tela chama novamente esta função no retry.
 */
export async function loadStudioProModule(
  loader: StudioProModuleLoader = () => import('@sistemazero/studio'),
): Promise<StudioProModuleLoadResult> {
  try {
    return { module: await loader() }
  } catch (error) {
    return { module: null, error }
  }
}
