import type * as Studio from '@sistemazero/studio'

export type StudioEmbedModule = typeof Studio
export type StudioEmbedModuleLoader = () => Promise<StudioEmbedModule>
export type StudioEmbedModuleLoadResult =
  | { module: StudioEmbedModule }
  | { module: null; error: unknown }

export async function loadStudioEmbedModule(
  loader: StudioEmbedModuleLoader = () => import('@sistemazero/studio'),
): Promise<StudioEmbedModuleLoadResult> {
  try {
    return { module: await loader() }
  } catch (error) {
    return { module: null, error }
  }
}
