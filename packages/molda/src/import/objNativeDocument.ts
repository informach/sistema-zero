import type { MoldaSceneDocument } from '../scene/document'
import { readSceneDocument } from '../scene/readDocument'
import { importDocumentBase, type NativeImportIdentity } from './importDocumentBase'
import { planObjAppearance } from './objAppearance'
import type { ObjBundleRead } from './objBundle'
import { collectObjConversionIssues, type ObjConversionReport } from './objConversionReport'
import { convertPlannedObjGeometries } from './objGeometries'
import { planObjGeometries } from './objGeometryPlan'
import { convertObjHierarchy } from './objHierarchy'
import { ObjInputError, requireObj } from './objInput'
import { planObjMaterials } from './objMaterialSelection'
import { convertObjMaterials } from './objNativeMaterials'
import { type ObjNativeOptions, readObjNativeOptions } from './objNativeOptions'
import { decodeObjRasters } from './objRasters'

export type ObjNativeIdentity = NativeImportIdentity

function checkedDocument(candidate: MoldaSceneDocument, identity = false): MoldaSceneDocument {
  const result = readSceneDocument(candidate)
  if (result.status === 'valid') return result.document
  throw new ObjInputError(
    identity ? 'invalid' : 'unsupported',
    `${identity ? 'identity' : 'native'}.${result.status === 'invalid' ? result.path : 'formatVersion'}`,
    result.status === 'invalid'
      ? result.message
      : 'Este documento precisa de outra versão do leitor nativo.',
  )
}

/**
 * Complete native OBJ conversion, not import approval. Caller owns original-file
 * retention, review and transactional adoption. No clock, random IDs, IO or writes.
 */
export function convertObjDocument(
  bundle: Extract<ObjBundleRead, { status: 'ready' }>,
  identity: ObjNativeIdentity,
  options: ObjNativeOptions,
): { document: MoldaSceneDocument; report: ObjConversionReport } {
  requireObj(
    identity !== null && typeof identity === 'object' && !Array.isArray(identity),
    'identity',
    'Informe a identidade da criação de destino.',
  )
  const empty = checkedDocument(importDocumentBase(identity), true),
    policy = readObjNativeOptions(options)
  requireObj(
    bundle !== null && typeof bundle === 'object' && bundle.status === 'ready',
    'bundle',
    'A importação precisa de um conjunto OBJ completo.',
  )
  try {
    const selection = planObjMaterials(bundle, policy.materials),
      appearance = planObjAppearance(bundle, selection, policy.appearance),
      plans = planObjGeometries(bundle.source, appearance.geometry),
      hierarchy = convertObjHierarchy(
        bundle.source,
        plans,
        appearance.geometry.defaultId,
        policy.hierarchy,
      ),
      report = collectObjConversionIssues(bundle, appearance)
    for (const detail of selection.issues) report.add({ stage: 'selection', detail })
    for (const material of appearance.materials) {
      const origin = {
        library: material.library,
        material: material.material,
        targetId: material.id,
      }
      for (const detail of material.base.issues) report.add({ stage: 'base', ...origin, detail })
      for (const detail of material.textures.issues)
        report.add({ stage: 'textures', ...origin, detail })
    }
    for (const detail of hierarchy.issues) report.add({ stage: 'hierarchy', detail })
    // Use the same plan already checked for hierarchy/material bindings. Never rebuild it after pixels.
    const geometry = convertPlannedObjGeometries(bundle.source, plans)
    for (const detail of geometry.issues) report.add({ stage: 'geometry', detail })
    const materials = convertObjMaterials(
      bundle,
      appearance,
      decodeObjRasters(bundle, appearance.references),
      policy.images,
      (detail) => report.add({ stage: 'materials', detail }),
    )
    const document = checkedDocument({
      ...empty,
      nodes: hierarchy.nodes,
      geometries: geometry.parts.map((part) => part.geometry),
      materials: materials.materials,
      images: materials.images,
    })
    return { document, report: report.finish(document) }
  } catch (error) {
    if (
      !(error instanceof ObjInputError) ||
      /^(?:files\[|native\.|report\.|options(?:\.|$))/.test(error.path)
    )
      throw error
    throw new ObjInputError(
      error.reason,
      `files[${JSON.stringify(bundle.entryPath)}].${error.path}`,
      error.message,
      { cause: error },
    )
  }
}
