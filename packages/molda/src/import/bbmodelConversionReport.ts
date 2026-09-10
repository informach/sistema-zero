import type { MoldaSceneDocument } from '../scene/document'
import type { BbmodelAnimationBoundsReport } from './bbmodelAnimationBounds'
import type { convertBbmodelClips } from './bbmodelClips'
import type { BbmodelVersion } from './bbmodelEnvelope'
import type { BbmodelFaceUvIssue } from './bbmodelFaceUvs'
import type { BbmodelGeometryIssue } from './bbmodelGeometries'
import type { BbmodelHierarchyIssue } from './bbmodelHierarchy'
import type { BbmodelImageIssue } from './bbmodelImages'
import type { BbmodelTopologyIssue } from './bbmodelNativeGeometryPlan'
import type { BbmodelNormalizedUvIssue } from './bbmodelNativeUvs'
import type { BbmodelNodeMaterialIssue } from './bbmodelNodeMaterials'
import type { BbmodelPaintImageIssue } from './bbmodelPaintImages'
import type { BbmodelPositionIssue } from './bbmodelPositions'
import type { BbmodelRemainderIssue } from './bbmodelRemainder'
import { BbmodelReportBudget } from './bbmodelReportLimits'
import type { BbmodelTextureResourceBinding } from './bbmodelResources'
import type { BbmodelSelectionIssue } from './bbmodelSelection'
import type { BbmodelSurfaceIssue } from './bbmodelSurfaces'
import type { BbmodelTextureLayoutIssue } from './bbmodelTextureLayouts'
import type { BbmodelTextureMaterialIssue } from './bbmodelTextureMaterials'
import { importDocumentCosts, type NativeImportCosts } from './importDocumentCosts'

export type BbmodelConversionIssue =
  | { stage: 'selection'; detail: BbmodelSelectionIssue }
  | { stage: 'remainder'; detail: BbmodelRemainderIssue }
  | { stage: 'topology'; detail: BbmodelTopologyIssue }
  | { stage: 'positions'; detail: BbmodelPositionIssue }
  | { stage: 'authorial-uv'; detail: BbmodelFaceUvIssue }
  | { stage: 'normalized-uv'; detail: BbmodelNormalizedUvIssue }
  | { stage: 'surfaces'; detail: BbmodelSurfaceIssue }
  | { stage: 'node-materials'; detail: BbmodelNodeMaterialIssue }
  | { stage: 'texture-materials'; detail: BbmodelTextureMaterialIssue }
  | { stage: 'hierarchy'; detail: BbmodelHierarchyIssue }
  | { stage: 'geometry'; detail: BbmodelGeometryIssue }
  | {
      stage: 'resources'
      detail: BbmodelTextureResourceBinding & { code: 'texture-resource-selected'; path: string }
    }
  | { stage: 'layouts'; detail: BbmodelTextureLayoutIssue }
  | { stage: 'images'; detail: BbmodelImageIssue }
  | { stage: 'paint-layers'; detail: BbmodelPaintImageIssue }

export interface BbmodelConversionSource {
  format: 'bbmodel'
  version: BbmodelVersion
  modelFormat: 'free'
  entryPath: string
  nodes: number
  omittedNodes: number
  textures: number
  unusedTextures: number
  textureGroups: number
  /** All user-supplied bytes, including unused companions, counted before parsing. */
  selectedFileBytes: number
  originalFile: 'not-retained'
  auxiliaryMetadata: 'not-stored'
}
export interface BbmodelConversionReport {
  review: 'required'
  source: BbmodelConversionSource
  costs: NativeImportCosts
  issues: BbmodelConversionIssue[]
  animations: BbmodelConversionAnimations | null
}

export type BbmodelConversionAnimations = ReturnType<typeof convertBbmodelClips>['report'] & {
  bounds: BbmodelAnimationBoundsReport[]
}

/** Per-call, bounded collector. Add each stage before progressing to encoded resources/pixels. */
export function collectBbmodelConversionReport(source: BbmodelConversionSource) {
  const issues: BbmodelConversionIssue[] = [],
    budget = new BbmodelReportBudget()
  let animations: BbmodelConversionAnimations | null = null
  budget.addText({ review: 'required', source, issues: [], animations: null })
  return {
    setAnimations(value: BbmodelConversionAnimations) {
      if (animations !== null) throw new Error('Duplicate bbmodel animation report')
      budget.addText(value)
      animations = value
    },
    add(issue: BbmodelConversionIssue) {
      budget.addIssue(issue)
      issues.push(issue)
    },
    finish(document: MoldaSceneDocument): BbmodelConversionReport {
      const costs = importDocumentCosts(document)
      budget.addText({ costs })
      return { review: 'required', source, costs, issues, animations }
    },
  }
}
