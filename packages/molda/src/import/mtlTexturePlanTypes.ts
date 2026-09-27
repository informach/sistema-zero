import type { MtlRepeatedPropertyPolicy } from './mtlEffectiveProperties'
import type { MtlMapKeyword, MtlTextureOption } from './mtlTypes'
import type { ObjUvTransform } from './objUvTransform'

export type MtlRgbSpace = 'linear' | 'srgb'
export const MTL_TEXTURE_ROLES = ['color', 'opacity', 'roughness', 'metalness', 'normal'] as const
export type MtlTextureRole = (typeof MTL_TEXTURE_ROLES)[number]
export interface MtlTexturePolicy {
  /** Interpretation of untagged color maps, independently of the scalar Kd interpretation. */
  colorSpace: MtlRgbSpace
  /** Interpretation of untagged RGB channels used as scalar data. Matte always remains linear. */
  scalarSpace: MtlRgbSpace
  repeatedOptions?: MtlRepeatedPropertyPolicy
  roleConflicts?: MtlRepeatedPropertyPolicy
  unsupportedMaps?: 'reject' | 'omit'
  bump?: 'reject' | 'normal'
  specularMap?: 'reject' | 'roughness'
  transparencyMap?: 'reject' | 'opacity' | 'transparency'
}
export type MtlUvTransform = ObjUvTransform
export type MtlTextureSample =
  | { kind: 'color'; rgbSpace: MtlRgbSpace }
  | {
      kind: 'scalar'
      channel: 'r' | 'g' | 'b' | 'm' | 'l'
      rgbSpace: MtlRgbSpace
      /** Inversion follows range remapping, before multiplication by material opacity. */
      invert: boolean
    }
  | { kind: 'normal'; strength: number }
export interface MtlTexturePlan {
  property: number
  line: number
  keyword: MtlMapKeyword
  /** Literal reference relative to the MTL, not a resolved resource or a request for IO. */
  filename: string
  role: MtlTextureRole
  sample: MtlTextureSample
  uv: MtlUvTransform
  /** output = base + gain * sample, in the interpreted linear domain (alpha has no transfer). */
  range: [base: number, gain: number]
}
export type MtlTextureIssue = { property: number; line: number } & (
  | {
      code: 'map-omitted'
      keyword: MtlMapKeyword
      reason: 'no-uv' | 'unsupported-role' | 'role-conflict'
    }
  | { code: 'map-interpreted'; as: 'normal' | 'roughness' | 'opacity' | 'transparency' }
  | { code: 'option-redeclared'; key: MtlTextureOption['key']; ignored: number }
  | { code: 'option-omitted'; key: 'boost' | 'texres' }
  | { code: 'third-texture-axis-omitted'; key: 'o' | 's' }
  | { code: 'sampler-filter-nearest'; blendu: boolean; blendv: boolean }
  | { code: 'sampler-wrap-clamp'; source: 'repeat' | 'underlying-material' }
  | { code: 'texture-rgb-interpreted'; space: MtlRgbSpace; origin: 'policy' | 'colorspace' }
  | { code: 'luminance-rec709' }
  | { code: 'matte-linear' }
)
