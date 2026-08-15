import type * as Pinta from '@sistemazero/pinta/lesson'

export type PintaEmbedModule = typeof Pinta
export type PintaEmbedModuleLoader = () => Promise<PintaEmbedModule>
export type PintaEmbedModuleLoadResult =
  | { module: PintaEmbedModule }
  | { module: null; error: unknown }

/** Transforma falha transitória do chunk em estado recuperável pela autoria. */
export async function loadPintaEmbedModule(
  loader: PintaEmbedModuleLoader = () => import('@sistemazero/pinta/lesson'),
): Promise<PintaEmbedModuleLoadResult> {
  try {
    return { module: await loader() }
  } catch (error) {
    return { module: null, error }
  }
}
