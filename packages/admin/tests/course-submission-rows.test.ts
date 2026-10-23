import { describe, expect, test } from 'bun:test'
import { toCourseSubmissionRow } from '../src/lib/course-submission-rows'

const base = {
  userId: 'aluno-1',
  blockId: 'b1',
  lessonId: 'l1',
  lessonTitle: 'Fase 1',
  moduleTitle: 'Mundo 1',
  submittedAt: '2026-10-14T12:00:00.000Z',
  score: null,
  checkedAt: null,
  passed: false,
  message: 'meu dino pula',
}

describe('linha da aba Entregas do curso', () => {
  test('repassa a marca "falado" do recado (o selo sumia da lista)', () => {
    expect(toCourseSubmissionRow({ ...base, messageSpoken: true }, {}).messageSpoken).toBe(true)
  })

  test('recado escrito e members antigo (sem o campo) ficam sem a marca', () => {
    expect(toCourseSubmissionRow({ ...base, messageSpoken: false }, {}).messageSpoken).toBe(false)
    expect(toCourseSubmissionRow(base, {}).messageSpoken).toBe(false)
  })

  test('a identidade hidratada entra na linha junto do resto', () => {
    const linha = toCourseSubmissionRow(base, { studentName: 'Ana', guardianName: 'Helena' })
    expect(linha).toMatchObject({ userId: 'aluno-1', studentName: 'Ana', message: 'meu dino pula' })
  })
})
