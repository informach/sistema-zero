export type MtlColor =
  | { space: 'rgb' | 'xyz'; value: [number, number, number] }
  | { space: 'spectral'; filename: string; factor: number }
export type MtlMapKeyword =
  | 'map_Ka'
  | 'map_Kd'
  | 'map_Ks'
  | 'map_Ns'
  | 'map_d'
  | 'decal'
  | 'disp'
  | 'bump'
  | 'refl'
  | 'map_Tr'
  | 'map_Pr'
  | 'map_Pm'
  | 'map_Ps'
  | 'map_Ke'
  | 'norm'
  | 'map_Bump'
  | 'map_bump'
  | 'map_disp'
  | 'map_Disp'
export type MtlTextureOption =
  | { key: 'blendu' | 'blendv' | 'cc' | 'clamp'; value: boolean }
  | { key: 'o' | 's' | 't'; value: [number, number?, number?] }
  | { key: 'mm'; value: [number, number] }
  | { key: 'bm' | 'boost' | 'texres'; value: number }
  | { key: 'colorspace'; value: string }
  | { key: 'imfchan'; value: 'r' | 'g' | 'b' | 'm' | 'l' | 'z' }
  | {
      key: 'type'
      value:
        | 'sphere'
        | 'cube_top'
        | 'cube_bottom'
        | 'cube_front'
        | 'cube_back'
        | 'cube_left'
        | 'cube_right'
    }
export interface MtlTexture {
  /** Literal filename, not an URI, resolved path, executable or request to load a resource. */
  filename: string
  /** Only authored options, preserving order, duplicates and vector arity. No sampler/UV defaults. */
  options: MtlTextureOption[]
}
export type MtlProperty = { line: number } & (
  | { kind: 'color'; keyword: 'Ka' | 'Kd' | 'Ks' | 'Tf' | 'Ke'; value: MtlColor }
  | {
      kind: 'scalar'
      keyword:
        | 'Ns'
        | 'Ni'
        | 'sharpness'
        | 'Tr'
        | 'Pr'
        | 'Pm'
        | 'Ps'
        | 'Pc'
        | 'Pcr'
        | 'aniso'
        | 'anisor'
      value: number
    }
  | { kind: 'dissolve'; keyword: 'd'; value: number; halo: boolean }
  | { kind: 'illumination'; keyword: 'illum'; value: number }
  | { kind: 'antialias'; keyword: 'map_aat'; value: boolean }
  | { kind: 'map'; keyword: MtlMapKeyword; value: MtlTexture }
)
export interface MtlMaterial {
  line: number
  name: string
  /** Redeclarations are not erased. Interpretation and conflict reporting belong to conversion. */
  properties: MtlProperty[]
}
export interface MtlDocument {
  /** Declaration order/identity; do not key by name, because names may repeat. */
  materials: MtlMaterial[]
  costs: { materials: number; properties: number; options: number }
}
