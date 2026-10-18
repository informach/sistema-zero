import { describe, expect, test } from 'bun:test'
import { createEmptyProject } from '@sistemazero/studio/project'
import { ProjectDocumentError } from '@sistemazero/studio/project-document'
import {
  keepRemoteAsOther,
  type StudioDraftDeps,
} from '../src/components/studio/lesson-studio-draft'
import { LESSON_DRAFT_OUTDATED, type LessonDraftRemote } from '../src/lib/lesson-draft-cloud'

/** Um Estúdio de mentira cuja conferência da versão da conta recusa com o erro dado. */
function deps(recusa: unknown): StudioDraftDeps {
  return {
    studio: {
      loadProjectSnapshotForCloud: async () => null,
      validateCloudProjectSnapshot: async () => {
        throw recusa
      },
      replaceLocalProject: async () => {},
      loadProjectSummaryForCloud: async () => null,
    } as unknown as StudioDraftDeps['studio'],
    channel: {} as StudioDraftDeps['channel'],
    blockId: 'bloco',
    projectId: 'projeto',
    backupId: 'projeto-outra',
    initialProject: createEmptyProject('initial', 'Projeto inicial'),
  }
}

const remote = { load: async () => ({ id: 'x' }) } as unknown as LessonDraftRemote

/**
 * "Atualize a página" só quando a página nova resolve (full review de 11/10/2026): o documento é
 * mais NOVO que ela. Uma recusa de outro tipo seguiria igual depois de recarregar, e a criança
 * ficaria num laço de "atualize" que não muda nada.
 */
describe('a versão da conta que esta página não lê', () => {
  test('formato futuro e blocos desconhecidos: a página está antiga', async () => {
    for (const recusa of [
      new ProjectDocumentError('future-format', 'mais novo'),
      new ProjectDocumentError('invalid-document', 'blocos', '$.blocksState'),
    ]) {
      const erro = await keepRemoteAsOther(deps(recusa), remote).catch((e) => e)
      expect((erro as { code?: string }).code).toBe(LESSON_DRAFT_OUTDATED)
    }
  })

  test('ids repetidos ou limite de blocos: falha comum, não página antiga', async () => {
    const recusa = new ProjectDocumentError('invalid-document', 'Dois blocos usam o mesmo id')
    const erro = await keepRemoteAsOther(deps(recusa), remote).catch((e) => e)
    expect(erro).toBe(recusa)
  })
})
