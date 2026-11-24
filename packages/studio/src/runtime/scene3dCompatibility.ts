import type { StudioRuntimeSelection } from '@sistemazero/core/studio/project-environment'
import {
  PYTHON_MOLDA_RELEVO_FEATURE,
  PYTHON_MOLDA_SCENE_FEATURE,
} from '@sistemazero/core/studio/python-runtime-features'
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

/**
 * O relevo de mundo grande ("campo", plano "Mundos de 2 km", lote 6) num projeto Python: só com o
 * catálogo à mão e uma versão do runtime que declara o `cenario.py` que o lê. Sem catálogo, o
 * cenário vem no formato de sempre (lotes de terreno), que toda versão abre.
 */
export function scene3DRuntimeReadsRelevo(
  runtime: StudioRuntimeSelection | undefined,
  catalog: StudioRuntimeCatalog | null | undefined,
): boolean {
  return (
    !!catalog &&
    !!runtime &&
    selectStudioRuntimeRelease(catalog, runtime)?.manifest.python?.features.includes(
      PYTHON_MOLDA_RELEVO_FEATURE,
    ) === true
  )
}
