import { canonicalJson, type EditorialDocument } from '@sistemazero/marketing-contracts'
import { WorkspaceError } from './workspace-error'

/** An existing final cannot silently certify a different copy or composition. */
export function assertArtifactFreshness(
  before: EditorialDocument | undefined,
  after: EditorialDocument,
) {
  if (
    before?.kind === 'video' &&
    after.kind === 'video' &&
    canonicalJson(before.timeline) !== canonicalJson(after.timeline) &&
    after.assetIds?.some((id) => before.assetIds?.includes(id))
  )
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'A montagem mudou. Exporte um novo vídeo final desta revisão.',
    )
  if (before?.kind !== 'component' || after.kind !== 'component') return
  const changed =
    before.body !== after.body ||
    before.title !== after.title ||
    canonicalJson(before.composition ?? null) !== canonicalJson(after.composition ?? null)
  if (changed && after.assetIds.some((id) => before.assetIds.includes(id)))
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'A copy ou montagem mudou. Preserve a imagem anterior como referência e produza uma nova arte final.',
    )
}
