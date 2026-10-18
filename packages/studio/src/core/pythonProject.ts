import type {
  StudioPythonClassicDocument,
  StudioPythonProDocument,
} from '@sistemazero/core/studio/project-document'
import type { ProjectAsset } from './projectAssets'

/** Portable Python documents. No JavaScript IR, DOM or editor runtime dependency. */
export type PythonClassicProjectDocument = Omit<StudioPythonClassicDocument, 'assets'> & {
  assets?: ProjectAsset[]
  tree?: never
  proMeta?: never
  extraFiles?: never
}
export type PythonProProjectDocument = Omit<StudioPythonProDocument, 'assets'> & {
  assets?: ProjectAsset[]
  files?: never
  extraFiles?: never
}
export type PythonProjectDocument = PythonClassicProjectDocument | PythonProProjectDocument
