import type { ObjMaterialIssue } from '../import/objMaterialConversionTypes'
import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'
import { reportCode, reportPath, reportTarget } from './objImportReportValues'

const MATERIAL: Record<ObjMaterialIssue['code'], true> = {
  'name-generated': true,
  'name-shortened': true,
  'rgba16-to-rgba8': true,
  'color-factor-baked': true,
  'color-alpha-interpreted': true,
  'normal-y-interpreted': true,
  'surface-sidedness-assumed': true,
  'opacity-resampled-nearest': true,
}
function dimensions(raw: unknown, at: string): [number, number] {
  const values = v.tuple(raw, 2, at)
  return [
    v.number(values[0], at, 1, SCENE_LIMITS.imageSide, true),
    v.number(values[1], at, 1, SCENE_LIMITS.imageSide, true),
  ]
}
export function readObjMaterialIssue(
  raw: unknown,
  targets: {
    materials: ReadonlySet<string>
    images: ReadonlySet<string>
    named: ReadonlySet<string>
  },
): ObjMaterialIssue {
  const row = v.record(raw, 'issue.detail'),
    code = reportCode(row.code, MATERIAL),
    path = reportPath(row.path),
    targetId = reportTarget(
      row.targetId,
      code === 'rgba16-to-rgba8'
        ? targets.images
        : code === 'name-generated' || code === 'name-shortened'
          ? targets.named
          : targets.materials,
      'issue.targetId',
    ),
    fields = (...keys: string[]) =>
      v.record(row, 'issue.detail', ['code', 'path', 'targetId', ...keys])
  switch (code) {
    case 'name-generated':
    case 'name-shortened':
    case 'rgba16-to-rgba8':
    case 'color-factor-baked':
      fields()
      return { code, path, targetId }
    case 'color-alpha-interpreted':
      fields('mode')
      return {
        code,
        path,
        targetId,
        mode: v.choice(row.mode, ['ignore', 'multiply'], 'issue.mode'),
      }
    case 'normal-y-interpreted': {
      fields('source', 'flipY')
      const source = v.choice(row.source, ['positive', 'negative'], 'issue.source'),
        flipY = v.boolean(row.flipY, 'issue.flipY')
      v.requireScene(
        flipY === (source === 'negative'),
        'issue.flipY',
        'Orientação normal inconsistente.',
      )
      return { code, path, targetId, source, flipY }
    }
    case 'surface-sidedness-assumed':
      fields('doubleSided')
      return { code, path, targetId, doubleSided: v.boolean(row.doubleSided, 'issue.doubleSided') }
    case 'opacity-resampled-nearest': {
      fields('source', 'target')
      const source = dimensions(row.source, 'issue.source'),
        target = dimensions(row.target, 'issue.target')
      v.requireScene(
        source[0] !== target[0] || source[1] !== target[1],
        'issue.target',
        'A reamostragem precisa indicar resoluções diferentes.',
      )
      return { code, path, targetId, source, target }
    }
  }
}
