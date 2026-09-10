import type { MoldaSceneDocument } from '../scene/document'
import type { GltfClipIssue } from './gltfClipTypes'
import { gltfConversionCosts } from './gltfConversionCosts'
import type { GltfDocument } from './gltfDocument'
import type { GltfGeometryIssue } from './gltfGeometries'
import type { GltfHierarchyIssue } from './gltfHierarchy'
import { GltfInputError } from './gltfInput'
import type { GltfMaterialIssue } from './gltfMaterialConversionTypes'
import type { GltfSelection } from './gltfSelection'
import type { GltfSkinBindingIssue } from './gltfSkinBindings'
import type { NativeImportCosts } from './importDocumentCosts'

/** Product report budget, independent of source JSON and native geometry budgets. */
export const GLTF_CONVERSION_REPORT_LIMITS = { issues: 65_536, pathChars: 8_320 } as const

/** Discriminated source diagnostics, without erasing stage-specific counts or error metrics. */
export type GltfConversionIssue =
  | { stage: 'geometry'; detail: GltfGeometryIssue }
  | { stage: 'hierarchy'; detail: GltfHierarchyIssue }
  | { stage: 'materials'; detail: GltfMaterialIssue }
  | { stage: 'skins'; detail: GltfSkinBindingIssue }
  | { stage: 'animations'; detail: GltfClipIssue }

export interface GltfConversionReport {
  /** Even an empty diagnostics list does not constitute user approval. */
  review: 'required'
  source: {
    format: GltfDocument['source']['format']
    sceneIndex: number | null
    omittedScenes: number
    omittedNodes: number
    /** This return value is not an archive of the source, its extras, copyright or generator. */
    originalFile: 'not-retained'
    auxiliaryMetadata: 'not-stored'
    /** Global scope: optional extensions may also affect content outside the selected scene. */
    unhandledExtensions: string[]
    extensionOccurrences: Array<{ name: string; path: string }>
    unknownChunkTypes: number[]
  }
  costs: NativeImportCosts
  issues: GltfConversionIssue[]
}

export function gltfConversionReport(
  source: GltfDocument,
  selection: GltfSelection,
  document: MoldaSceneDocument,
  issues: GltfConversionIssue[],
): GltfConversionReport {
  if (issues.length > GLTF_CONVERSION_REPORT_LIMITS.issues)
    throw new GltfInputError(
      'budget',
      'report.issues',
      'Há adaptações demais para revisar nesta importação.',
    )
  return {
    review: 'required',
    source: {
      format: source.source.format,
      sceneIndex: selection.sceneIndex,
      omittedScenes: source.graph.scenes.length - Number(selection.sceneIndex !== null),
      omittedNodes: source.graph.nodes.length - selection.nodes.length,
      originalFile: 'not-retained',
      auxiliaryMetadata: 'not-stored',
      unhandledExtensions: [...source.extensions.unhandled],
      extensionOccurrences: source.extensions.occurrences.map((entry) => ({ ...entry })),
      unknownChunkTypes: [...source.source.unknownChunkTypes],
    },
    costs: gltfConversionCosts(document),
    issues,
  }
}
