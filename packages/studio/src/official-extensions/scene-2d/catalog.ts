import type { BlockPlacementPreset } from '../../blockly/blocks/types'
import { SPRITE_SCENE_METHODS } from './spriteCatalog'
import type { SpriteSceneApi } from './spriteContract'

export type SceneApiMethod = keyof SpriteSceneApi

export type SceneTarget = 'g2d' | 'gk'
/** The two things a child names here. Each has its own list of names in use. */
export type SceneNameKind = 'layer' | 'track'
export const SCENE_NAME_KINDS = ['layer', 'track'] as const satisfies readonly SceneNameKind[]
export interface SceneArgument {
  name: string
  value: string | number | boolean
  field?: 'image' | 'select' | 'sprite' | 'animation' | 'mold'
  options?: readonly (readonly [string, string])[]
  /** This block gives the name its existence: the child types it here, once. */
  declares?: SceneNameKind
  /**
   * This block uses a name created elsewhere: its socket is born with a list of the
   * names in use. It stays a socket, so a name built in a loop still fits.
   */
  picks?: SceneNameKind
}
export interface SceneMethod {
  method: SceneApiMethod
  block: string
  message: string
  args: readonly SceneArgument[]
  value?: boolean
  family: 'begin' | 'more' | 'animation'
  targets?: readonly SceneTarget[]
  parameter?: string
  each?: boolean
  event?: boolean
  placement?: BlockPlacementPreset
  tooltip: string
}
/** Public vocabulary for both extensions. Projection remains private to the engine. */
export const SCENE_METHODS: readonly SceneMethod[] = SPRITE_SCENE_METHODS
export const sceneMethods = (target: SceneTarget) =>
  SCENE_METHODS.filter((entry) => !entry.targets || entry.targets.includes(target))

export const sceneMethod = (method: string, target?: SceneTarget) =>
  SCENE_METHODS.find(
    (entry) =>
      entry.method === method && (!target || !entry.targets || entry.targets.includes(target)),
  )
export const sceneBlockType = (target: SceneTarget, entry: SceneMethod) =>
  `sz_${target}_${entry.block}`
/** The hidden value block that sits in a name socket and lists the names in use. */
export const sceneNameBlockType = (target: SceneTarget, kind: SceneNameKind) =>
  `sz_${target}_scene_${kind}_name`
const SCENE_NAME_BLOCK_TYPES: ReadonlySet<string> = new Set(
  (['g2d', 'gk'] as const).flatMap((target) =>
    SCENE_NAME_KINDS.map((kind) => sceneNameBlockType(target, kind)),
  ),
)
/** True for the list block of either engine; for the program it is plain text. */
export const isSceneNameBlock = (type: string): boolean => SCENE_NAME_BLOCK_TYPES.has(type)

/**
 * A saved project with every list block read as the text it holds. Checks that look
 * at blocks (a lesson asking for "this layer, by this name") know text literals and
 * nothing about these blocks. Returns the same reference when there is none to swap,
 * and walks with a stack: a long chain of blocks must not ride the call stack.
 */
export function sceneNamesAsText<T>(state: T): T {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null
  const isName = (value: unknown): value is Record<string, unknown> =>
    isRecord(value) && typeof value.type === 'string' && isSceneNameBlock(value.type)
  let found = false
  const scan: unknown[] = [state]
  while (scan.length > 0 && !found) {
    const node = scan.pop()
    if (!isRecord(node)) continue
    if (isName(node)) found = true
    else for (const child of Object.values(node)) scan.push(child)
  }
  if (!found) return state
  const copy = structuredClone(state)
  const stack: unknown[] = [copy]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    for (const [key, child] of Object.entries(node)) {
      if (isName(child)) {
        const fields = isRecord(child.fields) ? child.fields : {}
        const { type: _type, fields: _fields, ...rest } = child
        ;(node as Record<string, unknown>)[key] = {
          ...rest,
          type: 'sz_val_text',
          fields: { TEXT: fields.NAME ?? '' },
        }
      } else stack.push(child)
    }
  }
  return copy
}
/** The literal a value socket is born with, in the palette and back from the bridge. */
export function sceneLiteralShadow(arg: SceneArgument): {
  type: string
  fields: Record<string, string | number>
} {
  return typeof arg.value === 'number'
    ? { type: 'sz_val_number', fields: { NUM: arg.value } }
    : typeof arg.value === 'boolean'
      ? { type: 'sz_val_bool', fields: { VALUE: arg.value ? 'true' : 'false' } }
      : { type: 'sz_val_text', fields: { TEXT: arg.value } }
}
export const SCENE_NAME_DEFAULTS: Readonly<Record<SceneNameKind, string>> = {
  layer: 'montanhas',
  track: 'pista',
}
/** The engine a scene block belongs to, read from its type. */
export const sceneTargetOf = (type: string): SceneTarget | undefined =>
  type.startsWith('sz_g2d_') ? 'g2d' : type.startsWith('sz_gk_') ? 'gk' : undefined
/**
 * Where a name of this kind is born: block type → name socket. Each engine keeps its
 * own scene, so a list asks for one engine; without it, both are returned.
 */
export function sceneNameDeclarations(
  kind: SceneNameKind,
  only?: SceneTarget,
): Record<string, string> {
  const found: Record<string, string> = {}
  for (const target of only ? [only] : (['g2d', 'gk'] as const)) {
    for (const entry of sceneMethods(target)) {
      const socket = entry.args.find((arg) => arg.declares === kind)
      if (socket) found[sceneBlockType(target, entry)] = socket.name
    }
  }
  return found
}
export const sceneTypes = (target: SceneTarget, family: SceneMethod['family']) =>
  sceneMethods(target)
    .filter((entry) => entry.family === family)
    .map((entry) => sceneBlockType(target, entry))
