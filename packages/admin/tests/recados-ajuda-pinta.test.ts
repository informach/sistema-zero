import { describe, expect, test } from 'bun:test'
import {
  CONTEXT_DETAIL,
  CONTEXT_LABELS,
  CONTEXTS,
} from '../src/app/admin/professor/recados/recados-copy'
import { threadSubject } from '../src/lib/teacher-thread-subject'

describe('Ajuda do Pinta na caixa de recados da equipe', () => {
  test('a conversa sem aula tem filtro, marca e assunto claros', () => {
    expect(CONTEXTS).toContain('pinta_recovery')
    expect(CONTEXT_LABELS.pinta_recovery).toBe('Ajuda do Pinta')
    expect(CONTEXT_DETAIL.pinta_recovery).toBe('Ajuda do Pinta: recuperação de desenhos')
    // Sem curso nem aula, o assunto é o título da conversa (nada some da linha da caixa).
    expect(
      threadSubject({ courseTitle: null, title: 'Ajuda do Pinta: recuperação de desenhos' }),
    ).toBe('Ajuda do Pinta: recuperação de desenhos')
  })
})
