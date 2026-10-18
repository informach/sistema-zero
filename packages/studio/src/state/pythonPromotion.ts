import { StudioProjectIdSchema } from '@sistemazero/core/studio/project-document'
import { withoutProjectPublication } from '../core/projectPublication'
import { assertPythonVisualDraftSettled } from '../python/blocks/workspaceDraft'
import { pythonFilesToTree, refinePythonClassicProjectDocument } from './pythonProjectValidation'
import { refinePythonProProjectDocument } from './pythonProProjectValidation'

/**
 * Prepares a promotion and an independent original copy. The store must authorize
 * Pro, compare its captured revision, persist original first and compare again
 * before committing converted. This function never writes storage.
 */
export async function preparePythonPromotion(
  raw: unknown,
  options: { originalId: string; now: number },
) {
  const originalId = StudioProjectIdSchema.parse(options.originalId)
  const now = options.now
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Data de promoção inválida.')
  const source = await refinePythonClassicProjectDocument(raw)
  assertPythonVisualDraftSettled(source)
  if (originalId === source.id)
    throw new Error('A cópia original precisa de uma identidade própria.')
  const unlinked = withoutProjectPublication(source)
  if (unlinked.kind !== 'classic') throw new Error('Abra o projeto Clássico para promover.')
  const { files, ir: _ir, blocksState: _blocks, bridgeCodeAhead: _ahead, ...common } = unlinked
  const original = { ...unlinked, id: originalId, name: `${source.name.slice(0, 191)} (Blocos)` }
  const converted = await refinePythonProProjectDocument({
    ...common,
    updatedAt: Math.max(now, source.updatedAt),
    kind: 'pro',
    mode: 'code',
    ir: null,
    blocksState: null,
    tree: pythonFilesToTree(files),
    proMeta: {
      templateId: 'python-from-classic',
      origin: { projectId: originalId, revision: source.updatedAt },
    },
  })
  return { original, converted }
}
