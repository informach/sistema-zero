import { type PintaAsset, pintaAssetToWire } from '@sistemazero/pinta/assets'
import type { EditableStudioProject } from '@sistemazero/studio'
import { type BlockForm, buildContent } from './lesson-block-form'
import type { LessonFormBuffer } from './lesson-form-buffer'
import type { LessonBlockContent } from './types'

export type LessonFormResourceSnapshot =
  | { kind: 'none' }
  | { kind: 'studio'; opening: LessonFormBuffer<BlockForm>; project: EditableStudioProject }
  | { kind: 'pinta'; opening: LessonFormBuffer<BlockForm>; asset: PintaAsset }

/** The existing content builder receives its own mutable fields, never the buffer's frozen
 * objects. Call only at serialization/capture, not from a form setter or every render. */
function copyOpening<T extends object>(opening: LessonFormBuffer<T>): T
function copyOpening(opening: { getSnapshot(): unknown }): unknown {
  return structuredClone(opening.getSnapshot())
}

/** Produces a draft candidate from the current opening, independent of React commit.
 * Resource preparation, publication validation and durable sealing belong to the owner. */
export function buildLessonFormContent(
  opening: LessonFormBuffer<BlockForm>,
  resource: LessonFormResourceSnapshot,
  previousContent?: LessonBlockContent,
): LessonBlockContent {
  if (!opening.isCurrent()) throw new Error('Esta não é mais a abertura ativa do formulário.')
  const current = opening.getSnapshot()
  if (resource.kind !== 'none' && resource.opening !== opening)
    throw new Error('O recurso preparado pertence a outra abertura do formulário.')
  if (current.kind === 'studio') {
    if (resource.kind !== 'studio')
      throw new Error('Prepare o snapshot deste Estúdio antes de capturar os campos.')
  } else if (current.kind === 'pinta' && !current.galleryEnabled) {
    if (resource.kind !== 'pinta')
      throw new Error('Prepare o snapshot deste Pinta antes de capturar os campos.')
  } else if (resource.kind !== 'none')
    throw new Error('O recurso preparado não pertence ao tipo atual deste formulário.')

  const content = buildContent(
    copyOpening(opening),
    resource.kind === 'studio' ? resource.project : undefined,
    previousContent,
    resource.kind === 'pinta' ? pintaAssetToWire(resource.asset) : undefined,
  )
  if (!opening.isCurrent()) throw new Error('Esta não é mais a abertura ativa do formulário.')
  return content
}
