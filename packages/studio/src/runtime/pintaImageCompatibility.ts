import {
  type PintaImageDerivation,
  pintaImageRequiredRuntimeFeature,
} from '@sistemazero/core/studio/pinta-image'
import type { StudioRuntimeSelection } from '@sistemazero/core/studio/project-environment'
import {
  type StudioRuntimeCatalog,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'

export const PINTA_SCENE_RUNTIME_MESSAGE =
  'O ambiente deste projeto precisa ser atualizado para receber este cenário. A imagem anterior e o programa foram preservados.'

/** Catalog belongs to the host. Its absence permits source-only/offline authoring. */
export function pintaImageRuntimeCompatible(
  image: PintaImageDerivation,
  runtime: StudioRuntimeSelection | undefined,
  catalog: StudioRuntimeCatalog | null | undefined,
): boolean {
  const feature = pintaImageRequiredRuntimeFeature(image)
  if (!catalog || !feature) return true
  return (
    !!runtime &&
    selectStudioRuntimeRelease(catalog, runtime)?.manifest.python?.features.includes(feature) ===
      true
  )
}
