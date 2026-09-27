import type { BbmodelAppearance } from './bbmodelAppearance'
import { BbmodelInputError } from './bbmodelInput'
import type { BbmodelVec2 } from './bbmodelValues'

/** Logical, frame-local UV dimensions of matching free metadata, never cached/decoded pixel sizes. */
export function bbmodelUvDimensions(
  appearance: BbmodelAppearance,
  texture: number | null,
): BbmodelVec2 {
  if (appearance.modelFormat !== 'free')
    throw new BbmodelInputError(
      'unsupported',
      'meta.model_format',
      'Este mapa UV precisa do formato genérico do Blockbench.',
    )
  const selected = texture === null ? null : appearance.textures[texture]
  if (texture !== null && !selected) throw new Error('Mismatched bbmodel texture binding')
  // Free Project defaults to 16 per axis; a Texture inherits each missing axis separately.
  return [
    selected?.uvWidth ?? appearance.project.uvWidth ?? 16,
    selected?.uvHeight ?? appearance.project.uvHeight ?? 16,
  ]
}
