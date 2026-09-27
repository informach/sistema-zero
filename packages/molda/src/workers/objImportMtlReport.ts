import type { MtlBaseIssue } from '../import/mtlBase'
import { MTL_INPUT_LIMITS } from '../import/mtlInput'
import type { MtlTextureIssue } from '../import/mtlTexturePlanTypes'
import type { MtlMapKeyword, MtlProperty, MtlTextureOption } from '../import/mtlTypes'
import * as v from '../scene/validation'
import { reportCode, reportLine } from './objImportReportValues'

const MAP: Record<MtlMapKeyword, true> = {
  map_Ka: true,
  map_Kd: true,
  map_Ks: true,
  map_Ns: true,
  map_d: true,
  decal: true,
  disp: true,
  bump: true,
  refl: true,
  map_Tr: true,
  map_Pr: true,
  map_Pm: true,
  map_Ps: true,
  map_Ke: true,
  norm: true,
  map_Bump: true,
  map_bump: true,
  map_disp: true,
  map_Disp: true,
}
const PROPERTY: Record<MtlProperty['keyword'], true> = {
  ...MAP,
  Ka: true,
  Kd: true,
  Ks: true,
  Tf: true,
  Ke: true,
  Ns: true,
  Ni: true,
  sharpness: true,
  Tr: true,
  Pr: true,
  Pm: true,
  Ps: true,
  Pc: true,
  Pcr: true,
  aniso: true,
  anisor: true,
  d: true,
  illum: true,
  map_aat: true,
}
const OPTION: Record<MtlTextureOption['key'], true> = {
  blendu: true,
  blendv: true,
  cc: true,
  clamp: true,
  o: true,
  s: true,
  t: true,
  mm: true,
  bm: true,
  boost: true,
  texres: true,
  colorspace: true,
  imfchan: true,
  type: true,
}
const BASE: Record<MtlBaseIssue['code'], true> = {
  'rgb-interpreted': true,
  'property-redeclared': true,
  'opacity-priority': true,
  'phong-roughness-approximated': true,
  'illumination-adapted': true,
  'parameter-omitted': true,
  'default-assumed': true,
}
const TEXTURE: Record<MtlTextureIssue['code'], true> = {
  'map-omitted': true,
  'map-interpreted': true,
  'option-redeclared': true,
  'option-omitted': true,
  'third-texture-axis-omitted': true,
  'sampler-filter-nearest': true,
  'sampler-wrap-clamp': true,
  'texture-rgb-interpreted': true,
  'luminance-rec709': true,
  'matte-linear': true,
}

export function readObjBaseIssue(raw: unknown): MtlBaseIssue {
  const row = v.record(raw, 'issue.detail'),
    code = reportCode(row.code, BASE),
    line = reportLine(row.line),
    fields = (...keys: string[]) => v.record(row, 'issue.detail', ['code', 'line', ...keys])
  switch (code) {
    case 'rgb-interpreted':
      fields('space')
      return { code, line, space: v.choice(row.space, ['linear', 'srgb'], 'issue.space') }
    case 'property-redeclared':
      fields('slot', 'ignored')
      return {
        code,
        line,
        slot: reportCode(row.slot, PROPERTY),
        ignored: v.number(row.ignored, 'issue.ignored', 1, MTL_INPUT_LIMITS.properties - 1, true),
      }
    case 'opacity-priority':
      fields('selected', 'omittedLine')
      return {
        code,
        line,
        selected: v.choice(row.selected, ['d', 'Tr'], 'issue.selected'),
        omittedLine: reportLine(row.omittedLine),
      }
    case 'phong-roughness-approximated':
      fields('method')
      return { code, line, method: v.choice(row.method, ['blender'], 'issue.method') }
    case 'illumination-adapted':
      fields('model')
      return { code, line, model: v.number(row.model, 'issue.model', 0, 10, true) }
    case 'parameter-omitted':
      fields('keyword')
      return { code, line, keyword: reportCode(row.keyword, PROPERTY) }
    case 'default-assumed':
      fields('field')
      return {
        code,
        line,
        field: v.choice(
          row.field,
          ['diffuse', 'opacity', 'roughness', 'metalness', 'illumination'],
          'issue.field',
        ),
      }
  }
}

export function readObjTextureIssue(raw: unknown): MtlTextureIssue {
  const row = v.record(raw, 'issue.detail'),
    code = reportCode(row.code, TEXTURE),
    line = reportLine(row.line),
    property = v.number(row.property, 'issue.property', 0, MTL_INPUT_LIMITS.properties - 1, true),
    fields = (...keys: string[]) =>
      v.record(row, 'issue.detail', ['code', 'line', 'property', ...keys])
  switch (code) {
    case 'map-omitted':
      fields('keyword', 'reason')
      return {
        code,
        line,
        property,
        keyword: reportCode(row.keyword, MAP),
        reason: v.choice(
          row.reason,
          ['no-uv', 'unsupported-role', 'role-conflict'],
          'issue.reason',
        ),
      }
    case 'map-interpreted':
      fields('as')
      return {
        code,
        line,
        property,
        as: v.choice(row.as, ['normal', 'roughness', 'opacity', 'transparency'], 'issue.as'),
      }
    case 'option-redeclared':
      fields('key', 'ignored')
      return {
        code,
        line,
        property,
        key: reportCode(row.key, OPTION),
        ignored: v.number(
          row.ignored,
          'issue.ignored',
          1,
          MTL_INPUT_LIMITS.optionsPerMap - 1,
          true,
        ),
      }
    case 'option-omitted':
      fields('key')
      return { code, line, property, key: v.choice(row.key, ['boost', 'texres'], 'issue.key') }
    case 'third-texture-axis-omitted':
      fields('key')
      return { code, line, property, key: v.choice(row.key, ['o', 's'], 'issue.key') }
    case 'sampler-filter-nearest':
      fields('blendu', 'blendv')
      return {
        code,
        line,
        property,
        blendu: v.boolean(row.blendu, 'issue.blendu'),
        blendv: v.boolean(row.blendv, 'issue.blendv'),
      }
    case 'sampler-wrap-clamp':
      fields('source')
      return {
        code,
        line,
        property,
        source: v.choice(row.source, ['repeat', 'underlying-material'], 'issue.source'),
      }
    case 'texture-rgb-interpreted':
      fields('space', 'origin')
      return {
        code,
        line,
        property,
        space: v.choice(row.space, ['linear', 'srgb'], 'issue.space'),
        origin: v.choice(row.origin, ['policy', 'colorspace'], 'issue.origin'),
      }
    case 'luminance-rec709':
    case 'matte-linear':
      fields()
      return { code, line, property }
  }
}
