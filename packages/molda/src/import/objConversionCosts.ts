import type { MoldaSceneDocument } from '../scene/document'
import { SceneValidationError } from '../scene/validation'
import { importDocumentCosts, type NativeImportCosts } from './importDocumentCosts'
import { ObjInputError } from './objInput'

/** Same exact cost accounting as other native importers, preserving the OBJ error boundary. */
export function objConversionCosts(document: MoldaSceneDocument): NativeImportCosts {
  try {
    return importDocumentCosts(document)
  } catch (error) {
    if (!(error instanceof SceneValidationError)) throw error
    throw new ObjInputError('invalid', error.path, error.message, { cause: error })
  }
}
