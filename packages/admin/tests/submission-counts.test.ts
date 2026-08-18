import { describe, expect, spyOn, test } from 'bun:test'
import {
  fetchSubmissionCountsSafe,
  moduleSubmissionCount,
  submissionCountWarning,
} from '../src/lib/submission-counts'

describe('avisos de entregas em exclusões', () => {
  test('soma somente as aulas do módulo pedido', () => {
    const counts = {
      total: 9,
      byLesson: { 'aula-1': 2, 'aula-2': 3, 'aula-fora': 4 },
      byBlock: {},
    }

    expect(moduleSubmissionCount(counts, ['aula-1', 'aula-2', 'aula-sem-entrega'])).toBe(5)
    expect(moduleSubmissionCount(null, ['aula-1'])).toBe(0)
  })

  test('omite zero e flexiona singular/plural no texto destrutivo', () => {
    expect(submissionCountWarning(0)).toBeNull()
    expect(submissionCountWarning(-1)).toBeNull()
    expect(submissionCountWarning(1)).toBe(
      'Existe 1 entrega de aluno aqui, e ela será apagada junto.',
    )
    expect(submissionCountWarning(2)).toBe(
      'Existem 2 entregas de alunos aqui, e elas serão apagadas junto.',
    )
  })

  test('busca a contagem pelo BFF e degrada falha para null', async () => {
    const payload = { total: 1, byLesson: { l1: 1 }, byBlock: { b1: 1 } }
    const fetchOk = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(payload))
    try {
      await expect(fetchSubmissionCountsSafe('curso/com espaço')).resolves.toEqual(payload)
      expect(fetchOk).toHaveBeenCalledWith(
        '/api/members/courses/curso%2Fcom%20espa%C3%A7o/submission-counts',
        {
          headers: { accept: 'application/json' },
        },
      )
    } finally {
      fetchOk.mockRestore()
    }

    const fetchFail = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('members offline'))
    try {
      await expect(fetchSubmissionCountsSafe('curso-1')).resolves.toBeNull()
    } finally {
      fetchFail.mockRestore()
    }
  })
})
