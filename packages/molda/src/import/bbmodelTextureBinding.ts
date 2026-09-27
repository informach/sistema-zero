import type { BbmodelAppearance } from './bbmodelAppearance'
import type { BbmodelGeometrySource, BbmodelTextureReference } from './bbmodelGeometryTypes'
import { requireBbmodel } from './bbmodelInput'
import { bbmodelKeyPath } from './bbmodelValues'

export type BbmodelTextureBinding =
  | { kind: 'texture'; texture: number }
  | { kind: 'none' }
  | { kind: 'disabled' }
  | { kind: 'unresolved-default' }

function bind(
  reference: BbmodelTextureReference,
  appearance: BbmodelAppearance,
  path: string,
): BbmodelTextureBinding {
  switch (reference.kind) {
    case 'none':
      return { kind: 'none' }
    case 'disabled':
      return { kind: 'disabled' }
    case 'default':
      // free does not enable either single_texture flag. Other formats need their own semantics.
      return { kind: appearance.modelFormat === 'free' ? 'none' : 'unresolved-default' }
    case 'index':
      requireBbmodel(
        reference.index < appearance.textures.length,
        path,
        'A face aponta para uma textura que não existe.',
      )
      return { kind: 'texture', texture: reference.index }
    case 'uuid': {
      const texture = appearance.byTextureUuid.get(reference.uuid)
      requireBbmodel(texture !== undefined, path, 'A face aponta para uma textura que não existe.')
      return { kind: 'texture', texture }
    }
  }
}

/** Binds already-read geometry; does not select images, materials, default textures or UV dimensions. */
export function bindBbmodelTextures(
  geometry: readonly BbmodelGeometrySource[],
  appearance: BbmodelAppearance,
): Array<{ node: number; faces: BbmodelTextureBinding[] }> {
  return geometry.map((shape) => ({
    node: shape.node,
    faces:
      shape.kind === 'unresolved'
        ? []
        : shape.faces.map((face) =>
            bind(
              face.texture,
              appearance,
              `${bbmodelKeyPath(`${shape.sourcePath}.faces`, 'direction' in face ? face.direction : face.id)}.texture`,
            ),
          ),
  }))
}
