export {
  assertLegacyStudioProjectMaterials,
  hasRegionalPintaReference,
  UNSUPPORTED_PINTA_REGION,
} from '@sistemazero/core/studio/pinta-regional-reference'

/** In-process option for a private JS reader only. Never a document, request or catalog field. */
export const PRIVATE_REGIONAL_JS_PROJECT = Symbol('private-regional-js-project')
export type RegionalJsProjectReadOptions = { [PRIVATE_REGIONAL_JS_PROJECT]?: true }
