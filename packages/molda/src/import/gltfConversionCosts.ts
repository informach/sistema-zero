import type { MoldaSceneDocument } from '../scene/document'
import { SceneValidationError } from '../scene/validation'
import { GltfInputError } from './gltfInput'
import { importDocumentCosts, type NativeImportCosts } from './importDocumentCosts'

/** Costs of a validated imported document. Shared by report production and transport verification. */
export function gltfConversionCosts(document: MoldaSceneDocument): NativeImportCosts {
  try {
    return importDocumentCosts(document)
  } catch (error) {
    if (!(error instanceof SceneValidationError)) throw error
    throw new GltfInputError('invalid', error.path, error.message, { cause: error })
  }
}
