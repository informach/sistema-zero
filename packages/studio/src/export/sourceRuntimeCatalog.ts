import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { StudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'

/** Snapshot metadata before asynchronous writers/loading; validation follows in the Python builder. */
export function captureSourceExportCatalog(catalog?: StudioRuntimeCatalog | null) {
  try {
    return catalog ? (copyStudioProjectJson(catalog) as StudioRuntimeCatalog) : null
  } catch {
    return null
  }
}
