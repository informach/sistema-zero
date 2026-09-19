import { describe, expect, test } from 'bun:test'
import {
  classifyLessonDraftRevision,
  publishedLessonFingerprint,
} from '../src/infrastructure/persistence/drizzle/lesson-draft-revision-rebase'

const lesson = {
  title: 'Aula de teste',
  slug: 'aula-de-teste',
  estimatedMinutes: 15,
  blocks: [],
  attachments: [],
}

describe('reconciliação de revisões após retirar supportBlockIds', () => {
  test('reconhece a revisão antiga de uma aula publicada com estrutura', () => {
    const snapshot = { ...lesson, sections: [{ id: 'secao-1', blockIds: [] }] }
    const antiga = publishedLessonFingerprint({ ...snapshot, supportBlockIds: [] })

    expect(classifyLessonDraftRevision(snapshot, antiga, true)).toEqual({
      kind: 'rebase',
      currentRevision: publishedLessonFingerprint(snapshot),
    })
  })

  test('reconhece a revisão antiga de uma aula ainda sem estrutura', () => {
    const snapshot = { ...lesson, sections: undefined }
    const antiga = publishedLessonFingerprint({ ...snapshot, supportBlockIds: undefined })

    expect(classifyLessonDraftRevision(snapshot, antiga, false)).toEqual({
      kind: 'rebase',
      currentRevision: publishedLessonFingerprint(snapshot),
    })
  })

  test('não altera aulas já reconciliadas ou republicadas', () => {
    const snapshot = { ...lesson, sections: [] }
    const atual = publishedLessonFingerprint(snapshot)

    expect(classifyLessonDraftRevision(snapshot, atual, true)).toEqual({
      kind: 'current',
      currentRevision: atual,
    })
  })

  test('recusa revisão inesperada para não encobrir edição concorrente real', () => {
    const snapshot = { ...lesson, sections: [] }

    expect(classifyLessonDraftRevision(snapshot, 'outra-revisao', true)).toEqual({
      kind: 'conflict',
      currentRevision: publishedLessonFingerprint(snapshot),
    })
  })
})
