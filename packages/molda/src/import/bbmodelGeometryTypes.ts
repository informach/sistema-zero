import type { BbmodelNodeProperties } from './bbmodelNodeProperties'
import type { BbmodelVec2, BbmodelVec3, BbmodelVec4 } from './bbmodelValues'

export const BBMODEL_CUBE_DIRECTIONS = ['north', 'east', 'south', 'west', 'up', 'down'] as const
export type BbmodelCubeDirection = (typeof BBMODEL_CUBE_DIRECTIONS)[number]
export type BbmodelTextureReference =
  | { kind: 'default' }
  | { kind: 'none' }
  | { kind: 'disabled' }
  | { kind: 'index'; index: number }
  | { kind: 'uuid'; uuid: string }

export type BbmodelGeometryProperties = BbmodelNodeProperties
export interface BbmodelCubeFace {
  direction: BbmodelCubeDirection
  uv: BbmodelVec4
  rotation: number
  texture: BbmodelTextureReference
  /** Raw remaining semantics (tint/cullface/enabled/etc.) need a later conversion decision. */
  source: Readonly<Record<string, unknown>>
}
export interface BbmodelCube extends BbmodelGeometryProperties {
  kind: 'cube'
  node: number
  from: BbmodelVec3
  to: BbmodelVec3
  inflate: number
  stretch: BbmodelVec3
  rescale: boolean
  mirrorUv: boolean
  uvOffset: BbmodelVec2
  /** null means inherit the project setting; no guessed default at this stage. */
  boxUv: boolean | null
  faces: BbmodelCubeFace[]
}
export interface BbmodelMeshFace {
  id: string
  /** Source order, including repeated references or non-surface faces; never weld/sort here. */
  vertices: Uint32Array
  /** Own coordinate pairs. Missing UV stays missing; surplus UV keys stay present. */
  uv: ReadonlyMap<string, BbmodelVec2>
  texture: BbmodelTextureReference
  source: Readonly<Record<string, unknown>>
}
export interface BbmodelMesh extends BbmodelGeometryProperties {
  kind: 'mesh'
  node: number
  vertexIds: string[]
  positions: Float64Array
  faces: BbmodelMeshFace[]
}
export interface BbmodelUnresolvedGeometry {
  kind: 'unresolved'
  node: number
  sourcePath: string
  type: string | null
}
export type BbmodelGeometrySource = BbmodelCube | BbmodelMesh | BbmodelUnresolvedGeometry
