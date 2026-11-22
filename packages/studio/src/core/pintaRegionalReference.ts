export {
  assertLegacyStudioProjectMaterials,
  hasRegionalPintaReference,
  UNSUPPORTED_PINTA_REGION,
} from '@sistemazero/core/studio/pinta-regional-reference'

import type { ProjectStorageScope } from '../state/projectStorageRuntime'

/** In-process scope for the private reader. Never a document, request or catalog field. */
export const PRIVATE_REGIONAL_PROJECT = Symbol('private-regional-project')
export type PrivateRegionalProjectReadOptions = {
  [PRIVATE_REGIONAL_PROJECT]?: ProjectStorageScope
}
