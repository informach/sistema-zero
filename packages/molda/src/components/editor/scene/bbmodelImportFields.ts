import { BBMODEL_ANIMATION_IMPORT_COPY as movement } from '../../../core/bbmodelAnimationImportCopy'
import { BBMODEL_IMPORT_COPY as copy } from '../../../core/bbmodelImportCopy'
import type { readBbmodelNativeOptions } from '../../../import/bbmodelNativeOptions'

export type BbmodelImportOptions = ReturnType<typeof readBbmodelNativeOptions>
type Groups = Omit<BbmodelImportOptions, 'sourcePreference'>

export interface BbmodelImportField {
  name: string
  label: string
  choices: ReadonlyArray<readonly [string, string]>
  value(options: BbmodelImportOptions): string
  change(options: BbmodelImportOptions, value: string): BbmodelImportOptions
}
function field<Group extends keyof Groups, Key extends keyof Groups[Group]>(
  group: Group,
  key: Key,
  label: string,
  choices: ReadonlyArray<readonly [Extract<Groups[Group][Key], string>, string]>,
): BbmodelImportField {
  return {
    name: `bbmodel-${group}-${String(key)}`,
    label,
    choices,
    value: (options) => String(options[group][key]),
    change: (options, value) => {
      const selected = choices.find(([choice]) => choice === value)
      return selected ? { ...options, [group]: { ...options[group], [key]: selected[0] } } : options
    },
  }
}
const reject = ['reject', copy.reject] as const

/** Each descriptor names a real, statically checked codec option; omitted content never defaults to consent. */
export const BBMODEL_APPEARANCE_FIELDS = [
  field('images', 'layers', copy.layers, [reject, ['molda-layers', copy.editableLayers]]),
  field('surfaces', 'normals', copy.normals, [reject, ['molda-flat', copy.nativeNormals]]),
  field('textureMaterials', 'lighting', copy.lighting, [
    reject,
    ['molda-standard', copy.nativeLighting],
  ]),
  field('nodeMaterials', 'untextured', copy.untextured, [reject, ['uniform', copy.uniform]]),
  field('textureMaterials', 'autoSides', copy.autoSides, [
    reject,
    ['front', copy.front],
    ['double', copy.double],
  ]),
] satisfies BbmodelImportField[]

export const BBMODEL_GEOMETRY_FIELDS = [
  field('geometry', 'quads', copy.quads, [
    ['source-triangles', copy.sourceTriangles],
    ['editable-quads', copy.editableQuads],
  ]),
  field('positions', 'nonPositiveCubes', copy.nonPositiveCubes, [
    reject,
    ['preserve', copy.preserveCubes],
  ]),
  field('uvs', 'missingMeshUvs', copy.missingUvs, [reject, ['zero', copy.zeroUvs]]),
  field('hierarchy', 'groupFlags', copy.groupFlags, [reject, ['inherit', copy.inheritFlags]]),
  field('surfaces', 'outsideFrameUvs', copy.outsideUvs, [reject, ['clamp', copy.clampUvs]]),
  field('textureMaterials', 'repeatWrap', copy.repeatWrap, [reject, ['clamp', copy.clampUvs]]),
  field('images', 'rgba16', copy.rgba16, [reject, ['round-to-rgba8', copy.roundColors]]),
] satisfies BbmodelImportField[]

export const BBMODEL_OMISSION_FIELDS = [
  field('selection', 'unlisted', copy.unlisted, [
    reject,
    ['append', copy.append],
    ['omit', copy.omitUnlisted],
  ]),
  field('selection', 'unsupportedNodes', copy.unsupportedNodes, [
    reject,
    ['omit-subtree', copy.omitSubtree],
  ]),
  field('geometry', 'unsupportedFaces', copy.unsupportedFaces, [reject, ['omit', copy.omitFaces]]),
  field('surfaces', 'renderOrder', copy.renderOrder, [reject, ['discard', copy.discardOrder]]),
  field('surfaces', 'seamLabels', copy.seamLabels, [reject, ['discard', copy.discardSeams]]),
  field('surfaces', 'cubeShade', copy.cubeShade, [reject, ['discard', copy.discardShade]]),
  field('textureMaterials', 'renderModes', copy.renderModes, [
    reject,
    ['standard', copy.standardModes],
  ]),
  field('textureMaterials', 'pbrGroups', copy.pbrGroups, [
    reject,
    ['texture-only', copy.textureOnly],
  ]),
  field('hierarchy', 'exportFlags', copy.exportFlags, [reject, ['discard', copy.discardExport]]),
  field('remainder', 'unmapped', copy.unmapped, [reject, ['discard', copy.discardUnmapped]]),
] satisfies BbmodelImportField[]

export const BBMODEL_MOVEMENT_FIELDS = [
  field('remainder', 'animations', copy.animations, [
    reject,
    ['omit', copy.omitAnimations],
    ['convert', copy.convertAnimations],
  ]),
  field('remainder', 'controllers', copy.controllers, [reject, ['omit', copy.omitControllers]]),
] satisfies BbmodelImportField[]

export const BBMODEL_CLIP_FIELDS = [
  field('clips', 'adaptation', movement.adaptation, [
    reject,
    ['continuous-sampled', movement.sampled],
  ]),
  field('clips', 'duration', movement.duration, [
    ['declared', movement.declared],
    ['fit-keys', movement.fitKeys],
  ]),
  field('clips', 'nameReferences', movement.names, [reject, ['unique-name', movement.uniqueName]]),
  field('clips', 'unresolved', movement.unresolved, [reject, ['omit-clip', movement.omitClip]]),
  field('clips', 'metadata', movement.metadata, [reject, ['discard', movement.discardMetadata]]),
  field('clips', 'unmapped', movement.unmapped, [reject, ['discard', movement.discardUnmapped]]),
  field('clips', 'discontinuities', movement.discontinuities, [
    reject,
    ['sample-pre', movement.samplePre],
  ]),
  field('clips', 'zeroScale', movement.zeroScale, [
    reject,
    ['preserve-zero', movement.preserveZero],
    ['source-minimum', movement.minimumScale],
  ]),
] satisfies BbmodelImportField[]
