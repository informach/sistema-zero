import type { MoldaSceneDocument } from '../scene/document'
import type { NativeImportCosts } from './importDocumentCosts'
import type { MtlBaseIssue } from './mtlBase'
import type { MtlTextureIssue } from './mtlTexturePlanTypes'
import type { ObjAppearancePlan } from './objAppearance'
import type { ObjBundleRead } from './objBundle'
import { objConversionCosts } from './objConversionCosts'
import type { ObjGeometryIssue } from './objGeometries'
import type { ObjHierarchyIssue } from './objHierarchy'
import { ObjInputError } from './objInput'
import type { ObjMaterialIssue } from './objMaterialConversionTypes'
import type { ObjMaterialSelectionIssue } from './objMaterialSelection'
import { OBJ_CONVERSION_REPORT_LIMITS } from './objReportLimits'
import { ObjReportTextBudget } from './objReportText'

/** Review/transport budgets, independent of valid source size and native image/geometry budgets. */
export { OBJ_CONVERSION_REPORT_LIMITS } from './objReportLimits'

type MaterialOrigin = { library: number; material: number; targetId: string }
export type ObjConversionIssue =
  | { stage: 'selection'; detail: ObjMaterialSelectionIssue }
  | ({ stage: 'base'; detail: MtlBaseIssue } & MaterialOrigin)
  | ({ stage: 'textures'; detail: MtlTextureIssue } & MaterialOrigin)
  | { stage: 'hierarchy'; detail: ObjHierarchyIssue }
  | { stage: 'geometry'; detail: ObjGeometryIssue }
  | { stage: 'materials'; detail: ObjMaterialIssue }

export interface ObjConversionReport {
  review: 'required'
  source: {
    format: 'obj'
    entryPath: string
    /** Paths indexed by the library indices in material-origin diagnostics. */
    libraries: string[]
    materialDeclarations: number
    usedMaterialDeclarations: number
    unusedMaterialDeclarations: number
    materialVariants: number
    /** Companion bytes only; this report and its document do not archive them. */
    companionFiles: number
    companionBytes: number
    originalFile: 'not-retained'
    auxiliaryMetadata: 'not-stored'
  }
  costs: NativeImportCosts
  issues: ObjConversionIssue[]
}

/** Call-local collector. Early stages must append before opening geometry values/encoded pixels. */
export function collectObjConversionIssues(
  bundle: Extract<ObjBundleRead, { status: 'ready' }>,
  appearance: ObjAppearancePlan,
) {
  const issues: ObjConversionIssue[] = [],
    text = new ObjReportTextBudget()
  let materialDeclarations = 0
  for (const library of bundle.libraries) materialDeclarations += library.source.materials.length
  const used = new Set(
      appearance.materials.map((material) => `${material.library}:${material.material}`),
    ),
    source: ObjConversionReport['source'] = {
      format: 'obj',
      entryPath: bundle.entryPath,
      libraries: bundle.libraries.map((library) => library.path),
      materialDeclarations,
      usedMaterialDeclarations: used.size,
      unusedMaterialDeclarations: materialDeclarations - used.size,
      materialVariants: appearance.materials.length,
      companionFiles: bundle.resources.size,
      companionBytes: bundle.resourceBytes,
      originalFile: 'not-retained',
      auxiliaryMetadata: 'not-stored',
    }
  text.add({ review: 'required', source, issues: [] })
  return {
    add(issue: ObjConversionIssue) {
      if (issues.length >= OBJ_CONVERSION_REPORT_LIMITS.issues)
        throw new ObjInputError(
          'budget',
          'report.issues',
          'Há adaptações demais para revisar nesta importação.',
        )
      text.add(issue)
      issues.push(issue)
    },
    finish(document: MoldaSceneDocument): ObjConversionReport {
      const costs = objConversionCosts(document)
      text.add({ costs })
      return { review: 'required', source, costs, issues }
    },
  }
}
