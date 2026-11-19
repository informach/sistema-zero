import type { StudioRuntimeSelection } from '@sistemazero/core/studio/project-environment'
import { PYTHON_MOLDA_SCENE_FEATURE } from '@sistemazero/core/studio/python-runtime-features'
import {
  type StudioRuntimeCatalog,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'

export const MOLDA_SCENE_RUNTIME_MESSAGE =
  'O ambiente deste projeto precisa ser atualizado para receber cenários do Molda. Os materiais e o programa foram preservados.'

/** No catalog means source-only/offline authoring, not permission to execute. */
export function scene3DRuntimeCompatible(
  runtime: StudioRuntimeSelection | undefined,
  catalog: StudioRuntimeCatalog | null | undefined,
): boolean {
  if (!catalog) return true
  return (
    !!runtime &&
    selectStudioRuntimeRelease(catalog, runtime)?.manifest.python?.features.includes(
      PYTHON_MOLDA_SCENE_FEATURE,
    ) === true
  )
}
