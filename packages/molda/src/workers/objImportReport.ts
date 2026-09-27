import { LOCAL_FILE_PATH_LIMIT } from '../import/localFilePath'
import { MTL_INPUT_LIMITS } from '../import/mtlInput'
import { objConversionCosts } from '../import/objConversionCosts'
import type { ObjConversionIssue, ObjConversionReport } from '../import/objConversionReport'
import { OBJ_INPUT_LIMITS } from '../import/objInput'
import { objMaterialIdentity } from '../import/objMaterialIdentity'
import { OBJ_CONVERSION_REPORT_LIMITS } from '../import/objReportLimits'
import { ObjReportTextBudget } from '../import/objReportText'
import { objLocalFilePath } from '../import/objResourcePath'
import type { MoldaSceneDocument } from '../scene/document'
import * as v from '../scene/validation'
import { readObjMaterialIssue } from './objImportMaterialReport'
import { readObjBaseIssue, readObjTextureIssue } from './objImportMtlReport'
import { reportTarget } from './objImportReportValues'
import type { ObjImportRequest } from './objImportRequest'
import {
  readObjGeometryIssue,
  readObjHierarchyIssue,
  readObjSelectionIssue,
} from './objImportStructureReport'

function readSource(
  raw: unknown,
  expected: ObjImportRequest,
  materials: number,
): ObjConversionReport['source'] {
  const row = v.record(raw, 'report.source', [
      'format',
      'entryPath',
      'libraries',
      'materialDeclarations',
      'usedMaterialDeclarations',
      'unusedMaterialDeclarations',
      'materialVariants',
      'companionFiles',
      'companionBytes',
      'originalFile',
      'auxiliaryMetadata',
    ]),
    selected = new Map(expected.files.map((file) => [file.path, file.bytes.byteLength])),
    libraries = v
      .list(row.libraries, 'report.source.libraries', OBJ_INPUT_LIMITS.libraries)
      .map((raw) => {
        const path = v.text(raw, 'report.library', LOCAL_FILE_PATH_LIMIT)
        v.requireScene(
          objLocalFilePath(path, 'report.library') === path && selected.has(path),
          'report.library',
          'A biblioteca precisa pertencer ao conjunto local escolhido.',
        )
        return path
      }),
    materialDeclarations = v.number(
      row.materialDeclarations,
      'report.source.materialDeclarations',
      0,
      libraries.length ? MTL_INPUT_LIMITS.materials : 0,
      true,
    ),
    usedMaterialDeclarations = v.number(
      row.usedMaterialDeclarations,
      'report.source.usedMaterialDeclarations',
      0,
      materialDeclarations,
      true,
    ),
    materialVariants = v.number(
      row.materialVariants,
      'report.source.materialVariants',
      usedMaterialDeclarations,
      Math.min(materials, usedMaterialDeclarations * 2),
      true,
    ),
    companionFiles = v.number(
      row.companionFiles,
      'report.source.companionFiles',
      libraries.length,
      libraries.length ? expected.files.length : 0,
      true,
    ),
    libraryBytes = libraries.reduce((sum, path) => sum + selected.get(path)!, 0),
    companionBytes = v.number(
      row.companionBytes,
      'report.source.companionBytes',
      libraryBytes,
      Math.min(
        OBJ_INPUT_LIMITS.fileBytes,
        companionFiles === libraries.length
          ? libraryBytes
          : expected.files.reduce((sum, file) => sum + file.bytes.byteLength, 0),
      ),
      true,
    )
  v.requireScene(
    new Set(libraries).size === libraries.length,
    'report.source.libraries',
    'Biblioteca repetida.',
  )
  v.requireScene(
    row.entryPath === expected.entryPath,
    'report.source.entryPath',
    'Arquivo principal incorreto.',
  )
  v.requireScene(
    row.unusedMaterialDeclarations === materialDeclarations - usedMaterialDeclarations,
    'report.source.unusedMaterialDeclarations',
    'Contagem de declarações inconsistente.',
  )
  v.requireScene(
    materials >= 1 && materials - materialVariants <= 1,
    'report.source.materialVariants',
    'Contagem de materiais nativos inconsistente.',
  )
  return {
    format: v.choice(row.format, ['obj'], 'report.source.format'),
    entryPath: expected.entryPath,
    libraries,
    materialDeclarations,
    usedMaterialDeclarations,
    unusedMaterialDeclarations: materialDeclarations - usedMaterialDeclarations,
    materialVariants,
    companionFiles,
    companionBytes,
    originalFile: v.choice(row.originalFile, ['not-retained'], 'report.source.originalFile'),
    auxiliaryMetadata: v.choice(
      row.auxiliaryMetadata,
      ['not-stored'],
      'report.source.auxiliaryMetadata',
    ),
  }
}

/** Validated native output, strict source/diagnostic shapes, recomputed costs, streaming text ceiling. */
export function readObjImportReport(
  raw: unknown,
  document: MoldaSceneDocument,
  expected: ObjImportRequest,
): ObjConversionReport {
  const row = v.record(raw, 'report', ['review', 'source', 'costs', 'issues']),
    review = v.choice(row.review, ['required'], 'report.review'),
    costs = objConversionCosts(document),
    reportedCosts = v.record(row.costs, 'report.costs', Object.keys(costs))
  for (const [key, value] of Object.entries(costs))
    v.requireScene(
      reportedCosts[key] === value,
      `report.costs.${key}`,
      'Custo informado não corresponde ao documento.',
    )
  v.requireScene(
    costs.skins === 0 && costs.clips === 0,
    'report.costs',
    'OBJ não contém esqueletos ou animações.',
  )
  const source = readSource(row.source, expected, costs.materials),
    nodes = new Set(document.nodes.map((node) => node.id)),
    geometries = new Set(document.geometries.map((geometry) => geometry.id)),
    materialById = new Map(document.materials.map((material) => [material.id, material])),
    imageById = new Map(document.images.map((image) => [image.id, image])),
    materials = new Set(materialById.keys()),
    images = new Set(document.images.map((image) => image.id)),
    targets = { materials, images, named: new Set([...materials, ...images]) },
    text = new ObjReportTextBudget()
  text.add({ review, source, costs, issues: [] })
  const issues = v
    .list(row.issues, 'report.issues', OBJ_CONVERSION_REPORT_LIMITS.issues)
    .map((raw) => {
      const item = v.record(raw, 'issue'),
        stage = v.choice(
          item.stage,
          ['selection', 'base', 'textures', 'hierarchy', 'geometry', 'materials'],
          'issue.stage',
        )
      v.record(
        item,
        'issue',
        stage === 'base' || stage === 'textures'
          ? ['stage', 'library', 'material', 'targetId', 'detail']
          : ['stage', 'detail'],
      )
      let issue: ObjConversionIssue
      switch (stage) {
        case 'selection':
          issue = { stage, detail: readObjSelectionIssue(item.detail, source.libraries.length) }
          break
        case 'geometry':
          issue = { stage, detail: readObjGeometryIssue(item.detail, geometries) }
          break
        case 'hierarchy':
          issue = { stage, detail: readObjHierarchyIssue(item.detail, nodes) }
          break
        case 'materials': {
          const detail = readObjMaterialIssue(item.detail, targets),
            material = materialById.get(detail.targetId)
          if (detail.code === 'surface-sidedness-assumed')
            v.requireScene(
              detail.doubleSided === expected.options.images.doubleSided &&
                detail.doubleSided === material!.doubleSided,
              'issue.doubleSided',
              'A aparência relatada não corresponde ao pedido e ao material recebido.',
            )
          if (detail.code === 'normal-y-interpreted')
            v.requireScene(
              detail.source === expected.options.images.normalY &&
                detail.flipY === material!.normalFlipY &&
                material!.normalImageId !== undefined,
              'issue.source',
              'A orientação normal não corresponde ao pedido e ao material recebido.',
            )
          if (detail.code === 'color-alpha-interpreted')
            v.requireScene(
              detail.mode === expected.options.images.colorAlpha,
              'issue.mode',
              'A interpretação do alpha não corresponde ao pedido.',
            )
          if (
            detail.code === 'color-alpha-interpreted' ||
            detail.code === 'color-factor-baked' ||
            detail.code === 'opacity-resampled-nearest'
          )
            v.requireScene(
              material!.colorImageId !== undefined,
              'issue.targetId',
              'A adaptação de cor precisa apontar para um material com imagem de cor.',
            )
          if (detail.code === 'opacity-resampled-nearest') {
            const image = imageById.get(material!.colorImageId!)!
            v.requireScene(
              expected.options.images.opacitySampling === 'nearest' &&
                detail.target[0] === image.width &&
                detail.target[1] === image.height,
              'issue.target',
              'A reamostragem não corresponde à escolha e à imagem recebida.',
            )
          }
          issue = { stage, detail }
          break
        }
        case 'base':
        case 'textures': {
          const origin = {
            library: v.number(item.library, 'issue.library', 0, source.libraries.length - 1, true),
            material: v.number(
              item.material,
              'issue.material',
              0,
              source.materialDeclarations - 1,
              true,
            ),
            targetId: reportTarget(item.targetId, materials, 'issue.targetId'),
          }
          v.requireScene(
            origin.targetId === objMaterialIdentity(origin.library, origin.material, true) ||
              origin.targetId === objMaterialIdentity(origin.library, origin.material, false),
            'issue.targetId',
            'A adaptação aponta para outra declaração de material.',
          )
          issue =
            stage === 'base'
              ? { stage, ...origin, detail: readObjBaseIssue(item.detail) }
              : { stage, ...origin, detail: readObjTextureIssue(item.detail) }
          break
        }
      }
      text.add(issue)
      return issue
    })
  return { review, source, costs, issues }
}
