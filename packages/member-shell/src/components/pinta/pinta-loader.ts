import type * as Pinta from '@sistemazero/pinta/lesson'

export type PintaLessonModule = typeof Pinta
export type PintaLessonModuleLoader = () => Promise<PintaLessonModule>
export type PintaLessonModuleLoadResult =
  | { module: PintaLessonModule }
  | { module: null; error: unknown }

/** Captura falhas do chunk para a aula oferecer retry sem rejeição não tratada. */
export async function loadPintaLessonModule(
  loader: PintaLessonModuleLoader = () => import('@sistemazero/pinta/lesson'),
): Promise<PintaLessonModuleLoadResult> {
  try {
    return { module: await loader() }
  } catch (error) {
    return { module: null, error }
  }
}
