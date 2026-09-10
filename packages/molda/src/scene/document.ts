/**
 * Unreleased model domain. Not accepted by the public reader/writer yet.
 * Geometry lives in node-local coordinates; atlas, mirrors and GPU buffers are derived.
 */
import type { TexelsPerUnit } from '../core/limits'
import type {
  MoldaAssetBase,
  MoldaPaletteFields,
  MoldaSnap,
  ShapeFaceId,
  Vec3,
} from '../core/model'
import type { SceneAlphaMask } from './alphaMask'
import type { SceneAnimationClip } from './animation'
import type { SceneBendLimit } from './bendLimit'
import type { SceneNode } from './graph'
import type { SceneSkinBinding } from './skin'

export type Vec2 = [number, number]
export interface SceneUvTransform {
  origin: Vec2
  u: Vec2
  v: Vec2
}

interface ModelNodeBase extends SceneNode {
  name: string
  hidden: boolean
  locked: boolean
}

export type ModelSceneNode = ModelNodeBase &
  (
    | { kind: 'mesh'; geometryId: string; materialId: string }
    | { kind: 'group' | 'locator'; bendLimit?: SceneBendLimit }
  )

export interface SceneMeshFace {
  /** UV belongs to each corner, not to a shared vertex; seams can be represented exactly. */
  corners: Array<{ vertexId: string; uv: Vec2 }>
  /** Absent means the node's default material. */
  materialId?: string
}

export interface SceneMeshGeometry {
  id: string
  kind: 'mesh'
  vertices: Record<string, Vec3>
  faces: Record<string, SceneMeshFace>
  looseEdges: Array<[string, string]>
}

interface ScenePrimitiveBase {
  id: string
  from: Vec3
  to: Vec3
  surfaces: Partial<Record<ShapeFaceId, { materialId?: string; uv: SceneUvTransform }>>
}

/** Omitted detail preserves the original native/legacy tessellation exactly. */
export type ScenePrimitiveGeometry = ScenePrimitiveBase &
  (
    | { kind: 'box' }
    | { kind: 'wedge' }
    | { kind: 'cylinder'; tessellation?: { around: number } }
    | { kind: 'sphere'; tessellation?: { around: number; down: number } }
  )
export type SceneCurvedPrimitive = Extract<ScenePrimitiveGeometry, { kind: 'cylinder' | 'sphere' }>

/** Authorial polyline; closed paths reuse the first ring, without duplicate control points. */
export interface ScenePathGeometry {
  id: string
  kind: 'path'
  points: Array<{ id: string; position: Vec3 }>
  radius: number
  around: number
  endCaps: boolean
  closed?: boolean
  surfaces: ScenePrimitiveGeometry['surfaces']
}

export type SceneGeometry = SceneMeshGeometry | ScenePrimitiveGeometry | ScenePathGeometry

export interface SceneMaterial {
  id: string
  name: string
  /** Palette binding stays editable after migrating; zero paint reveals this base. */
  baseColor:
    | { kind: 'palette'; index: number }
    | { kind: 'rgba'; value: [number, number, number, number] }
  colorImageId?: string
  /** Surface data uses the same UVs, RGBA source bytes and no sRGB transfer function. */
  normalImageId?: string
  roughnessImageId?: string
  metalnessImageId?: string
  normalStrength?: number
  normalFlipY?: boolean
  /** Absent preserves automatic blending; present cuts holes without altering paint. */
  alphaMask?: SceneAlphaMask
  roughness: number
  metalness: number
  doubleSided: boolean
}

export interface SceneImageLayer {
  id: string
  name: string
  visible: boolean
  opacity: number
  /** One authorial pixel source. Indexed zero is transparent over the material base. */
  pixels: Uint8Array
}

export interface SceneImage {
  id: string
  name: string
  width: number
  height: number
  encoding: 'indexed' | 'rgba'
  /** Bottom to top. Composite/atlas are derived and must not be persisted as a second source. */
  layers: SceneImageLayer[]
  flipbook?: SceneImageFlipbook
}

/** Uniform grid, ordered from the visible top-left; sequence may repeat or reorder cells. */
export interface SceneImageFlipbook {
  frameWidth: number
  frameHeight: number
  frames: number[]
  fps: number
  loop: boolean
}

/** Mirror output retains its identity without storing a second editable geometry/transform. */
export interface SceneMirror {
  id: string
  name: string
  sourceId: string
  axis: 'x' | 'y' | 'z'
  offset: number
}

export interface MoldaSceneDocument extends MoldaAssetBase, MoldaPaletteFields {
  formatVersion: 2
  kind: 'model'
  settings: { texelsPerUnit: TexelsPerUnit; snap: MoldaSnap; mirrorX: boolean }
  nodes: ModelSceneNode[]
  geometries: SceneGeometry[]
  materials: SceneMaterial[]
  images: SceneImage[]
  mirrors: SceneMirror[]
  /** Absent on existing v2 creations; playback time and active clip belong to the session. */
  animations?: SceneAnimationClip[]
  /** Internal skin contract. Joints reuse scene nodes and the existing timeline. */
  skins?: SceneSkinBinding[]
}
